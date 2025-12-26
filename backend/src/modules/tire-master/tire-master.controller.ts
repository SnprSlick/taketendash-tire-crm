import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TireMasterService } from './tire-master.service';
import {
  SyncTireMasterDataDto,
  TireMasterProductSearchDto,
  CreateTireMasterMappingDto,
  UpdateTireMasterMappingDto,
} from './dto/tire-master.dto';

@Controller('tire-master')
// @UseGuards(JwtAuthGuard)
export class TireMasterController {
  private readonly logger = new Logger(TireMasterController.name);

  constructor(private readonly tireMasterService: TireMasterService) {}

  @Post('sync')
  async syncTireMasterData(@Body() syncDto: SyncTireMasterDataDto) {
    this.logger.log(`Starting Tire Master sync: ${syncDto.syncType}`);

    try {
      const result = await this.tireMasterService.syncData(syncDto);
      this.logger.log(`Sync completed: ${result.recordsProcessed} records`);

      return {
        success: true,
        message: 'Tire Master sync completed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('sync/status')
  async getSyncStatus() {
    return this.tireMasterService.getSyncStatus();
  }

  @Post('sync/cancel/:syncId')
  async cancelSync(@Param('syncId') syncId: string) {
    return this.tireMasterService.cancelSync(syncId);
  }

  @Get('products/search')
  async searchProducts(@Query() searchDto: TireMasterProductSearchDto) {
    return this.tireMasterService.searchProducts(searchDto);
  }

  @Get('products/:productId')
  async getProduct(@Param('productId') productId: string) {
    return this.tireMasterService.getProductDetails(productId);
  }

  @Get('inventory/:locationId')
  async getInventoryByLocation(@Param('locationId') locationId: string) {
    return this.tireMasterService.getInventoryByLocation(locationId);
  }

  @Post('inventory/update')
  async updateInventory(
    @Body() inventoryUpdate: { productId: string; locationId: string; quantity: number }
  ) {
    return this.tireMasterService.updateInventory(inventoryUpdate);
  }

  @Get('price-lists')
  async getPriceLists() {
    return this.tireMasterService.getPriceLists();
  }

  @Get('price-lists/:priceListId/products')
  async getPriceListProducts(@Param('priceListId') priceListId: string) {
    return this.tireMasterService.getPriceListProducts(priceListId);
  }

  @Post('mappings')
  async createProductMapping(@Body() mappingDto: CreateTireMasterMappingDto) {
    return this.tireMasterService.createProductMapping(mappingDto);
  }

  @Get('mappings')
  async getProductMappings(@Query('productId') productId?: string) {
    return this.tireMasterService.getProductMappings(productId);
  }

  @Put('mappings/:mappingId')
  async updateProductMapping(
    @Param('mappingId') mappingId: string,
    @Body() mappingDto: UpdateTireMasterMappingDto,
  ) {
    return this.tireMasterService.updateProductMapping(mappingId, mappingDto);
  }

  @Delete('mappings/:mappingId')
  async deleteProductMapping(@Param('mappingId') mappingId: string) {
    return this.tireMasterService.deleteProductMapping(mappingId);
  }

  @Get('sales-orders')
  async getSalesOrders(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('keymod') keymod?: string,
  ) {
    return this.tireMasterService.getSalesOrders({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
      keymod,
    });
  }

  @Get('customers')
  async getCustomers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.tireMasterService.getCustomers({
      page: Number(page),
      limit: Number(limit),
      search,
    });
  }

  @Post('sales-orders/:orderId/sync')
  async syncSalesOrder(@Param('orderId') orderId: string) {
    return this.tireMasterService.syncSalesOrder(orderId);
  }

  @Get('reports/sync-history')
  async getSyncHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('syncType') syncType?: string,
  ) {
    return this.tireMasterService.getSyncHistory({
      page: Number(page),
      limit: Number(limit),
      syncType,
    });
  }

  @Get('reports/integration-health')
  async getIntegrationHealth() {
    return this.tireMasterService.getIntegrationHealth();
  }
}