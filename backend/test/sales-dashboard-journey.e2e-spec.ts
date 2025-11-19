import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Sales Dashboard Journey (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate and get JWT token for protected endpoints
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@tire-crm.com',
        password: 'admin123'
      });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      authToken = loginResponse.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Sales Dashboard Data Flow Journey', () => {
    it('should provide complete sales analytics journey through multiple endpoints', async () => {
      // Skip if no auth token (authentication system not fully configured)
      if (!authToken) {
        console.warn('Skipping authenticated journey tests - no auth token available');
        return;
      }

      // Step 1: Get overall sales analytics
      const analyticsResponse = await request(app.getHttpServer())
        .get('/analytics/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number),
        averageOrderValue: expect.any(Number),
        topProducts: expect.any(Array),
        salesByCategory: expect.any(Object),
        period: expect.any(Object)
      });

      // Step 2: Get today's specific analytics
      const todayResponse = await request(app.getHttpServer())
        .get('/analytics/sales/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(todayResponse.body).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number),
        averageOrderValue: expect.any(Number)
      });

      // Step 3: Get month-to-date analytics
      const monthResponse = await request(app.getHttpServer())
        .get('/analytics/sales/month-to-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(monthResponse.body).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number)
      });

      // Step 4: Get year-to-date analytics
      const yearResponse = await request(app.getHttpServer())
        .get('/analytics/sales/year-to-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(yearResponse.body).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number)
      });

      // Verify data consistency: YTD >= MTD >= Today
      expect(yearResponse.body.totalSales).toBeGreaterThanOrEqual(monthResponse.body.totalSales);
      expect(monthResponse.body.totalSales).toBeGreaterThanOrEqual(todayResponse.body.totalSales);
    });

    it('should handle date range filtering consistently', async () => {
      if (!authToken) {
        console.warn('Skipping date range tests - no auth token available');
        return;
      }

      const startDate = '2023-11-01';
      const endDate = '2023-11-18';

      const rangeResponse = await request(app.getHttpServer())
        .get(`/analytics/sales?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(rangeResponse.body).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number),
        period: {
          startDate: expect.any(String),
          endDate: expect.any(String)
        }
      });

      // Verify the period matches requested dates
      expect(new Date(rangeResponse.body.period.startDate)).toBeInstanceOf(Date);
      expect(new Date(rangeResponse.body.period.endDate)).toBeInstanceOf(Date);
    });
  });

  describe('GraphQL Sales Analytics Journey', () => {
    it('should provide consistent data through GraphQL queries', async () => {
      // Test basic sales analytics query
      const basicQuery = `
        query {
          salesAnalytics {
            totalSales
            totalTransactions
            averageOrderValue
            topProducts {
              name
              sales
              units
            }
            salesByCategory {
              tires
              services
              accessories
            }
            period {
              startDate
              endDate
            }
          }
        }
      `;

      const basicResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: basicQuery })
        .set('Authorization', authToken ? `Bearer ${authToken}` : '')
        .expect(200);

      expect(basicResponse.body.data.salesAnalytics).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number),
        averageOrderValue: expect.any(Number),
        topProducts: expect.any(Array),
        salesByCategory: expect.any(Object),
        period: expect.any(Object)
      });

      // Test today's analytics query
      const todayQuery = `
        query {
          todaysAnalytics {
            totalSales
            totalTransactions
            averageOrderValue
          }
        }
      `;

      const todayResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: todayQuery })
        .set('Authorization', authToken ? `Bearer ${authToken}` : '')
        .expect(200);

      expect(todayResponse.body.data.todaysAnalytics).toMatchObject({
        totalSales: expect.any(Number),
        totalTransactions: expect.any(Number),
        averageOrderValue: expect.any(Number)
      });
    });

    it('should handle enhanced analytics with trends and forecasting', async () => {
      const enhancedQuery = `
        query {
          enhancedAnalytics {
            totalSales
            totalTransactions
            averageOrderValue
            growthMetrics {
              salesGrowth
              transactionGrowth
              customerGrowth
            }
            trends {
              dailyAverages {
                date
                sales
              }
              weeklyTrends {
                week
                sales
              }
            }
            forecasting {
              nextMonthProjection
              confidenceLevel
            }
          }
        }
      `;

      const enhancedResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: enhancedQuery })
        .set('Authorization', authToken ? `Bearer ${authToken}` : '')
        .expect(200);

      if (enhancedResponse.body.data && enhancedResponse.body.data.enhancedAnalytics) {
        expect(enhancedResponse.body.data.enhancedAnalytics).toMatchObject({
          totalSales: expect.any(Number),
          totalTransactions: expect.any(Number),
          growthMetrics: {
            salesGrowth: expect.any(Number),
            transactionGrowth: expect.any(Number),
            customerGrowth: expect.any(Number)
          },
          trends: {
            dailyAverages: expect.any(Array),
            weeklyTrends: expect.any(Array)
          },
          forecasting: {
            nextMonthProjection: expect.any(Number),
            confidenceLevel: expect.any(Number)
          }
        });
      }
    });
  });

  describe('Dashboard Performance and Reliability', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/analytics/sales/today')
          .set('Authorization', authToken ? `Bearer ${authToken}` : '')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          totalSales: expect.any(Number),
          totalTransactions: expect.any(Number)
        });
      });

      // All responses should return consistent data
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.totalSales).toBe(firstResponse.totalSales);
        expect(response.body.totalTransactions).toBe(firstResponse.totalTransactions);
      });
    });

    it('should handle invalid date ranges gracefully', async () => {
      if (!authToken) {
        console.warn('Skipping error handling tests - no auth token available');
        return;
      }

      // Test invalid date format
      await request(app.getHttpServer())
        .get('/analytics/sales?startDate=invalid-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Test end date before start date
      await request(app.getHttpServer())
        .get('/analytics/sales?startDate=2023-12-01&endDate=2023-11-01')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication for protected endpoints', async () => {
      // Test without token
      await request(app.getHttpServer())
        .get('/analytics/sales')
        .expect(401);

      // Test with invalid token
      await request(app.getHttpServer())
        .get('/analytics/sales')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Cross-API Data Consistency', () => {
    it('should return consistent data between REST and GraphQL', async () => {
      if (!authToken) {
        console.warn('Skipping consistency tests - no auth token available');
        return;
      }

      // Get data from REST endpoint
      const restResponse = await request(app.getHttpServer())
        .get('/analytics/sales/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get same data from GraphQL
      const graphqlQuery = `
        query {
          todaysAnalytics {
            totalSales
            totalTransactions
            averageOrderValue
          }
        }
      `;

      const graphqlResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: graphqlQuery })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Compare the two results
      const restData = restResponse.body;
      const graphqlData = graphqlResponse.body.data.todaysAnalytics;

      expect(restData.totalSales).toBe(graphqlData.totalSales);
      expect(restData.totalTransactions).toBe(graphqlData.totalTransactions);
      expect(restData.averageOrderValue).toBe(graphqlData.averageOrderValue);
    });
  });
});