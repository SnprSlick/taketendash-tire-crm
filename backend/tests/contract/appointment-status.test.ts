import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('PUT /api/v1/appointments/{id}/status (Contract Test)', () => {
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

  describe('PUT /api/v1/appointments/{id}/status', () => {
    it('should successfully update appointment status with valid transition', async () => {
      // Setup test data
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

      const appointment = await prisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: new Date('2024-12-01'),
          appointmentTime: '10:00:00',
          duration: 60,
          serviceType: 'Oil Change',
          status: 'SCHEDULED'
        }
      });

      const statusUpdate = {
        status: 'CONFIRMED',
        notes: 'Customer confirmed via phone call'
      };

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      const response = await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      // Expected response schema
      expect(response.body).toEqual({
        id: appointment.id,
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: expect.any(String),
        appointmentTime: '10:00:00',
        duration: 60,
        serviceType: 'Oil Change',
        description: null,
        status: 'CONFIRMED',
        reminderSent: false,
        confirmationSent: false,
        notes: 'Customer confirmed via phone call',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should accept all valid appointment status transitions', async () => {
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

      const validTransitions = [
        { from: 'SCHEDULED', to: 'CONFIRMED' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS' },
        { from: 'IN_PROGRESS', to: 'COMPLETED' },
        { from: 'SCHEDULED', to: 'CANCELLED' },
        { from: 'CONFIRMED', to: 'NO_SHOW' }
      ];

      for (const transition of validTransitions) {
        const appointment = await prisma.appointment.create({
          data: {
            customerId: customer.id,
            vehicleId: vehicle.id,
            employeeId: employee.id,
            appointmentDate: new Date('2024-12-01'),
            appointmentTime: '10:00:00',
            duration: 60,
            serviceType: 'Oil Change',
            status: transition.from as any
          }
        });

        // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
        await request(app.getHttpServer())
          .put(`/api/v1/appointments/${appointment.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: transition.to })
          .expect(200)
          .expect((res) => {
            expect(res.body.status).toBe(transition.to);
          });

        // Clean up for next iteration
        await prisma.appointment.delete({ where: { id: appointment.id } });
      }
    });

    it('should reject invalid status transitions', async () => {
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

      const appointment = await prisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: new Date('2024-12-01'),
          appointmentTime: '10:00:00',
          duration: 60,
          serviceType: 'Oil Change',
          status: 'COMPLETED'
        }
      });

      // Try to move completed appointment back to scheduled (invalid transition)
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SCHEDULED' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('transition');
          expect(res.body.message).toContain('invalid');
        });
    });

    it('should reject invalid status values', async () => {
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

      const appointment = await prisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: new Date('2024-12-01'),
          appointmentTime: '10:00:00',
          duration: 60,
          serviceType: 'Oil Change',
          status: 'SCHEDULED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('validation');
        });
    });

    it('should return 404 for non-existent appointment', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toContain('not found');
        });
    });

    it('should reject unauthorized requests', async () => {
      const appointmentId = '550e8400-e29b-41d4-a716-446655440000';

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointmentId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(401);
    });

    it('should handle missing status in request body', async () => {
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

      const appointment = await prisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: new Date('2024-12-01'),
          appointmentTime: '10:00:00',
          duration: 60,
          serviceType: 'Oil Change',
          status: 'SCHEDULED'
        }
      });

      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Some notes without status' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('validation');
          expect(res.body.message).toContain('status');
        });
    });
  });
});