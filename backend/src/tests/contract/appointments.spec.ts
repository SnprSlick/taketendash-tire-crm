import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('POST /api/v1/appointments (Contract Test)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create auth token for tests
    authToken = jwtService.sign({
      sub: 'test-employee-id',
      role: 'SERVICE_ADVISOR'
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.appointment.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
  });

  describe('POST /api/v1/appointments', () => {
    it('should accept valid appointment request with all required fields', async () => {
      // Setup test data
      const customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com',
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

      const employee = await prisma.employee.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP001',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const appointmentData = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2024-12-01',
        appointmentTime: '10:00:00',
        duration: 90,
        serviceType: 'Oil Change',
        description: 'Regular oil change service',
        status: 'SCHEDULED'
      };

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      // Expected response schema
      expect(response.body).toEqual({
        id: expect.any(String),
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2024-12-01T00:00:00.000Z',
        appointmentTime: '10:00:00',
        duration: 90,
        serviceType: 'Oil Change',
        description: 'Regular oil change service',
        status: 'SCHEDULED',
        reminderSent: false,
        confirmationSent: false,
        notes: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should reject appointment with missing required fields', async () => {
      const invalidData = {
        appointmentDate: '2024-12-01',
        appointmentTime: '10:00:00'
        // Missing required fields: customerId, vehicleId, employeeId, serviceType
      };

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('validation');
          expect(res.body.message).toContain('required');
        });
    });

    it('should reject appointment with past date', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
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

      const employee = await prisma.employee.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP001',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      const pastAppointmentData = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2020-01-01', // Past date
        appointmentTime: '10:00:00',
        serviceType: 'Oil Change'
      };

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pastAppointmentData)
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('validation');
          expect(res.body.message).toContain('future');
        });
    });

    it('should reject appointment with scheduling conflict', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
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

      const employee = await prisma.employee.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@company.com',
          role: 'SERVICE_ADVISOR',
          employeeId: 'EMP001',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIVE'
        }
      });

      // Create existing appointment
      await prisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: new Date('2024-12-01'),
          appointmentTime: '10:00:00',
          duration: 60,
          serviceType: 'Existing Service',
          status: 'SCHEDULED'
        }
      });

      // Try to create overlapping appointment
      const conflictingData = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2024-12-01',
        appointmentTime: '10:30:00', // Overlaps with existing 10:00-11:00
        duration: 60,
        serviceType: 'Oil Change'
      };

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictingData)
        .expect(409)
        .expect((res) => {
          expect(res.body.error).toContain('conflict');
          expect(res.body.message).toContain('overlapping');
        });
    });

    it('should reject unauthorized requests', async () => {
      const appointmentData = {
        customerId: 'some-id',
        vehicleId: 'some-id',
        employeeId: 'some-id',
        appointmentDate: '2024-12-01',
        appointmentTime: '10:00:00',
        serviceType: 'Oil Change'
      };

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send(appointmentData)
        .expect(401);
    });
  });
});