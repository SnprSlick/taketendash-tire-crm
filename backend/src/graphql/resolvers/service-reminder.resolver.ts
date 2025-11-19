import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, ValidationPipe } from '@nestjs/common';
import { ServiceReminder, GenerateRemindersResponse } from '../types/service-reminder.type';
import {
  ServiceReminderFiltersInput,
  SendReminderInput,
  GenerateRemindersInput,
  UpdateReminderStatusInput
} from '../inputs/service-reminder.input';
import { PaginationInput } from '../inputs/pagination.input';
import { ServiceRemindersService } from '../../modules/service-reminders/service-reminders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReminderStatus } from '@prisma/client';

@Resolver(() => ServiceReminder)
@UseGuards(JwtAuthGuard)
export class ServiceReminderResolver {
  constructor(private readonly serviceRemindersService: ServiceRemindersService) {}

  @Query(() => [ServiceReminder])
  async serviceReminders(
    @Args('filters', { nullable: true, type: () => ServiceReminderFiltersInput })
    filters?: ServiceReminderFiltersInput,
    @Args('pagination', { nullable: true })
    pagination?: PaginationInput,
  ): Promise<ServiceReminder[]> {
    // Default behavior - get pending reminders if no filters provided
    if (!filters) {
      return this.serviceRemindersService.findPendingReminders();
    }

    // Apply specific filters based on provided criteria
    if (filters.status) {
      return this.serviceRemindersService.findRemindersByStatus(filters.status);
    }

    if (filters.reminderDate) {
      return this.serviceRemindersService.findRemindersByDate(new Date(filters.reminderDate));
    }

    if (filters.customerId) {
      return this.serviceRemindersService.findRemindersByCustomer(filters.customerId, filters.status);
    }

    if (filters.vehicleId) {
      return this.serviceRemindersService.findRemindersByVehicle(filters.vehicleId, filters.status);
    }

    // TODO: Implement comprehensive filtering in service when available
    return this.serviceRemindersService.findPendingReminders();
  }

  @Query(() => ServiceReminder)
  async serviceReminder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ServiceReminder> {
    const reminder = await this.serviceRemindersService.findReminderById(id);
    if (!reminder) {
      throw new Error('Service reminder not found');
    }
    return reminder;
  }

  @Query(() => [ServiceReminder])
  async customerReminders(
    @Args('customerId', { type: () => ID }) customerId: string,
    @Args('status', { type: () => ReminderStatus, nullable: true }) status?: ReminderStatus,
  ): Promise<ServiceReminder[]> {
    return this.serviceRemindersService.findRemindersByCustomer(customerId, status);
  }

  @Query(() => [ServiceReminder])
  async vehicleReminders(
    @Args('vehicleId', { type: () => ID }) vehicleId: string,
    @Args('status', { type: () => ReminderStatus, nullable: true }) status?: ReminderStatus,
  ): Promise<ServiceReminder[]> {
    return this.serviceRemindersService.findRemindersByVehicle(vehicleId, status);
  }

  @Mutation(() => ServiceReminder)
  async sendServiceReminder(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', new ValidationPipe()) input: SendReminderInput,
  ): Promise<ServiceReminder> {
    return this.serviceRemindersService.sendReminder(id, input.communicationMethod);
  }

  @Mutation(() => GenerateRemindersResponse)
  async generateServiceReminders(
    @Args('input', new ValidationPipe()) input: GenerateRemindersInput,
  ): Promise<GenerateRemindersResponse> {
    const request = {
      daysAhead: input.daysAhead,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      serviceTypes: input.serviceTypes,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
    };

    return this.serviceRemindersService.generateReminders(request);
  }

  @Mutation(() => ServiceReminder)
  async updateReminderStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', new ValidationPipe()) input: UpdateReminderStatusInput,
  ): Promise<ServiceReminder> {
    return this.serviceRemindersService.updateReminderStatus(id, input.status);
  }

  @Mutation(() => Boolean)
  async deleteServiceReminder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.serviceRemindersService.deleteReminder(id);
    return true;
  }
}