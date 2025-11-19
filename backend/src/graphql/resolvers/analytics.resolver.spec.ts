import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsResolver } from './analytics.resolver';
import { SalesDataService } from '../../modules/sales/sales-data.service';
import { SalesAnalytics } from '../../modules/sales/sales-data.repository';
import { AnalyticsEngine } from '../../libraries/analytics-engine';

describe('AnalyticsResolver (Contract Tests)', () => {
  let resolver: AnalyticsResolver;
  let salesDataService: jest.Mocked<SalesDataService>;

  const mockSalesAnalytics: SalesAnalytics = {
    totalSales: 42,
    totalRevenue: 15000.00,
    averageOrderValue: 357.14,
    salesByCategory: [
      { category: 'tires', total: 30, revenue: 12000.00 },
      { category: 'services', total: 8, revenue: 2000.00 },
      { category: 'accessories', total: 4, revenue: 1000.00 }
    ],
    salesByEmployee: [
      { employeeId: 'emp_001', total: 25, revenue: 9000.00 },
      { employeeId: 'emp_002', total: 17, revenue: 6000.00 }
    ],
    salesByMonth: [
      { month: '2023-11', total: 42, revenue: 15000.00 },
      { month: '2023-10', total: 38, revenue: 13500.00 }
    ],
    recentSales: []
  };

  const mockEnhancedAnalytics = {
    ...mockSalesAnalytics,
    growthMetrics: {
      salesGrowth: 15.2,
      transactionGrowth: 8.5,
      customerGrowth: 12.0
    },
    trends: {
      dailyAverages: [
        { date: '2023-11-17', sales: 850.00 },
        { date: '2023-11-18', sales: 920.00 }
      ],
      weeklyTrends: [
        { week: '2023-W45', sales: 6000.00 },
        { week: '2023-W46', sales: 6500.00 }
      ]
    },
    forecasting: {
      nextMonthProjection: 18000.00,
      confidenceLevel: 0.85
    }
  };

  beforeEach(async () => {
    const mockSalesDataService = {
      getSalesAnalytics: jest.fn(),
      getTodaysAnalytics: jest.fn(),
      getMonthToDateAnalytics: jest.fn(),
      getYearToDateAnalytics: jest.fn(),
      getSalesByDateRange: jest.fn(),
      getSalesByCustomer: jest.fn(),
      getSalesByEmployee: jest.fn(),
      getTodaysSales: jest.fn(),
      getRecentSales: jest.fn(),
    };

    const mockAnalyticsEngine = {
      generateInsights: jest.fn(),
      calculateSalesTrends: jest.fn(),
      calculateKPIs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsResolver,
        {
          provide: SalesDataService,
          useValue: mockSalesDataService,
        },
        {
          provide: AnalyticsEngine,
          useValue: mockAnalyticsEngine,
        },
      ],
    }).compile();

    resolver = module.get<AnalyticsResolver>(AnalyticsResolver);
    salesDataService = module.get(SalesDataService);
  });

  describe('salesAnalytics Query', () => {
    it('should return sales analytics with correct GraphQL contract', async () => {
      salesDataService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);

      const result = await resolver.salesAnalytics();

      expect(result).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number),
        salesByCategory: expect.any(Array),
        salesByEmployee: expect.any(Array),
        salesByMonth: expect.any(Array),
        recentSales: expect.any(Array)
      });

      expect(result.salesByCategory[0]).toMatchObject({
        category: expect.any(String),
        total: expect.any(Number),
        revenue: expect.any(Number)
      });

      expect(salesDataService.getSalesAnalytics).toHaveBeenCalled();
    });

    it('should handle date parameters correctly', async () => {
      salesDataService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);

      const startDate = new Date('2023-11-01');
      const endDate = new Date('2023-11-18');

      await resolver.salesAnalytics(startDate, endDate);

      expect(salesDataService.getSalesAnalytics).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should handle undefined date parameters', async () => {
      salesDataService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);

      await resolver.salesAnalytics();

      expect(salesDataService.getSalesAnalytics).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('todaysAnalytics Query', () => {
    it('should return today\'s analytics with correct contract', async () => {
      salesDataService.getTodaysAnalytics.mockResolvedValue(mockSalesAnalytics);

      const result = await resolver.todaysAnalytics();

      expect(result).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number),
        salesByCategory: expect.any(Array),
        salesByEmployee: expect.any(Array),
        salesByMonth: expect.any(Array),
        recentSales: expect.any(Array)
      });

      expect(salesDataService.getTodaysAnalytics).toHaveBeenCalled();
    });
  });


  describe('monthToDateAnalytics Query', () => {
    it('should return month-to-date analytics', async () => {
      salesDataService.getMonthToDateAnalytics.mockResolvedValue(mockSalesAnalytics);

      const result = await resolver.monthToDateAnalytics();

      expect(result).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number)
      });

      expect(salesDataService.getMonthToDateAnalytics).toHaveBeenCalled();
    });
  });

  describe('yearToDateAnalytics Query', () => {
    it('should return year-to-date analytics', async () => {
      salesDataService.getYearToDateAnalytics.mockResolvedValue(mockSalesAnalytics);

      const result = await resolver.yearToDateAnalytics();

      expect(result).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number)
      });

      expect(salesDataService.getYearToDateAnalytics).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      salesDataService.getSalesAnalytics.mockRejectedValue(new Error('Database connection failed'));

      await expect(resolver.salesAnalytics()).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid date ranges', async () => {
      salesDataService.getSalesAnalytics.mockRejectedValue(new Error('Invalid date range'));

      const startDate = new Date('2023-12-01');
      const endDate = new Date('2023-11-01'); // End before start

      await expect(resolver.salesAnalytics(startDate, endDate)).rejects.toThrow('Invalid date range');
    });
  });
});