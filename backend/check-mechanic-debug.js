
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMechanicData() {
  try {
    console.log('Checking user kmckeemech...');
    const user = await prisma.user.findUnique({
      where: { username: 'kmckeemech' },
      include: { employee: true }
    });

    if (!user) {
      console.log('User kmckeemech not found.');
    } else {
      console.log('User found:', user);
      if (user.employee) {
        console.log('Linked Employee:', user.employee);
        const mechanicName = `${user.employee.firstName} ${user.employee.lastName}`;
        console.log('Constructed Mechanic Name:', mechanicName);

        console.log(`Checking mechanic_labor for name: "${mechanicName}"...`);
        const laborCount = await prisma.mechanicLabor.count({
          where: {
            mechanicName: {
              equals: mechanicName,
              mode: 'insensitive'
            }
          }
        });
        console.log(`Found ${laborCount} records for "${mechanicName}"`);

        if (laborCount === 0) {
            console.log('Checking for similar names...');
            const allMechanics = await prisma.mechanicLabor.findMany({
                select: { mechanicName: true },
                distinct: ['mechanicName']
            });
            const similar = allMechanics.filter(m => m.mechanicName.toLowerCase().includes('andrew') || m.mechanicName.toLowerCase().includes('sparks'));
            console.log('Similar names found:', similar.map(m => m.mechanicName));
        }

      } else {
        console.log('User has no linked employee.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMechanicData();
