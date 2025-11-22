const { PrismaClient } = require('@prisma/client')

async function checkDatabase() {
  const prisma = new PrismaClient()

  try {
    console.log('=== Database Table Counts ===')

    const invoiceCount = await prisma.invoice.count()
    console.log('Invoices:', invoiceCount)

    const customerCount = await prisma.invoiceCustomer.count()
    console.log('Customers:', customerCount)

    const lineItemCount = await prisma.invoiceLineItem.count()
    console.log('Line Items:', lineItemCount)

    const batchCount = await prisma.importBatch.count()
    console.log('Import Batches:', batchCount)

    if (invoiceCount > 0) {
      console.log('\n=== Sample Invoice Data ===')
      const samples = await prisma.invoice.findMany({
        take: 3,
        include: {
          customer: true,
          lineItems: true
        }
      })
      samples.forEach((invoice, i) => {
        console.log(`Invoice ${i+1}: #${invoice.invoiceNumber}, Customer: ${invoice.customer.name}, Items: ${invoice.lineItems.length}`)
      })
    }

    if (batchCount > 0) {
      console.log('\n=== Recent Import Batches ===')
      const batches = await prisma.importBatch.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' }
      })
      batches.forEach(batch => {
        console.log(`Batch: ${batch.fileName} - Status: ${batch.status} - Records: ${batch.successfulRecords}/${batch.totalRecords}`)
      })
    }

  } catch (error) {
    console.error('Database check failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()