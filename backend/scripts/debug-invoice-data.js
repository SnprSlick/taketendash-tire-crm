
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking Invoice Data...');
    
    // 1. Check total count
    const count = await prisma.invoice.count();
    console.log(`Total Invoices: ${count}`);

    if (count === 0) {
      console.log('No invoices found.');
      return;
    }

    // 2. Check sums
    const aggregates = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
        grossProfit: true
      }
    });
    console.log('Aggregates (All Time):', aggregates._sum);

    // 3. Check a sample invoice from Dec 2025
    const sample = await prisma.invoice.findFirst({
      where: {
        invoiceDate: {
          gte: new Date('2025-12-01'),
          lte: new Date('2025-12-31')
        }
      },
      include: { lineItems: true }
    });
    
    if (sample) {
      console.log('\nSample Invoice (Dec 2025):');
      console.log(`ID: ${sample.id}`);
      console.log(`Number: ${sample.invoiceNumber}`);
      console.log(`Date: ${sample.invoiceDate}`);
      console.log(`Total Amount (Header): ${sample.totalAmount}`);
      console.log(`Gross Profit (Header): ${sample.grossProfit}`);
      console.log(`Status: ${sample.status}`);
      console.log(`Store ID: ${sample.storeId}`);
      
      const lineItemsTotal = sample.lineItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
      console.log(`Sum of Line Items: ${lineItemsTotal}`);
      console.log('Line Items:', sample.lineItems.map(i => ({ desc: i.description, total: i.lineTotal, cost: i.costPrice, gp: i.grossProfit })));
    } else {
      console.log('\nNo invoices found in Dec 2025.');
    }

    // 4. Check Aggregates for Dec 2025 with Status ACTIVE
    const aggregatesDec = await prisma.invoice.aggregate({
      where: {
        invoiceDate: {
          gte: new Date('2025-12-01'),
          lte: new Date('2025-12-31')
        },
        status: 'ACTIVE'
      },
      _sum: {
        totalAmount: true,
        grossProfit: true
      },
      _count: {
        id: true
      }
    });
    console.log('\nAggregates (Dec 2025, ACTIVE):', aggregatesDec);
    
    // 6. Check Zero vs Non-Zero Totals for Dec 2025
    const zeroTotalCount = await prisma.invoice.count({
      where: {
        invoiceDate: {
          gte: new Date('2025-12-01'),
          lte: new Date('2025-12-31')
        },
        totalAmount: 0
      }
    });

    const nonZeroTotalCount = await prisma.invoice.count({
      where: {
        invoiceDate: {
          gte: new Date('2025-12-01'),
          lte: new Date('2025-12-31')
        },
        totalAmount: { gt: 0 }
      }
    });

    console.log(`\nDec 2025 Invoices:`);
    console.log(`Zero Total: ${zeroTotalCount}`);
    console.log(`Non-Zero Total: ${nonZeroTotalCount}`);

    if (nonZeroTotalCount > 0) {
       const sampleNonZero = await prisma.invoice.findFirst({
         where: {
           invoiceDate: {
             gte: new Date('2025-12-01'),
             lte: new Date('2025-12-31')
           },
           totalAmount: { gt: 0 }
         }
       });
       console.log(`\nSample Non-Zero Invoice: ${sampleNonZero.invoiceNumber} - $${sampleNonZero.totalAmount}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
