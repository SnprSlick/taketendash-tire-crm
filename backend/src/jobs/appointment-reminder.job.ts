import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
// Temporarily disabled notification service
// import { NotificationService } from '../lib/notification-service/coordinator.service';
import { AppointmentStatus } from '@prisma/client';

// Temporarily disabled appointment reminder job due to missing notification service
/*
@Injectable()
export class AppointmentReminderJob {
  // ... all the original job logic would go here
}
*/

// Placeholder class for temporarily disabled appointment reminder job
@Injectable()
export class AppointmentReminderJob {
  private readonly logger = new Logger(AppointmentReminderJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // Placeholder methods to prevent errors if referenced elsewhere
  async sendManualReminder(appointmentId: string, reminderType = 'manual') {
    this.logger.warn('Appointment reminder service is temporarily disabled');
    return null;
  }
}