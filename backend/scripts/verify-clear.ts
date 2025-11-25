import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDataCleared() {
  console.log('🔍 Verifying CSV import data has been cleared...\n');

  try {
    const invoices = await prisma.invoice.count();
    const lineItems = await prisma.invoiceLineItem.count();
    const customers = await prisma.invoiceCustomer.count();
    const batches = await prisma.importBatch.count();
    const errors = await prisma.importError.count();
    const rollbacks = await prisma.importRollbackOperation.count();

    console.log('📊 Record Counts:');
    console.log(`   - Invoices: ${invoices}`);
    console.log(`   - Invoice Line Items: ${lineItems}`);
    console.log(`   - Invoice Customers: ${customers}`);
    console.log(`   - Import Batches: ${batches}`);
    console.log(`   - Import Errors: ${errors}`);
    console.log(`   - Rollback Operations: ${rollbacks}`);

    const total = invoices + lineItems + customers + batches + errors + rollbacks;

    if (total === 0) {
      console.log('\n✅ All CSV import data has been successfully cleared!');
      return true;
    } else {
      console.log(`\n⚠️  Warning: ${total} records still remain in the database`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyDataCleared()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch(() => {
    process.exit(1);
  });
