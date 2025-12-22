
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTireMasterData() {
  console.log('🗑️  Clearing Tire Master data...');

  try {
    // Delete in order of dependency (child tables first)
    
    console.log('   Deleting Sales Data (Tire Master Sync)...');
    await prisma.salesData.deleteMany({
      where: { sourceType: 'TIRE_MASTER_SYNC' }
    });

    console.log('   Deleting Invoices (Live Sync)...');
    // Find batches first
    const syncBatches = await prisma.importBatch.findMany({
      where: { originalPath: 'LIVE_SYNC' },
      select: { id: true }
    });
    const batchIds = syncBatches.map(b => b.id);

    if (batchIds.length > 0) {
      await prisma.invoice.deleteMany({
        where: { importBatchId: { in: batchIds } }
      });
      
      console.log('   Deleting Import Batches (Live Sync)...');
      await prisma.importBatch.deleteMany({
        where: { id: { in: batchIds } }
      });
    }

    console.log('   Deleting Sales Order Items...');
    await prisma.tireMasterSalesOrderItem.deleteMany({});

    console.log('   Deleting Sales Orders...');
    await prisma.tireMasterSalesOrder.deleteMany({});

    console.log('   Deleting Inventory...');
    await prisma.tireMasterInventory.deleteMany({});

    console.log('   Deleting Prices...');
    await prisma.tireMasterPrice.deleteMany({});

    console.log('   Deleting Product Mappings...');
    await prisma.tireMasterProductMapping.deleteMany({});

    console.log('   Deleting Products...');
    await prisma.tireMasterProduct.deleteMany({});

    console.log('   Deleting Customers...');
    await prisma.tireMasterCustomer.deleteMany({});

    console.log('   Deleting Sync History...');
    await prisma.tireMasterSyncHistory.deleteMany({});

    console.log('✅ Tire Master data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTireMasterData();
