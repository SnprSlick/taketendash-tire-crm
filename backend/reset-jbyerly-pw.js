
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  const hashedPassword = await bcrypt.hash('password123', 12);
  await prisma.user.update({
    where: { username: 'jbyerlytest' },
    data: { password: hashedPassword }
  });
  console.log('Password reset for jbyerlytest');
}

resetPassword()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
