
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const storeId = undefined;
  const storeFilter = Prisma.sql``;

  const inventoryData = await prisma.$queryRaw`
      WITH SalesHistory AS (
        SELECT
          ili."tire_master_product_id" as product_id,
          i."store_id",
          SUM(ili.quantity) as total_sold,
          MAX(i."invoice_date") as last_sale_date
        FROM "invoice_line_items" ili
        JOIN "invoices" i ON ili."invoice_id" = i.id
        WHERE i."invoice_date" >= NOW() - INTERVAL '90 days'
        GROUP BY ili."tire_master_product_id", i."store_id"
      ),
      Inventory AS (
        SELECT
          tmi."productId" as product_id,
          s.id as store_id,
          s.name as store_name,
          tmi."availableQty" as quantity
        FROM "tire_master_inventory" tmi
        JOIN "tire_master_locations" tml ON tmi."locationId" = tml.id
        JOIN "stores" s ON tml."tireMasterCode" = s.code
      )
      SELECT
        p.id as "productId",
        p.description as "productName",
        p.brand,
        p.pattern,
        p.size,
        p."tireMasterSku" as sku,
        inv.store_id as "storeId",
        inv.store_name as "storeName",
        inv.quantity,
        COALESCE(sh.total_sold, 0) as "soldLast90Days",
        COALESCE(sh.total_sold, 0) / 90.0 as "dailyVelocity",
        sh.last_sale_date as "lastSaleDate"
      FROM "tire_master_products" p
      JOIN Inventory inv ON p.id = inv.product_id
      LEFT JOIN SalesHistory sh ON p.id = sh.product_id AND inv.store_id = sh.store_id
      WHERE p."isTire" = true
      AND p.quality IN ('PREMIUM', 'STANDARD', 'ECONOMY')
      ${storeFilter}
      LIMIT 5
    `;

  console.log('Inventory Data:', inventoryData);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
