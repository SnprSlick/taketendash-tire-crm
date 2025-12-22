
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAndLink() {
  try {
    console.log('Seeding Stores...');
    
    const sites = [1, 2, 3, 4, 5, 6, 7];
    
    for (const siteNo of sites) {
      const code = siteNo.toString();
      const name = `Store ${siteNo}`;
      
      const store = await prisma.store.upsert({
        where: { code: code },
        update: {},
        create: {
          code: code,
          name: name
        }
      });
      console.log(`Ensured Store: ${store.name} (${store.id})`);
    }

    console.log('\nLinking Invoices to Stores...');
    
    // We need to link Invoice -> Store based on TireMasterSalesOrder -> siteNo
    // Since Invoice.invoiceNumber == TireMasterSalesOrder.orderNumber (mostly)
    
    // Fetch all TM Sales Orders with siteNo
    // This might be too large for memory, so let's do it in batches or use raw query
    
    // Raw query to update Invoice table from TireMasterSalesOrder
    // Assuming invoiceNumber matches orderNumber
    
    const updateCount = await prisma.$executeRaw`
      UPDATE invoices i
      SET store_id = s.id
      FROM tire_master_sales_orders tmso
      JOIN stores s ON s.code = tmso.site_no::text
      WHERE i.invoice_number = tmso.order_number
      AND i.store_id IS NULL
    `;
    
    console.log(`Updated ${updateCount} invoices with Store ID.`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

seedAndLink();
