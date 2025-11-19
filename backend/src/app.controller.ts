import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller('')
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  getApiInfo() {
    return {
      name: 'Tire CRM Dashboard API',
      version: '1.0.0',
      description: 'Comprehensive CRM system for tire and auto service companies',
      documentation: {
        graphql: 'http://localhost:3000/graphql',
        health: 'http://localhost:3000/health',
        apiInfo: 'http://localhost:3000/api',
      },
      features: [
        'Sales Analytics Dashboard with AI Insights',
        'Customer Management with Loyalty Scoring',
        'Performance Metrics and Trending',
        'Tire Master Integration',
        'JWT Authentication',
        'Real-time Caching with Redis',
      ],
      sampleQueries: {
        graphql: {
          enhancedAnalytics: `
query {
  enhancedAnalytics {
    basicAnalytics { totalSales, totalRevenue, averageOrderValue }
    insights { type, title, description, impact }
    kpis { name, value, trend }
  }
}`,
          customers: `
query {
  customers {
    firstName, lastName, email, status
  }
}`,
          recentSales: `
query {
  recentSales {
    transactionDate, category, unitPrice, quantity
  }
}`
        },
        auth: {
          login: 'POST /api/v1/auth/login',
          profile: 'GET /api/v1/auth/profile',
          validate: 'GET /api/v1/auth/validate',
        }
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  async getHealth() {
    const startTime = Date.now();

    try {
      // Check database connection
      const dbResult = await this.prisma.healthCheck();

      // Check Redis connection
      const redisResult = await this.redis.exists('health-check');
      await this.redis.set('health-check', 'ok', { ttl: 60 });

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        services: {
          database: {
            status: dbResult ? 'connected' : 'error',
            type: 'PostgreSQL',
          },
          cache: {
            status: 'connected',
            type: 'Redis',
          },
          api: {
            status: 'running',
            port: process.env.PORT || 3000,
          },
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        services: {
          database: { status: 'error' },
          cache: { status: 'error' },
          api: { status: 'running' },
        },
      };
    }
  }

  @Get('api')
  getApiDocumentation() {
    return {
      title: 'Tire CRM Dashboard API',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000',
      endpoints: {
        root: {
          method: 'GET',
          path: '/',
          description: 'API information and welcome message',
        },
        health: {
          method: 'GET',
          path: '/health',
          description: 'Health check endpoint for monitoring',
        },
        graphql: {
          method: 'POST',
          path: '/graphql',
          description: 'GraphQL endpoint for all data operations',
          playground: 'http://localhost:3000/graphql',
        },
        authentication: {
          login: {
            method: 'POST',
            path: '/api/v1/auth/login',
            description: 'Employee authentication',
            body: {
              email: 'string',
              password: 'string',
            },
          },
          profile: {
            method: 'GET',
            path: '/api/v1/auth/profile',
            description: 'Get authenticated user profile',
            headers: {
              Authorization: 'Bearer <jwt_token>',
            },
          },
          validate: {
            method: 'GET',
            path: '/api/v1/auth/validate',
            description: 'Validate JWT token',
            headers: {
              Authorization: 'Bearer <jwt_token>',
            },
          },
        },
      },
      graphqlOperations: {
        queries: [
          'enhancedAnalytics',
          'salesAnalytics',
          'todaysAnalytics',
          'monthToDateAnalytics',
          'businessInsights',
          'customers',
          'customer',
          'recentSales',
          'todaysSales',
        ],
        mutations: [
          'createCustomer',
          'updateCustomer',
          'deleteCustomer',
          'activateCustomer',
          'deactivateCustomer',
        ],
      },
      sampleData: {
        employees: 3,
        customers: 3,
        vehicles: 3,
        salesRecords: 50,
        serviceRecords: 2,
        appointments: 2,
      },
    };
  }

  @Get('favicon.ico')
  getFavicon(@Res() res: Response) {
    res.status(204).send();
  }
}