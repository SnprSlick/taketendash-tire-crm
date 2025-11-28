
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting mechanic store assignment...');

  // 1. Get all mechanic labor records
  const laborRecords = await prisma.mechanicLabor.findMany({
    select: {
      mechanicName: true,
      invoiceNumber: true,
    },
  });

  console.log(`Found ${laborRecords.length} labor records.`);

  // 2. Group invoices by mechanic
  const mechanicInvoices: Record<string, Set<string>> = {};
  
  for (const record of laborRecords) {
    if (!mechanicInvoices[record.mechanicName]) {
      mechanicInvoices[record.mechanicName] = new Set();
    }
    mechanicInvoices[record.mechanicName].add(record.invoiceNumber);
  }

  // 3. Process each mechanic
  for (const [mechanicName, invoices] of Object.entries(mechanicInvoices)) {
    console.log(`Processing ${mechanicName}...`);

    // Find the employee
    // Try exact match first, then case-insensitive
    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
            { firstName: { equals: mechanicName.split(' ')[0], mode: 'insensitive' }, lastName: { equals: mechanicName.split(' ').slice(1).join(' '), mode: 'insensitive' } },
            // Also try constructing full name for check if needed, but split is safer
        ]
      }
    });

    // If not found by split name, try to find by concatenating (fuzzy match logic might be needed in real app)
    if (!employee) {
        // Try to find by just matching the name string against firstName + lastName
        // This is tricky in Prisma without raw query, so we'll skip complex matching for now
        // and rely on the fact that import usually standardizes names or we use the same name as in DB
        
        // Let's try to find by "Last, First" if the mechanicName is "First Last" or vice versa
        // But MechanicLabor usually has "First Last" from the import logic
        
        console.log(`  Could not find employee record for ${mechanicName}, skipping store assignment.`);
        continue;
    }

    // Extract store codes from invoices
    const storeCodes = new Set<string>();
    for (const invoice of invoices) {
      // Rule: "The first # is the store id number"
      // Assuming format "X-YYYYY" or just "X"
      const match = invoice.match(/^(\d+)/);
      if (match) {
        storeCodes.add(match[1]);
      }
    }

    if (storeCodes.size === 0) {
        console.log(`  No valid store codes found in invoices for ${mechanicName}.`);
        continue;
    }

    console.log(`  Found stores: ${Array.from(storeCodes).join(', ')}`);

    // Link to stores
    for (const code of storeCodes) {
      // Find or create store
      let store = await prisma.store.findUnique({
        where: { code },
      });

      if (!store) {
        console.log(`  Creating new store: ${code}`);
        store = await prisma.store.create({
          data: {
            code,
            name: `Store ${code}`, // Placeholder name
          },
        });
      }

      // Connect employee to store
      // Check if already connected to avoid unnecessary writes? 
      // Prisma connect is idempotent if we use connect on update, but let's just do it.
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          stores: {
            connect: { id: store.id }
          }
        }
      });
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
