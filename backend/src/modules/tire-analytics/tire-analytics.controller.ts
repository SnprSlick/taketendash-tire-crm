import { Controller, Get, Query } from '@nestjs/common';
import { TireAnalyticsService } from './tire-analytics.service';
import { TireAnalyticsFilterDto } from './dto/tire-analytics-filter.dto';

@Controller('analytics/tires')
export class TireAnalyticsController {
  constructor(private readonly analyticsService: TireAnalyticsService) {}

  @Get()
  async getAnalytics(@Query() filter: TireAnalyticsFilterDto) {
    return this.analyticsService.getTireAnalytics(filter);
  }

  @Get('options')
  async getOptions() {
    return this.analyticsService.getFilterOptions();
  }

  @Get('trends')
  async getTrends(@Query() filter: TireAnalyticsFilterDto) {
    return this.analyticsService.getTireSalesTrends(filter);
  }
}
