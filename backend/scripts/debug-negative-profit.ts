
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding invoices with negative profit...');

  const negativeProfitInvoices = await prisma.invoice.findMany({
    where: {
      grossProfit: {
        lt: 0
      }
    },
    include: {
      lineItems: true,
      customer: true
    },
    take: 5,
    orderBy: {
      grossProfit: 'asc'
    }
  });

  console.log(`Found ${negativeProfitInvoices.length} invoices with negative profit (showing top 5 worst).`);

  for (const invoice of negativeProfitInvoices) {
    console.log(`\nInvoice: ${invoice.invoiceNumber} (Site: ${invoice.storeId})`);
    console.log(`Customer: ${invoice.customer?.name}`);
    console.log(`Date: ${invoice.invoiceDate}`);
    console.log(`Total: ${invoice.totalAmount}, Cost: ${invoice.totalCost}, Profit: ${invoice.grossProfit}`);
    console.log('Line Items:');
    
    for (const item of invoice.lineItems) {
      console.log(`  - [${item.productCode}] ${item.description}`);
      console.log(`    Qty: ${item.quantity}`);
      console.log(`    Unit Price: ${item.lineTotal.div(item.quantity)}, Cost: ${item.costPrice}`);
      console.log(`    Line Total: ${item.lineTotal}, Parts Cost: ${item.partsCost}, Labor Cost: ${item.laborCost}`);
      console.log(`    Profit: ${item.grossProfit}, Margin: ${item.grossProfitMargin}%`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
