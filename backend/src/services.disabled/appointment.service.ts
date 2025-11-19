import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from '../lib/customer-service/customer.service';
import { NotificationService } from '../lib/notification-service/coordinator.service';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { CreateAppointmentDto, UpdateAppointmentDto, UpdateAppointmentStatusDto } from '../dto/appointment.dto';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly notificationService: NotificationService
  ) {}

  async createAppointment(data: CreateAppointmentDto) {
    this.logger.log(`Creating appointment: ${JSON.stringify({
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      employeeId: data.employeeId,
      date: data.appointmentDate,
      time: data.appointmentTime,
      serviceType: data.serviceType
    })}`);

    // Validation: Check appointment date is in the future
    const appointmentDateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}`);
    const now = new Date();

    if (appointmentDateTime <= now) {
      this.logger.warn(`Attempted to create appointment in the past: ${appointmentDateTime}`);
      throw new BadRequestException('Appointment date must be in the future');
    }

    // Validation: Verify customer exists and is active
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId }
    });

    if (!customer) {
      this.logger.warn(`Customer not found: ${data.customerId}`);
      throw new BadRequestException('Customer not found');
    }

    if (customer.status !== 'ACTIVE') {
      this.logger.warn(`Cannot schedule appointment for inactive customer: ${data.customerId}`);
      throw new BadRequestException('Cannot schedule appointment for inactive customer');
    }

    this.logger.debug(`Customer validation passed: ${customer.firstName} ${customer.lastName}`);

    // Validation: Verify vehicle exists and belongs to customer
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: data.vehicleId }
    });

    if (!vehicle) {
      this.logger.warn(`Vehicle not found: ${data.vehicleId}`);
      throw new BadRequestException('Vehicle not found');
    }

    if (vehicle.customerId !== data.customerId) {
      this.logger.warn(`Vehicle ${data.vehicleId} does not belong to customer ${data.customerId}`);
      throw new BadRequestException('Vehicle does not belong to the specified customer');
    }

    this.logger.debug(`Vehicle validation passed: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);

    // Validation: Verify employee exists and is active
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId }
    });

    if (!employee) {
      this.logger.warn(`Employee not found: ${data.employeeId}`);
      throw new BadRequestException('Employee not found');
    }

    if (employee.status !== 'ACTIVE') {
      this.logger.warn(`Cannot assign appointment to inactive employee: ${data.employeeId}`);
      throw new BadRequestException('Cannot assign appointment to inactive employee');
    }

    this.logger.debug(`Employee validation passed: ${employee.firstName} ${employee.lastName}`);

    // Validation: Check for scheduling conflicts
    this.logger.debug(`Checking scheduling conflicts for employee ${data.employeeId}`);
    const hasConflict = await this.checkSchedulingConflicts(
      data.employeeId,
      data.appointmentDate,
      data.appointmentTime,
      data.duration || 60
    );

    if (hasConflict.hasConflict) {
      this.logger.warn(`Scheduling conflict detected: ${hasConflict.message}`);
      throw new ConflictException(`Scheduling conflict detected: ${hasConflict.message}`);
    }

    // Create the appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        employeeId: data.employeeId,
        appointmentDate: new Date(data.appointmentDate),
        appointmentTime: data.appointmentTime,
        duration: data.duration || 60,
        serviceType: data.serviceType,
        description: data.description,
        status: data.status || AppointmentStatus.SCHEDULED,
        notes: data.notes
      },
      include: {
        customer: true,
        vehicle: true,
        employee: true
      }
    });

    this.logger.log(`Successfully created appointment ${appointment.id} for ${customer.firstName} ${customer.lastName}`);
    return appointment;
  }

  async getAppointments(filters: any) {
    const {
      customerId,
      employeeId,
      date,
      status,
      page = 1,
      limit = 10
    } = filters;

    const where: Prisma.AppointmentWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          customer: true,
          vehicle: true,
          employee: true
        },
        orderBy: [
          { appointmentDate: 'asc' },
          { appointmentTime: 'asc' }
        ],
        skip,
        take: limit
      }),
      this.prisma.appointment.count({ where })
    ]);

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getAppointmentById(id: string) {
    return await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        employee: true
      }
    });
  }

  async updateAppointment(id: string, data: UpdateAppointmentDto) {
    this.logger.log(`Updating appointment ${id} with data: ${JSON.stringify(data)}`);
    const existingAppointment = await this.getAppointmentById(id);
    if (!existingAppointment) {
      this.logger.warn(`Appointment not found for update: ${id}`);
      throw new NotFoundException('Appointment not found');
    }

    // If updating date/time/employee/duration, check for conflicts
    if (data.appointmentDate || data.appointmentTime || data.employeeId || data.duration) {
      const employeeId = data.employeeId || existingAppointment.employeeId;
      const appointmentDate = data.appointmentDate || existingAppointment.appointmentDate.toISOString().split('T')[0];
      const appointmentTime = data.appointmentTime || existingAppointment.appointmentTime;
      const duration = data.duration || existingAppointment.duration;

      const conflict = await this.checkSchedulingConflicts(
        employeeId,
        appointmentDate,
        appointmentTime,
        duration,
        id // Exclude current appointment from conflict check
      );

      if (conflict.hasConflict) {
        this.logger.warn(`Scheduling conflict detected while updating appointment ${id}: ${conflict.message}`);
        throw new ConflictException(`Scheduling conflict detected: ${conflict.message}`);
      }
      this.logger.debug(`No scheduling conflicts found for appointment ${id} update`);
    }

    // Validate date is in future if being updated
    if (data.appointmentDate || data.appointmentTime) {
      const dateStr = data.appointmentDate || existingAppointment.appointmentDate.toISOString().split('T')[0];
      const timeStr = data.appointmentTime || existingAppointment.appointmentTime;
      const appointmentDateTime = new Date(`${dateStr}T${timeStr}`);

      if (appointmentDateTime <= new Date()) {
        this.logger.warn(`Attempted to update appointment ${id} to past date: ${appointmentDateTime}`);
        throw new BadRequestException('Appointment date must be in the future');
      }
    }

    const updateData: Prisma.AppointmentUpdateInput = {};

    if (data.vehicleId) updateData.vehicleId = data.vehicleId;
    if (data.employeeId) updateData.employeeId = data.employeeId;
    if (data.appointmentDate) updateData.appointmentDate = new Date(data.appointmentDate);
    if (data.appointmentTime) updateData.appointmentTime = data.appointmentTime;
    if (data.duration) updateData.duration = data.duration;
    if (data.serviceType) updateData.serviceType = data.serviceType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.reminderSent !== undefined) updateData.reminderSent = data.reminderSent;
    if (data.confirmationSent !== undefined) updateData.confirmationSent = data.confirmationSent;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        employee: true
      }
    });

    this.logger.log(`Successfully updated appointment ${id}`);
    return updatedAppointment;
  }

  async updateAppointmentStatus(id: string, data: UpdateAppointmentStatusDto) {
    this.logger.log(`Updating appointment ${id} status to ${data.status}`);
    const existingAppointment = await this.getAppointmentById(id);
    if (!existingAppointment) {
      this.logger.warn(`Appointment not found for status update: ${id}`);
      throw new NotFoundException('Appointment not found');
    }

    // Validate status transition
    const isValidTransition = this.isValidStatusTransition(existingAppointment.status, data.status);
    if (!isValidTransition) {
      this.logger.warn(`Invalid status transition attempt for appointment ${id}: ${existingAppointment.status} -> ${data.status}`);
      throw new BadRequestException(
        `Invalid status transition from ${existingAppointment.status} to ${data.status}`
      );
    }

    const updateData: Prisma.AppointmentUpdateInput = {
      status: data.status
    };

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // If completing appointment, create service record
    if (data.status === AppointmentStatus.COMPLETED) {
      this.logger.log(`Creating service record for completed appointment ${id}`);
      await this.createServiceRecordFromAppointment(existingAppointment);
      this.logger.log(`Scheduling follow-up reminder for appointment ${id}`);
      await this.scheduleFollowUpReminder(existingAppointment);
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        employee: true
      }
    });

    this.logger.log(`Successfully updated appointment ${id} status to ${data.status}`);
    return updatedAppointment;
  }

  async deleteAppointment(id: string) {
    this.logger.log(`Attempting to delete appointment ${id}`);
    const appointment = await this.getAppointmentById(id);
    if (!appointment) {
      this.logger.warn(`Appointment not found for deletion: ${id}`);
      throw new NotFoundException('Appointment not found');
    }

    // Only allow deletion if appointment is SCHEDULED or CANCELLED
    if (!['SCHEDULED', 'CANCELLED'].includes(appointment.status)) {
      this.logger.warn(`Cannot delete appointment ${id} with status ${appointment.status}`);
      throw new BadRequestException('Cannot delete appointment with current status');
    }

    await this.prisma.appointment.delete({
      where: { id }
    });

    this.logger.log(`Successfully deleted appointment ${id}`);
    return { success: true };
  }

  async sendAppointmentConfirmation(id: string) {
    this.logger.log(`Sending confirmation for appointment ${id}`);
    const appointment = await this.getAppointmentById(id);
    if (!appointment) {
      this.logger.warn(`Appointment not found for confirmation: ${id}`);
      throw new NotFoundException('Appointment not found');
    }

    // Send notification based on customer's preferred communication method
    const notificationResult = await this.sendAppointmentNotification(
      appointment,
      'confirmation',
      'appointment-confirmation'
    );

    // Update appointment confirmation status
    await this.prisma.appointment.update({
      where: { id },
      data: { confirmationSent: true }
    });

    this.logger.log(`Successfully sent confirmation for appointment ${id}`);
    return {
      appointment: await this.getAppointmentById(id),
      notificationResult
    };
  }

  async sendAppointmentReminder(id: string) {
    this.logger.log(`Sending reminder for appointment ${id}`);
    const appointment = await this.getAppointmentById(id);
    if (!appointment) {
      this.logger.warn(`Appointment not found for reminder: ${id}`);
      throw new NotFoundException('Appointment not found');
    }

    const notificationResult = await this.sendAppointmentNotification(
      appointment,
      'reminder',
      'appointment-reminder'
    );

    // Update appointment reminder status
    await this.prisma.appointment.update({
      where: { id },
      data: { reminderSent: true }
    });

    this.logger.log(`Successfully sent reminder for appointment ${id}`);
    return {
      appointment: await this.getAppointmentById(id),
      notificationResult
    };
  }

  async sendAppointmentCancellation(id: string) {
    this.logger.log(`Sending cancellation notification for appointment ${id}`);
    const appointment = await this.getAppointmentById(id);
    if (!appointment) {
      this.logger.warn(`Appointment not found for cancellation: ${id}`);
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.CANCELLED) {
      this.logger.warn(`Cannot send cancellation for appointment ${id} with status ${appointment.status}`);
      throw new BadRequestException('Appointment must be cancelled before sending cancellation notification');
    }

    const notificationResult = await this.sendAppointmentNotification(
      appointment,
      'cancellation',
      'appointment-cancellation'
    );

    this.logger.log(`Successfully sent cancellation notification for appointment ${id}`);
    return {
      appointment,
      notificationResult
    };
  }

  async getEmployeeSchedule(employeeId: string, date?: string, days = 7) {
    this.logger.debug(`Fetching schedule for employee ${employeeId}, ${days} days from ${date || 'today'}`);
    const startDate = date ? new Date(date) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days - 1);

    return await this.prisma.appointment.findMany({
      where: {
        employeeId,
        appointmentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        customer: true,
        vehicle: true,
        employee: true
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { appointmentTime: 'asc' }
      ]
    });
  }

  async getCustomerAppointmentHistory(customerId: string, page = 1, limit = 10) {
    this.logger.debug(`Fetching appointment history for customer ${customerId}, page ${page}, limit ${limit}`);
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { customerId },
        include: {
          customer: true,
          vehicle: true,
          employee: true
        },
        orderBy: { appointmentDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.appointment.count({ where: { customerId } })
    ]);

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async checkSchedulingConflicts(
    employeeId: string,
    date: string,
    time: string,
    duration: number,
    excludeAppointmentId?: string
  ) {
    this.logger.debug(`Checking conflicts for employee ${employeeId} on ${date} at ${time} (${duration}min)`);
    const appointmentDate = new Date(date);
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + (duration * 60000));

    const where: Prisma.AppointmentWhereInput = {
      employeeId,
      appointmentDate,
      status: {
        not: AppointmentStatus.CANCELLED
      }
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const existingAppointments = await this.prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        vehicle: true
      }
    });

    const conflictingAppointments = existingAppointments.filter(existing => {
      const existingStart = new Date(`${existing.appointmentDate.toISOString().split('T')[0]}T${existing.appointmentTime}`);
      const existingEnd = new Date(existingStart.getTime() + (existing.duration * 60000));

      // Check if times overlap
      return (startDateTime < existingEnd && endDateTime > existingStart);
    });

    const hasConflict = conflictingAppointments.length > 0;
    this.logger.debug(`Conflict check result: ${hasConflict ? 'CONFLICT FOUND' : 'NO CONFLICTS'}`);

    return {
      hasConflict,
      conflictingAppointments,
      message: hasConflict
        ? `Overlapping appointment found from ${conflictingAppointments[0].appointmentTime}`
        : null
    };
  }

  private isValidStatusTransition(currentStatus: AppointmentStatus, newStatus: AppointmentStatus): boolean {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW
      ],
      [AppointmentStatus.IN_PROGRESS]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED
      ],
      [AppointmentStatus.COMPLETED]: [], // No transitions from completed
      [AppointmentStatus.CANCELLED]: [], // No transitions from cancelled
      [AppointmentStatus.NO_SHOW]: []    // No transitions from no-show
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async createServiceRecordFromAppointment(appointment: any) {
    // This is a simplified service record creation
    // In a real implementation, you'd collect more details about parts, labor costs, etc.
    this.logger.debug(`Creating service record for appointment ${appointment.id}`);
    await this.prisma.serviceRecord.create({
      data: {
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
        employeeId: appointment.employeeId,
        serviceDate: appointment.appointmentDate,
        serviceType: appointment.serviceType,
        description: appointment.description || `Service completed from appointment: ${appointment.serviceType}`,
        laborHours: appointment.duration / 60, // Convert minutes to hours
        partsCost: 0, // Would be filled in by service advisor
        laborCost: 0, // Would be calculated based on labor hours and rate
        notes: appointment.notes
      }
    });
  }

  private async scheduleFollowUpReminder(appointment: any) {
    // Schedule a follow-up reminder for next service based on service type
    const reminderDays = this.getFollowUpReminderDays(appointment.serviceType);
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + reminderDays);

    this.logger.debug(`Scheduling follow-up reminder for appointment ${appointment.id} in ${reminderDays} days`);

    await this.prisma.serviceReminder.create({
      data: {
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
        reminderType: 'follow-up',
        reminderDate,
        reminderMessage: `It's time for your next ${appointment.serviceType} service`,
        communicationMethod: appointment.customer.preferredCommunication
      }
    });
  }

  private getFollowUpReminderDays(serviceType: string): number {
    // Service-specific follow-up intervals
    const reminderIntervals: Record<string, number> = {
      'Oil Change': 90, // 3 months
      'Tire Rotation': 180, // 6 months
      'Brake Service': 365, // 1 year
      'Transmission Service': 730, // 2 years
      'General Maintenance': 180 // 6 months
    };

    return reminderIntervals[serviceType] || 180; // Default 6 months
  }

  private async sendAppointmentNotification(appointment: any, type: string, template: string) {
    const customer = appointment.customer;
    const employee = appointment.employee;
    const vehicle = appointment.vehicle;

    const notificationData = {
      customerName: `${customer.firstName} ${customer.lastName}`,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      appointmentDate: appointment.appointmentDate.toLocaleDateString(),
      appointmentTime: appointment.appointmentTime,
      serviceType: appointment.serviceType,
      description: appointment.description
    };

    const results = [];

    // Send based on customer's preferred communication method
    if (['EMAIL', 'ALL'].includes(customer.preferredCommunication) && customer.email) {
      const emailResult = await this.notificationService.sendEmail({
        to: customer.email,
        subject: `Appointment ${type} - ${appointment.serviceType}`,
        template,
        data: notificationData
      });
      results.push({ method: 'email', ...emailResult });
    }

    if (['SMS', 'ALL'].includes(customer.preferredCommunication)) {
      const smsResult = await this.notificationService.sendSMS({
        to: customer.phone,
        message: `Appointment ${type}: ${appointment.serviceType} on ${notificationData.appointmentDate} at ${notificationData.appointmentTime}`,
        template,
        data: notificationData
      });
      results.push({ method: 'sms', ...smsResult });
    }

    return results;
  }
}