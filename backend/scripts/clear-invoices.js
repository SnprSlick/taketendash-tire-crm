
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearInvoices() {
  try {
    console.log('Clearing Invoices and Sales Orders...');

    // Delete in order of dependencies
    // InvoiceLineItem -> Invoice
    // TireMasterSalesOrderItem -> TireMasterSalesOrder

    console.log('Deleting InvoiceLineItems...');
    await prisma.invoiceLineItem.deleteMany({});

    console.log('Deleting Invoices...');
    await prisma.invoice.deleteMany({});

    console.log('Deleting TireMasterSalesOrderItems...');
    await prisma.tireMasterSalesOrderItem.deleteMany({});

    console.log('Deleting TireMasterSalesOrders...');
    await prisma.tireMasterSalesOrder.deleteMany({});

    console.log('✅ Database cleared of invoice data.');

  } catch (e) {
    console.error('Error clearing data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

clearInvoices();
