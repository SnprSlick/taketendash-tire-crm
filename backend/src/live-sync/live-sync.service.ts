import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TireMasterCustomerDto,
  TireMasterProductDto,
  TireMasterVehicleDto,
  TireMasterInvoiceDto,
  TireMasterInvoiceItemDto,
  TireMasterInventoryDataDto,
  TireMasterCategoryDto,
  TireMasterBrandDto,
  SyncLogDto,
} from './dto/sync-dtos';
import { TireType, TireSeason, TireQuality, ProductCategory, InvoiceStatus } from '@prisma/client';

@Injectable()
export class LiveSyncService {
  private readonly logger = new Logger(LiveSyncService.name);

  constructor(private prisma: PrismaService) {}

  async logRemote(log: SyncLogDto) {
    const { message, level, timestamp, context } = log;
    const formattedMessage = `[REMOTE] ${message}`;
    const ctx = context ? JSON.stringify(context) : '';
    
    switch (level?.toLowerCase()) {
      case 'error':
        this.logger.error(formattedMessage, ctx);
        break;
      case 'warn':
        this.logger.warn(formattedMessage, ctx);
        break;
      case 'debug':
        this.logger.debug(formattedMessage, ctx);
        break;
      default:
        this.logger.log(formattedMessage, ctx);
    }
    return { success: true };
  }

  async syncCategories(categories: TireMasterCategoryDto[]) {
    this.logger.log(`Syncing ${categories.length} categories`);
    let count = 0;
    for (const cat of categories) {
      try {
        await this.prisma.tireMasterCategory.upsert({
          where: { code: cat.CAT },
          update: {
            name: cat.NAME,
            catType: cat.CatType,
            lastSyncedAt: new Date(),
          },
          create: {
            code: cat.CAT,
            name: cat.NAME,
            catType: cat.CatType,
            lastSyncedAt: new Date(),
          },
        });
        count++;
      } catch (error) {
        this.logger.error(`Failed to sync category ${cat.CAT}: ${error.message}`);
      }
    }
    return { count };
  }

  async syncBrands(brands: TireMasterBrandDto[]) {
    this.logger.log(`Syncing ${brands.length} brands`);
    let count = 0;
    for (const brand of brands) {
      try {
        await this.prisma.tireMasterBrand.upsert({
          where: { code: brand.CODE },
          update: {
            name: brand.NAME,
            lastSyncedAt: new Date(),
          },
          create: {
            code: brand.CODE,
            name: brand.NAME,
            lastSyncedAt: new Date(),
          },
        });
        count++;
      } catch (error) {
        this.logger.error(`Failed to sync brand ${brand.CODE}: ${error.message}`);
      }
    }
    return { count };
  }

  async syncCustomers(customers: TireMasterCustomerDto[]) {
    this.logger.log(`Syncing ${customers.length} customers`);
    // Log IDs for debugging
    const ids = customers.map(c => c.CUCD).join(', ');
    this.logger.debug(`Customer IDs in batch: ${ids}`);

    let count = 0;
    for (const customer of customers) {
      try {
        // Determine best name to use
        // Priority: COMPANY > NAME > CONTACT
        const customerName = customer.COMPANY || customer.NAME || customer.CONTACT || 'Unknown Customer';

        await this.prisma.tireMasterCustomer.upsert({
          where: { tireMasterCode: customer.CUCD.toString() },
          update: {
            companyName: customerName,
            address: `${customer.ADDRESS1 || ''} ${customer.ADDRESS2 || ''}`.trim(),
            city: customer.CITY,
            state: customer.STATE,
            zipCode: customer.ZIP,
            phone: customer.BPHONE,
            email: customer.EMail,
            creditLimit: customer.CREDIT,
            paymentTerms: customer.TERMS,
            isActive: customer.ACTIVE === 1,
            lastSyncedAt: new Date(),
          },
          create: {
            tireMasterCode: customer.CUCD.toString(),
            companyName: customerName,
            address: `${customer.ADDRESS1 || ''} ${customer.ADDRESS2 || ''}`.trim(),
            city: customer.CITY,
            state: customer.STATE,
            zipCode: customer.ZIP,
            phone: customer.BPHONE,
            email: customer.EMail,
            creditLimit: customer.CREDIT,
            paymentTerms: customer.TERMS,
            isActive: customer.ACTIVE === 1,
            lastSyncedAt: new Date(),
          },
        });
        count++;
      } catch (error) {
        this.logger.error(`Failed to sync customer ${customer.CUCD}: ${error.message}`);
      }
    }
    return { count };
  }

  async syncInventory(products: TireMasterProductDto[]) {
    this.logger.log(`Syncing ${products.length} products`);
    let count = 0;
    for (const product of products) {
      try {
        let isTire = false;
        let tireType: TireType = TireType.OTHER;

        // 1. Determine Tire Type and isTire using Category
        if (product.CAT) {
           const category = await this.prisma.tireMasterCategory.findUnique({
             where: { code: product.CAT }
           });
           
           if (category) {
             // CatType 1 = Tire, 0 = Service/Part (based on sample data)
             if (category.catType === 1) {
               isTire = true;
               // Try to refine TireType from category name
               tireType = this.mapTireType(product.CAT, product.SIZE, product.NAME);
               if (tireType === TireType.OTHER) tireType = TireType.PASSENGER; // Default for tires if unknown
             } else {
               isTire = false;
               tireType = TireType.OTHER;
             }
           } else {
             // Fallback to heuristic
             tireType = this.mapTireType(product.CAT, product.SIZE, product.NAME);
             isTire = tireType !== TireType.OTHER;
           }
        } else {
           tireType = this.mapTireType(product.CAT, product.SIZE, product.NAME);
           isTire = tireType !== TireType.OTHER;
        }

        // 2. Look up Brand Name
        let brandName = product.MFG || 'Unknown';
        if (product.MFG) {
           const brand = await this.prisma.tireMasterBrand.findUnique({
             where: { code: product.MFG }
           });
           if (brand && brand.name) {
             brandName = brand.name;
           }
        }
        
        // Use INVNO as SKU, fallback to PARTNO if INVNO is missing
        let sku = product.INVNO || product.PARTNO.toString();

        // Check for SKU collision with a different product
        const existingProduct = await this.prisma.tireMasterProduct.findUnique({
          where: { tireMasterSku: sku }
        });

        if (existingProduct && existingProduct.tireMasterId !== product.PARTNO) {
          this.logger.warn(`Duplicate SKU ${sku} detected for PARTNO ${product.PARTNO} (Existing: ${existingProduct.tireMasterId}). Appending ID.`);
          sku = `${sku}-${product.PARTNO}`;
        }

        await this.prisma.tireMasterProduct.upsert({
          where: { tireMasterId: product.PARTNO },
          update: {
            tireMasterSku: sku,
            brand: brandName,
            pattern: 'Unknown', // Not provided in sample
            size: product.SIZE || 'Unknown',
            type: tireType,
            season: TireSeason.ALL_SEASON, // Default
            quality: TireQuality.UNKNOWN, // Default
            description: product.NAME,
            weight: product.WEIGHT,
            manufacturerCode: product.VENDPARTNO,
            isActive: product.ACTIVE === 1,
            isTire: isTire,
            lastSyncedAt: new Date(),
          },
          create: {
            tireMasterId: product.PARTNO,
            tireMasterSku: sku,
            brand: brandName,
            pattern: 'Unknown',
            size: product.SIZE || 'Unknown',
            type: tireType,
            season: TireSeason.ALL_SEASON,
            quality: TireQuality.UNKNOWN,
            description: product.NAME,
            weight: product.WEIGHT,
            manufacturerCode: product.VENDPARTNO,
            isActive: product.ACTIVE === 1,
            isTire: isTire,
            lastSyncedAt: new Date(),
          },
        });
        count++;
      } catch (error) {
        this.logger.error(`Failed to sync product ${product.PARTNO}: ${error.message}`);
      }
    }
    return { count };
  }

  async syncInventoryQuantities(inventoryData: TireMasterInventoryDataDto[]) {
    this.logger.log(`Syncing ${inventoryData.length} inventory quantity records`);
    let count = 0;
    for (const item of inventoryData) {
      try {
        // 1. Find Product
        const product = await this.prisma.tireMasterProduct.findUnique({
          where: { tireMasterId: item.PARTNO }
        });

        if (!product) {
          // Product not synced yet, skip or log
          // this.logger.warn(`Product ${item.PARTNO} not found for inventory sync`);
          continue;
        }

        // 2. Find or Create Location
        const locationCode = item.EFFSITENO.toString();
        let location = await this.prisma.tireMasterLocation.findUnique({
          where: { tireMasterCode: locationCode }
        });

        if (!location) {
          location = await this.prisma.tireMasterLocation.create({
            data: {
              tireMasterCode: locationCode,
              name: `Site ${locationCode}`,
              isActive: true
            }
          });
        }

        // 3. Upsert Inventory
        await this.prisma.tireMasterInventory.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: location.id
            }
          },
          update: {
            quantity: item.QTYONHAND || 0,
            reservedQty: item.RESERVE || 0,
            availableQty: (item.QTYONHAND || 0) - (item.RESERVE || 0),
            lastUpdated: new Date(),
          },
          create: {
            productId: product.id,
            locationId: location.id,
            quantity: item.QTYONHAND || 0,
            reservedQty: item.RESERVE || 0,
            availableQty: (item.QTYONHAND || 0) - (item.RESERVE || 0),
            lastUpdated: new Date(),
          }
        });
        count++;
      } catch (error) {
        this.logger.error(`Failed to sync inventory for PARTNO ${item.PARTNO} at Site ${item.EFFSITENO}: ${error.message}`);
      }
    }
    return { count };
  }

  async syncVehicles(vehicles: TireMasterVehicleDto[]) {
    this.logger.log(`Syncing ${vehicles.length} vehicles`);
    this.logger.warn('Vehicle sync not fully implemented due to missing link to internal Customer');
    return { count: 0 };
  }

  async syncInvoices(invoices: TireMasterInvoiceDto[]) {
    this.logger.log(`Syncing ${invoices.length} invoices`);
    
    // DEBUG: Log first invoice to check values
    if (invoices.length > 0) {
      this.logger.debug(`Sample Invoice Data: ${JSON.stringify(invoices[0])}`);
    }

    const batch = await this.getOrCreateLiveSyncBatch();

    let count = 0;
    for (const invoice of invoices) {
      try {
        // Find TireMasterCustomer to get internal ID
        let tmCustomer = await this.prisma.tireMasterCustomer.findUnique({
          where: { tireMasterCode: invoice.CUCD.toString() },
        });

        if (!tmCustomer) {
          this.logger.warn(`Customer ${invoice.CUCD} not found for invoice ${invoice.INVOICE}. Creating placeholder.`);
          
          // Create a placeholder customer so we don't lose the invoice
          tmCustomer = await this.prisma.tireMasterCustomer.create({
            data: {
              tireMasterCode: invoice.CUCD.toString(),
              companyName: `Unknown Customer (${invoice.CUCD})`,
              isActive: false,
              lastSyncedAt: new Date(),
            }
          });
        }

        // Create unique code combining Invoice and Site to prevent collisions
        const uniqueCode = `${invoice.SITENO}-${invoice.INVOICE}`;

        await this.prisma.tireMasterSalesOrder.upsert({
          where: { tireMasterCode: uniqueCode },
          update: {
            customerId: tmCustomer.id,
            orderNumber: invoice.INVOICE.toString(),
            orderDate: new Date(invoice.INVDATE),
            status: 'Completed', // Assumption
            subtotal: (invoice.TAXABLE || 0) + (invoice.NOTAXABLE || 0),
            taxAmount: invoice.TAX,
            totalAmount: (invoice.TAXABLE || 0) + (invoice.NOTAXABLE || 0) + (invoice.TAX || 0),
            siteNo: invoice.SITENO,
            salesperson: invoice.SALESMAN,
            lastSyncedAt: new Date(),
          },
          create: {
            tireMasterCode: uniqueCode,
            customerId: tmCustomer.id,
            orderNumber: invoice.INVOICE.toString(),
            orderDate: new Date(invoice.INVDATE),
            status: 'Completed',
            subtotal: (invoice.TAXABLE || 0) + (invoice.NOTAXABLE || 0),
            taxAmount: invoice.TAX,
            totalAmount: (invoice.TAXABLE || 0) + (invoice.NOTAXABLE || 0) + (invoice.TAX || 0),
            siteNo: invoice.SITENO,
            salesperson: invoice.SALESMAN,
            lastSyncedAt: new Date(),
          },
        });

        // Sync to main Invoice table for Reports
        await this.syncToInvoiceTable(invoice, batch.id, tmCustomer);

        count++;
      } catch (error) {
        this.logger.error(`Failed to sync invoice ${invoice.INVOICE}: ${error.message}`);
      }
    }
    return { count };
  }

  async syncInvoiceItems(items: TireMasterInvoiceItemDto[]) {
    this.logger.log(`Syncing ${items.length} invoice items`);
    
    // DEBUG: Log first item to check values
    if (items.length > 0) {
      this.logger.debug(`Sample Invoice Item Data: ${JSON.stringify(items[0])}`);
    }

    let count = 0;
    for (const item of items) {
      try {
        // Allow items without PARTNO if they have a description (e.g. service lines)
        // Generate a placeholder PARTNO if missing
        if (!item.PARTNO && !item.DESCR) {
           this.logger.warn(`Skipping invoice item ${item.INVOICE}-${item.LINENUM}: Missing PARTNO and DESCR`);
           continue;
        }
        
        const partNo = item.PARTNO || 0; // Use 0 for missing PARTNO

        // Find SalesOrder
        const uniqueCode = `${item.SITENO}-${item.INVOICE}`;
        const salesOrder = await this.prisma.tireMasterSalesOrder.findUnique({
          where: { tireMasterCode: uniqueCode },
        });

        if (!salesOrder) {
          // Invoice might not be synced yet.
          continue;
        }

        // Find Product
        let product = null;
        if (partNo !== 0) {
            product = await this.prisma.tireMasterProduct.findUnique({
              where: { tireMasterId: partNo },
            });
        }

        if (!product) {
          // Create or update placeholder product in DB to satisfy FK
          const placeholderId = (item.PARTNO && !isNaN(Number(item.PARTNO))) ? Number(item.PARTNO) : null;
          // Ensure SKU is unique. If partNo is 0, use 'MISC'. 
          // If partNo exists but product not found, use partNo string.
          const placeholderSku = partNo ? partNo.toString() : 'MISC';
          
          try {
            product = await this.prisma.tireMasterProduct.upsert({
              where: { tireMasterSku: placeholderSku },
              update: {}, // Don't update if exists
              create: {
                  tireMasterId: placeholderId,
                  tireMasterSku: placeholderSku,
                  brand: 'Unknown',
                  pattern: 'Unknown',
                  size: 'Unknown',
                  type: TireType.OTHER,
                  season: TireSeason.ALL_SEASON,
                  quality: TireQuality.UNKNOWN,
                  description: item.DESCR || 'Unknown Item',
                  isTire: false,
                  manufacturerCode: placeholderSku
              }
            });
          } catch (error) {
            // Fallback if SKU collision (e.g. 'MISC' exists but ID is different?)
            // Or if race condition
            this.logger.warn(`Failed to upsert placeholder product ${placeholderId}/${placeholderSku}: ${error.message}`);
            // Try to find it again, maybe created by another process
             product = await this.prisma.tireMasterProduct.findUnique({
              where: { tireMasterId: placeholderId },
            });

            // If not found by ID, try finding by SKU (which caused the unique constraint error)
            if (!product) {
                 product = await this.prisma.tireMasterProduct.findUnique({
                  where: { tireMasterSku: placeholderSku },
                });
            }
            
            if (!product) {
               // If still not found, we can't proceed with this item
               this.logger.error(`Could not find or create product for item ${item.INVOICE}-${item.LINENUM}`);
               continue;
            }
          }
        }

        // Generate unique line number using SITENO if available
        const uniqueLineNumber = item.LINENUM + ((item.SITENO || 0) * 100000);

        // Revenue Calculation:
        // AMOUNT = Unit Parts Price
        // LABOR = Unit Labor Price
        // FETAX = Unit FET Price
        const unitPartsPrice = Number(item.AMOUNT) || 0;
        const unitLaborPrice = Number(item.LABOR) || 0;
        const unitFetPrice = Number(item.FETAX) || 0;
        
        const unitPrice = unitPartsPrice + unitLaborPrice + unitFetPrice;
        const quantity = Number(item.QTY) || 0;
        // If Qty is 0 but we have a price (e.g. payment/adjustment), assume Qty 1 to preserve revenue
        const effectiveQty = (quantity === 0 && unitPrice !== 0) ? 1 : quantity;
        const totalAmount = unitPrice * effectiveQty;

        await this.prisma.tireMasterSalesOrderItem.upsert({
          where: {
            salesOrderId_lineNumber: {
              salesOrderId: salesOrder.id,
              lineNumber: uniqueLineNumber,
            },
          },
          update: {
            productId: product.id,
            quantity: quantity, // Keep original quantity (0) for record
            unitPrice: unitPrice,
            totalAmount: totalAmount,
          },
          create: {
            salesOrderId: salesOrder.id,
            lineNumber: uniqueLineNumber,
            productId: product.id,
            quantity: quantity, // Keep original quantity (0) for record
            unitPrice: unitPrice,
            totalAmount: totalAmount,
          },
        });

        // Sync to main InvoiceLineItem table for Reports
        await this.syncToInvoiceLineItemTable(item, product);

        count++;
      } catch (error) {
        this.logger.error(`Failed to sync invoice item ${item.INVOICE}-${item.LINENUM}: ${error.message}`);
      }
    }

    // Recalculate totals for affected invoices
    const affectedInvoiceIds = [...new Set(items.map(i => `${i.SITENO}-${i.INVOICE}`))];
    this.updateInvoiceTotals(affectedInvoiceIds);

    return { count };
  }

  private async getOrCreateLiveSyncBatch() {
    const batchName = 'Live Sync Batch';
    let batch = await this.prisma.importBatch.findFirst({
      where: { fileName: batchName }
    });

    if (!batch) {
      batch = await this.prisma.importBatch.create({
        data: {
          fileName: batchName,
          originalPath: 'LIVE_SYNC',
          totalRecords: 0,
          status: 'COMPLETED'
        }
      });
    }
    return batch;
  }

  private async syncToInvoiceTable(invoice: TireMasterInvoiceDto, batchId: string, tmCustomer: any) {
    try {
      // 1. Find or Create InvoiceCustomer
      // Use the name from TireMasterCustomer which we just synced with priority logic
      const tmCustomerRecord = await this.prisma.tireMasterCustomer.findUnique({
          where: { tireMasterCode: invoice.CUCD.toString() }
      });
      const customerName = tmCustomerRecord?.companyName || tmCustomer.name || `Customer ${invoice.CUCD}`;

      let invCustomer = await this.prisma.invoiceCustomer.findFirst({
        where: { 
          name: customerName
        }
      });

      if (!invCustomer) {
        invCustomer = await this.prisma.invoiceCustomer.create({
          data: {
            name: customerName,
            customerCode: invoice.CUCD.toString(),
            phone: tmCustomer.phone,
            email: tmCustomer.email,
            address: tmCustomer.address,
          }
        });
      }

      // 2. Find or Create Store
      let storeId = null;
      if (invoice.SITENO) {
        const siteCode = invoice.SITENO.toString();
        const store = await this.prisma.store.upsert({
          where: { code: siteCode },
          update: {},
          create: {
            code: siteCode,
            name: `Site ${siteCode}`
          }
        });
        storeId = store.id;
      }

      // 3. Upsert Invoice
      const totalAmount = (invoice.TAXABLE || 0) + (invoice.NOTAXABLE || 0) + (invoice.TAX || 0);
      const subtotal = (invoice.TAXABLE || 0) + (invoice.NOTAXABLE || 0);
      
      // Use composite ID for invoiceNumber to ensure uniqueness across sites
      // Format: SITE-INVOICE (e.g. 3-331202)
      const uniqueInvoiceNumber = `${invoice.SITENO}-${invoice.INVOICE}`;

      await this.prisma.invoice.upsert({
        where: { invoiceNumber: uniqueInvoiceNumber },
        update: {
          customerId: invCustomer.id,
          invoiceDate: new Date(invoice.INVDATE),
          salesperson: invoice.SALESMAN || 'Unknown',
          subtotal: subtotal,
          taxAmount: invoice.TAX || 0,
          totalAmount: totalAmount,
          storeId: storeId,
          status: InvoiceStatus.ACTIVE,
          updatedAt: new Date(),
        },
        create: {
          invoiceNumber: uniqueInvoiceNumber,
          customerId: invCustomer.id,
          invoiceDate: new Date(invoice.INVDATE),
          salesperson: invoice.SALESMAN || 'Unknown',
          subtotal: subtotal,
          taxAmount: invoice.TAX || 0,
          totalAmount: totalAmount,
          storeId: storeId,
          status: InvoiceStatus.ACTIVE,
          importBatchId: batchId,
        }
      });

    } catch (error) {
      this.logger.error(`Failed to sync to Invoice table for ${invoice.INVOICE}: ${error.message}`);
    }
  }

  private async syncToInvoiceLineItemTable(item: TireMasterInvoiceItemDto, product: any) {
    try {
      const uniqueInvoiceNumber = `${item.SITENO}-${item.INVOICE}`;
      const invoice = await this.prisma.invoice.findUnique({
        where: { invoiceNumber: uniqueInvoiceNumber }
      });

      if (!invoice) return;

      // Determine Category
      let category: ProductCategory = ProductCategory.OTHER;
      if (product.type === TireType.PASSENGER || product.type === TireType.LIGHT_TRUCK || product.isTire) {
        category = ProductCategory.TIRES;
      } else if (item.DESCR && (item.DESCR.toLowerCase().includes('labor') || item.DESCR.toLowerCase().includes('service'))) {
        category = ProductCategory.SERVICES;
      } else {
        category = ProductCategory.PARTS;
      }

      // Calculate Costs and Profits
      const quantity = item.QTY || 0;
      
      // Revenue Calculation:
      // AMOUNT = Unit Parts Price
      // LABOR = Unit Labor Price
      // FETAX = Unit FET Price
      const unitPartsPrice = Number(item.AMOUNT) || 0;
      const unitLaborPrice = Number(item.LABOR) || 0;
      const unitFetPrice = Number(item.FETAX) || 0;
      
      const unitPrice = unitPartsPrice + unitLaborPrice + unitFetPrice;
      const totalAmount = unitPrice * quantity;
      
      // TireMaster TRANS table COST appears to be Total Cost (Extended Cost) based on data analysis
      const totalCost = Number(item.COST) || 0;
      const unitCost = quantity !== 0 ? totalCost / quantity : 0;
      
      const grossProfit = totalAmount - totalCost;
      let grossProfitMargin = totalAmount !== 0 ? (grossProfit / totalAmount) * 100 : 0;
      
      // Clamp grossProfitMargin to fit Decimal(5, 2) range (-999.99 to 999.99)
      if (grossProfitMargin > 999.99) grossProfitMargin = 999.99;
      if (grossProfitMargin < -999.99) grossProfitMargin = -999.99;

      // Assign cost to parts or labor based on category
      let partsCost = 0;
      let laborCost = 0;
      if (category === ProductCategory.SERVICES) {
        laborCost = totalCost;
      } else {
        partsCost = totalCost;
      }

      // Generate unique line number using SITENO if available
      const uniqueLineNumber = item.LINENUM + ((item.SITENO || 0) * 100000);

      // Check if line item exists by invoiceId + lineNumber (not unique constraint in schema, but logical)
      // Schema has id as PK. We need to find it first.
      const existingItem = await this.prisma.invoiceLineItem.findFirst({
        where: {
          invoiceId: invoice.id,
          lineNumber: uniqueLineNumber
        }
      });

      const data = {
        invoiceId: invoice.id,
        lineNumber: uniqueLineNumber,
        productCode: product.tireMasterSku || item.PARTNO.toString(),
        description: item.DESCR || product.description || 'Unknown',
        quantity: quantity,
        lineTotal: totalAmount,
        costPrice: unitCost,
        partsCost: partsCost,
        laborCost: laborCost,
        fet: unitFetPrice * quantity,
        grossProfit: grossProfit,
        grossProfitMargin: grossProfitMargin,
        category: category,
        tireMasterProductId: product.id
      };

      if (existingItem) {
        await this.prisma.invoiceLineItem.update({
          where: { id: existingItem.id },
          data
        });
      } else {
        await this.prisma.invoiceLineItem.create({
          data
        });
      }

    } catch (error) {
      this.logger.error(`Failed to sync to InvoiceLineItem table for ${item.INVOICE}-${item.LINENUM}: ${error.message}`);
    }
  }

  private async updateInvoiceTotals(invoiceIds: string[]) {
    for (const invoiceId of invoiceIds) {
      try {
        // Update TireMasterSalesOrder
        const salesOrder = await this.prisma.tireMasterSalesOrder.findUnique({
          where: { tireMasterCode: invoiceId },
          include: { items: true }
        });

        if (salesOrder) {
          const totalFromItems = salesOrder.items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
          
          // Update if current total is 0 and we have items with value
          // FORCE UPDATE: Always recalculate total from items to ensure consistency
          // The HINVOICE header fields (TAXABLE, NOTAXABLE) often don't match the sum of TRANS items
          if (totalFromItems !== Number(salesOrder.totalAmount)) {
             await this.prisma.tireMasterSalesOrder.update({
               where: { id: salesOrder.id },
               data: { 
                 totalAmount: totalFromItems,
                 // Recalculate subtotal as Total - Tax
                 subtotal: totalFromItems - Number(salesOrder.taxAmount || 0)
               }
             });
             this.logger.debug(`Updated invoice ${invoiceId} total to ${totalFromItems} from items (was ${salesOrder.totalAmount})`);
          }
        }

        // Update Invoice
        const invoice = await this.prisma.invoice.findUnique({
            where: { invoiceNumber: invoiceId },
            include: { lineItems: true }
        });

        if (invoice) {
            const totalFromItems = invoice.lineItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
            const totalGrossProfit = invoice.lineItems.reduce((sum, item) => sum + Number(item.grossProfit), 0);
            const totalLabor = invoice.lineItems.reduce((sum, item) => sum + Number(item.laborCost), 0);
            const totalParts = invoice.lineItems.reduce((sum, item) => sum + Number(item.partsCost), 0);

            if (totalFromItems !== Number(invoice.totalAmount) || totalGrossProfit !== Number(invoice.grossProfit)) {
                // Safety check: If items sum to 0 but header has value, don't overwrite with 0
                // This handles cases where line items might be missing or have 0 amount in sync but header is correct
                if (totalFromItems === 0 && Number(invoice.totalAmount) > 0) {
                    this.logger.warn(`Invoice ${invoiceId} items sum to 0 but header is ${invoice.totalAmount}. Skipping total update.`);
                    continue;
                }

                await this.prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        totalAmount: totalFromItems,
                        subtotal: totalFromItems - Number(invoice.taxAmount || 0),
                        grossProfit: totalGrossProfit,
                        laborCost: totalLabor,
                        partsCost: totalParts
                    }
                });
                this.logger.debug(`Updated Invoice ${invoiceId} totals from items.`);
            }
        }

      } catch (e) {
        this.logger.error(`Failed to update total for invoice ${invoiceId}: ${e.message}`);
      }
    }
  }

  private mapTireType(cat: string, size?: string, name?: string): TireType {
    // 1. Check Category
    if (cat) {
        const upperCat = cat.toUpperCase();
        if (upperCat.includes('TIRE') || upperCat.includes('PASS')) return TireType.PASSENGER;
        if (upperCat.includes('LTR')) return TireType.LIGHT_TRUCK;
        if (upperCat.includes('MTR')) return TireType.MEDIUM_TRUCK;
        if (upperCat.includes('IND')) return TireType.INDUSTRIAL;
        if (upperCat.includes('AGR')) return TireType.AGRICULTURAL;
        if (upperCat.includes('OTR')) return TireType.OTR;
        if (upperCat.includes('TRL')) return TireType.TRAILER;
        if (upperCat.includes('ATV')) return TireType.ATV_UTV;
        if (upperCat.includes('LAWN')) return TireType.LAWN_GARDEN;
        if (upperCat.includes('COMM')) return TireType.COMMERCIAL;
        if (upperCat.includes('SPEC')) return TireType.SPECIALTY;
    }

    // 2. Check Size (Regex for common tire sizes)
    if (size) {
        const upperSize = size.toUpperCase();
        // Passenger/Light Truck: 205/55R16, P215/60R16, LT245/75R16
        if (/^[P]?\d{3}\/\d{2}[R|D|B]\d{2}/.test(upperSize)) return TireType.PASSENGER;
        if (/^LT\d{3}\/\d{2}[R|D|B]\d{2}/.test(upperSize)) return TireType.LIGHT_TRUCK;
        // Medium Truck: 11R22.5, 295/75R22.5
        if (/^\d{2,3}[R|D|B]\d{2}\.?\d?/.test(upperSize)) return TireType.MEDIUM_TRUCK;
        if (/^\d{3}\/\d{2}[R|D|B]\d{2}\.?\d?/.test(upperSize) && upperSize.includes('22.5')) return TireType.MEDIUM_TRUCK;
        // Flotation: 35x12.50R15
        if (/^\d{2}X\d{2}\.?\d{0,2}[R|D|B]\d{2}/.test(upperSize)) return TireType.LIGHT_TRUCK;
    }

    // 3. Check Name/Description
    if (name) {
        const upperName = name.toUpperCase();
        if (upperName.includes('TIRE')) return TireType.PASSENGER; // Generic guess
    }

    return TireType.OTHER;
  }
}
