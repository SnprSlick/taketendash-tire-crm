
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.mechanicLabor.findMany({
    where: {
      labor: { gt: 0 }
    },
    take: 20,
  });
  console.log('Labor records:', records.map(r => ({
    cat: r.category,
    qty: r.quantity,
    labor: r.labor,
    desc: r.productCode
  })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
