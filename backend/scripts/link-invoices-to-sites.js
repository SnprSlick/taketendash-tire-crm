
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkInvoicesToSites() {
  try {
    console.log('Analyzing existing data to link Invoices to Sites...');

    // 1. Find all distinct site numbers from the synced TireMasterSalesOrders
    const distinctSites = await prisma.tireMasterSalesOrder.groupBy({
      by: ['siteNo'],
      where: {
        siteNo: { not: null }
      }
    });

    console.log(`Found ${distinctSites.length} distinct sites in data:`, distinctSites.map(s => s.siteNo));

    // 2. Ensure a Store record exists for each site
    for (const site of distinctSites) {
      const siteCode = site.siteNo.toString();
      const storeName = `Site ${siteCode}`;

      await prisma.store.upsert({
        where: { code: siteCode },
        update: {}, // Don't change name if exists
        create: {
          code: siteCode,
          name: storeName
        }
      });
      console.log(`Ensured Store record for Site ${siteCode}`);
    }

    // 3. Update Invoices to link to the correct Store
    // We use a raw query for performance and to handle the join
    // Note: Prisma maps camelCase to snake_case in DB, but we need to be careful with raw queries.
    // In schema: orderNumber String @db.VarChar(50) -> likely "orderNumber" if not mapped, or "order_number" if mapped by convention?
    // The error said "column tmso.order_number does not exist".
    // Let's check the schema again. It says `orderNumber String`. It does NOT have `@map("order_number")`.
    // So it is likely `orderNumber` (mixed case) in Postgres if created by Prisma without map, OR `ordernumber` (lowercase).
    // Prisma usually uses the property name if no map is provided, but Postgres forces lowercase unless quoted.
    // Let's try quoting it "orderNumber".
    
    const updateCount = await prisma.$executeRaw`
      UPDATE invoices i
      SET store_id = s.id
      FROM tire_master_sales_orders tmso
      JOIN stores s ON s.code = tmso.site_no::text
      WHERE i.invoice_number = tmso."orderNumber"
      AND (i.store_id IS NULL OR i.store_id != s.id)
    `;

    console.log(`Successfully linked ${updateCount} invoices to their respective sites.`);

  } catch (e) {
    console.error('Error linking invoices:', e);
  } finally {
    await prisma.$disconnect();
  }
}

linkInvoicesToSites();
