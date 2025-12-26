
const { PrismaClient, InvoiceStatus, ProductCategory, TireType } = require('@prisma/client');
const prisma = new PrismaClient();

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'rehydrate.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${message}`;
    console.log(logMsg);
    fs.appendFileSync(LOG_FILE, logMsg + '\n');
}

process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}\n${err.stack}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

async function rehydrate() {
  const argDate = process.argv[2];
  const startDate = argDate ? new Date(argDate) : new Date('2025-01-01T00:00:00Z');
  // If arg provided, go to end of year (or could be just that day, but sync client goes forward)
  const endDate = new Date('2025-12-31T23:59:59Z');

  log(`Rehydrating invoices from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Get or create batch
  let batch = await prisma.importBatch.findFirst({ where: { fileName: 'Live Sync Batch' } });
  if (!batch) {
    batch = await prisma.importBatch.create({
      data: { fileName: 'Live Sync Batch', originalPath: 'LIVE_SYNC', totalRecords: 0, status: 'COMPLETED' }
    });
  }

  const BATCH_SIZE = 1000;
  let skip = 0; // Scan all, but skip existing
  let totalProcessed = 0;
  let totalSkipped = 0;
  
  while (true) {
      let orders;
      try {
        orders = await prisma.tireMasterSalesOrder.findMany({
            where: {
            orderDate: {
                gte: startDate,
                lte: endDate
            }
            },
            orderBy: {
            orderDate: 'desc'
            },
            include: {
            customer: true,
            items: {
                include: {
                product: true
                }
            }
            },
            take: BATCH_SIZE,
            skip: skip
        });
      } catch (e) {
          log(`Error fetching batch at offset ${skip}: ${e.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; 
      }

      if (orders.length === 0) {
          break;
      }

      log(`Processing batch of ${orders.length} orders (Offset: ${skip})...`);

      const pLimit = (concurrency) => {
        const queue = [];
        let activeCount = 0;
        const next = () => {
          activeCount--;
          if (queue.length > 0) queue.shift()();
        };
        return (fn) => new Promise((resolve, reject) => {
          const run = async () => {
            activeCount++;
            try { resolve(await fn()); } catch (e) { reject(e); } finally { next(); }
          };
          if (activeCount < concurrency) run();
          else queue.push(run);
        });
      };

      const limit = pLimit(20); // Process 20 invoices concurrently

      const promises = orders.map(order => limit(async () => {
        try {
          // Check if exists
          const exists = await prisma.invoice.findUnique({ 
              where: { invoiceNumber: order.tireMasterCode },
              select: { id: true, grossProfit: true, totalAmount: true }
          });
          
          if (exists) {
              // Check if profit looks suspicious (100% profit usually means missing cost)
              const total = Number(exists.totalAmount);
              const profit = Number(exists.grossProfit);
              const isProfitSuspicious = total > 0 && Math.abs(profit - total) < 0.01;
              
              if (!isProfitSuspicious) {
                  totalSkipped++;
                  return;
              }
              // If suspicious, we proceed to re-sync (update)
          }

          // Sync Header
          await syncToInvoiceTable(order, batch.id);

          // Sync Items
          for (const item of order.items) {
              await syncToInvoiceLineItemTable(item, order.siteNo, order.orderNumber);
          }
          
          // Update totals
          await updateInvoiceTotals([order.tireMasterCode]);

          totalProcessed++;
        } catch (e) {
          log(`Failed to rehydrate order ${order.id}: ${e.message}`);
        }
      }));

      await Promise.all(promises);
      
      skip += orders.length;
      log(`Processed: ${totalProcessed}, Skipped: ${totalSkipped}`);
      
      // Small delay to let DB breathe
      await new Promise(resolve => setTimeout(resolve, 100));
  }

  log(`Rehydration complete. Processed ${totalProcessed} invoices.`);
}

async function syncToInvoiceTable(order, batchId) {
    try {
      const invoiceDto = order.metadata || {};
      const tmCustomer = order.customer;
      
      // Construct customerCode
      // If metadata exists, use CUCD_S logic, else use tmCustomer.tireMasterCode
      let customerCode = tmCustomer.tireMasterCode;
      if (invoiceDto.CUCD && invoiceDto.CUCD_S) {
          customerCode = `${invoiceDto.CUCD}-${invoiceDto.CUCD_S}`;
      }

      // Find or Create InvoiceCustomer
      const customerName = tmCustomer?.companyName || `Customer ${customerCode}`;

      let invCustomer = await prisma.invoiceCustomer.findFirst({
        where: { customerCode: customerCode }
      });

      if (invCustomer) {
        if (invCustomer.name !== customerName) {
           try {
               await prisma.invoiceCustomer.update({
                 where: { id: invCustomer.id },
                 data: { name: customerName }
               });
           } catch (e) {
               if (e.code === 'P2002') {
                   const uniqueName = `${customerName} (${customerCode})`;
                   try {
                       await prisma.invoiceCustomer.update({
                         where: { id: invCustomer.id },
                         data: { name: uniqueName }
                       });
                   } catch (e2) {}
               }
           }
        }
      } else {
          // Create new
          try {
              invCustomer = await prisma.invoiceCustomer.create({
                data: {
                  name: customerName,
                  customerCode: customerCode,
                  phone: tmCustomer?.phone,
                  email: tmCustomer?.email,
                  address: tmCustomer?.address,
                }
              });
          } catch (e) {
              if (e.code === 'P2002') {
                   const uniqueName = `${customerName} (${customerCode})`;
                   try {
                       invCustomer = await prisma.invoiceCustomer.create({
                         data: {
                           name: uniqueName,
                           customerCode: customerCode,
                           phone: tmCustomer?.phone,
                           email: tmCustomer?.email,
                           address: tmCustomer?.address,
                         }
                       });
                   } catch (e2) {
                       if (e2.code === 'P2002') {
                           invCustomer = await prisma.invoiceCustomer.findFirst({
                               where: { name: uniqueName }
                           });
                       }
                       
                       if (!invCustomer) {
                           console.error(`Failed to create customer ${customerCode} even with unique name: ${e2.message}`);
                           throw e2;
                       }
                   }
              } else {
                  throw e;
              }
          }
      }

      // Find or Create Store
      let storeId = null;
      if (order.siteNo) {
        const siteCode = order.siteNo.toString();
        const store = await prisma.store.upsert({
          where: { code: siteCode },
          update: {},
          create: { code: siteCode, name: `Site ${siteCode}` }
        });
        storeId = store.id;
      }

      // Upsert Invoice
      // Use entity fields
      const totalAmount = Number(order.totalAmount) || 0;
      const taxAmount = Number(order.taxAmount) || 0;
      const subtotal = Number(order.subtotal) || (totalAmount - taxAmount);
      
      const uniqueInvoiceNumber = order.tireMasterCode; // Should be SITENO-INVOICE

      await prisma.invoice.upsert({
        where: { invoiceNumber: uniqueInvoiceNumber },
        update: {
          customerId: invCustomer.id,
          invoiceDate: new Date(order.orderDate),
          salesperson: order.salesperson || 'Unknown',
          subtotal: subtotal,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          storeId: storeId,
          status: InvoiceStatus.ACTIVE,
          keymod: order.keymod,
          metadata: invoiceDto,
          updatedAt: new Date(),
        },
        create: {
          invoiceNumber: uniqueInvoiceNumber,
          customerId: invCustomer.id,
          invoiceDate: new Date(order.orderDate),
          salesperson: order.salesperson || 'Unknown',
          subtotal: subtotal,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          storeId: storeId,
          status: InvoiceStatus.ACTIVE,
          keymod: order.keymod,
          metadata: invoiceDto,
          importBatchId: batchId,
        }
      });

    } catch (error) {
      console.error(`Failed to sync to Invoice table for ${order.orderNumber}: ${error.message}`);
    }
}

async function syncToInvoiceLineItemTable(item, siteNo, invoiceNumber) {
    try {
      const uniqueInvoiceNumber = `${siteNo}-${invoiceNumber}`;
      const invoice = await prisma.invoice.findUnique({
        where: { invoiceNumber: uniqueInvoiceNumber }
      });

      if (!invoice) return;

      const product = item.product;
      const itemDto = item.metadata || {};

      // Determine Category
      let category = ProductCategory.OTHER;
      if (product.type === TireType.PASSENGER || product.type === TireType.LIGHT_TRUCK || product.isTire) {
        category = ProductCategory.TIRES;
      } else if (product.description && (product.description.toLowerCase().includes('labor') || product.description.toLowerCase().includes('service'))) {
        category = ProductCategory.SERVICES;
      } else {
        category = ProductCategory.PARTS;
      }

      const quantity = item.quantity || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const totalAmount = Number(item.totalAmount) || 0;
      
      // Try to get cost from metadata, else 0
      let totalCost = Number(itemDto.COST) || 0;

      // Fallback to Product Cost if missing in Transaction
      if (totalCost === 0 && product && product.metadata) {
          // Try to find cost in product metadata (LASTCOST, NEXTCOST, etc.)
          // Note: These are Unit Costs, so multiply by Quantity
          const productMeta = product.metadata;
          const unitCostFallback = Number(productMeta.LASTCOST) || Number(productMeta.NEXTCOST) || Number(productMeta.EDL) || 0;
          if (unitCostFallback > 0) {
              totalCost = unitCostFallback * quantity;
          }
      }

      const unitCost = quantity !== 0 ? totalCost / quantity : 0;
      
      // Try to get FET/Labor from metadata
      const unitFetPrice = Number(itemDto.FETAX) || 0;
      const unitLaborPrice = Number(itemDto.LABOR) || 0;
      const unitPartsPrice = Number(itemDto.AMOUNT) || 0;

      const grossProfit = totalAmount - totalCost;
      let grossProfitMargin = totalAmount !== 0 ? (grossProfit / totalAmount) * 100 : 0;
      
      if (grossProfitMargin > 999.99) grossProfitMargin = 999.99;
      if (grossProfitMargin < -999.99) grossProfitMargin = -999.99;

      let partsCost = 0;
      let laborCost = 0;
      if (category === ProductCategory.SERVICES) {
        laborCost = totalCost;
      } else {
        partsCost = totalCost;
      }

      const uniqueLineNumber = item.lineNumber; // Already unique per order in DB? No, lineNumber is Int.
      // In LiveSyncService: const uniqueLineNumber = item.LINENUM + ((item.SITENO || 0) * 100000);
      // But here item.lineNumber comes from DB, which should be the unique one if synced correctly.
      // Let's assume item.lineNumber is correct.

      const existingItem = await prisma.invoiceLineItem.findFirst({
        where: {
          invoiceId: invoice.id,
          lineNumber: uniqueLineNumber
        }
      });

      const data = {
        invoiceId: invoice.id,
        lineNumber: uniqueLineNumber,
        productCode: product.tireMasterSku || 'MISC',
        description: product.description || 'Unknown',
        quantity: quantity,
        lineTotal: totalAmount,
        costPrice: unitCost,
        partsCost: partsCost,
        laborCost: laborCost,
        fet: unitFetPrice * quantity,
        grossProfit: grossProfit,
        grossProfitMargin: grossProfitMargin,
        category: category,
        tireMasterProductId: product.id,
        metadata: itemDto
      };

      if (existingItem) {
        await prisma.invoiceLineItem.update({
          where: { id: existingItem.id },
          data
        });
      } else {
        await prisma.invoiceLineItem.create({
          data
        });
      }

    } catch (error) {
      console.error(`Failed to sync to InvoiceLineItem table for item ${item.id}: ${error.message}`);
    }
}

async function updateInvoiceTotals(invoiceIds) {
    for (const invoiceId of invoiceIds) {
      try {
        const invoice = await prisma.invoice.findUnique({
            where: { invoiceNumber: invoiceId },
            include: { lineItems: true }
        });

        if (invoice) {
            const totalFromItems = invoice.lineItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
            const totalGrossProfit = invoice.lineItems.reduce((sum, item) => sum + Number(item.grossProfit), 0);
            const totalLabor = invoice.lineItems.reduce((sum, item) => sum + Number(item.laborCost), 0);
            const totalParts = invoice.lineItems.reduce((sum, item) => sum + Number(item.partsCost), 0);

            if (totalFromItems !== Number(invoice.totalAmount) || totalGrossProfit !== Number(invoice.grossProfit)) {
                if (totalFromItems === 0 && Number(invoice.totalAmount) > 0) {
                    continue;
                }

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        totalAmount: totalFromItems,
                        subtotal: totalFromItems - Number(invoice.taxAmount || 0),
                        grossProfit: totalGrossProfit,
                        laborCost: totalLabor,
                        partsCost: totalParts
                    }
                });
            }
        }
      } catch (e) {
        console.error(`Failed to update total for invoice ${invoiceId}: ${e.message}`);
      }
    }
}

rehydrate()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
