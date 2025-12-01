
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.employee.count();
    console.log(`Total employees: ${count}`);

    if (count > 0) {
      const employees = await prisma.employee.findMany({
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          role: true
        }
      });
      console.log('Sample employees:', JSON.stringify(employees, null, 2));
    } else {
      console.log('No employees found in the database.');
    }
  } catch (error) {
    console.error('Error querying employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
