const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const record = await prisma.reconciliationRecord.findFirst({
    where: { invoiceNumber: '3-GS321705' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(record);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
