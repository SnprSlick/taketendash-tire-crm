
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking Mechanic Labor count...');
    const laborCount = await prisma.mechanicLabor.count();
    console.log(`Total Mechanic Labor records: ${laborCount}`);

    console.log('Checking Invoice count...');
    const invoiceCount = await prisma.invoice.count();
    console.log(`Total Invoice records: ${invoiceCount}`);

    console.log('Checking Stores...');
    const stores = await prisma.store.findMany();
    console.log('Stores:', stores.map(s => ({ id: s.id, name: s.name, code: s.code })));

    if (stores.length === 0) {
        console.log('No stores found!');
        return;
    }

    const storeId = stores[0].id;
    console.log(`Testing filter with Store ID: ${storeId} (${stores[0].name})`);

    // Check join without filter
    const joinCheck = await prisma.$queryRaw`
      SELECT 
        COUNT(ml.id) as "total",
        COUNT(i.id) as "matched"
      FROM mechanic_labor ml
      LEFT JOIN invoices i ON ml.invoice_number = i.invoice_number
    `;
    console.log('Join stats (Total vs Matched with Invoices):', joinCheck);

    // Check join with filter
    const filteredCheck = await prisma.$queryRaw`
      SELECT 
        COUNT(ml.id) as "count"
      FROM mechanic_labor ml
      LEFT JOIN invoices i ON ml.invoice_number = i.invoice_number
      WHERE i.store_id = ${storeId}
    `;
    console.log(`Records matching store ${stores[0].name}:`, filteredCheck);

    // Check store_id distribution in invoices
    const storeDist = await prisma.$queryRaw`
      SELECT store_id, COUNT(*) as count
      FROM invoices
      GROUP BY store_id
    `;
    console.log('Invoice Store Distribution:', storeDist);

    // Check if mechanic_labor joins to invoices with store_id
    const laborStoreDist = await prisma.$queryRaw`
      SELECT i.store_id, COUNT(ml.id) as count
      FROM mechanic_labor ml
      LEFT JOIN invoices i ON ml.invoice_number = i.invoice_number
      GROUP BY i.store_id
    `;
    console.log('Mechanic Labor Store Distribution:', laborStoreDist);


  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
