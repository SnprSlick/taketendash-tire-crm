import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearCsvImportData() {
  console.log('🗑️  Starting to clear CSV import data...\n');

  try {
    // Step 1: Delete invoice line items (child of invoices)
    console.log('1️⃣  Deleting invoice line items...');
    const lineItemsResult = await prisma.invoiceLineItem.deleteMany({});
    console.log(`   ✅ Deleted ${lineItemsResult.count} invoice line items\n`);

    // Step 2: Delete sales data that references invoices
    console.log('2️⃣  Deleting sales data linked to invoices...');
    const salesDataResult = await prisma.salesData.deleteMany({
      where: {
        sourceType: 'INVOICE_IMPORT',
      },
    });
    console.log(`   ✅ Deleted ${salesDataResult.count} sales data records\n`);

    // Step 3: Delete invoices
    console.log('3️⃣  Deleting invoices...');
    const invoicesResult = await prisma.invoice.deleteMany({});
    console.log(`   ✅ Deleted ${invoicesResult.count} invoices\n`);

    // Step 4: Delete invoice customers
    console.log('4️⃣  Deleting invoice customers...');
    const customersResult = await prisma.invoiceCustomer.deleteMany({});
    console.log(`   ✅ Deleted ${customersResult.count} invoice customers\n`);

    // Step 5: Delete import errors
    console.log('5️⃣  Deleting import errors...');
    const errorsResult = await prisma.importError.deleteMany({});
    console.log(`   ✅ Deleted ${errorsResult.count} import errors\n`);

    // Step 6: Delete rollback operations
    console.log('6️⃣  Deleting rollback operations...');
    const rollbackResult = await prisma.importRollbackOperation.deleteMany({});
    console.log(`   ✅ Deleted ${rollbackResult.count} rollback operations\n`);

    // Step 7: Delete import batches
    console.log('7️⃣  Deleting import batches...');
    const batchesResult = await prisma.importBatch.deleteMany({});
    console.log(`   ✅ Deleted ${batchesResult.count} import batches\n`);

    console.log('🎉 Successfully cleared all CSV import data!');
    console.log('\n📊 Summary:');
    console.log(`   - Invoice line items: ${lineItemsResult.count}`);
    console.log(`   - Sales data: ${salesDataResult.count}`);
    console.log(`   - Invoices: ${invoicesResult.count}`);
    console.log(`   - Invoice customers: ${customersResult.count}`);
    console.log(`   - Import errors: ${errorsResult.count}`);
    console.log(`   - Rollback operations: ${rollbackResult.count}`);
    console.log(`   - Import batches: ${batchesResult.count}`);
    console.log(`   Total records deleted: ${
      lineItemsResult.count +
      salesDataResult.count +
      invoicesResult.count +
      customersResult.count +
      errorsResult.count +
      rollbackResult.count +
      batchesResult.count
    }`);
  } catch (error) {
    console.error('❌ Error clearing CSV import data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
clearCsvImportData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
