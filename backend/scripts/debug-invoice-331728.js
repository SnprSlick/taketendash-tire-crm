
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugInvoice() {
  try {
    const invoiceNum = '3-331728';
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
      console.log(`Total: ${invoice.totalAmount}`);
      console.log(`Subtotal: ${invoice.subtotal}`);
      console.log(`Tax: ${invoice.taxAmount}`);
      
      console.log('\n--- Line Items ---');
      invoice.lineItems.forEach(item => {
        console.log(`[${item.lineNumber}] ${item.productCode}: ${item.description}`);
        console.log(`    Qty: ${item.quantity}`);
        console.log(`    Line Total: ${item.lineTotal}`);
        console.log(`    Unit Cost (costPrice): ${item.costPrice}`);
        console.log(`    Parts Cost: ${item.partsCost}`);
        console.log(`    Labor Cost: ${item.laborCost}`);
        console.log(`    Gross Profit: ${item.grossProfit}`);
        console.log(`    Calculated Unit Price (Total/Qty): ${Number(item.lineTotal) / Number(item.quantity)}`);
      });
    }

    // 2. Check TireMasterSalesOrder (Raw Sync Data)
    const tmOrder = await prisma.tireMasterSalesOrder.findUnique({
      where: { tireMasterCode: invoiceNum },
      include: { items: true }
    });

    if (tmOrder) {
      console.log('\n--- TireMaster Sales Order (Sync Data) ---');
      console.log(`Total: ${tmOrder.totalAmount}`);
      console.log(`Items Count: ${tmOrder.items.length}`);
      tmOrder.items.forEach(item => {
        console.log(`[${item.lineNumber}] ProductID ${item.productId}: Qty ${item.quantity}`);
        console.log(`    Total Amount: ${item.totalAmount}`);
        console.log(`    Unit Price (stored): ${item.unitPrice}`);
      });
    } else {
      console.log('\nNo TireMasterSalesOrder found.');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debugInvoice();
