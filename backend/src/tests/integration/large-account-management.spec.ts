import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppModule } from '../../app.module';
import request from 'supertest';

describe('Large Account Management Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.serviceRecord.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.largeAccount.deleteMany();
    await prisma.customer.deleteMany();
  });

  describe('Account designation workflow', () => {
    it('should designate customer as large account based on revenue threshold', async () => {
      // Create a customer with high revenue
      const customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Manager',
          email: 'john@bigfleet.com',
          phone: '555-0123',
          address: '123 Fleet St, Business City, BC 12345',
        },
      });

      // Create a vehicle for the customer
      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: 'Ford',
          model: 'F-150',
          year: 2023,
          vin: 'TEST123456789ABCD',
          licensePlate: 'ABC-123',
        },
      });

      // Create an employee
      const employee = await prisma.employee.create({
        data: {
          firstName: 'Service',
          lastName: 'Technician',
          email: 'tech@example.com',
          role: 'TECHNICIAN',
          employeeId: 'EMP001',
          hireDate: new Date('2023-01-01'),
        },
      });

      // Create service records that exceed large account threshold
      await prisma.serviceRecord.createMany({
        data: [
          {
            customerId: customer.id,
            vehicleId: vehicle.id,
            employeeId: employee.id,
            serviceDate: new Date('2024-01-15'),
            serviceType: 'Tire Installation',
            description: 'Fleet tire installation and alignment',
            laborHours: 40,
            partsCost: 20000,
            laborCost: 5000,
          },
          {
            customerId: customer.id,
            vehicleId: vehicle.id,
            employeeId: employee.id,
            serviceDate: new Date('2024-02-15'),
            serviceType: 'Fleet Maintenance',
            description: 'Complete fleet maintenance service',
            laborHours: 50,
            partsCost: 25000,
            laborCost: 5000,
          },
        ],
      });

      // Test account designation API
      const response = await request(app.getHttpServer())
        .post('/api/v1/large-accounts/designate')
        .send({
          customerId: customer.id,
          tier: 'GOLD',
          accountType: 'FLEET',
          reason: 'Annual revenue exceeds $50,000 threshold',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('customerId', customer.id);
      expect(response.body.data).toHaveProperty('tier', 'GOLD');
      expect(response.body.data).toHaveProperty('accountType', 'FLEET');

      // Verify account was created in database
      const largeAccount = await prisma.largeAccount.findUnique({
        where: { customerId: customer.id },
      });

      expect(largeAccount).toBeTruthy();
      expect(largeAccount?.tier).toBe('GOLD');
    });

    it('should upgrade account tier based on performance metrics', async () => {
      // Create existing large account
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Jane',
          lastName: 'Owner',
          email: 'jane@growing.com',
          phone: '555-0456',
          address: '456 Growth Ave, Expanding City, EC 67890',
        },
      });

      const largeAccount = await prisma.largeAccount.create({
        data: {
          customerId: customer.id,
          accountType: 'COMMERCIAL',
          tier: 'SILVER',
          annualRevenue: 75000,
          contractStartDate: new Date('2024-01-01'),
          contractEndDate: new Date('2024-12-31'),
          status: 'ACTIVE',
          accountManager: 'Account Manager A',
          specialTerms: 'Standard commercial terms',
          discountTier: 10,
          serviceLevel: 'STANDARD',
          priorityRanking: 3,
        },
      });

      // Test tier upgrade
      const upgradeResponse = await request(app.getHttpServer())
        .put(`/api/v1/large-accounts/${largeAccount.id}/tier`)
        .send({
          tier: 'GOLD',
          reason: 'Revenue growth and loyalty metrics exceeded Gold tier requirements',
        })
        .expect(200);

      expect(upgradeResponse.body.data).toHaveProperty('tier', 'GOLD');

      // Verify upgrade in database
      const updatedAccount = await prisma.largeAccount.findUnique({
        where: { id: largeAccount.id },
      });

      expect(updatedAccount?.tier).toBe('GOLD');
    });

    it('should calculate account health score', async () => {
      // Create customer and large account
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Health',
          lastName: 'Manager',
          email: 'health@accounts.com',
          phone: '555-0789',
          address: '789 Health St, Wellness City, WC 11111',
        },
      });

      const largeAccount = await prisma.largeAccount.create({
        data: {
          customerId: customer.id,
          accountType: 'ENTERPRISE',
          tier: 'PLATINUM',
          annualRevenue: 150000,
          contractStartDate: new Date('2024-01-01'),
          contractEndDate: new Date('2025-12-31'),
          status: 'ACTIVE',
          accountManager: 'Senior Account Manager',
          specialTerms: 'Enterprise tier benefits',
          discountTier: 20,
          serviceLevel: 'PREMIUM',
          priorityRanking: 1,
        },
      });

      // Create vehicle and employee for service record
      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: 'Mercedes',
          model: 'E-Class',
          year: 2022,
          vin: 'HEALTH12345678901',
        },
      });

      const employee = await prisma.employee.create({
        data: {
          firstName: 'Premium',
          lastName: 'Tech',
          email: 'premium@example.com',
          role: 'TECHNICIAN',
          employeeId: 'EMP002',
          hireDate: new Date('2023-01-01'),
        },
      });

      // Add recent positive service activity
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date(),
          serviceType: 'Premium Service',
          description: 'Premium maintenance and inspection',
          laborHours: 20,
          partsCost: 12000,
          laborCost: 3000,
        },
      });

      // Test health score calculation
      const healthResponse = await request(app.getHttpServer())
        .get(`/api/v1/large-accounts/${largeAccount.id}/health`)
        .expect(200);

      const health = healthResponse.body.data;
      expect(health).toHaveProperty('overallScore');
      expect(health).toHaveProperty('revenueHealth');
      expect(health).toHaveProperty('serviceHealth');
      expect(health).toHaveProperty('paymentHealth');
      expect(health).toHaveProperty('relationshipHealth');

      expect(typeof health.overallScore).toBe('number');
      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);

      expect(Array.isArray(health.riskFactors)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });

    it('should manage account notifications and alerts', async () => {
      // Create customer and large account
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Alert',
          lastName: 'Manager',
          email: 'alerts@test.com',
          phone: '555-9999',
          address: '999 Alert Ave, Notification City, NC 99999',
        },
      });

      const largeAccount = await prisma.largeAccount.create({
        data: {
          customerId: customer.id,
          accountType: 'COMMERCIAL',
          tier: 'GOLD',
          annualRevenue: 100000,
          contractStartDate: new Date('2024-01-01'),
          contractEndDate: new Date('2024-06-01'), // Contract expiring soon
          status: 'ACTIVE',
          accountManager: 'Alert Manager',
          specialTerms: 'Standard terms',
          discountTier: 15,
          serviceLevel: 'ENHANCED',
          priorityRanking: 2,
        },
      });

      // Test notification generation for contract renewal
      const notificationResponse = await request(app.getHttpServer())
        .get(`/api/v1/large-accounts/${largeAccount.id}/notifications`)
        .expect(200);

      const notifications = notificationResponse.body.data;
      expect(Array.isArray(notifications)).toBe(true);

      // Should have contract renewal notification
      const contractNotification = notifications.find(
        (n: any) => n.type === 'CONTRACT_RENEWAL_DUE'
      );
      expect(contractNotification).toBeTruthy();
      expect(contractNotification).toHaveProperty('priority', 'HIGH');
      expect(contractNotification).toHaveProperty('message');
    });
  });

  describe('Account reporting and analytics', () => {
    it('should generate account performance report', async () => {
      // Create customer and large account with performance data
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Performance',
          lastName: 'Manager',
          email: 'performance@test.com',
          phone: '555-1111',
          address: '111 Performance St, Analytics City, AC 11111',
        },
      });

      const largeAccount = await prisma.largeAccount.create({
        data: {
          customerId: customer.id,
          accountType: 'ENTERPRISE',
          tier: 'PLATINUM',
          annualRevenue: 200000,
          contractStartDate: new Date('2024-01-01'),
          contractEndDate: new Date('2025-12-31'),
          status: 'ACTIVE',
          accountManager: 'Performance Manager',
          specialTerms: 'Enterprise terms',
          discountTier: 25,
          serviceLevel: 'PREMIUM',
          priorityRanking: 1,
        },
      });

      // Create vehicle and employees for service records
      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make: 'BMW',
          model: 'X5',
          year: 2023,
          vin: 'PERFORMANCE123456',
        },
      });

      const employee1 = await prisma.employee.create({
        data: {
          firstName: 'Tech',
          lastName: 'One',
          email: 'tech1@example.com',
          role: 'TECHNICIAN',
          employeeId: 'EMP003',
          hireDate: new Date('2023-01-01'),
        },
      });

      const employee2 = await prisma.employee.create({
        data: {
          firstName: 'Tech',
          lastName: 'Two',
          email: 'tech2@example.com',
          role: 'TECHNICIAN',
          employeeId: 'EMP004',
          hireDate: new Date('2023-01-01'),
        },
      });

      // Add performance data
      await prisma.serviceRecord.createMany({
        data: [
          {
            customerId: customer.id,
            vehicleId: vehicle.id,
            employeeId: employee1.id,
            serviceDate: new Date('2024-01-15'),
            serviceType: 'Premium Service A',
            description: 'Premium service package A',
            laborHours: 30,
            partsCost: 15000,
            laborCost: 5000,
          },
          {
            customerId: customer.id,
            vehicleId: vehicle.id,
            employeeId: employee2.id,
            serviceDate: new Date('2024-02-15'),
            serviceType: 'Premium Service B',
            description: 'Premium service package B',
            laborHours: 35,
            partsCost: 18000,
            laborCost: 7000,
          },
        ],
      });

      // Test performance report generation
      const reportResponse = await request(app.getHttpServer())
        .get(`/api/v1/large-accounts/${largeAccount.id}/performance-report`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expect(200);

      const report = reportResponse.body.data;
      expect(report).toHaveProperty('accountSummary');
      expect(report).toHaveProperty('revenueMetrics');
      expect(report).toHaveProperty('serviceMetrics');
      expect(report).toHaveProperty('trendAnalysis');
      expect(report).toHaveProperty('recommendations');

      expect(report.revenueMetrics).toHaveProperty('totalRevenue');
      expect(report.revenueMetrics).toHaveProperty('averageTransactionValue');
      expect(report.revenueMetrics).toHaveProperty('revenueGrowthRate');
    });
  });
});