import { BaseEntity } from '../../../common/base.repository';
import { LargeAccountType, LargeAccountTier, LargeAccountStatus, ServiceLevel } from '@prisma/client';

export interface LargeAccountEntity extends BaseEntity {
  customerId: string;
  accountType: LargeAccountType;
  tier: LargeAccountTier;
  annualRevenue?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
  status: LargeAccountStatus;
  accountManager: string;
  specialTerms?: string;
  discountTier?: number;
  serviceLevel: ServiceLevel;
  priorityRanking?: number;
  contractNumber?: string;
  creditLimit?: number;
  paymentTerms?: string;
  billingContact?: string;
  billingEmail?: string;
  notes?: string;
}

export interface LargeAccountWithRelations extends LargeAccountEntity {
  customer: {
    id: string;
    companyName?: string;
    contactName?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    address?: string;
    accountType: string;
    status: string;
  };
}

export interface CreateLargeAccountRequest {
  customerId: string;
  accountType: LargeAccountType;
  tier: LargeAccountTier;
  annualRevenue?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
  accountManager: string;
  specialTerms?: string;
  discountTier?: number;
  serviceLevel?: ServiceLevel;
  priorityRanking?: number;
  contractNumber?: string;
  creditLimit?: number;
  paymentTerms?: string;
  billingContact?: string;
  billingEmail?: string;
  notes?: string;
  reason?: string;
}

export interface UpdateLargeAccountRequest {
  accountType?: LargeAccountType;
  tier?: LargeAccountTier;
  annualRevenue?: number;
  contractStartDate?: Date;
  contractEndDate?: Date;
  status?: LargeAccountStatus;
  accountManager?: string;
  specialTerms?: string;
  discountTier?: number;
  serviceLevel?: ServiceLevel;
  priorityRanking?: number;
  contractNumber?: string;
  creditLimit?: number;
  paymentTerms?: string;
  billingContact?: string;
  billingEmail?: string;
  notes?: string;
}

export interface LargeAccountFilters {
  tier?: LargeAccountTier;
  status?: LargeAccountStatus;
  accountType?: LargeAccountType;
  accountManager?: string;
  serviceLevel?: ServiceLevel;
  priorityRanking?: number;
  page?: number;
  limit?: number;
}

export interface AccountHealthScore {
  overallScore: number;
  revenueHealth: number;
  serviceHealth: number;
  paymentHealth: number;
  relationshipHealth: number;
  riskFactors: string[];
  recommendations: string[];
}

export interface AccountNotification {
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  actionRequired?: boolean;
  dueDate?: Date;
}

export interface PerformanceReport {
  accountSummary: {
    id: string;
    customerId: string;
    tier: LargeAccountTier;
    accountType: LargeAccountType;
    status: LargeAccountStatus;
  };
  revenueMetrics: {
    totalRevenue: number;
    averageTransactionValue: number;
    revenueGrowthRate: number;
  };
  serviceMetrics: {
    totalServices: number;
    averageServiceValue: number;
    customerSatisfaction?: number;
  };
  trendAnalysis: {
    periodStart: Date;
    periodEnd: Date;
    trends: string[];
  };
  recommendations: string[];
}

export interface TierUpdateRequest {
  tier: LargeAccountTier;
  reason: string;
}

export interface LargeAccountDto {
  id: string;
  customerId: string;
  accountType: LargeAccountType;
  tier: LargeAccountTier;
  annualRevenue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  status: LargeAccountStatus;
  accountManager: string;
  specialTerms?: string;
  discountTier?: number;
  serviceLevel: ServiceLevel;
  priorityRanking?: number;
  contractNumber?: string;
  creditLimit?: number;
  paymentTerms?: string;
  billingContact?: string;
  billingEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LargeAccountDetailDto extends LargeAccountDto {
  customer: {
    id: string;
    companyName?: string;
    contactInfo: {
      firstName: string;
      lastName: string;
      email?: string;
      phone: string;
      address?: string;
    };
  };
  contracts?: any[];
  healthScore?: AccountHealthScore;
  revenueHistory?: any[];
  serviceHistory?: any[];
  tierChangeHistory?: any[];
}