import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoiceNo = 999999;
  const siteNo = 99;
  const uniqueCode = `${siteNo}-${invoiceNo}`;

  console.log(`Verifying fixes for Invoice ${uniqueCode}...`);

  // Clean up previous test data
  try {
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { invoiceNumber: invoiceNo.toString() } } });
    await prisma.tireMasterSalesOrderItem.deleteMany({ where: { salesOrder: { orderNumber: invoiceNo.toString() } } });
    await prisma.tireMasterSalesOrder.deleteMany({ where: { orderNumber: invoiceNo.toString() } });
    await prisma.invoice.deleteMany({ where: { invoiceNumber: invoiceNo.toString() } });
    await prisma.importBatch.deleteMany({ where: { fileName: 'test-verify-script' } });
  } catch (e: any) {
    console.log('Cleanup warning:', e.message);
  }

  // Create a mock SalesOrder
  // Note: TireMasterSalesOrder connects to TireMasterCustomer
  const salesOrder = await prisma.tireMasterSalesOrder.create({
    data: {
      siteNo: siteNo,
      orderNumber: invoiceNo.toString(),
      tireMasterCode: uniqueCode,
      orderDate: new Date(),
      status: 'Closed',
      subtotal: 100,
      totalAmount: 100,
      customer: {
        connectOrCreate: {
          where: { tireMasterCode: 'TEST-TM-CUST' },
          create: { tireMasterCode: 'TEST-TM-CUST', companyName: 'TEST CUSTOMER' }
        }
      }
    }
  });

  // Create ImportBatch first as it is required for Invoice
  const importBatch = await prisma.importBatch.create({
    data: {
      fileName: 'test-verify-script',
      originalPath: 'test',
      totalRecords: 1,
      status: 'COMPLETED'
    }
  });

  // Create Customer manually to avoid connectOrCreate type issues
  const customer = await prisma.invoiceCustomer.create({
    data: { name: 'TEST CUSTOMER' }
  });

  // Create corresponding Invoice
  // Note: Invoice connects to InvoiceCustomer
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: invoiceNo.toString(),
      invoiceDate: new Date(),
      salesperson: 'Test',
      subtotal: 100,
      taxAmount: 0,
      totalAmount: 100,
      status: 'ACTIVE', // Enum InvoiceStatus.ACTIVE
      importBatch: {
        connect: { id: importBatch.id }
      },
      customer: {
        connect: { id: customer.id }
      },
      store: {
        connectOrCreate: {
          where: { code: 'TEST' },
          create: { code: 'TEST', name: 'Test Store' }
        }
      }
    }
  });

  console.log('Created Invoice and SalesOrder.');

  // Test Case 1: Zero Quantity Item
  console.log('Testing Zero Quantity Item...');
  
  // Create TireMaster Product
  const tmProduct = await prisma.tireMasterProduct.upsert({
    where: { tireMasterSku: 'TEST-SKU-1' },
    update: {},
    create: {
      tireMasterSku: 'TEST-SKU-1',
      brand: 'TEST',
      pattern: 'TEST',
      size: 'TEST',
      type: 'OTHER',
      season: 'ALL_SEASON'
    }
  });

  // Simulate Sync Logic for InvoiceLineItem (Zero Quantity)
  
  const qty = 0;
  const total = 50;
  
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      lineNumber: 1,
      productCode: 'TEST-SKU-1',
      description: 'Zero Qty Item',
      quantity: qty,
      lineTotal: total,
      // unitPrice: 0, // REMOVED - not in schema
      partsCost: 0,
      laborCost: 0,
      fet: 0,
      costPrice: 0,
      grossProfit: 50,
      grossProfitMargin: 100,
      category: 'PARTS',
      tireMasterProductId: tmProduct.id
    }
  });

  console.log('Zero Quantity Item created successfully.');

  // Test Case 2: Product Upsert with Duplicate SKU (Simulated)
  
  console.log('Testing Product Upsert...');
  const tmProduct2 = await prisma.tireMasterProduct.upsert({
    where: { tireMasterSku: 'TEST-SKU-1' }, // Same SKU
    update: { description: 'Updated Description' },
    create: {
      tireMasterSku: 'TEST-SKU-1',
      brand: 'TEST',
      pattern: 'TEST',
      size: 'TEST',
      type: 'OTHER',
      season: 'ALL_SEASON'
    }
  });
  
  if (tmProduct2.id === tmProduct.id && tmProduct2.description === 'Updated Description') {
      console.log('Product Upsert worked (updated existing).');
  } else {
      console.error('Product Upsert failed to update existing.');
  }

  console.log('Verification Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
