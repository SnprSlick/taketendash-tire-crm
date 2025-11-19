import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../lib/notification-service/coordinator.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentReminderJob {
  private readonly logger = new Logger(AppointmentReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Send appointment reminders for appointments scheduled for tomorrow
   * Runs every day at 6:00 PM
   */
  @Cron('0 18 * * *', {
    name: 'daily-appointment-reminders',
    timeZone: 'America/New_York'
  })
  async sendDailyAppointmentReminders() {
    this.logger.log('Starting daily appointment reminder job');

    try {
      // Get appointments for tomorrow that haven't had reminders sent
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const appointmentsToRemind = await this.prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: tomorrow,
            lte: endOfTomorrow
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
          },
          reminderSent: false
        },
        include: {
          customer: true,
          vehicle: true,
          employee: true
        },
        orderBy: {
          appointmentTime: 'asc'
        }
      });

      this.logger.log(`Found ${appointmentsToRemind.length} appointments requiring reminders for tomorrow`);

      let successCount = 0;
      let errorCount = 0;

      for (const appointment of appointmentsToRemind) {
        try {
          await this.sendAppointmentReminder(appointment);

          // Mark reminder as sent
          await this.prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminderSent: true }
          });

          successCount++;
          this.logger.debug(`Reminder sent for appointment ${appointment.id}`);
        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
        }
      }

      this.logger.log(`Daily reminder job completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      this.logger.error('Daily appointment reminder job failed:', error);
    }
  }

  /**
   * Send appointment reminders for appointments scheduled in 2 hours
   * Runs every hour during business hours (8 AM - 6 PM)
   */
  @Cron('0 8-18 * * *', {
    name: 'hourly-appointment-reminders',
    timeZone: 'America/New_York'
  })
  async sendHourlyAppointmentReminders() {
    this.logger.log('Starting hourly appointment reminder job');

    try {
      // Get appointments for 2 hours from now
      const twoHoursFromNow = new Date();
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);

      const startTime = new Date(twoHoursFromNow);
      startTime.setMinutes(0, 0, 0);

      const endTime = new Date(twoHoursFromNow);
      endTime.setMinutes(59, 59, 999);

      const appointmentsToRemind = await this.prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: startTime,
            lte: endTime
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
          }
        },
        include: {
          customer: true,
          vehicle: true,
          employee: true
        }
      });

      this.logger.log(`Found ${appointmentsToRemind.length} appointments requiring 2-hour reminders`);

      let successCount = 0;
      let errorCount = 0;

      for (const appointment of appointmentsToRemind) {
        try {
          await this.sendAppointmentReminder(appointment, '2-hour');
          successCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to send 2-hour reminder for appointment ${appointment.id}:`, error);
        }
      }

      this.logger.log(`Hourly reminder job completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      this.logger.error('Hourly appointment reminder job failed:', error);
    }
  }

  /**
   * Process missed appointment follow-ups
   * Runs every day at 8:00 AM
   */
  @Cron('0 8 * * *', {
    name: 'missed-appointment-followup',
    timeZone: 'America/New_York'
  })
  async processMissedAppointments() {
    this.logger.log('Starting missed appointment follow-up job');

    try {
      // Get appointments from yesterday that were no-shows or still scheduled/confirmed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      const missedAppointments = await this.prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: yesterday,
            lte: endOfYesterday
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW]
          }
        },
        include: {
          customer: true,
          vehicle: true,
          employee: true
        }
      });

      this.logger.log(`Found ${missedAppointments.length} missed appointments to process`);

      let processedCount = 0;

      for (const appointment of missedAppointments) {
        try {
          // Update status to NO_SHOW if still scheduled/confirmed
          if (appointment.status !== AppointmentStatus.NO_SHOW) {
            await this.prisma.appointment.update({
              where: { id: appointment.id },
              data: {
                status: AppointmentStatus.NO_SHOW,
                notes: `${appointment.notes || ''}\n\nMarked as no-show by automated system on ${new Date().toISOString()}`
              }
            });
          }

          // Send follow-up notification
          await this.sendMissedAppointmentFollowUp(appointment);
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process missed appointment ${appointment.id}:`, error);
        }
      }

      this.logger.log(`Missed appointment follow-up job completed. Processed: ${processedCount}`);
    } catch (error) {
      this.logger.error('Missed appointment follow-up job failed:', error);
    }
  }

  /**
   * Clean up old completed appointments (archive)
   * Runs every Sunday at 2:00 AM
   */
  @Cron('0 2 * * 0', {
    name: 'appointment-cleanup',
    timeZone: 'America/New_York'
  })
  async cleanupOldAppointments() {
    this.logger.log('Starting appointment cleanup job');

    try {
      // Archive appointments older than 2 years
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const oldAppointments = await this.prisma.appointment.findMany({
        where: {
          appointmentDate: {
            lt: twoYearsAgo
          },
          status: {
            in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]
          }
        }
      });

      this.logger.log(`Found ${oldAppointments.length} appointments to archive`);

      // In a real implementation, you might move these to an archive table
      // For now, we'll just log the count
      this.logger.log(`Appointment cleanup job completed. Found ${oldAppointments.length} candidates for archival`);
    } catch (error) {
      this.logger.error('Appointment cleanup job failed:', error);
    }
  }

  /**
   * Send appointment reminder notification
   */
  private async sendAppointmentReminder(appointment: any, reminderType = 'daily') {
    const customer = appointment.customer;
    const employee = appointment.employee;
    const vehicle = appointment.vehicle;

    const appointmentDate = appointment.appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const appointmentTime = this.formatTime(appointment.appointmentTime);

    const notificationData = {
      customerName: `${customer.firstName} ${customer.lastName}`,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      appointmentDate,
      appointmentTime,
      serviceType: appointment.serviceType,
      description: appointment.description || '',
      reminderType
    };

    const results = [];

    // Send based on customer's preferred communication method
    if (['EMAIL', 'ALL'].includes(customer.preferredCommunication) && customer.email) {
      const subject = reminderType === '2-hour'
        ? `Appointment in 2 hours - ${appointment.serviceType}`
        : `Appointment reminder - ${appointment.serviceType}`;

      const emailResult = await this.notificationService.sendEmail({
        to: customer.email,
        subject,
        template: 'appointment-reminder',
        data: notificationData
      });
      results.push({ method: 'email', ...emailResult });
    }

    if (['SMS', 'ALL'].includes(customer.preferredCommunication)) {
      const message = reminderType === '2-hour'
        ? `Reminder: Your ${appointment.serviceType} appointment is in 2 hours at ${appointmentTime}. See you soon!`
        : `Reminder: You have a ${appointment.serviceType} appointment tomorrow at ${appointmentTime}. We look forward to seeing you!`;

      const smsResult = await this.notificationService.sendSMS({
        to: customer.phone,
        message,
        template: 'appointment-reminder-sms',
        data: notificationData
      });
      results.push({ method: 'sms', ...smsResult });
    }

    if (['PHONE', 'ALL'].includes(customer.preferredCommunication)) {
      // For phone calls, we might integrate with a calling service
      // For now, we'll log that a call should be made
      this.logger.log(`Phone reminder needed for appointment ${appointment.id} - Customer: ${customer.phone}`);
    }

    return results;
  }

  /**
   * Send follow-up for missed appointments
   */
  private async sendMissedAppointmentFollowUp(appointment: any) {
    const customer = appointment.customer;
    const notificationData = {
      customerName: `${customer.firstName} ${customer.lastName}`,
      serviceType: appointment.serviceType,
      missedDate: appointment.appointmentDate.toLocaleDateString()
    };

    if (customer.email) {
      await this.notificationService.sendEmail({
        to: customer.email,
        subject: 'We missed you - Let\'s reschedule your appointment',
        template: 'missed-appointment-followup',
        data: notificationData
      });
    }

    if (['SMS', 'ALL'].includes(customer.preferredCommunication)) {
      await this.notificationService.sendSMS({
        to: customer.phone,
        message: `Hi ${customer.firstName}, we missed you for your ${appointment.serviceType} appointment. Please call us to reschedule!`,
        template: 'missed-appointment-sms',
        data: notificationData
      });
    }
  }

  /**
   * Format time string for display
   */
  private formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${period}`;
    } catch (error) {
      return timeString; // Fallback to original format
    }
  }

  /**
   * Manual method to send reminders for specific appointments (for testing/admin use)
   */
  async sendManualReminder(appointmentId: string, reminderType = 'manual') {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        vehicle: true,
        employee: true
      }
    });

    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    const result = await this.sendAppointmentReminder(appointment, reminderType);

    // Update reminder sent status if it's a daily reminder
    if (reminderType === 'daily' || reminderType === 'manual') {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { reminderSent: true }
      });
    }

    return result;
  }
}