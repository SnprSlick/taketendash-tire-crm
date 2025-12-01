import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { SalesDataService } from './sales-data.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SalesAnalytics } from './sales-data.repository';
import { User } from '../../common/decorators/user.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesAnalyticsController {
  constructor(private readonly salesDataService: SalesDataService) {}

  @Get('sales')
  async getSalesAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('storeId') storeId?: string,
    @User() user?: any
  ): Promise<SalesAnalytics> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }

    return this.salesDataService.getSalesAnalytics(start, end, storeId, allowedStoreIds);
  }

  @Get('sales/today')
  async getTodaysAnalytics(
    @Query('storeId') storeId?: string,
    @User() user?: any
  ): Promise<SalesAnalytics> {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }
    return this.salesDataService.getTodaysAnalytics(storeId, allowedStoreIds);
  }

  @Get('sales/month-to-date')
  async getMonthToDateAnalytics(
    @Query('storeId') storeId?: string,
    @User() user?: any
  ): Promise<SalesAnalytics> {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }
    return this.salesDataService.getMonthToDateAnalytics(storeId, allowedStoreIds);
  }

  @Get('sales/year-to-date')
  async getYearToDateAnalytics(
    @Query('storeId') storeId?: string,
    @User() user?: any
  ): Promise<SalesAnalytics> {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (storeId) {
        if (!user.stores.includes(storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }
    return this.salesDataService.getYearToDateAnalytics(storeId, allowedStoreIds);
  }

  @Get('sales/customer')
  async getSalesByCustomer(
    @Query('customerId') customerId: string,
    @User() user?: any
  ): Promise<any[]> {
    // TODO: Verify customer belongs to allowed store?
    // For now, we assume customer ID is enough, but ideally we check invoice.storeId
    return this.salesDataService.getSalesByCustomer(customerId);
  }

  @Get('sales/employee')
  async getSalesByEmployee(
    @Query('employeeId') employeeId: string,
    @User() user?: any
  ): Promise<any[]> {
    return this.salesDataService.getSalesByEmployee(employeeId);
  }
}