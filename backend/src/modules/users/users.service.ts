import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ 
      where: { email },
      include: { stores: true, employee: true }
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ 
      where: { id },
      include: { stores: true, employee: true }
    });
  }

  async create(data: any): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const createData: Prisma.UserCreateInput = {
      username: data.username,
      password: hashedPassword,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      scopes: data.scopes,
      isApproved: data.isApproved,
      stores: data.stores ? {
        connect: data.stores.map((id: string) => ({ id }))
      } : undefined,
      employee: data.employeeId ? {
        connect: { id: data.employeeId }
      } : undefined
    };

    return this.prisma.user.create({
      data: createData,
    });
  }

  async update(id: string, data: any): Promise<User> {
    if (data.password && typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updateData: Prisma.UserUpdateInput = {
      ...data,
      stores: data.stores ? {
        set: data.stores.map((id: string) => ({ id }))
      } : undefined,
      employee: data.employeeId ? {
        connect: { id: data.employeeId }
      } : data.employeeId === null ? {
        disconnect: true
      } : undefined
    };
    
    // Remove fields that shouldn't be in updateData directly if they were processed
    delete (updateData as any).employeeId;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async searchEmployees(query: string): Promise<any[]> {
    return this.prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { employeeId: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        role: true
      }
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
