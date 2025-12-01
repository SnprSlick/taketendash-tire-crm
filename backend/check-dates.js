
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        salesperson: 'JACOB BYERLY'
      },
      select: {
        invoiceDate: true
      },
      orderBy: {
        invoiceDate: 'desc'
      },
      take: 5
    });

    console.log('Invoice Dates:', invoices.map(i => i.invoiceDate));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();
