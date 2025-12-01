const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing search logic for "Justin"...');
    const searchLogicResults = await prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Justin', mode: 'insensitive' } },
          { lastName: { contains: 'Justin', mode: 'insensitive' } },
          { employeeId: { contains: 'Justin', mode: 'insensitive' } }
        ]
      },
      take: 5
    });
    console.log('Search logic results:', JSON.stringify(searchLogicResults, null, 2));
    
    console.log('Testing search logic for "JUSTIN"...');
    const searchLogicResultsUpper = await prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: 'JUSTIN', mode: 'insensitive' } },
          { lastName: { contains: 'JUSTIN', mode: 'insensitive' } },
          { employeeId: { contains: 'JUSTIN', mode: 'insensitive' } }
        ]
      },
      take: 5
    });
    console.log('Search logic results (UPPER):', JSON.stringify(searchLogicResultsUpper, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
