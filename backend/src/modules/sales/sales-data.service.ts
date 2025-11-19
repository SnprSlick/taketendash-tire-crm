import { Injectable } from '@nestjs/common';
import { SalesDataRepository, SalesDataEntity, SalesAnalytics } from './sales-data.repository';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SalesDataService {
  constructor(
    private readonly salesDataRepository: SalesDataRepository,
    private readonly redisService: RedisService,
  ) {}

  async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics> {
    // Create cache key based on date range
    const cacheKey = `sales-analytics-${startDate?.toISOString() || 'all'}-${endDate?.toISOString() || 'all'}`;

    // Try to get from cache first
    const cached = await this.redisService.getCachedAnalytics<SalesAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get fresh data
    const analytics = await this.salesDataRepository.getSalesAnalytics(startDate, endDate);

    // Cache for 5 minutes
    await this.redisService.cacheAnalytics(cacheKey, analytics, 300);

    return analytics;
  }

  async getTodaysAnalytics(): Promise<SalesAnalytics> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return this.getSalesAnalytics(startOfDay, endOfDay);
  }

  async getMonthToDateAnalytics(): Promise<SalesAnalytics> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return this.getSalesAnalytics(startOfMonth, today);
  }

  async getYearToDateAnalytics(): Promise<SalesAnalytics> {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    return this.getSalesAnalytics(startOfYear, today);
  }

  async getSalesByCustomer(customerId: string): Promise<SalesDataEntity[]> {
    return this.salesDataRepository.getSalesByCustomer(customerId);
  }

  async getSalesByEmployee(employeeId: string): Promise<SalesDataEntity[]> {
    return this.salesDataRepository.getSalesByEmployee(employeeId);
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<SalesDataEntity[]> {
    return this.salesDataRepository.getSalesByDateRange(startDate, endDate);
  }

  async getTodaysSales(): Promise<SalesDataEntity[]> {
    return this.salesDataRepository.getTodaysSales();
  }

  async getRecentSales(limit: number = 10): Promise<SalesDataEntity[]> {
    const result = await this.salesDataRepository.findMany({
      orderBy: { salesDate: 'desc' },
      take: limit,
    });
    return result;
  }

  // Clear analytics cache when new sales data is added
  async invalidateAnalyticsCache(): Promise<void> {
    const keys = await this.redisService.keys('analytics:sales-analytics-*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }
}