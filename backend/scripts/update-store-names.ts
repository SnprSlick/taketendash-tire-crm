import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { code: '2', name: 'Ponca City' },
    { code: '3', name: 'Tulsa West' },
    { code: '4', name: 'OKC' },
    { code: '5', name: 'Kansas City' },
    { code: '6', name: 'Tulsa East' },
    { code: '7', name: 'Fort Smith' },
  ];

  console.log('Updating store names...');

  for (const update of updates) {
    const store = await prisma.store.findUnique({
      where: { code: update.code },
    });

    if (store) {
      await prisma.store.update({
        where: { code: update.code },
        data: { name: update.name },
      });
      console.log(`✅ Updated Store ${update.code} to "${update.name}"`);
    } else {
      await prisma.store.create({
        data: {
          code: update.code,
          name: update.name,
        },
      });
      console.log(`✨ Created Store ${update.code} as "${update.name}"`);
    }
  }
  
  // Pre-create Stillwater store for 2026
  const stillwaterCode = '5-SW';
  const stillwaterName = 'Stillwater';
  
  const stillwater = await prisma.store.findUnique({
      where: { code: stillwaterCode },
  });
  
  if (!stillwater) {
      await prisma.store.create({
          data: {
              code: stillwaterCode,
              name: stillwaterName
          }
      });
      console.log(`✨ Created Future Store ${stillwaterCode} as "${stillwaterName}"`);
  } else {
      console.log(`ℹ️ Store ${stillwaterCode} already exists`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
