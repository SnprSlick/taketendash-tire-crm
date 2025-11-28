import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.tireMasterProduct.groupBy({
    by: ['brand'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });

  console.log('Unique Brands and counts:');
  brands.forEach(b => console.log(`${b.brand}: ${b._count.id}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());