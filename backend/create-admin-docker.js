
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 12);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword,
      role: 'ADMINISTRATOR',
      scopes: ['*'],
      isApproved: true,
      mustChangePassword: true
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMINISTRATOR',
      scopes: ['*'],
      isApproved: true,
      mustChangePassword: true
    }
  });

  console.log('Admin user created/updated:', admin);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
