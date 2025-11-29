
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.tireMasterProduct.groupBy({
    by: ['type'],
    _count: {
      type: true
    }
  });
  console.log('Distinct Types:', types);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
