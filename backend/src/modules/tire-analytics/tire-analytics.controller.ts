import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { TireAnalyticsService } from './tire-analytics.service';
import { TireAnalyticsFilterDto } from './dto/tire-analytics-filter.dto';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('analytics/tires')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TireAnalyticsController {
  constructor(private readonly analyticsService: TireAnalyticsService) {}

  @Get()
  async getAnalytics(@Query() filter: TireAnalyticsFilterDto, @User() user?: any) {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (filter.storeId) {
        if (!user.stores.includes(filter.storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }
    return this.analyticsService.getTireAnalytics(filter, allowedStoreIds);
  }

  @Get('options')
  async getOptions(@User() user?: any) {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      allowedStoreIds = user.stores;
    }
    return this.analyticsService.getFilterOptions(allowedStoreIds);
  }

  @Get('trends')
  async getTrends(@Query() filter: TireAnalyticsFilterDto, @User() user?: any) {
    let allowedStoreIds: string[] | undefined;
    if (user && user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE') {
      if (filter.storeId) {
        if (!user.stores.includes(filter.storeId)) {
          throw new ForbiddenException('You do not have access to this store');
        }
      } else {
        allowedStoreIds = user.stores;
      }
    }
    return this.analyticsService.getTireSalesTrends(filter, allowedStoreIds);
  }
}
