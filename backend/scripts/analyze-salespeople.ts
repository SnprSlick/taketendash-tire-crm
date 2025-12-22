
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Analyzing Salesperson Performance...');

  // 1. Get all invoices to aggregate manually (avoiding groupBy TS issues)
  const allInvoices = await prisma.invoice.findMany({
    select: {
      id: true,
      salesperson: true,
      totalAmount: true,
      grossProfit: true, // Using grossProfit instead of totalProfit based on schema
    }
  });

  const salesStats: Record<string, { revenue: number, profit: number, count: number }> = {};

  for (const inv of allInvoices) {
    const sp = inv.salesperson || 'Unknown';
    if (!salesStats[sp]) {
      salesStats[sp] = { revenue: 0, profit: 0, count: 0 };
    }
    salesStats[sp].revenue += Number(inv.totalAmount || 0);
    salesStats[sp].profit += Number(inv.grossProfit || 0);
    salesStats[sp].count += 1;
  }

  // Convert to array and sort
  const sortedSalespeople = Object.entries(salesStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);

  console.log('\nTop 20 Salespeople by Revenue:');
  console.log('--------------------------------------------------------------------------------');
  console.log('| Name                 | Revenue      | Profit       | Invoices | Avg Inv Val |');
  console.log('--------------------------------------------------------------------------------');

  for (const person of sortedSalespeople.slice(0, 20)) {
    const avg = person.count > 0 ? person.revenue / person.count : 0;
    console.log(
      `| ${person.name.padEnd(20).slice(0, 20)} | $${person.revenue.toFixed(2).padStart(11)} | $${person.profit.toFixed(2).padStart(11)} | ${person.count.toString().padStart(8)} | $${avg.toFixed(2).padStart(10)} |`
    );
  }

  // 2. Deep dive into specific suspicious salespeople vs Nick Bennett
  const targets = [
    'JAMES MATHERS',
    'DARLA KAY TARRANT',
    'KALEE GILBERT',
    'STEVE WITZKE',
    'EMILY R ISRAEL',
    'ELI STEWARD',
    'NICK BENNETT'
  ];

  console.log('\n\nDeep Dive into Specific Salespeople:');
  
  for (const target of targets) {
    // Find exact name match from the list above (case insensitive search might be needed if names vary)
    
    const invoices = await prisma.invoice.findMany({
      where: {
        salesperson: {
          contains: target,
          mode: 'insensitive'
        }
      },
      include: {
        customer: true,
        lineItems: {
            take: 3
        }
      },
      orderBy: {
        totalAmount: 'desc'
      },
      take: 5
    });

    if (invoices.length === 0) {
        console.log(`\nNo invoices found for ${target}`);
        continue;
    }

    const actualName = invoices[0].salesperson;
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`ANALYSIS: ${actualName} (Target: ${target})`);
    console.log(`--------------------------------------------------------------------------------`);

    // Check customer distribution
    // We can't use groupBy easily with relations in Prisma, so let's fetch and aggregate
    const spInvoices = await prisma.invoice.findMany({
        where: { salesperson: actualName },
        select: {
            customer: {
                select: { name: true }
            },
            totalAmount: true
        }
    });

    const custStats: Record<string, { count: number, revenue: number }> = {};
    for (const inv of spInvoices) {
        const cName = inv.customer.name;
        if (!custStats[cName]) custStats[cName] = { count: 0, revenue: 0 };
        custStats[cName].count++;
        custStats[cName].revenue += Number(inv.totalAmount || 0);
    }

    const sortedCusts = Object.entries(custStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);

    console.log('Top 5 Customers by Revenue:');
    sortedCusts.forEach(([cName, stats]) => {
        console.log(`  - ${cName}: ${stats.count} invoices, $${stats.revenue.toFixed(2)}`);
    });

    console.log('\nTop 5 Invoices:');
    invoices.forEach(inv => {
        console.log(`  Inv #${inv.invoiceNumber} (${inv.invoiceDate.toISOString().split('T')[0]}): $${Number(inv.totalAmount).toFixed(2)} - Cust: ${inv.customer.name}`);
        console.log(`    Items: ${inv.lineItems.map(i => `${Number(i.quantity)}x ${i.description} ($${Number(i.lineTotal)})`).join(', ')}...`);
    });
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
