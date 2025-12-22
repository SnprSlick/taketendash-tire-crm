
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (admin) {
      console.log('Admin user found:', admin.username);
      console.log('Role:', admin.role);
      // Verify password 'admin123'
      const isMatch = await bcrypt.compare('admin123', admin.password);
      console.log('Password "admin123" matches:', isMatch);
    } else {
      console.log('Admin user NOT found');
    }
  } catch (error) {
    console.error('Error checking admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
