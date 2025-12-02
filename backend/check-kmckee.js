
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const username = 'kmckeemanage';
    console.log(`Checking user: ${username}`);
    
    const user = await prisma.user.findUnique({
      where: { username },
      include: { 
        stores: true,
        employee: true
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      stores: user.stores.map(s => ({ id: s.id, name: s.name })),
      employee: user.employee ? { id: user.employee.id, name: `${user.employee.firstName} ${user.employee.lastName}` } : null
    });

    const allStores = await prisma.store.findMany();
    console.log('Total stores in DB:', allStores.length);
    console.log('All Store IDs:', allStores.map(s => s.id));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
