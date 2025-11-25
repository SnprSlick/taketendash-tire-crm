import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting store backfill...');

  const invoices = await prisma.invoice.findMany({
    where: {
      storeId: null
    },
    select: {
      id: true,
      invoiceNumber: true
    }
  });

  console.log(`Found ${invoices.length} invoices without store.`);

  const storeMap: Record<string, string> = {
    '3': 'West Tulsa',
  };

  const getStoreName = (code: string) => storeMap[code] || `Store ${code}`;

  let processed = 0;
  let createdStores = new Set<string>();

  for (const invoice of invoices) {
    if (invoice.invoiceNumber && invoice.invoiceNumber.includes('-')) {
      const storeCode = invoice.invoiceNumber.split('-')[0];
      
      // Find or create store
      let store = await prisma.store.findUnique({ where: { code: storeCode } });
      if (!store) {
        store = await prisma.store.create({
          data: {
            code: storeCode,
            name: getStoreName(storeCode)
          }
        });
        console.log(`Created new store: ${store.name} (${storeCode})`);
        createdStores.add(storeCode);
      }

      // Update invoice
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          storeId: store.id
        }
      });
      processed++;
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} invoices...`);
      }
    }
  }

  console.log(`Backfill complete. Processed ${processed} invoices.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
