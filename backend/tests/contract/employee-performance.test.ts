import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('GET /api/v1/analytics/employee-performance (Contract Test)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let managerToken: string;
  let serviceAdvisorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create auth tokens for tests
    managerToken = jwtService.sign({
      sub: 'test-manager-id',
      role: 'MANAGER'
    });

    serviceAdvisorToken = jwtService.sign({
      sub: 'test-advisor-id',
      role: 'SERVICE_ADVISOR'
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data in dependency order
    await prisma.serviceRecord.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
  });

  describe('GET /api/v1/analytics/employee-performance', () => {
    it('should return performance metrics for all employees when no filters provided', async () => {
      // Setup test data - employees
      const employee1 = await prisma.employee.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP001',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const employee2 = await prisma.employee.create({
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP002',
          hireDate: new Date('2023-02-01'),
          status: 'ACTIVE'
        }
      });

      // Setup customer and vehicle
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Test',
          lastName: 'Customer',
          phone: '+1234567890',
          email: 'test@example.com',
          accountType: 'INDIVIDUAL',
          status: 'ACTIVE',
          preferredCommunication: 'EMAIL'
        }
      });

      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          vin: '1234567890ABCDEFG'
        }
      });

      // Create service records for performance calculation
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee1.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Oil Change',
          description: 'Regular oil change',
          laborHours: 2.0,
          laborCost: 120.00,
          partsCost: 45.00,
          totalCost: 165.00,
          status: 'COMPLETED'
        }
      });

      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee1.id,
          serviceDate: new Date('2024-01-20'),
          serviceType: 'Tire Installation',
          description: 'Install 4 new tires',
          laborHours: 3.0,
          laborCost: 180.00,
          partsCost: 800.00,
          totalCost: 980.00,
          status: 'COMPLETED'
        }
      });

      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee2.id,
          serviceDate: new Date('2024-01-18'),
          serviceType: 'Brake Service',
          description: 'Brake pad replacement',
          laborHours: 1.5,
          laborCost: 90.00,
          partsCost: 120.00,
          totalCost: 210.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase) - endpoint doesn't exist yet
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      // Expected response schema for employee performance metrics
      expect(response.body).toEqual({
        performanceData: expect.arrayContaining([
          expect.objectContaining({
            employeeId: employee1.id,
            employeeName: 'John Smith',
            totalRevenue: 1145.00, // 165 + 980
            totalLaborHours: 5.0,   // 2 + 3
            revenuePerLaborHour: 229.00, // 1145 / 5
            totalServices: 2,
            averageServiceValue: 572.50, // 1145 / 2
            periodStart: expect.any(String),
            periodEnd: expect.any(String),
            lastUpdated: expect.any(String)
          }),
          expect.objectContaining({
            employeeId: employee2.id,
            employeeName: 'Jane Doe',
            totalRevenue: 210.00,
            totalLaborHours: 1.5,
            revenuePerLaborHour: 140.00,
            totalServices: 1,
            averageServiceValue: 210.00,
            periodStart: expect.any(String),
            periodEnd: expect.any(String),
            lastUpdated: expect.any(String)
          })
        ]),
        totalRevenue: 1355.00,
        totalLaborHours: 6.5,
        overallRevenuePerLaborHour: 208.46,
        totalEmployees: 2,
        periodStart: expect.any(String),
        periodEnd: expect.any(String)
      });
    });

    it('should filter performance by date range', async () => {
      const employee = await prisma.employee.create({
        data: {
          firstName: 'Test',
          lastName: 'Employee',
          email: 'test.employee@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP003',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          firstName: 'Test',
          lastName: 'Customer',
          phone: '+1234567890',
          accountType: 'INDIVIDUAL',
          status: 'ACTIVE',
          preferredCommunication: 'EMAIL'
        }
      });

      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: 'Toyota',
          model: 'Camry',
          year: 2020
        }
      });

      // Service within date range
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Oil Change',
          laborHours: 2.0,
          laborCost: 120.00,
          partsCost: 45.00,
          totalCost: 165.00,
          status: 'COMPLETED'
        }
      });

      // Service outside date range
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2023-12-15'),
          serviceType: 'Tire Rotation',
          laborHours: 1.0,
          laborCost: 60.00,
          partsCost: 0.00,
          totalCost: 60.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.performanceData).toHaveLength(1);
      expect(response.body.performanceData[0]).toEqual(
        expect.objectContaining({
          employeeId: employee.id,
          totalRevenue: 165.00, // Only January service
          totalLaborHours: 2.0,
          totalServices: 1
        })
      );
    });

    it('should filter performance by specific employee', async () => {
      const employee1 = await prisma.employee.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP004',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const employee2 = await prisma.employee.create({
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP005',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const customer = await prisma.customer.create({
        data: {
          firstName: 'Test',
          lastName: 'Customer',
          phone: '+1234567890',
          accountType: 'INDIVIDUAL',
          status: 'ACTIVE',
          preferredCommunication: 'EMAIL'
        }
      });

      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: 'Toyota',
          model: 'Camry',
          year: 2020
        }
      });

      // Create services for both employees
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee1.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Oil Change',
          laborHours: 2.0,
          totalCost: 165.00,
          status: 'COMPLETED'
        }
      });

      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee2.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Brake Service',
          laborHours: 1.5,
          totalCost: 210.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .query({ employeeId: employee1.id })
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.performanceData).toHaveLength(1);
      expect(response.body.performanceData[0].employeeId).toBe(employee1.id);
      expect(response.body.performanceData[0].totalRevenue).toBe(165.00);
    });

    it('should require manager or service advisor role', async () => {
      const unauthorizedToken = jwtService.sign({
        sub: 'unauthorized-user',
        role: 'CUSTOMER' // Invalid role
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .expect(401);
    });

    it('should return empty results when no service records exist', async () => {
      const employee = await prisma.employee.create({
        data: {
          firstName: 'Test',
          lastName: 'Employee',
          email: 'test@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP006',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        performanceData: [],
        totalRevenue: 0,
        totalLaborHours: 0,
        overallRevenuePerLaborHour: 0,
        totalEmployees: 0,
        periodStart: expect.any(String),
        periodEnd: expect.any(String)
      });
    });

    it('should support pagination for large employee lists', async () => {
      // Create multiple employees for pagination test
      const employees = [];
      for (let i = 1; i <= 15; i++) {
        employees.push(await prisma.employee.create({
          data: {
            firstName: `Employee${i}`,
            lastName: 'Test',
            email: `employee${i}@company.com`,
            role: 'SERVICE_ADVISOR',
            employeeId: `EMP${String(i).padStart(3, '0')}`,
            hireDate: new Date('2023-01-01'),
            status: 'ACTIVE'
          }
        }));
      }

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .query({
          page: 1,
          limit: 10
        })
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          performanceData: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            totalPages: expect.any(Number)
          })
        })
      );
    });

    it('should handle service advisor access with proper scope', async () => {
      // Service advisors should only see their own performance
      const serviceAdvisor = await prisma.employee.create({
        data: {
          id: 'test-advisor-id', // Match the token sub
          firstName: 'Service',
          lastName: 'Advisor',
          email: 'advisor@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'ADV001',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/employee-performance')
        .set('Authorization', `Bearer ${serviceAdvisorToken}`)
        .expect(200);

      // Service advisors should only see their own performance
      expect(response.body.performanceData).toHaveLength(1);
      expect(response.body.performanceData[0].employeeId).toBe('test-advisor-id');
    });
  });
});