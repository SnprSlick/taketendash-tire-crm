
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLabor() {
  try {
    const labor = await prisma.mechanicLabor.findFirst();
    console.log('Sample MechanicLabor:', labor);

    if (labor) {
        const invoice = await prisma.invoice.findUnique({
            where: { invoiceNumber: labor.invoiceNumber }
        });
        console.log('Matching Invoice:', invoice);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkLabor();
