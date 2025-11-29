
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    where: {
      firstName: { equals: 'Adam', mode: 'insensitive' },
      lastName: { equals: 'Cherry', mode: 'insensitive' }
    }
  });
  console.log('Employee:', employee);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
