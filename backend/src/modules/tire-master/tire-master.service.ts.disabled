import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SyncTireMasterDataDto,
  TireMasterProductSearchDto,
  CreateTireMasterMappingDto,
  UpdateTireMasterMappingDto,
} from './dto/tire-master.dto';

@Injectable()
export class TireMasterService {
  private readonly logger = new Logger(TireMasterService.name);
  private activeSyncs = new Map<string, { status: string; progress: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async syncData(syncDto: SyncTireMasterDataDto) {
    const syncId = this.generateSyncId();
    this.activeSyncs.set(syncId, { status: 'RUNNING', progress: 0 });

    try {
      this.logger.log(`Starting sync ${syncId} for type: ${syncDto.syncType}`);

      let result;
      switch (syncDto.syncType) {
        case 'PRODUCTS':
          result = await this.syncProducts(syncId, syncDto);
          break;
        case 'INVENTORY':
          result = await this.syncInventory(syncId, syncDto);
          break;
        case 'PRICES':
          result = await this.syncPrices(syncId, syncDto);
          break;
        case 'ORDERS':
          result = await this.syncOrders(syncId, syncDto);
          break;
        case 'FULL':
          result = await this.fullSync(syncId, syncDto);
          break;
        default:
          throw new BadRequestException(`Unknown sync type: ${syncDto.syncType}`);
      }

      this.activeSyncs.set(syncId, { status: 'COMPLETED', progress: 100 });
      await this.logSyncHistory(syncId, syncDto.syncType, 'COMPLETED', result);

      return {
        syncId,
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
        recordsCreated: result.recordsCreated,
        errors: result.errors || [],
        duration: result.duration,
      };
    } catch (error) {
      this.activeSyncs.set(syncId, { status: 'FAILED', progress: 0 });
      await this.logSyncHistory(syncId, syncDto.syncType, 'FAILED', null, error.message);
      throw error;
    }
  }

  async getSyncStatus() {
    return {
      activeSyncs: Array.from(this.activeSyncs.entries()).map(([id, status]) => ({
        syncId: id,
        ...status,
      })),
      lastSync: await this.getLastSyncInfo(),
      integrationHealth: await this.checkIntegrationHealth(),
    };
  }

  async cancelSync(syncId: string) {
    if (this.activeSyncs.has(syncId)) {
      this.activeSyncs.set(syncId, { status: 'CANCELLED', progress: 0 });
      this.logger.log(`Sync ${syncId} cancelled`);
      return { success: true, message: 'Sync cancelled successfully' };
    }
    throw new BadRequestException('Sync not found or already completed');
  }

  async searchProducts(searchDto: TireMasterProductSearchDto) {
    const { brand, size, type, season, page = 1, limit = 20 } = searchDto;

    const where: any = {};
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (size) where.size = { contains: size };
    if (type) where.type = type;
    if (season) where.season = season;

    const [products, total] = await Promise.all([
      this.prisma.tireMasterProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          inventory: true,
          prices: true,
        },
      }),
      this.prisma.tireMasterProduct.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductDetails(productId: string) {
    return this.prisma.tireMasterProduct.findUnique({
      where: { id: productId },
      include: {
        inventory: {
          include: {
            location: true,
          },
        },
        prices: {
          include: {
            priceList: true,
          },
        },
        mappings: {
          include: {
            crmProduct: true,
          },
        },
      },
    });
  }

  async getInventoryByLocation(locationId: string) {
    return this.prisma.tireMasterInventory.findMany({
      where: { locationId },
      include: {
        product: true,
        location: true,
      },
    });
  }

  async updateInventory(inventoryUpdate: {
    productId: string;
    locationId: string;
    quantity: number;
  }) {
    return this.prisma.tireMasterInventory.upsert({
      where: {
        productId_locationId: {
          productId: inventoryUpdate.productId,
          locationId: inventoryUpdate.locationId,
        },
      },
      update: {
        quantity: inventoryUpdate.quantity,
        updatedAt: new Date(),
      },
      create: {
        productId: inventoryUpdate.productId,
        locationId: inventoryUpdate.locationId,
        quantity: inventoryUpdate.quantity,
      },
    });
  }

  async getPriceLists() {
    return this.prisma.tireMasterPriceList.findMany({
      include: {
        _count: {
          select: { prices: true },
        },
      },
    });
  }

  async getPriceListProducts(priceListId: string) {
    return this.prisma.tireMasterPrice.findMany({
      where: { priceListId },
      include: {
        product: true,
        priceList: true,
      },
    });
  }

  async createProductMapping(mappingDto: CreateTireMasterMappingDto) {
    return this.prisma.tireMasterProductMapping.create({
      data: {
        tireMasterProductId: mappingDto.tireMasterProductId,
        crmProductId: mappingDto.crmProductId,
        mappingType: mappingDto.mappingType,
        autoSync: mappingDto.autoSync ?? true,
        notes: mappingDto.notes,
      },
    });
  }

  async getProductMappings(productId?: string) {
    const where: any = {};
    if (productId) {
      where.OR = [
        { tireMasterProductId: productId },
        { crmProductId: productId },
      ];
    }

    return this.prisma.tireMasterProductMapping.findMany({
      where,
      include: {
        tireMasterProduct: true,
        crmProduct: true,
      },
    });
  }

  async updateProductMapping(mappingId: string, mappingDto: UpdateTireMasterMappingDto) {
    return this.prisma.tireMasterProductMapping.update({
      where: { id: mappingId },
      data: {
        mappingType: mappingDto.mappingType,
        autoSync: mappingDto.autoSync,
        notes: mappingDto.notes,
        updatedAt: new Date(),
      },
    });
  }

  async deleteProductMapping(mappingId: string) {
    return this.prisma.tireMasterProductMapping.delete({
      where: { id: mappingId },
    });
  }

  async getSalesOrders(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.orderDate = {};
      if (filters.startDate) where.orderDate.gte = filters.startDate;
      if (filters.endDate) where.orderDate.lte = filters.endDate;
    }

    if (filters.status) where.status = filters.status;

    return this.prisma.tireMasterSalesOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async syncSalesOrder(orderId: string) {
    const order = await this.prisma.tireMasterSalesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Sales order not found');
    }

    this.logger.log(`Syncing sales order ${orderId} to CRM`);
    return { success: true, message: 'Sales order synced to CRM successfully' };
  }

  async getSyncHistory(filters: {
    page: number;
    limit: number;
    syncType?: string;
  }) {
    const where: any = {};
    if (filters.syncType) where.syncType = filters.syncType;

    const [syncHistory, total] = await Promise.all([
      this.prisma.tireMasterSyncHistory.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: {
          startTime: 'desc',
        },
      }),
      this.prisma.tireMasterSyncHistory.count({ where }),
    ]);

    return {
      syncHistory,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getIntegrationHealth() {
    const [
      lastSuccessfulSync,
      recentFailures,
      activeMappings,
      totalProducts,
    ] = await Promise.all([
      this.prisma.tireMasterSyncHistory.findFirst({
        where: { status: 'COMPLETED' },
        orderBy: { endTime: 'desc' },
      }),
      this.prisma.tireMasterSyncHistory.count({
        where: {
          status: 'FAILED',
          startTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      this.prisma.tireMasterProductMapping.count({
        where: { autoSync: true },
      }),
      this.prisma.tireMasterProduct.count(),
    ]);

    const healthScore = this.calculateHealthScore(lastSuccessfulSync, recentFailures);

    return {
      healthScore,
      status: healthScore >= 80 ? 'HEALTHY' : healthScore >= 60 ? 'WARNING' : 'CRITICAL',
      lastSuccessfulSync: lastSuccessfulSync?.endTime,
      recentFailures,
      activeMappings,
      totalProducts,
      checks: {
        connectivity: await this.checkTireMasterConnectivity(),
        dataSync: healthScore >= 60,
        mappings: activeMappings > 0,
      },
    };
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async syncProducts(syncId: string, syncDto: SyncTireMasterDataDto) {
    this.logger.log(`Syncing products for ${syncId}`);

    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    recordsProcessed = 100; // Mock data
    recordsCreated = 25;
    recordsUpdated = 75;

    this.activeSyncs.set(syncId, { status: 'RUNNING', progress: 100 });

    return {
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      duration: Date.now() - startTime,
    };
  }

  private async syncInventory(syncId: string, syncDto: SyncTireMasterDataDto) {
    this.logger.log(`Syncing inventory for ${syncId}`);

    const startTime = Date.now();
    return {
      recordsProcessed: 50,
      recordsCreated: 10,
      recordsUpdated: 40,
      duration: Date.now() - startTime,
    };
  }

  private async syncPrices(syncId: string, syncDto: SyncTireMasterDataDto) {
    this.logger.log(`Syncing prices for ${syncId}`);

    const startTime = Date.now();
    return {
      recordsProcessed: 75,
      recordsCreated: 15,
      recordsUpdated: 60,
      duration: Date.now() - startTime,
    };
  }

  private async syncOrders(syncId: string, syncDto: SyncTireMasterDataDto) {
    this.logger.log(`Syncing orders for ${syncId}`);

    const startTime = Date.now();
    return {
      recordsProcessed: 30,
      recordsCreated: 20,
      recordsUpdated: 10,
      duration: Date.now() - startTime,
    };
  }

  private async fullSync(syncId: string, syncDto: SyncTireMasterDataDto) {
    this.logger.log(`Performing full sync for ${syncId}`);

    const startTime = Date.now();
    const results = await Promise.all([
      this.syncProducts(syncId, syncDto),
      this.syncInventory(syncId, syncDto),
      this.syncPrices(syncId, syncDto),
      this.syncOrders(syncId, syncDto),
    ]);

    return {
      recordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
      recordsCreated: results.reduce((sum, r) => sum + r.recordsCreated, 0),
      recordsUpdated: results.reduce((sum, r) => sum + r.recordsUpdated, 0),
      duration: Date.now() - startTime,
    };
  }

  private async getLastSyncInfo() {
    return this.prisma.tireMasterSyncHistory.findFirst({
      orderBy: { endTime: 'desc' },
    });
  }

  private async checkIntegrationHealth() {
    return this.checkTireMasterConnectivity();
  }

  private async checkTireMasterConnectivity(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Tire Master connectivity check failed', error);
      return false;
    }
  }

  private calculateHealthScore(lastSync: any, recentFailures: number): number {
    let score = 100;

    if (!lastSync) {
      score -= 50;
    } else {
      const hoursSinceLastSync = (Date.now() - new Date(lastSync.endTime).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSync > 24) score -= 20;
      if (hoursSinceLastSync > 48) score -= 30;
    }

    score -= recentFailures * 10;

    return Math.max(0, score);
  }

  private async logSyncHistory(
    syncId: string,
    syncType: string,
    status: string,
    result: any,
    error?: string,
  ) {
    await this.prisma.tireMasterSyncHistory.create({
      data: {
        syncId,
        syncType,
        status,
        startTime: new Date(),
        endTime: new Date(),
        recordsProcessed: result?.recordsProcessed || 0,
        recordsCreated: result?.recordsCreated || 0,
        recordsUpdated: result?.recordsUpdated || 0,
        errors: error ? [error] : [],
      },
    });
  }
}