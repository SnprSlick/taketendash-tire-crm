import { Controller, Get, Query, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
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
  ) {
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
  async getLocations() {
    return this.inventoryService.getLocations();
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
  ) {
    return this.inventoryService.getSalesAnalytics({
      days: days ? Number(days) : 30,
      storeId,
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
