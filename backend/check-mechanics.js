
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mechanics = await prisma.employee.findMany({
    where: { isMechanic: true },
    select: { firstName: true, lastName: true }
  });
  console.log('Mechanics:', mechanics);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
