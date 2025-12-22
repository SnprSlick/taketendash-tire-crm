
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        email: 'admin@taketendash.com',
        firstName: 'Admin',
        lastName: 'User',
      },
    });

    console.log('Admin user reset successfully:', admin.username);
    console.log('Password set to: admin123');
    
  } catch (error) {
    console.error('Error resetting admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
