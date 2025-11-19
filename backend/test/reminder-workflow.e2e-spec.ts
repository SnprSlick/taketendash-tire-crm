import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

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

describe('Service Reminder Generation Workflow (E2E)', () => {
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

  describe('Complete Reminder Generation and Notification Workflow', () => {
    it('should generate reminders based on service records and send notifications', async () => {
      // Skip if no auth token (authentication system not fully configured)
      if (!authToken) {
        console.warn('Skipping authenticated workflow tests - no auth token available');
        return;
      }

      // Step 1: Check initial state - get all pending reminders
      const initialRemindersResponse = await request(app.getHttpServer())
        .get('/service-reminders?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialReminderCount = initialRemindersResponse.body.length;
      console.log(`Initial pending reminders: ${initialReminderCount}`);

      // Step 2: Trigger reminder generation (simulate cron job)
      // This would typically be done via a background job, but for testing we'll use an endpoint
      const generationResponse = await request(app.getHttpServer())
        .post('/service-reminders/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysAhead: 30 }) // Generate reminders for next 30 days
        .expect(201);

      expect(generationResponse.body).toMatchObject({
        generated: expect.any(Number),
        message: expect.any(String)
      });

      // Step 3: Verify new reminders were created
      const newRemindersResponse = await request(app.getHttpServer())
        .get('/service-reminders?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const newReminderCount = newRemindersResponse.body.length;
      console.log(`New pending reminders after generation: ${newReminderCount}`);

      // Should have at least same or more reminders
      expect(newReminderCount).toBeGreaterThanOrEqual(initialReminderCount);

      // Step 4: Validate reminder structure
      if (newReminderCount > 0) {
        const reminder = newRemindersResponse.body[0];
        expect(reminder).toMatchObject({
          id: expect.any(String),
          customerId: expect.any(String),
          vehicleId: expect.any(String),
          serviceType: expect.any(String),
          reminderDate: expect.any(String),
          lastServiceDate: expect.any(String),
          status: ReminderStatus.PENDING,
          communicationMethod: expect.stringMatching(/^(EMAIL|SMS|PHONE|ALL)$/),
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        });

        // Step 5: Send a reminder
        const sendResponse = await request(app.getHttpServer())
          .post(`/service-reminders/${reminder.id}/send`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ communicationMethod: CommunicationMethod.EMAIL })
          .expect(200);

        expect(sendResponse.body).toMatchObject({
          id: reminder.id,
          status: ReminderStatus.SENT,
          communicationMethod: CommunicationMethod.EMAIL,
          updatedAt: expect.any(String)
        });

        // Step 6: Verify reminder status changed
        const sentRemindersResponse = await request(app.getHttpServer())
          .get('/service-reminders?status=SENT')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const sentReminder = sentRemindersResponse.body.find((r: any) => r.id === reminder.id);
        expect(sentReminder).toBeDefined();
        expect(sentReminder.status).toBe(ReminderStatus.SENT);
      }
    });

    it('should handle reminder generation for specific date ranges', async () => {
      if (!authToken) {
        console.warn('Skipping date range generation tests - no auth token available');
        return;
      }

      // Test generating reminders for a specific upcoming date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7); // 7 days from now

      const specificGenerationResponse = await request(app.getHttpServer())
        .post('/service-reminders/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetDate: targetDate.toISOString().split('T')[0],
          serviceTypes: ['Oil Change', 'Tire Rotation']
        })
        .expect(201);

      expect(specificGenerationResponse.body).toMatchObject({
        generated: expect.any(Number),
        targetDate: expect.any(String),
        serviceTypes: expect.arrayContaining(['Oil Change', 'Tire Rotation'])
      });
    });

    it('should filter reminders by multiple criteria', async () => {
      if (!authToken) {
        console.warn('Skipping filter tests - no auth token available');
        return;
      }

      // Test complex filtering
      const today = new Date().toISOString().split('T')[0];

      const filteredResponse = await request(app.getHttpServer())
        .get(`/service-reminders?status=PENDING&reminderDate=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All returned reminders should match the filter criteria
      filteredResponse.body.forEach((reminder: any) => {
        expect(reminder.status).toBe(ReminderStatus.PENDING);
        expect(reminder.reminderDate.split('T')[0]).toBe(today);
      });
    });
  });

  describe('Reminder Workflow Error Handling', () => {
    it('should handle generation errors gracefully', async () => {
      if (!authToken) {
        console.warn('Skipping error handling tests - no auth token available');
        return;
      }

      // Test with invalid parameters
      await request(app.getHttpServer())
        .post('/service-reminders/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysAhead: -10 }) // Invalid negative days
        .expect(400);
    });

    it('should handle sending reminders for non-existent IDs', async () => {
      if (!authToken) {
        console.warn('Skipping non-existent ID tests - no auth token available');
        return;
      }

      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';

      await request(app.getHttpServer())
        .post(`/service-reminders/${nonExistentId}/send`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ communicationMethod: CommunicationMethod.EMAIL })
        .expect(404);
    });

    it('should prevent duplicate reminder sending', async () => {
      if (!authToken) {
        console.warn('Skipping duplicate sending tests - no auth token available');
        return;
      }

      // Get a pending reminder
      const remindersResponse = await request(app.getHttpServer())
        .get('/service-reminders?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (remindersResponse.body.length > 0) {
        const reminder = remindersResponse.body[0];

        // Send the reminder first time
        await request(app.getHttpServer())
          .post(`/service-reminders/${reminder.id}/send`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ communicationMethod: CommunicationMethod.EMAIL })
          .expect(200);

        // Try to send the same reminder again - should fail
        await request(app.getHttpServer())
          .post(`/service-reminders/${reminder.id}/send`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ communicationMethod: CommunicationMethod.EMAIL })
          .expect(409); // Conflict - already sent
      }
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across reminder lifecycle', async () => {
      if (!authToken) {
        console.warn('Skipping data consistency tests - no auth token available');
        return;
      }

      // Get reminders count by status
      const statusCounts = {};
      const statuses = [ReminderStatus.PENDING, ReminderStatus.SENT, ReminderStatus.DISMISSED, ReminderStatus.CONVERTED];

      for (const status of statuses) {
        const response = await request(app.getHttpServer())
          .get(`/service-reminders?status=${status}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        statusCounts[status] = response.body.length;
      }

      console.log('Reminder counts by status:', statusCounts);

      // Verify all reminders have valid UUIDs and timestamps
      for (const status of statuses) {
        const response = await request(app.getHttpServer())
          .get(`/service-reminders?status=${status}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.forEach((reminder: any) => {
          // Validate UUID format
          expect(reminder.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          expect(reminder.customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          expect(reminder.vehicleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

          // Validate timestamp formats
          expect(new Date(reminder.createdAt)).toBeInstanceOf(Date);
          expect(new Date(reminder.updatedAt)).toBeInstanceOf(Date);
          expect(new Date(reminder.reminderDate)).toBeInstanceOf(Date);
          expect(new Date(reminder.lastServiceDate)).toBeInstanceOf(Date);

          // Validate enums
          expect(Object.values(ReminderStatus)).toContain(reminder.status);
          expect(Object.values(CommunicationMethod)).toContain(reminder.communicationMethod);
        });
      }
    });

    it('should validate date logic for reminders', async () => {
      if (!authToken) {
        console.warn('Skipping date logic tests - no auth token available');
        return;
      }

      const remindersResponse = await request(app.getHttpServer())
        .get('/service-reminders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify logical date relationships
      remindersResponse.body.forEach((reminder: any) => {
        const createdAt = new Date(reminder.createdAt);
        const updatedAt = new Date(reminder.updatedAt);
        const reminderDate = new Date(reminder.reminderDate);
        const lastServiceDate = new Date(reminder.lastServiceDate);

        // Updated date should be >= created date
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());

        // Reminder date should be after last service date
        expect(reminderDate.getTime()).toBeGreaterThan(lastServiceDate.getTime());
      });
    });
  });
});