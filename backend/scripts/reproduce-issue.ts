
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reproduce() {
  console.log('Starting reproduction...');

  const invoiceId = 'TEST-62783';
  const siteNo = 3;

  // Mock Data based on user report
  const items = [
    {
      LINENUM: 1,
      PARTNO: '503',
      QTY: 1,
      AMOUNT: 0,
      DESCR: 'TEST PART 503',
      COST: 0,
      LABOR: 0,
      FETAX: 0,
      CAT: 'TEST',
      MFG: 'TEST',
      SIZE: 'TEST'
    },
    {
      LINENUM: 2,
      PARTNO: null,
      QTY: null, // Simulating null QTY
      AMOUNT: 16.48,
      DESCR: 'TEST NULL PART',
      COST: 0,
      LABOR: 0,
      FETAX: 0,
      CAT: null,
      MFG: null,
      SIZE: null
    }
  ];

  try {
    // 1. Create Dummy Sales Order
    console.log('Creating Sales Order...');
    const order = await prisma.tireMasterSalesOrder.create({
      data: {
        invoiceNumber: '62783',
        siteNo: siteNo,
        uniqueCode: `${invoiceId}-${siteNo}`,
        orderDate: new Date(),
        totalAmount: 16.48,
        subtotal: 16.48,
        status: 'CLOSED'
      }
    });
    console.log('Sales Order created:', order.id);

    // 2. Process Items (Logic copied from LiveSyncService)
    for (const item of items) {
      console.log(`Processing item ${item.LINENUM}...`);
      
      const partNo = item.PARTNO || 'MISC';
      const quantity = item.QTY || 0; // Logic from service
      const unitPrice = item.AMOUNT || 0;
      const laborPrice = item.LABOR || 0;
      const fetPrice = item.FETAX || 0;
      
      const partsRevenue = unitPrice * quantity;
      const laborRevenue = laborPrice * quantity;
      const fetRevenue = fetPrice * quantity;
      const totalAmount = partsRevenue + laborRevenue + fetRevenue;

      console.log(`  Part: ${partNo}, Qty: ${quantity}, UnitPrice: ${unitPrice}, Total: ${totalAmount}`);

      // Upsert Product
      const placeholderSku = partNo;
      console.log(`  Upserting product ${placeholderSku}...`);
      const product = await prisma.tireMasterProduct.upsert({
        where: { tireMasterSku: placeholderSku },
        update: {},
        create: {
          tireMasterSku: placeholderSku,
          name: item.DESCR || 'Unknown Item',
          category: item.CAT || 'OTHER',
          manufacturer: item.MFG,
          size: item.SIZE,
          tireType: 'OTHER'
        }
      });
      console.log(`  Product upserted: ${product.id}`);

      // Upsert Item
      console.log(`  Upserting SalesOrderItem...`);
      await prisma.tireMasterSalesOrderItem.upsert({
        where: {
          unique_item_id: {
            salesOrderId: order.id,
            lineNumber: item.LINENUM
          }
        },
        update: {
            quantity: quantity,
            unitPrice: unitPrice,
            fet: fetPrice,
            labor: laborPrice,
            totalAmount: totalAmount,
            cost: item.COST || 0,
            itemDescription: item.DESCR,
            tireMasterSku: partNo,
            productId: product.id
        },
        create: {
            salesOrderId: order.id,
            lineNumber: item.LINENUM,
            quantity: quantity,
            unitPrice: unitPrice,
            fet: fetPrice,
            labor: laborPrice,
            totalAmount: totalAmount,
            cost: item.COST || 0,
            itemDescription: item.DESCR,
            tireMasterSku: partNo,
            productId: product.id
        }
      });
      console.log(`  Item ${item.LINENUM} upserted.`);
    }

    console.log('Reproduction finished successfully.');

  } catch (error) {
    console.error('Reproduction FAILED:', error);
  } finally {
    // Cleanup
    console.log('Cleaning up...');
    await prisma.tireMasterSalesOrderItem.deleteMany({ where: { salesOrder: { invoiceNumber: '62783' } } });
    await prisma.tireMasterSalesOrder.deleteMany({ where: { invoiceNumber: '62783' } });
    await prisma.$disconnect();
  }
}

reproduce();
