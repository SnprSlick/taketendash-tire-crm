
const fs = require('fs');
const readline = require('readline');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function importJsonl(filePath) {
  console.log(`Starting import from ${filePath}...`);
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  let skipped = 0;
  let errors = 0;

  for await (const line of rl) {
    try {
      if (!line.trim()) continue;
      
      const record = JSON.parse(line);
      const model = record.model;
      const data = record.data;

      if (model === 'invoiceCustomer') {
        await prisma.invoiceCustomer.upsert({
          where: { id: data.id },
          update: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            customerCode: data.customerCode,
            updatedAt: new Date(data.updatedAt)
          },
          create: {
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            customerCode: data.customerCode,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          }
        });
      } else if (model === 'invoice') {
        // Handle Invoice
        // Need to ensure customer exists or connect properly
        // The data likely has customerId
        await prisma.invoice.upsert({
            where: { id: data.id },
            update: {
                invoiceNumber: data.invoiceNumber,
                customerName: data.customerName,
                vehicleInfo: data.vehicleInfo,
                mileage: data.mileage,
                invoiceDate: new Date(data.invoiceDate),
                salesperson: data.salesperson,
                taxAmount: parseFloat(data.taxAmount),
                totalAmount: parseFloat(data.totalAmount),
                grossProfit: parseFloat(data.grossProfit),
                profitMargin: parseFloat(data.profitMargin),
                avgProfitPerUnit: parseFloat(data.avgProfitPerUnit),
                reconDifference: parseFloat(data.reconDifference),
                lineItemsCount: parseInt(data.lineItemsCount),
                customerId: data.customerId,
                updatedAt: new Date(data.updatedAt)
            },
            create: {
                id: data.id,
                invoiceNumber: data.invoiceNumber,
                customerName: data.customerName,
                vehicleInfo: data.vehicleInfo,
                mileage: data.mileage,
                invoiceDate: new Date(data.invoiceDate),
                salesperson: data.salesperson,
                taxAmount: parseFloat(data.taxAmount),
                totalAmount: parseFloat(data.totalAmount),
                grossProfit: parseFloat(data.grossProfit),
                profitMargin: parseFloat(data.profitMargin),
                avgProfitPerUnit: parseFloat(data.avgProfitPerUnit),
                reconDifference: parseFloat(data.reconDifference),
                lineItemsCount: parseInt(data.lineItemsCount),
                customerId: data.customerId,
                createdAt: new Date(data.createdAt),
                updatedAt: new Date(data.updatedAt)
            }
        });
      } else if (model === 'invoiceLineItem') {
          await prisma.invoiceLineItem.upsert({
              where: { id: data.id },
              update: {
                  line: parseInt(data.line),
                  productCode: data.productCode,
                  description: data.description,
                  adjustment: data.adjustment,
                  quantity: parseFloat(data.quantity),
                  partsCost: parseFloat(data.partsCost),
                  laborCost: parseFloat(data.laborCost),
                  fet: parseFloat(data.fet),
                  lineTotal: parseFloat(data.lineTotal),
                  cost: parseFloat(data.cost),
                  grossProfitMargin: parseFloat(data.grossProfitMargin),
                  grossProfit: parseFloat(data.grossProfit),
                  invoiceId: data.invoiceId,
                  updatedAt: new Date(data.updatedAt)
              },
              create: {
                  id: data.id,
                  line: parseInt(data.line),
                  productCode: data.productCode,
                  description: data.description,
                  adjustment: data.adjustment,
                  quantity: parseFloat(data.quantity),
                  partsCost: parseFloat(data.partsCost),
                  laborCost: parseFloat(data.laborCost),
                  fet: parseFloat(data.fet),
                  lineTotal: parseFloat(data.lineTotal),
                  cost: parseFloat(data.cost),
                  grossProfitMargin: parseFloat(data.grossProfitMargin),
                  grossProfit: parseFloat(data.grossProfit),
                  invoiceId: data.invoiceId,
                  createdAt: new Date(data.createdAt),
                  updatedAt: new Date(data.updatedAt)
              }
          });
      } else if (model === 'reconciliationBatch') {
          await prisma.reconciliationBatch.upsert({
              where: { id: data.id },
              update: {
                  status: data.status,
                  totalInvoices: parseInt(data.totalInvoices),
                  totalAmount: parseFloat(data.totalAmount),
                  totalDiscrepancy: parseFloat(data.totalDiscrepancy),
                  updatedAt: new Date(data.updatedAt)
              },
              create: {
                  id: data.id,
                  status: data.status,
                  totalInvoices: parseInt(data.totalInvoices),
                  totalAmount: parseFloat(data.totalAmount),
                  totalDiscrepancy: parseFloat(data.totalDiscrepancy),
                  createdAt: new Date(data.createdAt),
                  updatedAt: new Date(data.updatedAt)
              }
          });
      } else if (model === 'reconciliationRecord') {
          await prisma.reconciliationRecord.upsert({
              where: { id: data.id },
              update: {
                  invoiceNumber: data.invoiceNumber,
                  systemAmount: parseFloat(data.systemAmount),
                  csvAmount: parseFloat(data.csvAmount),
                  difference: parseFloat(data.difference),
                  status: data.status,
                  notes: data.notes,
                  batchId: data.batchId,
                  invoiceId: data.invoiceId,
                  updatedAt: new Date(data.updatedAt)
              },
              create: {
                  id: data.id,
                  invoiceNumber: data.invoiceNumber,
                  systemAmount: parseFloat(data.systemAmount),
                  csvAmount: parseFloat(data.csvAmount),
                  difference: parseFloat(data.difference),
                  status: data.status,
                  notes: data.notes,
                  batchId: data.batchId,
                  invoiceId: data.invoiceId,
                  createdAt: new Date(data.createdAt),
                  updatedAt: new Date(data.updatedAt)
              }
          });
      }

      count++;
      if (count % 100 === 0) process.stdout.write(`.`);

    } catch (err) {
      console.error(`\nError processing line: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nImport complete.`);
  console.log(`Processed: ${count}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

// Get file path from args
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide a file path');
    process.exit(1);
}

importJsonl(filePath)
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
