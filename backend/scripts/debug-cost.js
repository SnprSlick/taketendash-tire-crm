
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugNegativeProfit() {
  try {
    console.log('Analyzing Negative Profit Line Items...');

    const negativeItems = await prisma.invoiceLineItem.findMany({
      where: {
        grossProfit: { lt: 0 }
      },
      take: 5,
      include: {
        invoice: true
      }
    });

    if (negativeItems.length === 0) {
      console.log('No negative profit items found.');
      return;
    }

    console.log(`Found ${negativeItems.length} sample negative items:`);
    
    for (const item of negativeItems) {
      console.log('\n--------------------------------------------------');
      console.log(`Invoice: ${item.invoice.invoiceNumber}`);
      console.log(`Product: ${item.description} (${item.productCode})`);
      console.log(`Qty: ${item.quantity}`);
      console.log(`Line Total (Revenue): ${item.lineTotal}`);
      console.log(`Stored Unit Cost (costPrice): ${item.costPrice}`);
      console.log(`Calculated Total Cost (parts+labor): ${Number(item.partsCost) + Number(item.laborCost)}`);
      console.log(`Gross Profit: ${item.grossProfit}`);
      
      // Reverse engineer
      const costPerQty = Number(item.costPrice);
      const totalCost = Number(item.partsCost) + Number(item.laborCost);
      
      console.log(`\nAnalysis:`);
      console.log(`Is Total Cost = Unit Cost * Qty? ${Math.abs(totalCost - (costPerQty * item.quantity)) < 0.01}`);
      console.log(`Is Total Cost = Unit Cost? ${Math.abs(totalCost - costPerQty) < 0.01}`);
      
      if (item.quantity > 1) {
          console.log(`Hypothesis: If input COST was actually Total Cost...`);
          console.log(`  Then True Unit Cost = ${costPerQty} / ${item.quantity} = ${costPerQty / item.quantity}`);
          console.log(`  True Total Cost = ${costPerQty}`);
          console.log(`  True Profit = ${item.lineTotal} - ${costPerQty} = ${Number(item.lineTotal) - costPerQty}`);
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debugNegativeProfit();
