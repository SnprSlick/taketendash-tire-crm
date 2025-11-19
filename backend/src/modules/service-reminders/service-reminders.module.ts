import { Module } from '@nestjs/common';
import { ServiceRemindersService } from './service-reminders.service';
import { ServiceRemindersRepository } from './service-reminders.repository';
import { ServiceRemindersController } from './service-reminders.controller';
import { ServiceReminderResolver } from '../../graphql/resolvers/service-reminder.resolver';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Module({
  controllers: [ServiceRemindersController],
  providers: [
    ServiceRemindersService,
    ServiceRemindersRepository,
    ServiceReminderResolver,
    ReminderSchedulerService
  ],
  exports: [ServiceRemindersService, ServiceRemindersRepository, ReminderSchedulerService],
})
export class ServiceRemindersModule {}