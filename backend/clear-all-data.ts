
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🧹 Clearing ALL database data...');

  try {
    // 1. Clear Invoice related data (CSV Import & Sync)
    console.log('Deleting InvoiceLineItems...');
    await prisma.invoiceLineItem.deleteMany({});

    console.log('Deleting SalesData...');
    await prisma.salesData.deleteMany({});

    console.log('Deleting ReconciliationRecords...');
    await prisma.reconciliationRecord.deleteMany({});

    console.log('Deleting ReconciliationBatches...');
    await prisma.reconciliationBatch.deleteMany({});

    console.log('Deleting Invoices...');
    await prisma.invoice.deleteMany({});

    console.log('Deleting InvoiceCustomers...');
    await prisma.invoiceCustomer.deleteMany({});

    console.log('Deleting ImportErrors...');
    await prisma.importError.deleteMany({});

    console.log('Deleting ImportRollbackOperations...');
    await prisma.importRollbackOperation.deleteMany({});

    console.log('Deleting ImportBatches...');
    await prisma.importBatch.deleteMany({});

    // 2. Clear TireMaster Sync data
    console.log('Deleting TireMasterSalesOrderItems...');
    await prisma.tireMasterSalesOrderItem.deleteMany({});

    console.log('Deleting TireMasterSalesOrders...');
    await prisma.tireMasterSalesOrder.deleteMany({});

    console.log('Deleting TireMasterCustomers...');
    await prisma.tireMasterCustomer.deleteMany({});

    console.log('Deleting TireMasterInventory...');
    await prisma.tireMasterInventory.deleteMany({});

    console.log('Deleting TireMasterPrices...');
    await prisma.tireMasterPrice.deleteMany({});

    console.log('Deleting TireMasterProductMappings...');
    await prisma.tireMasterProductMapping.deleteMany({});

    // Note: TireMasterProduct is referenced by InvoiceLineItem (optional) and TireMasterInventory/Prices
    // We deleted dependent records above.
    console.log('Deleting TireMasterProducts...');
    await prisma.tireMasterProduct.deleteMany({});

    console.log('Deleting TireMasterPriceLists...');
    await prisma.tireMasterPriceList.deleteMany({});

    console.log('Deleting TireMasterLocations...');
    await prisma.tireMasterLocation.deleteMany({});

    console.log('Deleting TireMasterSyncHistory...');
    await prisma.tireMasterSyncHistory.deleteMany({});

    // 3. Clear other tables
    console.log('Deleting MechanicLabor...');
    await prisma.mechanicLabor.deleteMany({});

    console.log('✅ ALL data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();
