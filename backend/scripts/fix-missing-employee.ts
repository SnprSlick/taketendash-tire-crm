
import { PrismaClient, EmployeeRole, CustomerStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const firstName = 'CHRISTOPHER';
  const lastName = 'HAUGEN';
  const fullName = `${firstName} ${lastName}`;

  console.log(`Fixing missing employee: ${fullName}`);

  // 1. Create Employee
  const employeeId = `EMP-${firstName.substring(0,1)}${lastName.substring(0,8)}`.toUpperCase();
  
  console.log(`Creating employee with ID: ${employeeId}`);

  const employee = await prisma.employee.create({
    data: {
      firstName,
      lastName,
      employeeId,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@placeholder.com`,
      role: EmployeeRole.TECHNICIAN,
      isMechanic: true,
      status: CustomerStatus.ACTIVE,
      hireDate: new Date(),
    }
  });

  console.log(`Created Employee: ${employee.id}`);

  // 2. Find Stores from Labor Records
  const laborRecords = await prisma.mechanicLabor.findMany({
    where: { mechanicName: fullName },
    select: { invoiceNumber: true }
  });

  const storeCodes = new Set<string>();
  for (const record of laborRecords) {
    const match = record.invoiceNumber.match(/^(\d+)/);
    if (match) {
      storeCodes.add(match[1]);
    }
  }

  console.log(`Found stores: ${Array.from(storeCodes).join(', ')}`);

  // 3. Assign Stores
  for (const code of storeCodes) {
    let store = await prisma.store.findUnique({ where: { code } });
    
    if (!store) {
      console.log(`Creating missing store: ${code}`);
      store = await prisma.store.create({
        data: { code, name: `Store ${code}` }
      });
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        stores: {
          connect: { id: store.id }
        }
      }
    });
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
