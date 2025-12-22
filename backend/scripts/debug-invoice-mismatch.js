
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugInvoice() {
  try {
    const invoiceNum = '331202';
    console.log(`Debugging Invoice ${invoiceNum}...`);

    // 1. Check Invoice Record
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: invoiceNum },
      include: { 
        lineItems: true,
        store: true,
        customer: true
      }
    });

    if (!invoice) {
      console.log('Invoice not found in DB.');
    } else {
      console.log('\n--- Invoice Header ---');
      console.log(`ID: ${invoice.id}`);
      console.log(`Number: ${invoice.invoiceNumber}`);
      console.log(`Date: ${invoice.invoiceDate}`);
      console.log(`Salesperson: ${invoice.salesperson}`);
      console.log(`Store: ${invoice.store?.name} (${invoice.storeId})`);
      console.log(`Total: ${invoice.totalAmount}`);
      
      console.log('\n--- Line Items ---');
      invoice.lineItems.forEach(item => {
        console.log(`[${item.lineNumber}] ${item.productCode}: ${item.description} (Qty: ${item.quantity}, Total: ${item.lineTotal})`);
      });
    }

    // 2. Check TireMasterSalesOrder (Raw Sync Data)
    // We might have overwritten it if there are multiple, but let's see what's there.
    const tmOrder = await prisma.tireMasterSalesOrder.findUnique({
      where: { tireMasterCode: invoiceNum },
      include: { items: true }
    });

    if (tmOrder) {
      console.log('\n--- TireMaster Sales Order (Sync Data) ---');
      console.log(`Site No: ${tmOrder.siteNo}`);
      console.log(`Order Date: ${tmOrder.orderDate}`);
      console.log(`Items Count: ${tmOrder.items.length}`);
      tmOrder.items.forEach(item => {
        console.log(`[${item.lineNumber}] ProductID ${item.productId}: Qty ${item.quantity} = ${item.totalAmount}`);
      });
    } else {
      console.log('\nNo TireMasterSalesOrder found.');
    }

    // 3. Check for potential duplicates in TireMasterSalesOrder if we query by orderNumber instead of unique code
    // (Though schema enforces unique tireMasterCode, maybe we are mapping it wrong?)
    const potentialDupes = await prisma.tireMasterSalesOrder.findMany({
      where: { orderNumber: invoiceNum }
    });
    console.log(`\nRecords with orderNumber ${invoiceNum}: ${potentialDupes.length}`);
    potentialDupes.forEach(d => console.log(`- ID: ${d.id}, Site: ${d.siteNo}, Code: ${d.tireMasterCode}`));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debugInvoice();
