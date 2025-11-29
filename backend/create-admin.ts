import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ROLES, SCOPES } from './src/auth/constants';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'admin';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
        password: hashedPassword,
        role: ROLES.ADMINISTRATOR,
        scopes: [SCOPES.ALL],
        isApproved: true,
    },
    create: {
      username,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: ROLES.ADMINISTRATOR,
      scopes: [SCOPES.ALL],
      isApproved: true,
      mustChangePassword: true,
    },
  });

  console.log('Admin user created/updated:', { id: user.id, username: user.username, role: user.role });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
