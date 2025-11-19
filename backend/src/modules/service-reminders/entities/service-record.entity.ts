import { BaseEntity } from '../../../common/base.repository';
import { PaymentStatus } from '@prisma/client';

export interface ServiceRecordEntity extends BaseEntity {
  customerId: string;
  vehicleId: string;
  employeeId: string;
  serviceMasterId?: string;
  serviceDate: Date;
  serviceType: string;
  description: string;
  laborHours: number;
  partsCost: number;
  laborCost: number;
  taxAmount?: number;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export interface ServiceRecordWithRelations extends ServiceRecordEntity {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
    mileage?: number;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface CreateServiceRecordRequest {
  customerId: string;
  vehicleId: string;
  employeeId: string;
  serviceMasterId?: string;
  serviceDate: Date;
  serviceType: string;
  description: string;
  laborHours: number;
  partsCost: number;
  laborCost: number;
  taxAmount?: number;
  notes?: string;
}

export interface UpdateServiceRecordRequest {
  serviceDate?: Date;
  serviceType?: string;
  description?: string;
  laborHours?: number;
  partsCost?: number;
  laborCost?: number;
  taxAmount?: number;
  paymentStatus?: PaymentStatus;
  notes?: string;
}

export interface ServiceRecordFilters {
  customerId?: string;
  vehicleId?: string;
  employeeId?: string;
  serviceType?: string;
  paymentStatus?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
}