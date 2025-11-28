
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing stores...');

  // 1. Rename Store 3
  const store3 = await prisma.store.findUnique({ where: { code: '3' } });
  if (store3) {
    console.log('Renaming Store 3 to Tulsa West...');
    await prisma.store.update({
      where: { code: '3' },
      data: { name: 'Tulsa West' }
    });
  } else {
    console.log('Store 3 not found.');
  }

  // 2. Check and delete Store 101 and 102 if empty
  const codes = ['101', '102'];
  for (const code of codes) {
    const store = await prisma.store.findUnique({
      where: { code },
      include: { employees: true }
    });

    if (store) {
      if (store.employees.length === 0) {
        console.log(`Deleting empty Store ${code}...`);
        await prisma.store.delete({ where: { code } });
      } else {
        console.log(`Store ${code} has ${store.employees.length} employees. NOT deleting.`);
        store.employees.forEach(e => console.log(` - ${e.firstName} ${e.lastName}`));
      }
    } else {
      console.log(`Store ${code} not found.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
