
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairZeroTotals() {
  try {
    console.log('Repairing zero totals in Invoices from TireMasterSalesOrders...');

    // Find invoices with 0 total but linked to a TM Sales Order with non-zero total
    const invoicesToRepair = await prisma.$queryRaw`
      SELECT i.id, i.invoice_number, tmso."totalAmount" as tm_total, tmso."taxAmount" as tm_tax
      FROM invoices i
      JOIN tire_master_sales_orders tmso ON i.invoice_number = tmso."orderNumber"
      WHERE i.total_amount = 0
      AND tmso."totalAmount" > 0
    `;

    console.log(`Found ${invoicesToRepair.length} invoices to repair.`);

    let updatedCount = 0;
    for (const inv of invoicesToRepair) {
      const total = Number(inv.tm_total);
      const tax = Number(inv.tm_tax || 0);
      const subtotal = total - tax;

      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          totalAmount: total,
          taxAmount: tax,
          subtotal: subtotal
        }
      });
      updatedCount++;
      if (updatedCount % 100 === 0) process.stdout.write(`\rRepaired ${updatedCount} invoices...`);
    }

    console.log(`\nSuccessfully repaired ${updatedCount} invoices.`);

  } catch (e) {
    console.error('Error repairing totals:', e);
  } finally {
    await prisma.$disconnect();
  }
}

repairZeroTotals();
