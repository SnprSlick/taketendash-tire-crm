
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.mechanicLabor.groupBy({
    by: ['category'],
    _count: true,
  });
  
  const laborCategories = categories.filter(c => 
    /labor|service|repair|install|mount|balance|align|shop/i.test(c.category)
  );
  
  console.log('Labor Categories:', laborCategories);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
