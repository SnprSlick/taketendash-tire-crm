const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking Prisma Client...');
  if (prisma.store) {
    console.log('prisma.store exists!');
    const count = await prisma.store.count();
    console.log('Store count:', count);
  } else {
    console.log('prisma.store DOES NOT exist!');
    console.log('Keys:', Object.keys(prisma));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
