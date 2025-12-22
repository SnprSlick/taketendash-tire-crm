
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateInvoices() {
  console.log('Searching for "ZZ-VISA/MASTERCARD" customer...');
  const customer = await prisma.invoiceCustomer.findFirst({
    where: {
      name: 'ZZ-VISA/MASTERCARD'
    }
  });

  if (!customer) {
    console.log('Customer "ZZ-VISA/MASTERCARD" not found.');
    return;
  }

  console.log(`Found customer: ${customer.name} (ID: ${customer.id}, Code: ${customer.customerCode})`);

  console.log('\nFetching recent invoices for this customer...');
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: customer.id
    },
    include: {
      lineItems: true
    },
    orderBy: {
      invoiceDate: 'desc'
    },
    take: 10
  });

  console.log(`Found ${invoices.length} recent invoices:`);
  invoices.forEach(inv => {
    console.log(`\nInvoice #${inv.invoiceNumber} - Date: ${inv.invoiceDate.toISOString().split('T')[0]} - Total: ${inv.totalAmount} - LineItems: ${inv.lineItems.length}`);
    console.log('Line Items:');
    if (inv.lineItems.length === 0) {
        console.log('  (No line items found)');
    }
    inv.lineItems.forEach(item => {
      console.log(`  - ${item.description} (Qty: ${item.quantity}, Total: ${item.lineTotal})`);
    });
  });

  // Check Raw Data for the specific invoice 62783
  console.log('\nChecking Raw TireMaster Data for Invoice 62783...');
  const rawOrders = await prisma.tireMasterSalesOrder.findMany({
    where: {
      orderNumber: '62783' // Changed from invoiceNumber to orderNumber
    },
    include: {
      items: true
    }
  });

  if (rawOrders.length === 0) {
      console.log('No raw TireMasterSalesOrder found for 62783.');
  } else {
      rawOrders.forEach(order => {
          console.log(`Raw Order ID: ${order.id} - Site: ${order.siteNo} - Invoice: ${order.invoiceNumber}`);
          console.log(`Item Count: ${order.items.length}`);
          order.items.forEach(item => {
              console.log(`  - SKU: ${item.tireMasterSku}, Desc: ${item.itemDescription}, Qty: ${item.quantity}, Total: ${item.totalAmount}`);
          });
      });
  }
}

investigateInvoices()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
