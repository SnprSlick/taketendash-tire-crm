
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.tireMasterProduct.findMany({
    take: 5,
    select: {
      id: true,
      tireMasterSku: true,
      description: true,
      brand: true
    }
  });
  console.log('Products:', products);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
