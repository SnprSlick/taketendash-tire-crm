
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const technicians = await prisma.employee.findMany({
      where: { role: 'TECHNICIAN' }
    });
    console.log(`Employees with role TECHNICIAN: ${technicians.length}`);

    const mechanics = await prisma.employee.findMany({
      where: { isMechanic: true }
    });
    console.log(`Employees with isMechanic=true: ${mechanics.length}`);

    const serviceRecords = await prisma.serviceRecord.count();
    console.log(`Total ServiceRecords: ${serviceRecords}`);

    const mechanicLabor = await prisma.mechanicLabor.count();
    console.log(`Total MechanicLabor records: ${mechanicLabor}`);

    if (mechanics.length > 0) {
        const firstMech = mechanics[0];
        console.log(`First mechanic: ${firstMech.firstName} ${firstMech.lastName} (ID: ${firstMech.id})`);
        
        const records = await prisma.serviceRecord.findMany({
            where: { employeeId: firstMech.id }
        });
        console.log(`ServiceRecords for first mechanic: ${records.length}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
