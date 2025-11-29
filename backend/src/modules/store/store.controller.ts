import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { StoreService } from './store.service';

@Controller('stores')
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly storeService: StoreService) {}

  @Get()
  async getStores() {
    try {
      const stores = await this.storeService.findAll();
      return {
        success: true,
        data: stores
      };
    } catch (error) {
      this.logger.error('Failed to fetch stores', error);
      return {
        success: false,
        error: 'Failed to fetch stores'
      };
    }
  }

  @Get('analytics/comparison')
  async getComparisonAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const data = await this.storeService.getComparisonAnalytics(start, end);
      return {
        success: true,
        data
      };
    } catch (error) {
      this.logger.error('Failed to fetch comparison analytics', error);
      return {
        success: false,
        error: 'Failed to fetch comparison analytics'
      };
    }
  }

  @Get(':id')
  async getStore(@Param('id') id: string) {
    try {
      const store = await this.storeService.findOne(id);
      return {
        success: true,
        data: store
      };
    } catch (error) {
      this.logger.error(`Failed to fetch store ${id}`, error);
      return {
        success: false,
        error: 'Failed to fetch store'
      };
    }
  }

  @Get(':id/stats')
  async getStoreStats(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const stats = await this.storeService.getStats(id, start, end);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error(`Failed to fetch store stats ${id}`, error);
      return {
        success: false,
        error: 'Failed to fetch store stats'
      };
    }
  }

  @Get(':id/analytics')
  async getStoreAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const analytics = await this.storeService.getAnalytics(id, start, end);
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      this.logger.error(`Failed to fetch store analytics ${id}`, error);
      return {
        success: false,
        error: 'Failed to fetch store analytics'
      };
    }
  }

  @Get(':id/employees')
  async getStoreEmployees(@Param('id') id: string) {
    try {
      const employees = await this.storeService.getEmployees(id);
      return {
        success: true,
        data: employees
      };
    } catch (error) {
      this.logger.error(`Failed to fetch store employees ${id}`, error);
      return {
        success: false,
        error: 'Failed to fetch store employees'
      };
    }
  }
}
