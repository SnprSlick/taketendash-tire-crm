import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SalesAnalyticsController } from './sales-analytics.controller';
import { SalesDataService } from './sales-data.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SalesAnalytics } from './sales-data.repository';

describe('SalesAnalyticsController (Contract Tests)', () => {
  let app: INestApplication;
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

  beforeEach(async () => {
    const mockSalesDataService = {
      getSalesAnalytics: jest.fn(),
      getTodaysAnalytics: jest.fn(),
      getMonthToDateAnalytics: jest.fn(),
      getYearToDateAnalytics: jest.fn(),
      getSalesByCustomer: jest.fn(),
      getSalesByEmployee: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesAnalyticsController],
      providers: [
        {
          provide: SalesDataService,
          useValue: mockSalesDataService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();

    salesDataService = module.get(SalesDataService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /analytics/sales', () => {
    it('should return sales analytics with correct contract structure', async () => {
      salesDataService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales')
        .expect(200);

      expect(response.body).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number),
        salesByCategory: expect.any(Array),
        salesByEmployee: expect.any(Array),
        salesByMonth: expect.any(Array),
        recentSales: expect.any(Array)
      });

      expect(response.body.salesByCategory[0]).toMatchObject({
        category: expect.any(String),
        total: expect.any(Number),
        revenue: expect.any(Number)
      });
    });

    it('should accept date range parameters', async () => {
      salesDataService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);

      await request(app.getHttpServer())
        .get('/analytics/sales?startDate=2023-11-01&endDate=2023-11-18')
        .expect(200);

      expect(salesDataService.getSalesAnalytics).toHaveBeenCalledWith(
        new Date('2023-11-01'),
        new Date('2023-11-18')
      );
    });

    it('should handle missing date parameters', async () => {
      salesDataService.getSalesAnalytics.mockResolvedValue(mockSalesAnalytics);

      await request(app.getHttpServer())
        .get('/analytics/sales')
        .expect(200);

      expect(salesDataService.getSalesAnalytics).toHaveBeenCalledWith(
        undefined,
        undefined
      );
    });
  });

  describe('GET /analytics/sales/today', () => {
    it('should return today\'s analytics with correct contract', async () => {
      salesDataService.getTodaysAnalytics.mockResolvedValue(mockSalesAnalytics);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales/today')
        .expect(200);

      expect(response.body).toMatchObject({
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

  describe('GET /analytics/sales/month-to-date', () => {
    it('should return month-to-date analytics with correct contract', async () => {
      salesDataService.getMonthToDateAnalytics.mockResolvedValue(mockSalesAnalytics);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales/month-to-date')
        .expect(200);

      expect(response.body).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number),
        salesByCategory: expect.any(Array)
      });

      expect(salesDataService.getMonthToDateAnalytics).toHaveBeenCalled();
    });
  });

  describe('GET /analytics/sales/year-to-date', () => {
    it('should return year-to-date analytics with correct contract', async () => {
      salesDataService.getYearToDateAnalytics.mockResolvedValue(mockSalesAnalytics);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales/year-to-date')
        .expect(200);

      expect(response.body).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        averageOrderValue: expect.any(Number),
        salesByCategory: expect.any(Array)
      });
    });
  });

  describe('GET /analytics/sales/customer', () => {
    it('should return customer sales data', async () => {
      const mockCustomerSales = [];
      salesDataService.getSalesByCustomer.mockResolvedValue(mockCustomerSales);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales/customer?customerId=123')
        .expect(200);

      expect(response.body).toEqual(mockCustomerSales);
      expect(salesDataService.getSalesByCustomer).toHaveBeenCalledWith('123');
    });
  });

  describe('GET /analytics/sales/employee', () => {
    it('should return employee sales data', async () => {
      const mockEmployeeSales = [];
      salesDataService.getSalesByEmployee.mockResolvedValue(mockEmployeeSales);

      const response = await request(app.getHttpServer())
        .get('/analytics/sales/employee?employeeId=456')
        .expect(200);

      expect(response.body).toEqual(mockEmployeeSales);
      expect(salesDataService.getSalesByEmployee).toHaveBeenCalledWith('456');
    });
  });
});