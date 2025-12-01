import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async approveUser(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  async assignRole(id: string, role: string, scopes: string[]): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role, scopes },
    });
  }

  async assignStores(id: string, storeIds: string[]): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        stores: {
          set: storeIds.map(storeId => ({ id: storeId }))
        }
      },
      include: { stores: true }
    });
  }

  async resetPassword(id: string): Promise<{ tempPassword: string }> {
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    await this.prisma.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        mustChangePassword: true 
      },
    });

    return { tempPassword };
  }

  async bulkApprove(ids: string[]): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { isApproved: true },
    });
  }

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    
    const isValid = await bcrypt.compare(oldPass, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid old password');

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        mustChangePassword: false 
      }
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        stores: true,
        employee: true
      }
    });
  }
}
