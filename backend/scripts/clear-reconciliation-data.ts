import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearReconciliationData() {
  console.log('🗑️  Starting to clear Reconciliation data...\n');

  try {
    // Step 1: Delete reconciliation records
    console.log('1️⃣  Deleting reconciliation records...');
    const recordsResult = await prisma.reconciliationRecord.deleteMany({});
    console.log(`   ✅ Deleted ${recordsResult.count} reconciliation records\n`);

    // Step 2: Delete reconciliation batches
    console.log('2️⃣  Deleting reconciliation batches...');
    const batchesResult = await prisma.reconciliationBatch.deleteMany({});
    console.log(`   ✅ Deleted ${batchesResult.count} reconciliation batches\n`);

    console.log('🎉 Successfully cleared all Reconciliation data!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearReconciliationData();
