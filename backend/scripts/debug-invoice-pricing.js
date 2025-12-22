
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoice() {
  const invoiceNumber = '3-331202';
  console.log(`Checking invoice ${invoiceNumber}...`);

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: invoiceNumber },
    include: {
      lineItems: true
    }
  });

  if (!invoice) {
    console.log('Invoice not found.');
    return;
  }

  console.log(`Invoice Total: ${invoice.totalAmount}`);
  console.log('Line Items:');
  invoice.lineItems.forEach(item => {
    console.log(`- ${item.description} (${item.productCode}): Qty ${item.quantity} @ ${item.unitPrice} = ${item.lineTotal} (Cost: ${item.costPrice}, Margin: ${item.grossProfitMargin}%)`);
  });
}

checkInvoice()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
