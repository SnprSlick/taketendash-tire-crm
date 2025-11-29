
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const labor = await prisma.mechanicLabor.findMany({
    where: {
      labor: { gt: 0 }
    },
    take: 10,
  });
  console.log(JSON.stringify(labor, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
