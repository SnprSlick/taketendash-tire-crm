const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('ReconciliationBatch:', prisma.reconciliationBatch);
console.log('Keys:', Object.keys(prisma));
