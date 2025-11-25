import { Controller, Get, Query } from '@nestjs/common';
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
  ) {
    return this.inventoryService.getInventory({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
      locationId,
      type,
    });
  }

  @Get('locations')
  async getLocations() {
    return this.inventoryService.getLocations();
  }
}
