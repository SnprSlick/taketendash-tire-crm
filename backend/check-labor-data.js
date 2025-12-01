
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking MechanicLabor data...');
    const laborCount = await prisma.mechanicLabor.count();
    console.log(`Total MechanicLabor records: ${laborCount}`);

    if (laborCount > 0) {
      const sampleLabor = await prisma.mechanicLabor.findFirst();
      console.log('Sample MechanicLabor record:', sampleLabor);

      const matchingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNumber: sampleLabor.invoiceNumber }
      });
      console.log('Matching Invoice for sample:', matchingInvoice ? 'Found' : 'Not Found');
      
      if (matchingInvoice) {
          console.log('Matching Invoice Details:', {
              id: matchingInvoice.id,
              invoiceNumber: matchingInvoice.invoiceNumber,
              salesperson: matchingInvoice.salesperson,
              invoiceDate: matchingInvoice.invoiceDate // Added this
          });
      }
    }

    console.log('\nChecking Invoices data...');
    const invoiceCount = await prisma.invoice.count();
    console.log(`Total Invoice records: ${invoiceCount}`);
    
    // Check for a salesperson that definitely exists
    const salesperson = await prisma.invoice.findFirst({
        select: { salesperson: true },
        where: { salesperson: { not: '' } }
    });
    
    if (salesperson) {
        console.log(`\nChecking labor stats for salesperson: ${salesperson.salesperson}`);
        
        const laborStats = await prisma.$queryRaw`
            SELECT 
              i.salesperson,
              SUM(ml.labor) as total_labor,
              SUM(ml.parts) as total_parts
            FROM invoices i
            JOIN mechanic_labor ml ON i.invoice_number = ml.invoice_number
            WHERE i.salesperson = ${salesperson.salesperson}
            GROUP BY i.salesperson
        `;
        console.log('Labor Stats Query Result:', laborStats);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
