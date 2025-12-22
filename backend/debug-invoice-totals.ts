
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvoiceTotals() {
  console.log('🔍 Checking Invoice Totals...');

  try {
    // Get 5 recent invoices
    const invoices = await prisma.tireMasterSalesOrder.findMany({
      take: 5,
      orderBy: { orderDate: 'desc' },
      include: {
        items: true
      }
    });

    if (invoices.length === 0) {
      console.log('❌ No invoices found.');
      return;
    }

    for (const inv of invoices) {
      console.log(`\n🧾 Invoice: ${inv.orderNumber}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Header Subtotal: ${inv.subtotal}`);
      console.log(`   Header Tax: ${inv.taxAmount}`);
      console.log(`   Header Total: ${inv.totalAmount}`);
      
      console.log(`   Items: ${inv.items.length}`);
      let calculatedTotal = 0;
      for (const item of inv.items) {
        console.log(`     - Item: Qty ${item.quantity} x $${item.unitPrice} = $${item.totalAmount}`);
        calculatedTotal += Number(item.totalAmount);
      }
      console.log(`   Calculated Total from Items: ${calculatedTotal}`);
      
      if (Number(inv.totalAmount) !== calculatedTotal) {
        console.log('   ⚠️  MISMATCH DETECTED');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoiceTotals();
