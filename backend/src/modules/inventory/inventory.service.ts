import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TireType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalProducts = await this.prisma.tireMasterProduct.count({
      where: { isActive: true }
    });

    const inventoryStats = await this.prisma.tireMasterInventory.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        quantity: { gt: 0 }
      }
    });

    const locations = await this.prisma.tireMasterLocation.findMany({
      where: { isActive: true },
      select: { id: true, name: true, tireMasterCode: true }
    });

    return {
      totalProducts,
      totalQuantity: inventoryStats._sum.quantity || 0,
      locationsCount: locations.length
    };
  }

  async getInventory(params: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    type?: string;
  }) {
    const { page = 1, limit = 50, search, locationId, type } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TireMasterProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { tireMasterSku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { size: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type && Object.values(TireType).includes(type as TireType)) {
      where.type = type as TireType;
    }

    const [items, total] = await Promise.all([
      this.prisma.tireMasterProduct.findMany({
        where,
        include: {
          inventory: {
            where: locationId ? { locationId } : undefined,
            include: {
              location: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { tireMasterSku: 'asc' }
      }),
      this.prisma.tireMasterProduct.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getLocations() {
    return this.prisma.tireMasterLocation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }
}
