
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling isMechanic based on Role...');

  // Update all TECHNICIAN to isMechanic = true
  const result = await prisma.employee.updateMany({
    where: {
      role: 'TECHNICIAN'
    },
    data: {
      isMechanic: true
    }
  });

  console.log(`Updated ${result.count} employees from TECHNICIAN to isMechanic=true`);

  // Verify
  const mechanics = await prisma.employee.count({ where: { isMechanic: true } });
  console.log(`New count of isMechanic=true: ${mechanics}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
