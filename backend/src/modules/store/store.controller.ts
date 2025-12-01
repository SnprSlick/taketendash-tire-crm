import { Controller, Get, Param, Query, Logger, UseGuards, ForbiddenException } from '@nestjs/common';
import { StoreService } from './store.service';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly storeService: StoreService) {}

  @Get()
  async getStores(@User() user: any) {
    try {
      const stores = await this.storeService.findAll();
      
      // Filter stores based on user role and assignments
      let allowedStores = stores;
      if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        allowedStores = stores.filter(store => user.stores.includes(store.id));
      }

      return {
        success: true,
        data: allowedStores
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
    @User() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      // Pass allowed store IDs to service if not admin/corporate
      let allowedStoreIds: string[] | undefined;
      if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
        allowedStoreIds = user.stores;
      }

      const data = await this.storeService.getComparisonAnalytics(start, end, allowedStoreIds);
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
  async getStore(@Param('id') id: string, @User() user: any) {
    try {
      // Check access
      if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE' && !user.stores.includes(id)) {
        throw new ForbiddenException('You do not have access to this store');
      }

      const store = await this.storeService.findOne(id);
      return {
        success: true,
        data: store
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
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
    @User() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Check access
      if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE' && !user.stores.includes(id)) {
        throw new ForbiddenException('You do not have access to this store');
      }

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const stats = await this.storeService.getStats(id, start, end);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
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
    @User() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      // Check access
      if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE' && !user.stores.includes(id)) {
        throw new ForbiddenException('You do not have access to this store');
      }

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const analytics = await this.storeService.getAnalytics(id, start, end);
      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Failed to fetch store analytics ${id}`, error);
      return {
        success: false,
        error: 'Failed to fetch store analytics'
      };
    }
  }

  @Get(':id/employees')
  async getStoreEmployees(@Param('id') id: string, @User() user: any) {
    try {
      // Check access
      if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE' && !user.stores.includes(id)) {
        throw new ForbiddenException('You do not have access to this store');
      }

      const employees = await this.storeService.getEmployees(id);
      return {
        success: true,
        data: employees
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Failed to fetch store employees ${id}`, error);
      return {
        success: false,
        error: 'Failed to fetch store employees'
      };
    }
  }
}
