import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SalesAnalytics, EnhancedAnalytics } from '../types/analytics.type';
import { SalesData } from '../types/sales-data.type';
import { BusinessInsight, SalesTrend, PerformanceMetric } from '../types/insights.type';
import { SalesDataService } from '../../modules/sales/sales-data.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsEngine } from '../../libraries/analytics-engine';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AnalyticsResolver {
  constructor(
    private readonly salesDataService: SalesDataService,
    private readonly analyticsEngine: AnalyticsEngine,
  ) {}

  @Query(() => SalesAnalytics)
  async salesAnalytics(
    @Args('startDate', { type: () => Date, nullable: true }) startDate?: Date,
    @Args('endDate', { type: () => Date, nullable: true }) endDate?: Date,
  ): Promise<SalesAnalytics> {
    return this.salesDataService.getSalesAnalytics(startDate, endDate);
  }

  @Query(() => SalesAnalytics)
  async todaysAnalytics(): Promise<SalesAnalytics> {
    return this.salesDataService.getTodaysAnalytics();
  }

  @Query(() => SalesAnalytics)
  async monthToDateAnalytics(): Promise<SalesAnalytics> {
    return this.salesDataService.getMonthToDateAnalytics();
  }

  @Query(() => SalesAnalytics)
  async yearToDateAnalytics(): Promise<SalesAnalytics> {
    return this.salesDataService.getYearToDateAnalytics();
  }

  @Query(() => [SalesData])
  async salesByCustomer(
    @Args('customerId') customerId: string,
  ): Promise<SalesData[]> {
    return this.salesDataService.getSalesByCustomer(customerId);
  }

  @Query(() => [SalesData])
  async salesByEmployee(
    @Args('employeeId') employeeId: string,
  ): Promise<SalesData[]> {
    return this.salesDataService.getSalesByEmployee(employeeId);
  }

  @Query(() => [SalesData])
  async salesByDateRange(
    @Args('startDate', { type: () => Date }) startDate: Date,
    @Args('endDate', { type: () => Date }) endDate: Date,
  ): Promise<SalesData[]> {
    return this.salesDataService.getSalesByDateRange(startDate, endDate);
  }

  @Query(() => [SalesData])
  async todaysSales(): Promise<SalesData[]> {
    return this.salesDataService.getTodaysSales();
  }

  @Query(() => [SalesData])
  async recentSales(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 10 }) limit?: number,
  ): Promise<SalesData[]> {
    return this.salesDataService.getRecentSales(limit);
  }

  @Query(() => EnhancedAnalytics)
  async enhancedAnalytics(
    @Args('startDate', { type: () => Date, nullable: true }) startDate?: Date,
    @Args('endDate', { type: () => Date, nullable: true }) endDate?: Date,
  ): Promise<EnhancedAnalytics> {
    // Get basic analytics
    const basicAnalytics = await this.salesDataService.getSalesAnalytics(startDate, endDate);

    // Get raw sales data for enhanced analysis
    const salesData = await this.salesDataService.getSalesByDateRange(
      startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Default to last year
      endDate || new Date()
    );

    // Transform to analytics engine format
    const analyticsData = salesData.map(sale => ({
      date: sale.salesDate,
      amount: sale.netAmount,
      category: sale.category,
      employeeId: sale.employeeId,
    }));

    // Generate insights and trends
    const insights = this.analyticsEngine.generateInsights(analyticsData);
    const trends = this.analyticsEngine.calculateSalesTrends(
      analyticsData.map(d => ({ date: d.date, amount: d.amount }))
    );
    const kpis = this.analyticsEngine.calculateKPIs(analyticsData);

    return {
      basicAnalytics,
      insights,
      trends,
      kpis,
    };
  }

  @Query(() => [BusinessInsight])
  async businessInsights(
    @Args('startDate', { type: () => Date, nullable: true }) startDate?: Date,
    @Args('endDate', { type: () => Date, nullable: true }) endDate?: Date,
  ): Promise<BusinessInsight[]> {
    const salesData = await this.salesDataService.getSalesByDateRange(
      startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default to last 90 days
      endDate || new Date()
    );

    const analyticsData = salesData.map(sale => ({
      date: sale.salesDate,
      amount: sale.netAmount,
      category: sale.category,
      employeeId: sale.employeeId,
    }));

    return this.analyticsEngine.generateInsights(analyticsData);
  }

  @Query(() => [PerformanceMetric])
  async performanceMetrics(
    @Args('startDate', { type: () => Date, nullable: true }) startDate?: Date,
    @Args('endDate', { type: () => Date, nullable: true }) endDate?: Date,
  ): Promise<PerformanceMetric[]> {
    const salesData = await this.salesDataService.getSalesByDateRange(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      endDate || new Date()
    );

    const analyticsData = salesData.map(sale => ({
      date: sale.salesDate,
      amount: sale.netAmount,
      category: sale.category,
    }));

    return this.analyticsEngine.calculateKPIs(analyticsData);
  }
}