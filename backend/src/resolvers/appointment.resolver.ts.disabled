import { Resolver, Query, Mutation, Args, Context, ID, Subscription } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppointmentService } from '../services/appointment.service';
import {
  AppointmentType,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
  AppointmentFiltersInput
} from '../graphql/types/appointment.type';
import { EmployeeRole } from '@prisma/client';

const pubSub = new PubSub();

@Resolver(() => AppointmentType)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentResolver {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Mutation(() => AppointmentType)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async createAppointment(
    @Args('input') input: CreateAppointmentInput,
    @Context() context: any
  ): Promise<AppointmentType> {
    try {
      const appointment = await this.appointmentService.createAppointment(input);

      // Publish appointment created event
      pubSub.publish('appointmentCreated', {
        appointmentCreated: appointment,
        employeeId: input.employeeId
      });

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  @Query(() => [AppointmentType])
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER, EmployeeRole.ACCOUNT_MANAGER)
  async appointments(
    @Args('filters', { nullable: true }) filters?: AppointmentFiltersInput,
    @Context() context?: any
  ): Promise<AppointmentType[]> {
    const result = await this.appointmentService.getAppointments(filters || {});
    return result.appointments;
  }

  @Query(() => AppointmentType, { nullable: true })
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER, EmployeeRole.ACCOUNT_MANAGER)
  async appointment(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<AppointmentType | null> {
    const appointment = await this.appointmentService.getAppointmentById(id);

    if (!appointment) {
      return null;
    }

    // Check if user has permission to view this appointment
    const userRole = context.req.user?.role;
    const userId = context.req.user?.sub;

    if (userRole === EmployeeRole.SERVICE_ADVISOR && appointment.employeeId !== userId) {
      throw new ForbiddenException('Access denied: You can only view your own appointments');
    }

    return appointment;
  }

  @Mutation(() => AppointmentType)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async updateAppointment(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAppointmentInput,
    @Context() context: any
  ): Promise<AppointmentType> {
    const appointment = await this.appointmentService.updateAppointment(id, input);

    // Publish appointment updated event
    pubSub.publish('appointmentUpdated', {
      appointmentUpdated: appointment,
      employeeId: appointment.employeeId
    });

    return appointment;
  }

  @Mutation(() => AppointmentType)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async updateAppointmentStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAppointmentStatusInput,
    @Context() context: any
  ): Promise<AppointmentType> {
    const appointment = await this.appointmentService.updateAppointmentStatus(id, input);

    // Publish status update event
    pubSub.publish('appointmentStatusChanged', {
      appointmentStatusChanged: appointment,
      employeeId: appointment.employeeId,
      customerId: appointment.customerId,
      newStatus: appointment.status
    });

    return appointment;
  }

  @Mutation(() => Boolean)
  @Roles(EmployeeRole.MANAGER)
  async deleteAppointment(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<boolean> {
    const result = await this.appointmentService.deleteAppointment(id);

    if (result) {
      pubSub.publish('appointmentDeleted', {
        appointmentDeleted: { id },
      });
    }

    return !!result;
  }

  @Mutation(() => AppointmentType)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async sendAppointmentConfirmation(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<AppointmentType> {
    const result = await this.appointmentService.sendAppointmentConfirmation(id);

    // Publish confirmation sent event
    pubSub.publish('appointmentConfirmationSent', {
      appointmentConfirmationSent: result.appointment,
      customerId: result.appointment.customerId
    });

    return result.appointment;
  }

  @Mutation(() => AppointmentType)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async sendAppointmentReminder(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<AppointmentType> {
    const result = await this.appointmentService.sendAppointmentReminder(id);

    // Publish reminder sent event
    pubSub.publish('appointmentReminderSent', {
      appointmentReminderSent: result.appointment,
      customerId: result.appointment.customerId
    });

    return result.appointment;
  }

  @Mutation(() => AppointmentType)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async sendAppointmentCancellation(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<AppointmentType> {
    const result = await this.appointmentService.sendAppointmentCancellation(id);

    // Publish cancellation sent event
    pubSub.publish('appointmentCancellationSent', {
      appointmentCancellationSent: result.appointment,
      customerId: result.appointment.customerId
    });

    return result.appointment;
  }

  @Query(() => [AppointmentType])
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async employeeSchedule(
    @Args('employeeId', { type: () => ID }) employeeId: string,
    @Args('date', { nullable: true }) date?: string,
    @Args('days', { nullable: true }) days?: number,
    @Context() context?: any
  ): Promise<AppointmentType[]> {
    const userRole = context.req.user?.role;
    const userId = context.req.user?.sub;

    // Service advisors can only view their own schedule
    if (userRole === EmployeeRole.SERVICE_ADVISOR && employeeId !== userId) {
      throw new ForbiddenException('Access denied: You can only view your own schedule');
    }

    return await this.appointmentService.getEmployeeSchedule(employeeId, date, days || 7);
  }

  @Query(() => [AppointmentType])
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER, EmployeeRole.ACCOUNT_MANAGER)
  async customerAppointmentHistory(
    @Args('customerId', { type: () => ID }) customerId: string,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
    @Context() context?: any
  ): Promise<AppointmentType[]> {
    const result = await this.appointmentService.getCustomerAppointmentHistory(
      customerId,
      page || 1,
      limit || 10
    );
    return result.appointments;
  }

  @Query(() => Boolean)
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async checkAppointmentConflicts(
    @Args('employeeId', { type: () => ID }) employeeId: string,
    @Args('date') date: string,
    @Args('time') time: string,
    @Args('duration') duration: number,
    @Args('excludeAppointmentId', { type: () => ID, nullable: true }) excludeAppointmentId?: string,
    @Context() context?: any
  ): Promise<boolean> {
    const result = await this.appointmentService.checkSchedulingConflicts(
      employeeId,
      date,
      time,
      duration,
      excludeAppointmentId
    );
    return result.hasConflict;
  }

  // Subscriptions for real-time updates
  @Subscription(() => AppointmentType, {
    filter: (payload, variables) => {
      return payload.employeeId === variables.employeeId;
    }
  })
  appointmentCreated(
    @Args('employeeId', { type: () => ID }) employeeId: string
  ) {
    return pubSub.asyncIterator('appointmentCreated');
  }

  @Subscription(() => AppointmentType, {
    filter: (payload, variables) => {
      return payload.employeeId === variables.employeeId;
    }
  })
  appointmentUpdated(
    @Args('employeeId', { type: () => ID }) employeeId: string
  ) {
    return pubSub.asyncIterator('appointmentUpdated');
  }

  @Subscription(() => AppointmentType, {
    filter: (payload, variables) => {
      return payload.employeeId === variables.employeeId ||
             payload.customerId === variables.customerId;
    }
  })
  appointmentStatusChanged(
    @Args('employeeId', { type: () => ID, nullable: true }) employeeId?: string,
    @Args('customerId', { type: () => ID, nullable: true }) customerId?: string
  ) {
    return pubSub.asyncIterator('appointmentStatusChanged');
  }

  @Subscription(() => AppointmentType, {
    filter: (payload, variables) => {
      return payload.customerId === variables.customerId;
    }
  })
  appointmentConfirmationSent(
    @Args('customerId', { type: () => ID }) customerId: string
  ) {
    return pubSub.asyncIterator('appointmentConfirmationSent');
  }

  @Subscription(() => AppointmentType, {
    filter: (payload, variables) => {
      return payload.customerId === variables.customerId;
    }
  })
  appointmentReminderSent(
    @Args('customerId', { type: () => ID }) customerId: string
  ) {
    return pubSub.asyncIterator('appointmentReminderSent');
  }
}