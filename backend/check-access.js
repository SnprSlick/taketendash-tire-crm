
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking data for JACOB BYERLY...');

    // 1. Find invoices for JACOB BYERLY
    const invoices = await prisma.invoice.findMany({
      where: {
        salesperson: {
          equals: 'JACOB BYERLY',
          mode: 'insensitive' // Check case insensitivity
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        storeId: true,
        salesperson: true
      },
      take: 5
    });

    console.log(`Found ${invoices.length} invoices for JACOB BYERLY.`);
    if (invoices.length > 0) {
      console.log('Sample invoices:', invoices);
      const storeIds = [...new Set(invoices.map(i => i.storeId))];
      console.log('Associated Store IDs:', storeIds);

      // 2. Check user jbyerlytest
      const user = await prisma.user.findUnique({
        where: { username: 'jbyerlytest' },
        include: { stores: true }
      });

      if (user) {
        console.log(`User jbyerlytest found. ID: ${user.id}`);
        console.log('Assigned Stores:', user.stores.map(s => s.id));

        // Check overlap
        const hasAccess = user.stores.some(s => storeIds.includes(s.id));
        console.log(`User has access to required stores: ${hasAccess}`);
      } else {
        console.log('User jbyerlytest not found.');
      }
    } else {
      console.log('No invoices found for JACOB BYERLY (case insensitive).');
      
      // Check exact match
      const exactInvoices = await prisma.invoice.findMany({
        where: { salesperson: 'JACOB BYERLY' },
        take: 1
      });
      console.log(`Exact match count: ${exactInvoices.length}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
