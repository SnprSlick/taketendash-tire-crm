
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'password'; // Default password
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Creating admin user...`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
      mustChangePassword: false,
    },
    create: {
      username,
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
      mustChangePassword: false,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
    },
  });

  console.log(`Admin user created/updated: ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
