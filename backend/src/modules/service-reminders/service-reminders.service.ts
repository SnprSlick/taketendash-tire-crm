import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ServiceRemindersRepository } from './service-reminders.repository';
import {
  ServiceReminderEntity,
  ServiceReminderDto,
  CreateServiceReminderRequest,
  UpdateServiceReminderRequest,
  ServiceReminderFilters,
  GenerateRemindersRequest,
  GenerateRemindersResponse
} from './entities/service-reminder.entity';
import { ReminderStatus, CommunicationMethod } from '@prisma/client';
import { NotificationServiceLib, NotificationRequest } from '../../libraries/notification-service';

@Injectable()
export class ServiceRemindersService {
  private readonly logger = new Logger(ServiceRemindersService.name);

  constructor(
    private readonly serviceRemindersRepository: ServiceRemindersRepository,
    private readonly notificationService: NotificationServiceLib,
  ) {}

  async findReminderById(id: string): Promise<ServiceReminderDto | null> {
    const reminder = await this.serviceRemindersRepository.findWithRelations(id);
    if (!reminder) {
      return null;
    }
    return this.mapToDto(reminder);
  }

  async findPendingReminders(): Promise<ServiceReminderDto[]> {
    const reminders = await this.serviceRemindersRepository.findPendingReminders();
    return reminders.map(reminder => this.mapToDto(reminder));
  }

  async findRemindersByStatus(status: ReminderStatus): Promise<ServiceReminderDto[]> {
    const reminders = await this.serviceRemindersRepository.findByStatus(status);
    return reminders.map(reminder => this.mapToDto(reminder));
  }

  async findRemindersByDate(date: Date): Promise<ServiceReminderDto[]> {
    const reminders = await this.serviceRemindersRepository.findByDate(date);
    return reminders.map(reminder => this.mapToDto(reminder));
  }

  async findRemindersByCustomer(customerId: string, status?: ReminderStatus): Promise<ServiceReminderDto[]> {
    const reminders = await this.serviceRemindersRepository.findByCustomer(customerId, status);
    return reminders.map(reminder => this.mapToDto(reminder));
  }

  async findRemindersByVehicle(vehicleId: string, status?: ReminderStatus): Promise<ServiceReminderDto[]> {
    const reminders = await this.serviceRemindersRepository.findByVehicle(vehicleId, status);
    return reminders.map(reminder => this.mapToDto(reminder));
  }

  async sendReminder(id: string, communicationMethod: CommunicationMethod): Promise<ServiceReminderDto> {
    const reminderWithDetails = await this.serviceRemindersRepository.findWithRelations(id);

    if (!reminderWithDetails) {
      throw new NotFoundException('Service reminder not found');
    }

    if (reminderWithDetails.status === ReminderStatus.SENT) {
      throw new ConflictException('Service reminder has already been sent');
    }

    try {
      // Prepare notification request based on communication method
      const notificationRequest: NotificationRequest = {
        templateId: 'service_reminder',
        recipient: {
          email: reminderWithDetails.customer.email,
          phone: reminderWithDetails.customer.phone,
          name: `${reminderWithDetails.customer.firstName} ${reminderWithDetails.customer.lastName}`,
        },
        variables: {
          customerName: `${reminderWithDetails.customer.firstName} ${reminderWithDetails.customer.lastName}`,
          vehicleMake: reminderWithDetails.vehicle.make,
          vehicleModel: reminderWithDetails.vehicle.model,
          lastServiceDate: reminderWithDetails.lastService?.serviceDate?.toLocaleDateString() || 'Not available',
          recommendedService: reminderWithDetails.reminderType || 'General Service',
          currentMileage: reminderWithDetails.vehicle.mileage?.toString() || 'Not available',
          phoneNumber: '(555) 123-4567', // TODO: Get from business settings
          businessName: 'TakeTen Auto Service', // TODO: Get from business settings
        },
        priority: this.determinePriority(reminderWithDetails.reminderDate),
      };

      // Send notification based on communication method
      let notificationResult;
      switch (communicationMethod) {
        case CommunicationMethod.EMAIL:
          if (!reminderWithDetails.customer.email) {
            throw new BadRequestException('Customer email is required for email notifications');
          }
          notificationResult = await this.notificationService.sendNotification(notificationRequest);
          break;

        case CommunicationMethod.SMS:
          if (!reminderWithDetails.customer.phone) {
            throw new BadRequestException('Customer phone is required for SMS notifications');
          }
          // Create SMS-optimized version
          const smsRequest = {
            ...notificationRequest,
            templateId: 'service_reminder_sms', // Would need to create this template
          };
          notificationResult = await this.notificationService.sendNotification(smsRequest);
          break;

        case CommunicationMethod.PHONE:
          this.logger.log(`Phone call reminder logged for ${reminderWithDetails.customer.phone}`);
          notificationResult = { id: `phone_${Date.now()}`, status: 'sent' as const, timestamp: new Date() };
          break;

        case CommunicationMethod.ALL:
          // Send both email and SMS if available
          const notifications: Promise<any>[] = [];
          if (reminderWithDetails.customer.email) {
            notifications.push(this.notificationService.sendNotification(notificationRequest));
          }
          if (reminderWithDetails.customer.phone) {
            const smsRequest = { ...notificationRequest, templateId: 'service_reminder_sms' };
            notifications.push(this.notificationService.sendNotification(smsRequest));
          }

          const results = await Promise.allSettled(notifications);
          notificationResult = { id: `multi_${Date.now()}`, status: 'sent' as const, timestamp: new Date() };
          break;

        default:
          throw new BadRequestException(`Unsupported communication method: ${communicationMethod}`);
      }

      if (notificationResult.status === 'failed') {
        throw new Error(notificationResult.error || 'Notification failed');
      }

      this.logger.log(`Reminder ${id} sent successfully via ${communicationMethod}`);

      // Mark reminder as sent
      const updatedReminder = await this.serviceRemindersRepository.markAsSent(id, communicationMethod);
      return this.mapToDto(updatedReminder);
    } catch (error) {
      this.logger.error(`Failed to send reminder ${id}:`, error.message);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to send service reminder');
    }
  }

  async generateReminders(request: GenerateRemindersRequest): Promise<GenerateRemindersResponse> {
    const {
      daysAhead = 30,
      targetDate,
      serviceTypes,
      customerId,
      vehicleId
    } = request;

    // Calculate target date for reminder generation
    const calculatedTargetDate = targetDate || new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    this.logger.log(`Generating reminders for target date: ${calculatedTargetDate.toISOString()}`);

    try {
      // Find service records that need reminders
      const serviceRecordsNeedingReminders = await this.serviceRemindersRepository.findRemindersForGeneration(
        calculatedTargetDate,
        serviceTypes,
        customerId,
        vehicleId
      );

      let generatedCount = 0;

      // Generate reminders based on service history and tire service intervals
      for (const serviceRecord of serviceRecordsNeedingReminders) {
        const reminderDate = this.calculateReminderDate(serviceRecord, calculatedTargetDate);
        const reminderType = this.determineReminderType(serviceRecord);
        const message = this.generateReminderMessage(serviceRecord, reminderType);

        // Use customer's preferred communication method
        const communicationMethod = serviceRecord.customer.preferredCommunication || CommunicationMethod.EMAIL;

        const createRequest: CreateServiceReminderRequest = {
          customerId: serviceRecord.customerId,
          vehicleId: serviceRecord.vehicleId,
          lastServiceId: serviceRecord.id,
          reminderType,
          reminderDate,
          reminderMessage: message,
          communicationMethod,
        };

        await this.createReminder(createRequest);
        generatedCount++;
      }

      const response: GenerateRemindersResponse = {
        generated: generatedCount,
        message: `Successfully generated ${generatedCount} service reminders`,
        targetDate: calculatedTargetDate.toISOString().split('T')[0],
        serviceTypes,
      };

      this.logger.log(`Generated ${generatedCount} reminders for ${serviceRecordsNeedingReminders.length} service records`);

      return response;
    } catch (error) {
      this.logger.error('Failed to generate reminders:', error.message);
      throw new BadRequestException('Failed to generate service reminders');
    }
  }

  async updateReminderStatus(id: string, status: ReminderStatus, notes?: string): Promise<ServiceReminderDto> {
    const reminder = await this.serviceRemindersRepository.findById(id);

    if (!reminder) {
      throw new NotFoundException('Service reminder not found');
    }

    // Log status change
    this.logger.log(`Updating reminder ${id} status from ${reminder.status} to ${status}`);

    const updatedReminder = await this.serviceRemindersRepository.updateStatus(id, status, notes);
    return this.mapToDto(updatedReminder);
  }

  async bulkUpdateReminderStatus(
    ids: string[],
    status: ReminderStatus,
    notes?: string
  ): Promise<ServiceReminderDto[]> {
    this.logger.log(`Bulk updating ${ids.length} reminders to status: ${status}`);

    const updatedReminders: ServiceReminderDto[] = [];

    for (const id of ids) {
      try {
        const updated = await this.updateReminderStatus(id, status, notes);
        updatedReminders.push(updated);
      } catch (error) {
        this.logger.error(`Failed to update reminder ${id}:`, error.message);
      }
    }

    return updatedReminders;
  }

  async getReminderStatusHistory(id: string): Promise<any[]> {
    // TODO: Implement status history tracking in repository
    // For now return mock data
    return [
      {
        id: '1',
        reminderId: id,
        previousStatus: 'PENDING',
        newStatus: 'SENT',
        changedBy: 'system',
        changedAt: new Date().toISOString(),
        notes: 'Automated reminder sent via email',
      }
    ];
  }

  async getReminderMetrics(startDate: Date, endDate: Date): Promise<any> {
    const reminders = await this.serviceRemindersRepository.findByDateRange(startDate, endDate);

    const metrics = {
      total: reminders.length,
      pending: reminders.filter(r => r.status === ReminderStatus.PENDING).length,
      sent: reminders.filter(r => r.status === ReminderStatus.SENT).length,
      dismissed: reminders.filter(r => r.status === ReminderStatus.DISMISSED).length,
      converted: reminders.filter(r => r.status === ReminderStatus.CONVERTED).length,
      conversionRate: 0,
      byServiceType: {} as Record<string, number>,
      byCommunicationMethod: {} as Record<string, number>,
    };

    // Calculate conversion rate
    if (metrics.sent > 0) {
      metrics.conversionRate = (metrics.converted / metrics.sent) * 100;
    }

    // Group by service type
    reminders.forEach(reminder => {
      const serviceType = reminder.reminderType || 'General Service';
      metrics.byServiceType[serviceType] = (metrics.byServiceType[serviceType] || 0) + 1;
    });

    // Group by communication method
    reminders.forEach(reminder => {
      const method = reminder.communicationMethod;
      metrics.byCommunicationMethod[method] = (metrics.byCommunicationMethod[method] || 0) + 1;
    });

    this.logger.log(`Generated metrics for ${metrics.total} reminders between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    return metrics;
  }

  async deleteReminder(id: string): Promise<void> {
    const reminder = await this.serviceRemindersRepository.findById(id);

    if (!reminder) {
      throw new NotFoundException('Service reminder not found');
    }

    await this.serviceRemindersRepository.delete(id);
  }

  async createReminder(request: CreateServiceReminderRequest): Promise<ServiceReminderDto> {
    const reminderData = {
      ...request,
      status: ReminderStatus.PENDING,
      communicationMethod: request.communicationMethod || CommunicationMethod.EMAIL,
    };

    const reminder = await this.serviceRemindersRepository.create(reminderData);
    return this.mapToDto(reminder);
  }

  async updateReminder(id: string, request: UpdateServiceReminderRequest): Promise<ServiceReminderDto> {
    const existingReminder = await this.serviceRemindersRepository.findById(id);

    if (!existingReminder) {
      throw new NotFoundException('Service reminder not found');
    }

    const updatedReminder = await this.serviceRemindersRepository.update(id, request);
    return this.mapToDto(updatedReminder);
  }

  // Private helper methods

  private calculateReminderDate(serviceRecord: any, targetDate: Date): Date {
    // Calculate reminder date based on service type and mileage
    const serviceDate = new Date(serviceRecord.serviceDate);
    const monthsSinceService = Math.floor((targetDate.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    let reminderInterval = 6; // Default 6 months

    // Adjust interval based on service type
    switch (serviceRecord.serviceType.toLowerCase()) {
      case 'oil change':
        reminderInterval = 3; // 3 months
        break;
      case 'tire rotation':
        reminderInterval = 6; // 6 months
        break;
      case 'tire replacement':
        reminderInterval = 24; // 2 years
        break;
      case 'alignment':
        reminderInterval = 12; // 1 year
        break;
      case 'balancing':
        reminderInterval = 12; // 1 year
        break;
      default:
        reminderInterval = 6;
    }

    // Calculate the next service due date
    const nextServiceDate = new Date(serviceDate);
    nextServiceDate.setMonth(nextServiceDate.getMonth() + reminderInterval);

    // If next service is overdue, set reminder for immediate attention
    if (nextServiceDate <= new Date()) {
      return new Date();
    }

    // Set reminder 1 week before next service date
    const reminderDate = new Date(nextServiceDate);
    reminderDate.setDate(reminderDate.getDate() - 7);

    return reminderDate;
  }

  private determineReminderType(serviceRecord: any): string {
    const serviceType = serviceRecord.serviceType.toLowerCase();

    if (serviceType.includes('oil')) {
      return 'Oil Change Reminder';
    } else if (serviceType.includes('tire rotation')) {
      return 'Tire Rotation Reminder';
    } else if (serviceType.includes('tire replacement') || serviceType.includes('new tires')) {
      return 'Tire Inspection Reminder';
    } else if (serviceType.includes('alignment')) {
      return 'Wheel Alignment Reminder';
    } else if (serviceType.includes('balancing')) {
      return 'Wheel Balancing Reminder';
    } else {
      return 'General Service Reminder';
    }
  }

  private generateReminderMessage(serviceRecord: any, reminderType: string): string {
    const customerName = `${serviceRecord.customer.firstName} ${serviceRecord.customer.lastName}`;
    const vehicleInfo = `${serviceRecord.vehicle.year} ${serviceRecord.vehicle.make} ${serviceRecord.vehicle.model}`;
    const lastServiceDate = new Date(serviceRecord.serviceDate).toLocaleDateString();

    return `Hi ${customerName}, it's time for ${reminderType.toLowerCase()} for your ${vehicleInfo}. Your last ${serviceRecord.serviceType.toLowerCase()} was on ${lastServiceDate}. Please contact us to schedule your appointment.`;
  }

  private determinePriority(reminderDate: Date): 'low' | 'medium' | 'high' {
    const now = new Date();
    const daysUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilReminder < 0) {
      return 'high'; // Overdue
    } else if (daysUntilReminder <= 7) {
      return 'high'; // Within a week
    } else if (daysUntilReminder <= 30) {
      return 'medium'; // Within a month
    } else {
      return 'low'; // More than a month away
    }
  }

  private mapToDto(reminder: any): ServiceReminderDto {
    // Map internal entity to DTO format expected by API contract
    return {
      id: reminder.id,
      customerId: reminder.customerId,
      vehicleId: reminder.vehicleId,
      serviceType: reminder.reminderType || 'General Service',
      reminderDate: reminder.reminderDate.toISOString(),
      lastServiceDate: reminder.lastService?.serviceDate?.toISOString() || reminder.createdAt.toISOString(),
      mileage: reminder.vehicle?.mileage || undefined,
      status: reminder.status,
      communicationMethod: reminder.communicationMethod,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
    };
  }
}