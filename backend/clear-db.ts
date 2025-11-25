
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Clearing database...');

  try {
    // Delete in order of dependencies (child tables first)
    
    console.log('Deleting InvoiceLineItems...');
    await prisma.invoiceLineItem.deleteMany({});
    
    console.log('Deleting Invoices...');
    await prisma.invoice.deleteMany({});
    
    console.log('Deleting InvoiceCustomers...');
    await prisma.invoiceCustomer.deleteMany({});
    
    console.log('Deleting ImportErrors...');
    await prisma.importError.deleteMany({});
    
    console.log('Deleting ImportBatches...');
    await prisma.importBatch.deleteMany({});

    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
