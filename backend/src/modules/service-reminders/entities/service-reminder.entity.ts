import { BaseEntity } from '../../../common/base.repository';
import { ReminderStatus, CommunicationMethod } from '@prisma/client';

export interface ServiceReminderEntity extends BaseEntity {
  customerId: string;
  vehicleId: string;
  lastServiceId?: string;
  reminderType: string;
  reminderDate: Date;
  reminderMessage: string;
  sentDate?: Date;
  status: ReminderStatus;
  communicationMethod: CommunicationMethod;
}

export interface ServiceReminderWithRelations extends ServiceReminderEntity {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    preferredCommunication: CommunicationMethod;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
    mileage?: number;
    tireSize?: string;
  };
  lastService?: {
    id: string;
    serviceDate: Date;
    serviceType: string;
    description: string;
    laborHours: number;
    partsCost: number;
    laborCost: number;
  };
}

export interface CreateServiceReminderRequest {
  customerId: string;
  vehicleId: string;
  lastServiceId?: string;
  reminderType: string;
  reminderDate: Date;
  reminderMessage: string;
  communicationMethod?: CommunicationMethod;
}

export interface UpdateServiceReminderRequest {
  reminderType?: string;
  reminderDate?: Date;
  reminderMessage?: string;
  status?: ReminderStatus;
  communicationMethod?: CommunicationMethod;
  sentDate?: Date;
}

export interface ServiceReminderFilters {
  customerId?: string;
  vehicleId?: string;
  status?: ReminderStatus;
  reminderType?: string;
  reminderDate?: Date;
  communicationMethod?: CommunicationMethod;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SendReminderRequest {
  communicationMethod: CommunicationMethod;
}

export interface GenerateRemindersRequest {
  daysAhead?: number;
  targetDate?: Date;
  serviceTypes?: string[];
  customerId?: string;
  vehicleId?: string;
}

export interface GenerateRemindersResponse {
  generated: number;
  message: string;
  targetDate?: string;
  serviceTypes?: string[];
}

// DTO for API responses that aligns with the contract
export interface ServiceReminderDto {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceType: string; // Maps to reminderType
  reminderDate: string; // ISO date string
  lastServiceDate: string; // ISO date string from lastService
  mileage?: number; // From vehicle
  status: ReminderStatus;
  communicationMethod: CommunicationMethod;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}