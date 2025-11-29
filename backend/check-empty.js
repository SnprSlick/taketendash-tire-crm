
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const countEmpty = await prisma.tireMasterProduct.count({
    where: { description: '' }
  });
  console.log('Count with empty description:', countEmpty);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
