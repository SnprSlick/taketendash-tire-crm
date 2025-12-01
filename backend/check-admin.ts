
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    console.log('Admin user found:', admin);

    if (admin) {
      const isMatch = await bcrypt.compare('admin', admin.password);
      console.log('Password "admin" matches:', isMatch);
    }
  } catch (error) {
    console.error('Error checking admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
