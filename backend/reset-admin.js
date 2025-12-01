
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 12);
  await prisma.user.update({
    where: { username: 'admin' },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
    },
  });
  console.log('Admin password reset to "admin"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
