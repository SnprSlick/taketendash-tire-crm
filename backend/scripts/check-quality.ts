import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.tireMasterProduct.groupBy({
    by: ['quality'],
    _count: {
      id: true
    }
  });

  console.log('Quality counts:', counts);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());