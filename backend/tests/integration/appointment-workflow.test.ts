import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../../src/lib/notification-service/coordinator.service';
import { CustomerService } from '../../src/lib/customer-service/customer.service';

describe('Appointment Scheduling Workflow (Integration Test)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let notificationService: NotificationService;
  let customerService: CustomerService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
    customerService = moduleFixture.get<CustomerService>(CustomerService);

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
    await prisma.serviceReminder.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();

    // Mock notification service methods
    jest.spyOn(notificationService, 'sendEmail').mockResolvedValue({ success: true, messageId: 'test-msg-id' });
    jest.spyOn(notificationService, 'sendSMS').mockResolvedValue({ success: true, messageId: 'test-sms-id' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Appointment Scheduling Workflow', () => {
    it('should handle complete appointment lifecycle from creation to completion', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)

      // Step 1: Create customer and vehicle via customer service
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        preferredCommunication: 'EMAIL'
      };

      const vehicleData = {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vin: '1234567890ABCDEFG',
        tireSize: '225/50R17'
      };

      // Use customer service library
      const customer = await customerService.createCustomer(customerData);
      const vehicle = await customerService.addVehicle(customer.id, vehicleData);

      // Step 2: Create service advisor employee
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

      // Step 3: Schedule appointment
      const appointmentData = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2024-12-01',
        appointmentTime: '10:00:00',
        duration: 90,
        serviceType: 'Oil Change and Tire Rotation',
        description: 'Regular maintenance service'
      };

      const appointmentResponse = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      const appointmentId = appointmentResponse.body.id;

      // Verify appointment was created with correct status
      expect(appointmentResponse.body.status).toBe('SCHEDULED');
      expect(appointmentResponse.body.reminderSent).toBe(false);
      expect(appointmentResponse.body.confirmationSent).toBe(false);

      // Step 4: Confirm appointment
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CONFIRMED',
          notes: 'Customer confirmed via phone'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('CONFIRMED');
          expect(res.body.confirmationSent).toBe(false);
        });

      // Step 5: Send appointment confirmation
      await request(app.getHttpServer())
        .post(`/api/v1/appointments/${appointmentId}/send-confirmation`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify confirmation was sent
      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });
      expect(updatedAppointment.confirmationSent).toBe(true);

      // Verify notification service was called
      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: customer.email,
          subject: expect.stringContaining('appointment'),
          template: expect.stringContaining('confirmation')
        })
      );

      // Step 6: Start service
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PROGRESS',
          notes: 'Service started'
        })
        .expect(200);

      // Step 7: Complete service
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'COMPLETED',
          notes: 'Service completed successfully'
        })
        .expect(200);

      // Step 8: Verify service record is created automatically
      const serviceRecords = await prisma.serviceRecord.findMany({
        where: {
          customerId: customer.id,
          vehicleId: vehicle.id
        }
      });

      expect(serviceRecords).toHaveLength(1);
      expect(serviceRecords[0].serviceType).toBe('Oil Change and Tire Rotation');
      expect(serviceRecords[0].employeeId).toBe(employee.id);

      // Step 9: Verify follow-up reminder is scheduled
      const serviceReminders = await prisma.serviceReminder.findMany({
        where: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          status: 'PENDING'
        }
      });

      expect(serviceReminders.length).toBeGreaterThan(0);
      expect(serviceReminders[0].reminderType).toContain('follow-up');
    });

    it('should prevent scheduling conflicts for the same employee', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)

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

      // Create first appointment
      const firstAppointment = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2024-12-01',
        appointmentTime: '10:00:00',
        duration: 90,
        serviceType: 'Oil Change'
      };

      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstAppointment)
        .expect(201);

      // Try to create overlapping appointment
      const overlappingAppointment = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        employeeId: employee.id,
        appointmentDate: '2024-12-01',
        appointmentTime: '10:30:00', // Overlaps with first appointment
        duration: 60,
        serviceType: 'Tire Rotation'
      };

      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(overlappingAppointment)
        .expect(409)
        .expect((res) => {
          expect(res.body.error).toContain('conflict');
        });
    });

    it('should handle appointment cancellation and notification workflow', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)

      const customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com',
          accountType: 'INDIVIDUAL',
          status: 'ACTIVE',
          preferredCommunication: 'ALL'
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

      // Create appointment
      const appointmentResponse = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: '2024-12-01',
          appointmentTime: '10:00:00',
          serviceType: 'Oil Change'
        })
        .expect(201);

      const appointmentId = appointmentResponse.body.id;

      // Cancel appointment
      await request(app.getHttpServer())
        .put(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CANCELLED',
          notes: 'Customer requested cancellation'
        })
        .expect(200);

      // Send cancellation notification
      await request(app.getHttpServer())
        .post(`/api/v1/appointments/${appointmentId}/send-cancellation`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify multi-channel notification was sent
      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: customer.email,
          subject: expect.stringContaining('cancelled'),
        })
      );

      expect(notificationService.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: customer.phone,
          message: expect.stringContaining('cancelled'),
        })
      );

      // Verify time slot is now available
      const newAppointmentResponse = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: '2024-12-01',
          appointmentTime: '10:00:00',
          serviceType: 'Tire Inspection'
        })
        .expect(201);

      expect(newAppointmentResponse.body.status).toBe('SCHEDULED');
    });

    it('should integrate with customer service for customer and vehicle validation', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)

      // Try to create appointment with non-existent customer
      const nonExistentCustomerId = '550e8400-e29b-41d4-a716-446655440000';
      const nonExistentVehicleId = '550e8400-e29b-41d4-a716-446655440001';

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

      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: nonExistentCustomerId,
          vehicleId: nonExistentVehicleId,
          employeeId: employee.id,
          appointmentDate: '2024-12-01',
          appointmentTime: '10:00:00',
          serviceType: 'Oil Change'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('validation');
          expect(res.body.message).toMatch(/customer|vehicle/);
        });

      // Verify customer service integration
      const customer = await customerService.createCustomer({
        firstName: 'Valid',
        lastName: 'Customer',
        phone: '+1234567890',
        preferredCommunication: 'EMAIL'
      });

      // Try with valid customer but non-existent vehicle
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          vehicleId: nonExistentVehicleId,
          employeeId: employee.id,
          appointmentDate: '2024-12-01',
          appointmentTime: '10:00:00',
          serviceType: 'Oil Change'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toContain('validation');
          expect(res.body.message).toContain('vehicle');
        });
    });

    it('should handle appointment reminders workflow', async () => {
      // THIS TEST MUST FAIL INITIALLY (TDD Red Phase)

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

      // Create appointment for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointmentResponse = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.id,
          employeeId: employee.id,
          appointmentDate: tomorrow.toISOString().split('T')[0],
          appointmentTime: '10:00:00',
          serviceType: 'Oil Change'
        })
        .expect(201);

      const appointmentId = appointmentResponse.body.id;

      // Send appointment reminder
      await request(app.getHttpServer())
        .post(`/api/v1/appointments/${appointmentId}/send-reminder`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify reminder was sent
      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });
      expect(updatedAppointment.reminderSent).toBe(true);

      // Verify notification service was called
      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: customer.email,
          subject: expect.stringContaining('reminder'),
        })
      );
    });
  });
});