
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.employee.count();
    console.log(`Total employees: ${count}`);

    const sample = await prisma.employee.findMany({ take: 5 });
    console.log('Sample employees:', JSON.stringify(sample, null, 2));

    const searchTest = await prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Justin', mode: 'insensitive' } },
          { lastName: { contains: 'Weiland', mode: 'insensitive' } }
        ]
      }
    });
    console.log('Search test for "Justin Weiland":', JSON.stringify(searchTest, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
