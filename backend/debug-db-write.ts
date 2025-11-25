
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDbWrite() {
  console.log('🔧 Starting DB Write Debug');
  
  try {
    // 1. Create a test batch
    console.log('1. Creating test ImportBatch...');
    const batch = await prisma.importBatch.create({
      data: {
        fileName: 'debug-test.csv',
        originalPath: '/tmp/debug-test.csv',
        totalRecords: 1,
        status: 'STARTED'
      }
    });
    console.log(`   ✅ Created batch: ${batch.id}`);

    // 2. Define sample invoice data (mimicking parsed data)
    const invoiceData = {
      invoiceNumber: `DEBUG-${Date.now()}`,
      customerName: 'DEBUG CUSTOMER',
      invoiceDate: new Date(),
      salesperson: 'DEBUG USER',
      totalAmount: 100.00,
      lineItems: [
        {
          productCode: 'TEST-PROD-01',
          description: 'Test Product',
          quantity: 1,
          lineTotal: 100.00,
          cost: 50.00
        }
      ]
    };

    // 3. Simulate persistInvoiceData logic
    console.log('2. Attempting to write invoice to DB...');
    
    await prisma.$transaction(async (tx) => {
      // Check/Create Customer
      let customer = await tx.invoiceCustomer.findFirst({
        where: { name: invoiceData.customerName }
      });

      if (!customer) {
        customer = await tx.invoiceCustomer.create({
          data: { name: invoiceData.customerName }
        });
        console.log(`   ✅ Created customer: ${customer.id}`);
      } else {
        console.log(`   ℹ️ Found existing customer: ${customer.id}`);
      }

      // Create Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: invoiceData.invoiceNumber,
          customer: { connect: { id: customer.id } },
          invoiceDate: invoiceData.invoiceDate,
          salesperson: invoiceData.salesperson,
          subtotal: 100.00,
          taxAmount: 0,
          totalAmount: 100.00,
          status: 'ACTIVE',
          importBatch: { connect: { id: batch.id } }
        }
      });
      console.log(`   ✅ Created invoice: ${createdInvoice.id} (${createdInvoice.invoiceNumber})`);

      // Create Line Item
      const lineItem = invoiceData.lineItems[0];
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: createdInvoice.id,
          lineNumber: 1,
          productCode: lineItem.productCode,
          description: lineItem.description,
          quantity: lineItem.quantity,
          partsCost: 0,
          laborCost: 0,
          fet: 0,
          lineTotal: lineItem.lineTotal,
          costPrice: lineItem.cost,
          grossProfitMargin: 50.00,
          grossProfit: 50.00,
          category: 'TIRES' // Assuming enum value
        }
      });
      console.log(`   ✅ Created line item`);
    });

    console.log('🎉 DB Write Successful!');

  } catch (error) {
    console.error('❌ DB Write Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDbWrite();
