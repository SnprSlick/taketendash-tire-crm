import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceRemindersService } from './service-reminders.service';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(private readonly serviceRemindersService: ServiceRemindersService) {}

  /**
   * Daily reminder generation job
   * Runs every day at 6:00 AM to generate reminders for upcoming services
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM, {
    name: 'daily-reminder-generation',
    timeZone: 'America/New_York',
  })
  async handleDailyReminderGeneration(): Promise<void> {
    this.logger.log('Starting daily reminder generation job');

    try {
      // Generate reminders for the next 30 days
      const result = await this.serviceRemindersService.generateReminders({
        daysAhead: 30,
      });

      this.logger.log(
        `Daily reminder generation completed: ${result.generated} reminders generated`,
      );
    } catch (error) {
      this.logger.error('Daily reminder generation failed:', error.message);
    }
  }

  /**
   * Weekly comprehensive reminder generation job
   * Runs every Monday at 7:00 AM for comprehensive service analysis
   */
  @Cron('0 7 * * 1', { // Every Monday at 7:00 AM
    name: 'weekly-comprehensive-generation',
    timeZone: 'America/New_York',
  })
  async handleWeeklyComprehensiveGeneration(): Promise<void> {
    this.logger.log('Starting weekly comprehensive reminder generation job');

    try {
      // Generate reminders for the next 60 days with all service types
      const serviceTypes = [
        'Oil Change',
        'Tire Rotation',
        'Tire Replacement',
        'Wheel Alignment',
        'Wheel Balancing',
        'Brake Service',
        'General Inspection',
      ];

      const result = await this.serviceRemindersService.generateReminders({
        daysAhead: 60,
        serviceTypes,
      });

      this.logger.log(
        `Weekly comprehensive generation completed: ${result.generated} reminders generated`,
      );
    } catch (error) {
      this.logger.error('Weekly comprehensive reminder generation failed:', error.message);
    }
  }

  /**
   * Urgent reminder generation job for overdue services
   * Runs every 6 hours to catch critically overdue services
   */
  @Cron('0 */6 * * *', {
    name: 'urgent-overdue-reminders',
    timeZone: 'America/New_York',
  })
  async handleUrgentOverdueReminders(): Promise<void> {
    this.logger.log('Starting urgent overdue reminders job');

    try {
      // Generate immediate reminders for services that should have happened already
      const urgentResult = await this.serviceRemindersService.generateReminders({
        daysAhead: 0, // Today
        serviceTypes: ['Oil Change', 'Tire Replacement'], // Critical services
      });

      this.logger.log(
        `Urgent overdue reminders completed: ${urgentResult.generated} urgent reminders generated`,
      );
    } catch (error) {
      this.logger.error('Urgent overdue reminders failed:', error.message);
    }
  }

  /**
   * Monthly tire-specific reminder generation
   * Runs on the 1st of every month at 8:00 AM
   */
  @Cron('0 8 1 * *', {
    name: 'monthly-tire-reminders',
    timeZone: 'America/New_York',
  })
  async handleMonthlyTireReminders(): Promise<void> {
    this.logger.log('Starting monthly tire-specific reminder generation job');

    try {
      const tireServiceTypes = [
        'Tire Rotation',
        'Tire Replacement',
        'Wheel Alignment',
        'Wheel Balancing',
      ];

      const result = await this.serviceRemindersService.generateReminders({
        daysAhead: 90, // Next 3 months
        serviceTypes: tireServiceTypes,
      });

      this.logger.log(
        `Monthly tire reminders completed: ${result.generated} tire-specific reminders generated`,
      );
    } catch (error) {
      this.logger.error('Monthly tire reminders failed:', error.message);
    }
  }

  /**
   * Manual trigger for immediate reminder generation (for testing/admin use)
   */
  async triggerImmediateGeneration(
    daysAhead: number = 30,
    serviceTypes?: string[],
  ): Promise<{ generated: number; message: string }> {
    this.logger.log(`Manually triggering reminder generation for ${daysAhead} days ahead`);

    try {
      const result = await this.serviceRemindersService.generateReminders({
        daysAhead,
        serviceTypes,
      });

      this.logger.log(
        `Manual trigger completed: ${result.generated} reminders generated`,
      );

      return result;
    } catch (error) {
      this.logger.error('Manual reminder generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Health check for scheduler service
   */
  getSchedulerStatus(): {
    serviceName: string;
    scheduledJobs: string[];
    lastRun: string;
  } {
    return {
      serviceName: 'ReminderSchedulerService',
      scheduledJobs: [
        'daily-reminder-generation (6:00 AM daily)',
        'weekly-comprehensive-generation (7:00 AM Mondays)',
        'urgent-overdue-reminders (every 6 hours)',
        'monthly-tire-reminders (8:00 AM 1st of month)',
      ],
      lastRun: new Date().toISOString(),
    };
  }
}