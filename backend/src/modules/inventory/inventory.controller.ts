import { Controller, Get, Query, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stats')
  async getStats() {
    return this.inventoryService.getStats();
  }

  @Get()
  async getInventory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
    @Query('type') type?: string,
    @Query('size') size?: string,
    @Query('inStock') inStock?: string,
    @Query('isTire') isTire?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @User() user?: any
  ) {
    // Access Control for locationId
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      // If locationId is provided, we need to check if it maps to an allowed store.
      // This is tricky because locationId is TireMasterLocation ID, not Store ID.
      // But we can assume that if they are restricted, they should only see inventory for their stores.
      // However, inventory visibility might be open to all stores for checking stock?
      // The requirement says: "Wholesale will have access to the inventory, restock and insights page."
      // "Store manager will have access to their assigned store page with full scope."
      // It doesn't explicitly say inventory is restricted per store.
      // Usually inventory is visible across stores to check stock.
      // But let's assume for now we don't restrict inventory VIEWING, only analytics.
    }

    return this.inventoryService.getInventory({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
      locationId,
      type,
      size,
      inStock: inStock === 'true',
      isTire: isTire === 'true' ? true : isTire === 'false' ? false : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('locations')
  async getLocations(@User() user?: any) {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      allowedStoreIds = user.stores;
    }
    return this.inventoryService.getLocations(allowedStoreIds);
  }

  @Get('analytics')
  async getAnalytics(
    @Query('days') days?: number,
    @Query('storeId') storeId?: string,
    @Query('minVelocity') minVelocity?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('size') size?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('outlook') outlook?: number,
    @User() user?: any
  ) {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        // We need to verify if storeId (which is TireMasterLocation ID here) maps to an allowed store.
        // This verification is hard without mapping.
        // But we can pass allowedStoreIds to service and let it handle.
      }
      allowedStoreIds = user.stores;
    }

    return this.inventoryService.getSalesAnalytics({
      days: days ? Number(days) : 30,
      storeId,
      allowedStoreIds,
      minVelocity: minVelocity ? Number(minVelocity) : 0,
      sortBy,
      sortOrder,
      search,
      size,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : undefined,
      outlook: outlook ? Number(outlook) : 30,
    });
  }

  @Get('analytics/:productId/history')
  async getProductHistory(
    @Param('productId') productId: string,
    @Query('days') days?: number,
  ) {
    return this.inventoryService.getProductSalesHistory(productId, days ? Number(days) : 365);
  }
}
