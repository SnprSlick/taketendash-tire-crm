import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ServiceRemindersController } from './service-reminders.controller';
import { ServiceRemindersService } from './service-reminders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DISMISSED = 'DISMISSED',
  CONVERTED = 'CONVERTED'
}

enum CommunicationMethod {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
  ALL = 'ALL'
}

interface ServiceReminder {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceType: string;
  reminderDate: string;
  lastServiceDate: string;
  mileage?: number;
  status: ReminderStatus;
  communicationMethod: CommunicationMethod;
  createdAt: string;
  updatedAt: string;
}

describe('ServiceRemindersController (Contract Tests)', () => {
  let app: INestApplication;
  let serviceRemindersService: jest.Mocked<ServiceRemindersService>;

  const mockServiceReminders: ServiceReminder[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      vehicleId: '550e8400-e29b-41d4-a716-446655440002',
      serviceType: 'Oil Change',
      reminderDate: '2023-12-01T00:00:00.000Z',
      lastServiceDate: '2023-09-01T00:00:00.000Z',
      mileage: 75000,
      status: ReminderStatus.PENDING,
      communicationMethod: CommunicationMethod.EMAIL,
      createdAt: '2023-11-18T10:00:00.000Z',
      updatedAt: '2023-11-18T10:00:00.000Z'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      customerId: '550e8400-e29b-41d4-a716-446655440004',
      vehicleId: '550e8400-e29b-41d4-a716-446655440005',
      serviceType: 'Tire Rotation',
      reminderDate: '2023-11-25T00:00:00.000Z',
      lastServiceDate: '2023-05-25T00:00:00.000Z',
      mileage: 80000,
      status: ReminderStatus.PENDING,
      communicationMethod: CommunicationMethod.SMS,
      createdAt: '2023-11-18T10:00:00.000Z',
      updatedAt: '2023-11-18T10:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    const mockServiceRemindersService = {
      findPendingReminders: jest.fn(),
      findRemindersByStatus: jest.fn(),
      findRemindersByDate: jest.fn(),
      sendReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceRemindersController],
      providers: [
        {
          provide: ServiceRemindersService,
          useValue: mockServiceRemindersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();

    serviceRemindersService = module.get(ServiceRemindersService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /service-reminders', () => {
    it('should return all pending service reminders with correct contract structure', async () => {
      serviceRemindersService.findPendingReminders.mockResolvedValue(mockServiceReminders);

      const response = await request(app.getHttpServer())
        .get('/service-reminders')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);

      const reminder = response.body[0];
      expect(reminder).toMatchObject({
        id: expect.any(String),
        customerId: expect.any(String),
        vehicleId: expect.any(String),
        serviceType: expect.any(String),
        reminderDate: expect.any(String),
        lastServiceDate: expect.any(String),
        status: expect.stringMatching(/^(PENDING|SENT|DISMISSED|CONVERTED)$/),
        communicationMethod: expect.stringMatching(/^(EMAIL|SMS|PHONE|ALL)$/),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      // Verify UUID format for IDs
      expect(reminder.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(reminder.customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(reminder.vehicleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Verify date formats (ISO 8601)
      expect(reminder.reminderDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(reminder.lastServiceDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(reminder.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(reminder.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      expect(serviceRemindersService.findPendingReminders).toHaveBeenCalled();
    });

    it('should filter service reminders by status query parameter', async () => {
      const sentReminders = mockServiceReminders.map(r => ({ ...r, status: ReminderStatus.SENT }));
      serviceRemindersService.findRemindersByStatus.mockResolvedValue(sentReminders);

      await request(app.getHttpServer())
        .get('/service-reminders?status=SENT')
        .expect(200);

      expect(serviceRemindersService.findRemindersByStatus).toHaveBeenCalledWith(ReminderStatus.SENT);
    });

    it('should filter service reminders by reminder date query parameter', async () => {
      const dateFilteredReminders = [mockServiceReminders[0]];
      serviceRemindersService.findRemindersByDate.mockResolvedValue(dateFilteredReminders);

      await request(app.getHttpServer())
        .get('/service-reminders?reminderDate=2023-12-01')
        .expect(200);

      expect(serviceRemindersService.findRemindersByDate).toHaveBeenCalledWith(new Date('2023-12-01'));
    });

    it('should filter by both status and reminder date when both query parameters provided', async () => {
      const filteredReminders = [mockServiceReminders[0]];
      serviceRemindersService.findRemindersByStatus.mockImplementation((status) => {
        if (status === ReminderStatus.PENDING) {
          return Promise.resolve(filteredReminders);
        }
        return Promise.resolve([]);
      });

      await request(app.getHttpServer())
        .get('/service-reminders?status=PENDING&reminderDate=2023-12-01')
        .expect(200);

      expect(serviceRemindersService.findRemindersByStatus).toHaveBeenCalledWith(ReminderStatus.PENDING);
    });

    it('should return empty array when no reminders found', async () => {
      serviceRemindersService.findPendingReminders.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/service-reminders')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should handle invalid status parameter gracefully', async () => {
      await request(app.getHttpServer())
        .get('/service-reminders?status=INVALID_STATUS')
        .expect(400);
    });

    it('should handle invalid date format gracefully', async () => {
      await request(app.getHttpServer())
        .get('/service-reminders?reminderDate=invalid-date')
        .expect(400);
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      // Re-create app without JWT override for auth tests
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ServiceRemindersController],
        providers: [
          {
            provide: ServiceRemindersService,
            useValue: {
              findPendingReminders: jest.fn(),
            },
          },
        ],
      }).compile();

      if (app) await app.close();
      app = module.createNestApplication();
      await app.init();
    });

    it('should require authentication for accessing service reminders', async () => {
      await request(app.getHttpServer())
        .get('/service-reminders')
        .expect(401);
    });
  });

  describe('POST /service-reminders/{reminderId}/send', () => {
    const validReminderId = '550e8400-e29b-41d4-a716-446655440000';
    const validSendRequest = {
      communicationMethod: CommunicationMethod.EMAIL
    };

    beforeEach(async () => {
      // Re-enable JWT mock for send tests
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ServiceRemindersController],
        providers: [
          {
            provide: ServiceRemindersService,
            useValue: {
              sendReminder: jest.fn(),
            },
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      if (app) await app.close();
      app = module.createNestApplication();
      await app.init();

      serviceRemindersService = module.get(ServiceRemindersService);
    });

    it('should send reminder successfully with valid request', async () => {
      const sentReminder: ServiceReminder = {
        ...mockServiceReminders[0],
        id: validReminderId,
        status: ReminderStatus.SENT,
        communicationMethod: CommunicationMethod.EMAIL,
        updatedAt: new Date().toISOString()
      };

      serviceRemindersService.sendReminder.mockResolvedValue(sentReminder);

      const response = await request(app.getHttpServer())
        .post(`/service-reminders/${validReminderId}/send`)
        .send(validSendRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        id: validReminderId,
        customerId: expect.any(String),
        vehicleId: expect.any(String),
        serviceType: expect.any(String),
        reminderDate: expect.any(String),
        lastServiceDate: expect.any(String),
        status: ReminderStatus.SENT,
        communicationMethod: CommunicationMethod.EMAIL,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(serviceRemindersService.sendReminder).toHaveBeenCalledWith(
        validReminderId,
        CommunicationMethod.EMAIL
      );
    });

    it('should accept different communication methods', async () => {
      const testMethods = [
        CommunicationMethod.EMAIL,
        CommunicationMethod.SMS,
        CommunicationMethod.PHONE,
        CommunicationMethod.ALL
      ];

      for (const method of testMethods) {
        const sentReminder = {
          ...mockServiceReminders[0],
          status: ReminderStatus.SENT,
          communicationMethod: method
        };

        serviceRemindersService.sendReminder.mockResolvedValue(sentReminder);

        await request(app.getHttpServer())
          .post(`/service-reminders/${validReminderId}/send`)
          .send({ communicationMethod: method })
          .expect(200);

        expect(serviceRemindersService.sendReminder).toHaveBeenCalledWith(validReminderId, method);
      }
    });

    it('should return 400 for invalid reminder ID format', async () => {
      const invalidId = 'invalid-uuid-format';

      await request(app.getHttpServer())
        .post(`/service-reminders/${invalidId}/send`)
        .send(validSendRequest)
        .expect(400);
    });

    it('should return 400 for missing communication method in request body', async () => {
      await request(app.getHttpServer())
        .post(`/service-reminders/${validReminderId}/send`)
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid communication method', async () => {
      await request(app.getHttpServer())
        .post(`/service-reminders/${validReminderId}/send`)
        .send({ communicationMethod: 'INVALID_METHOD' })
        .expect(400);
    });

    it('should return 404 for non-existent reminder ID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';

      serviceRemindersService.sendReminder.mockRejectedValue(new Error('Reminder not found'));

      await request(app.getHttpServer())
        .post(`/service-reminders/${nonExistentId}/send`)
        .send(validSendRequest)
        .expect(404);
    });

    it('should return 409 if reminder has already been sent', async () => {
      serviceRemindersService.sendReminder.mockRejectedValue(new Error('Reminder already sent'));

      await request(app.getHttpServer())
        .post(`/service-reminders/${validReminderId}/send`)
        .send(validSendRequest)
        .expect(409);
    });

    it('should validate UUID format for reminder ID parameter', async () => {
      const malformedUuids = [
        'not-a-uuid',
        '123',
        '550e8400-e29b-41d4-a716',  // too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        'ggge8400-e29b-41d4-a716-446655440000' // invalid characters
      ];

      for (const invalidId of malformedUuids) {
        await request(app.getHttpServer())
          .post(`/service-reminders/${invalidId}/send`)
          .send(validSendRequest)
          .expect(400);
      }
    });

    it('should handle service errors gracefully', async () => {
      serviceRemindersService.sendReminder.mockRejectedValue(new Error('Notification service unavailable'));

      await request(app.getHttpServer())
        .post(`/service-reminders/${validReminderId}/send`)
        .send(validSendRequest)
        .expect(503);
    });

    it('should require authentication for sending reminders', async () => {
      // Remove JWT mock for this test
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ServiceRemindersController],
        providers: [
          {
            provide: ServiceRemindersService,
            useValue: { sendReminder: jest.fn() },
          },
        ],
      }).compile();

      if (app) await app.close();
      app = module.createNestApplication();
      await app.init();

      await request(app.getHttpServer())
        .post(`/service-reminders/${validReminderId}/send`)
        .send(validSendRequest)
        .expect(401);
    });
  });
});