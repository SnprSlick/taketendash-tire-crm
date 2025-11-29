import { Controller, Get, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('inventory/restock')
  async getRestockAlerts(
    @Query('storeId') storeId?: string,
    @Query('daysOutOfStockThreshold') daysOutOfStockThreshold?: string,
    @Query('outlookDays') outlookDays?: string
  ) {
    const threshold = daysOutOfStockThreshold ? parseInt(daysOutOfStockThreshold, 10) : 0;
    const outlook = outlookDays ? parseInt(outlookDays, 10) : 30;
    return this.insightsService.getInventoryRiskAnalysis(storeId, outlook, threshold);
  }

  @Get('inventory/transfers')
  async getCrossStoreTransfers(@Query('storeId') storeId?: string) {
    return this.insightsService.getCrossStoreTransfers(storeId);
  }

  @Get('inventory/dead-stock')
  async getDeadStock(@Query('storeId') storeId?: string) {
    return this.insightsService.getDeadStock(storeId);
  }

  @Get('workforce/utilization')
  async getTechnicianUtilization(@Query('storeId') storeId?: string) {
    return this.insightsService.getTechnicianUtilization(storeId);
  }

  @Get('margin/leakage')
  async getMarginLeakage(@Query('storeId') storeId?: string) {
    return this.insightsService.getMarginLeakage(storeId);
  }

  @Get('margin/attachment')
  async getAttachmentRates(@Query('storeId') storeId?: string) {
    return this.insightsService.getAttachmentRates(storeId);
  }

  @Get('inventory/top-tires')
  async getTopTiresByCategory(@Query('storeId') storeId?: string) {
    return this.insightsService.getTopTiresByCategory(storeId);
  }
}
