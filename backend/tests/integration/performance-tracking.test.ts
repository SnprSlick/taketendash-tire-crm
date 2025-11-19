import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PerformanceTrackingService } from '../../src/services/performance-tracking.service';

describe('Performance Tracking Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let performanceTrackingService: PerformanceTrackingService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    performanceTrackingService = module.get<PerformanceTrackingService>(PerformanceTrackingService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up test data in dependency order
    await prisma.serviceRecord.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
  });

  describe('Employee Performance Calculation Workflow', () => {
    it('should calculate performance metrics from service records correctly', async () => {
      // Setup test data
      const employee = await prisma.employee.create({
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

      // Create service records with different complexities
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Oil Change',
          description: 'Regular oil change',
          laborHours: 1.5,
          laborCost: 90.00,
          partsCost: 35.00,
          totalCost: 125.00,
          status: 'COMPLETED'
        }
      });

      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
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
          employeeId: employee.id,
          serviceDate: new Date('2024-01-25'),
          serviceType: 'Brake Service',
          description: 'Brake pad replacement',
          laborHours: 2.5,
          laborCost: 150.00,
          partsCost: 220.00,
          totalCost: 370.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase) - service doesn't exist yet
      const performance = await performanceTrackingService.calculateEmployeePerformance(
        employee.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Verify calculated metrics
      expect(performance).toEqual({
        employeeId: employee.id,
        employeeName: 'John Smith',
        totalRevenue: 1475.00, // 125 + 980 + 370
        totalLaborHours: 7.0,   // 1.5 + 3.0 + 2.5
        revenuePerLaborHour: 210.71, // 1475 / 7 (rounded)
        totalServices: 3,
        averageServiceValue: 491.67, // 1475 / 3 (rounded)
        laborCost: 420.00, // 90 + 180 + 150
        partsCost: 1055.00, // 35 + 800 + 220
        profitMargin: 0, // totalRevenue - laborCost - partsCost = 0 in this case
        serviceBreakdown: {
          'Oil Change': { count: 1, totalRevenue: 125.00, totalHours: 1.5 },
          'Tire Installation': { count: 1, totalRevenue: 980.00, totalHours: 3.0 },
          'Brake Service': { count: 1, totalRevenue: 370.00, totalHours: 2.5 }
        },
        trendData: {
          weeklyRevenue: expect.arrayContaining([
            expect.objectContaining({
              week: expect.any(String),
              revenue: expect.any(Number),
              hours: expect.any(Number)
            })
          ])
        }
      });
    });

    it('should handle multiple employees performance comparison', async () => {
      // Setup multiple employees
      const employee1 = await prisma.employee.create({
        data: {
          firstName: 'High',
          lastName: 'Performer',
          email: 'high@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP001',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const employee2 = await prisma.employee.create({
        data: {
          firstName: 'Average',
          lastName: 'Performer',
          email: 'average@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP002',
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

      // High performer - efficient, high-value services
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee1.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Comprehensive Service',
          laborHours: 4.0,
          laborCost: 240.00,
          partsCost: 300.00,
          totalCost: 800.00, // High profit margin
          status: 'COMPLETED'
        }
      });

      // Average performer - standard services
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee2.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Basic Service',
          laborHours: 2.0,
          laborCost: 120.00,
          partsCost: 50.00,
          totalCost: 200.00,
          status: 'COMPLETED'
        }
      });

      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee2.id,
          serviceDate: new Date('2024-01-20'),
          serviceType: 'Oil Change',
          laborHours: 1.0,
          laborCost: 60.00,
          partsCost: 30.00,
          totalCost: 120.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const comparisonReport = await performanceTrackingService.compareEmployeePerformance(
        [employee1.id, employee2.id],
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(comparisonReport).toEqual({
        employees: [
          expect.objectContaining({
            employeeId: employee1.id,
            revenuePerLaborHour: 200.00, // 800 / 4
            totalRevenue: 800.00,
            totalServices: 1,
            ranking: 1
          }),
          expect.objectContaining({
            employeeId: employee2.id,
            revenuePerLaborHour: 106.67, // 320 / 3 (rounded)
            totalRevenue: 320.00,
            totalServices: 2,
            ranking: 2
          })
        ],
        teamAverages: {
          revenuePerLaborHour: 160.00, // (200 + 106.67) / 2
          totalRevenue: 560.00, // 800 + 320 / 2
          totalServices: 1.5 // (1 + 2) / 2
        },
        topPerformer: {
          employeeId: employee1.id,
          metric: 'revenuePerLaborHour',
          value: 200.00
        }
      });
    });

    it('should integrate with analytics engine for advanced calculations', async () => {
      const employee = await prisma.employee.create({
        data: {
          firstName: 'Analytics',
          lastName: 'Test',
          email: 'analytics@company.com',
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

      // Create service records over multiple months
      const serviceRecords = [];
      for (let month = 1; month <= 6; month++) {
        serviceRecords.push(
          await prisma.serviceRecord.create({
            data: {
              customerId: customer.id,
              vehicleId: vehicle.id,
              employeeId: employee.id,
              serviceDate: new Date(`2024-${month.toString().padStart(2, '0')}-15`),
              serviceType: 'Monthly Service',
              laborHours: 2.0,
              laborCost: 120.00,
              partsCost: 80.00,
              totalCost: 250.00,
              status: 'COMPLETED'
            }
          })
        );
      }

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const analyticsReport = await performanceTrackingService.generateAdvancedAnalytics(
        employee.id,
        new Date('2024-01-01'),
        new Date('2024-06-30')
      );

      expect(analyticsReport).toEqual({
        employeeId: employee.id,
        performanceMetrics: {
          totalRevenue: 1500.00, // 250 * 6
          averageMonthlyRevenue: 250.00,
          revenueGrowthRate: expect.any(Number),
          consistencyScore: expect.any(Number), // Measures consistency across months
          efficiencyScore: expect.any(Number)   // Revenue per hour consistency
        },
        trendAnalysis: {
          monthlyTrends: expect.arrayContaining([
            expect.objectContaining({
              month: expect.any(String),
              revenue: 250.00,
              hours: 2.0,
              servicesCompleted: 1
            })
          ]),
          seasonalityIndex: expect.any(Number),
          predictedNextMonthRevenue: expect.any(Number)
        },
        benchmarks: {
          companyAverage: expect.any(Number),
          industryAverage: expect.any(Number),
          percentileRanking: expect.any(Number)
        },
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            suggestion: expect.any(String),
            impactScore: expect.any(Number)
          })
        ])
      });
    });

    it('should handle real-time performance updates', async () => {
      const employee = await prisma.employee.create({
        data: {
          firstName: 'Real',
          lastName: 'Time',
          email: 'realtime@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP004',
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

      // Initial service record
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Initial Service',
          laborHours: 2.0,
          totalCost: 200.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const initialPerformance = await performanceTrackingService.getRealTimePerformance(employee.id);
      expect(initialPerformance.totalRevenue).toBe(200.00);

      // Add another service record
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2024-01-16'),
          serviceType: 'Additional Service',
          laborHours: 1.5,
          totalCost: 150.00,
          status: 'COMPLETED'
        }
      });

      // Performance should update in real-time
      const updatedPerformance = await performanceTrackingService.getRealTimePerformance(employee.id);
      expect(updatedPerformance.totalRevenue).toBe(350.00);
      expect(updatedPerformance.totalLaborHours).toBe(3.5);
      expect(updatedPerformance.revenuePerLaborHour).toBe(100.00);
    });

    it('should cache performance calculations for optimization', async () => {
      const employee = await prisma.employee.create({
        data: {
          firstName: 'Cache',
          lastName: 'Test',
          email: 'cache@company.com',
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

      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2024-01-15'),
          serviceType: 'Test Service',
          laborHours: 2.0,
          totalCost: 200.00,
          status: 'COMPLETED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const startTime1 = Date.now();
      const performance1 = await performanceTrackingService.calculateEmployeePerformance(
        employee.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      const duration1 = Date.now() - startTime1;

      // Second call should be faster due to caching
      const startTime2 = Date.now();
      const performance2 = await performanceTrackingService.calculateEmployeePerformance(
        employee.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      const duration2 = Date.now() - startTime2;

      // Cached call should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      expect(performance1).toEqual(performance2);

      // Cache should invalidate when new service record is added
      await prisma.serviceRecord.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          serviceDate: new Date('2024-01-20'),
          serviceType: 'New Service',
          laborHours: 1.0,
          totalCost: 100.00,
          status: 'COMPLETED'
        }
      });

      const updatedPerformance = await performanceTrackingService.calculateEmployeePerformance(
        employee.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(updatedPerformance.totalRevenue).toBe(300.00); // 200 + 100
      expect(updatedPerformance.totalServices).toBe(2);
    });

    it('should handle edge cases and error scenarios', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)

      // Test with non-existent employee
      await expect(
        performanceTrackingService.calculateEmployeePerformance(
          'non-existent-id',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )
      ).rejects.toThrow('Employee not found');

      // Test with invalid date range
      await expect(
        performanceTrackingService.calculateEmployeePerformance(
          'some-id',
          new Date('2024-02-01'),
          new Date('2024-01-01') // End before start
        )
      ).rejects.toThrow('Invalid date range');

      // Test with inactive employee
      const inactiveEmployee = await prisma.employee.create({
        data: {
          firstName: 'Inactive',
          lastName: 'Employee',
          email: 'inactive@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP006',
          hireDate: new Date('2023-01-01'),
          status: 'INACTIVE'
        }
      });

      const emptyPerformance = await performanceTrackingService.calculateEmployeePerformance(
        inactiveEmployee.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(emptyPerformance).toEqual({
        employeeId: inactiveEmployee.id,
        employeeName: 'Inactive Employee',
        totalRevenue: 0,
        totalLaborHours: 0,
        revenuePerLaborHour: 0,
        totalServices: 0,
        averageServiceValue: 0,
        laborCost: 0,
        partsCost: 0,
        profitMargin: 0,
        serviceBreakdown: {},
        trendData: { weeklyRevenue: [] }
      });
    });
  });
});