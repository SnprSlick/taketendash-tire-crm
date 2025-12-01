
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin', 10);
    
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: { 
        password: hashedPassword,
        isApproved: true,
        mustChangePassword: true
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        role: 'ADMINISTRATOR',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@taketentire.com',
        isApproved: true,
        mustChangePassword: true
      }
    });

    console.log('Admin user reset/created:', admin.username);
    console.log('Password set to: admin');
    
  } catch (error) {
    console.error('Error resetting admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
