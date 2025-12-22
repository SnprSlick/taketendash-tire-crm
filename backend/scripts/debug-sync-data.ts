import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Inspecting Database State...');

  // Check for specific customer 1410
  const customerCode = '1410';
  const customer = await prisma.tireMasterCustomer.findUnique({
    where: { tireMasterCode: customerCode }
  });

  if (customer) {
    console.log(`✅ Customer ${customerCode} FOUND:`, customer.id, customer.companyName);
  } else {
    console.log(`❌ Customer ${customerCode} NOT FOUND in DB.`);
  }

  // Check total counts
  const customerCount = await prisma.tireMasterCustomer.count();
  const invoiceCount = await prisma.tireMasterSalesOrder.count();
  const itemCount = await prisma.tireMasterSalesOrderItem.count();

  console.log(`\n📊 Counts:`);
  console.log(`   Customers: ${customerCount}`);
  console.log(`   Invoices:  ${invoiceCount}`);
  console.log(`   Items:     ${itemCount}`);

  // Check for invoices without customers (if any, though schema enforces FK?)
  // Prisma schema: customer TireMasterCustomer @relation(...)
  // So we can't have an invoice without a valid customerId in the DB.
  // The error "Customer ... not found" happened in the service *before* creating the invoice.
  // So the invoice wouldn't be created.

  // List a few customers to see format
  const sampleCustomers = await prisma.tireMasterCustomer.findMany({ take: 5 });
  console.log('\n👤 Sample Customers:', sampleCustomers.map(c => ({ code: c.tireMasterCode, name: c.companyName })));

  // Check a sample product
  const sampleProduct = await prisma.tireMasterProduct.findFirst({
    where: { tireMasterId: { not: undefined } }
  });
  if (sampleProduct) {
    console.log('\n📦 Sample Product:', { 
      id: sampleProduct.id, 
      tmId: sampleProduct.tireMasterId, 
      sku: sampleProduct.tireMasterSku,
      name: sampleProduct.description 
    });
  }

}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
