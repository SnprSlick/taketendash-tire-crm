
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.tireMasterProduct.count({
    where: { description: null }
  });
  console.log('Count with null description:', count);
  
  const countSku = await prisma.tireMasterProduct.count({
    where: { tireMasterSku: null }
  });
  console.log('Count with null SKU:', countSku);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
