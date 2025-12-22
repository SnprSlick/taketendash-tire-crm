import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Live Sync Data...');

  const customers = await prisma.tireMasterCustomer.count();
  console.log(`✅ TireMaster Customers: ${customers}`);

  const products = await prisma.tireMasterProduct.count();
  console.log(`✅ TireMaster Products: ${products}`);

  const invoices = await prisma.tireMasterSalesOrder.count();
  console.log(`✅ TireMaster Invoices: ${invoices}`);

  const items = await prisma.tireMasterSalesOrderItem.count();
  console.log(`✅ TireMaster Invoice Items: ${items}`);

  if (items > 0) {
    const sampleItem = await prisma.tireMasterSalesOrderItem.findFirst({
      include: { product: true, salesOrder: true }
    });
    console.log('\n📄 Sample Invoice Item:', JSON.stringify(sampleItem, null, 2));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
