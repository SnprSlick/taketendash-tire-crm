import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ServiceReminderEntity,
  ServiceReminderWithRelations,
  ServiceReminderFilters
} from './entities/service-reminder.entity';
import { ReminderStatus, CommunicationMethod } from '@prisma/client';

@Injectable()
export class ServiceRemindersRepository extends BaseRepository<ServiceReminderEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'serviceReminder');
  }

  async findByStatus(status: ReminderStatus): Promise<ServiceReminderEntity[]> {
    return this.findMany({
      where: { status },
      orderBy: { reminderDate: 'asc' },
    });
  }

  async findByDate(date: Date): Promise<ServiceReminderEntity[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.findMany({
      where: {
        reminderDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { reminderDate: 'asc' },
    });
  }

  async findByCustomer(customerId: string, status?: ReminderStatus): Promise<ServiceReminderEntity[]> {
    return this.findMany({
      where: {
        customerId,
        ...(status && { status }),
      },
      orderBy: { reminderDate: 'asc' },
    });
  }

  async findByVehicle(vehicleId: string, status?: ReminderStatus): Promise<ServiceReminderEntity[]> {
    return this.findMany({
      where: {
        vehicleId,
        ...(status && { status }),
      },
      orderBy: { reminderDate: 'asc' },
    });
  }

  async findPendingReminders(): Promise<ServiceReminderEntity[]> {
    return this.findByStatus(ReminderStatus.PENDING);
  }

  async findWithRelations(id: string): Promise<ServiceReminderWithRelations | null> {
    const reminder = await this.prisma.serviceReminder.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            preferredCommunication: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true,
            tireSize: true,
          },
        },
        lastService: {
          select: {
            id: true,
            serviceDate: true,
            serviceType: true,
            description: true,
            laborHours: true,
            partsCost: true,
            laborCost: true,
          },
        },
      },
    });

    if (!reminder) return null;

    return {
      ...reminder,
      lastService: reminder.lastService ? {
        ...reminder.lastService,
        laborHours: Number(reminder.lastService.laborHours),
        partsCost: Number(reminder.lastService.partsCost),
        laborCost: Number(reminder.lastService.laborCost),
      } : undefined,
    } as ServiceReminderWithRelations;
  }

  async findWithFilters(filters: ServiceReminderFilters): Promise<ServiceReminderEntity[]> {
    const where: any = {};

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.status) where.status = filters.status;
    if (filters.reminderType) where.reminderType = { contains: filters.reminderType };
    if (filters.communicationMethod) where.communicationMethod = filters.communicationMethod;

    if (filters.reminderDate) {
      const startOfDay = new Date(filters.reminderDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.reminderDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.reminderDate = { gte: startOfDay, lte: endOfDay };
    }

    if (filters.dateFrom && filters.dateTo) {
      where.reminderDate = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      };
    } else if (filters.dateFrom) {
      where.reminderDate = { gte: filters.dateFrom };
    } else if (filters.dateTo) {
      where.reminderDate = { lte: filters.dateTo };
    }

    return this.findMany({
      where,
      orderBy: { reminderDate: 'asc' },
    });
  }

  async updateStatus(id: string, status: ReminderStatus, notes?: string, sentDate?: Date): Promise<ServiceReminderEntity> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (sentDate && status === ReminderStatus.SENT) {
      updateData.sentDate = sentDate;
    }

    return this.update(id, updateData);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<ServiceReminderEntity[]> {
    return this.findMany({
      where: {
        reminderDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { reminderDate: 'asc' },
    });
  }

  async markAsSent(id: string, communicationMethod: CommunicationMethod): Promise<ServiceReminderEntity> {
    return this.update(id, {
      status: ReminderStatus.SENT,
      communicationMethod,
      sentDate: new Date(),
    });
  }

  async findRemindersForGeneration(
    targetDate: Date,
    serviceTypes?: string[],
    customerId?: string,
    vehicleId?: string,
  ): Promise<any[]> {
    // This method would find service records that need reminders generated
    const where: any = {
      serviceDate: {
        lte: targetDate,
      },
    };

    if (serviceTypes && serviceTypes.length > 0) {
      where.serviceType = { in: serviceTypes };
    }

    if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;

    // Find service records that don't already have reminders generated
    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where: {
        ...where,
        reminders: {
          none: {
            reminderDate: {
              gte: new Date(),
            },
          },
        },
      },
      include: {
        customer: true,
        vehicle: true,
      },
    });

    return serviceRecords;
  }

  async getReminderStats(): Promise<{
    pending: number;
    sent: number;
    dismissed: number;
    converted: number;
    total: number;
  }> {
    const [pending, sent, dismissed, converted, total] = await Promise.all([
      this.count({ status: ReminderStatus.PENDING }),
      this.count({ status: ReminderStatus.SENT }),
      this.count({ status: ReminderStatus.DISMISSED }),
      this.count({ status: ReminderStatus.CONVERTED }),
      this.count(),
    ]);

    return { pending, sent, dismissed, converted, total };
  }
}