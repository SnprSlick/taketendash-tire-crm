import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SalesDataService } from './sales-data.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SalesAnalytics } from './sales-data.repository';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class SalesAnalyticsController {
  constructor(private readonly salesDataService: SalesDataService) {}

  @Get('sales')
  async getSalesAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SalesAnalytics> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.salesDataService.getSalesAnalytics(start, end);
  }

  @Get('sales/today')
  async getTodaysAnalytics(): Promise<SalesAnalytics> {
    return this.salesDataService.getTodaysAnalytics();
  }

  @Get('sales/month-to-date')
  async getMonthToDateAnalytics(): Promise<SalesAnalytics> {
    return this.salesDataService.getMonthToDateAnalytics();
  }

  @Get('sales/year-to-date')
  async getYearToDateAnalytics(): Promise<SalesAnalytics> {
    return this.salesDataService.getYearToDateAnalytics();
  }

  @Get('sales/customer')
  async getSalesByCustomer(
    @Query('customerId') customerId: string,
  ): Promise<any[]> {
    return this.salesDataService.getSalesByCustomer(customerId);
  }

  @Get('sales/employee')
  async getSalesByEmployee(
    @Query('employeeId') employeeId: string,
  ): Promise<any[]> {
    return this.salesDataService.getSalesByEmployee(employeeId);
  }
}