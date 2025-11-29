
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.tireMasterProduct.findMany({
    where: {
      isTire: true,
      quality: { in: ['PREMIUM', 'STANDARD', 'ECONOMY'] }
    },
    take: 5,
    select: {
      id: true,
      tireMasterSku: true,
      description: true,
      brand: true,
      quality: true
    }
  });
  console.log('Filtered Products:', products);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
