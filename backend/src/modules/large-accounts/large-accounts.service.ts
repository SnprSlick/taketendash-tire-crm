import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LargeAccountsRepository } from './large-accounts.repository';
import {
  LargeAccountEntity,
  LargeAccountWithRelations,
  CreateLargeAccountRequest,
  UpdateLargeAccountRequest,
  LargeAccountFilters,
  LargeAccountDto,
  LargeAccountDetailDto,
  AccountHealthScore,
  AccountNotification,
  PerformanceReport,
  TierUpdateRequest,
} from './entities/large-account.entity';
import { PrismaService } from '../../prisma/prisma.service';
import { LargeAccountTier, LargeAccountStatus } from '@prisma/client';

@Injectable()
export class LargeAccountsService {
  constructor(
    private readonly largeAccountsRepository: LargeAccountsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(filters: LargeAccountFilters = {}): Promise<{
    data: LargeAccountDto[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { accounts, total } = await this.largeAccountsRepository.findWithFilters(filters);

    const data = accounts.map(account => this.mapToDto(account));

    if (filters.page && filters.limit) {
      return {
        data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      };
    }

    return { data };
  }

  async findById(id: string): Promise<LargeAccountDetailDto> {
    const account = await this.largeAccountsRepository.findWithCustomerDetails(id);

    if (!account) {
      throw new NotFoundException('Large account not found');
    }

    return this.mapToDetailDto(account);
  }

  async designateAccount(request: CreateLargeAccountRequest): Promise<LargeAccountDto> {
    // Check if customer already has a large account
    const existingAccount = await this.largeAccountsRepository.findByCustomerId(request.customerId);
    if (existingAccount) {
      throw new BadRequestException('Customer already has a large account designation');
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: request.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const accountData = {
      ...request,
      status: LargeAccountStatus.ACTIVE,
      serviceLevel: request.serviceLevel || 'STANDARD' as any,
    };

    const account = await this.largeAccountsRepository.create(accountData);
    return this.mapToDto(account);
  }

  async updateTier(id: string, request: TierUpdateRequest): Promise<LargeAccountDetailDto> {
    const existingAccount = await this.largeAccountsRepository.findById(id);

    if (!existingAccount) {
      throw new NotFoundException('Large account not found');
    }

    const updatedAccount = await this.largeAccountsRepository.updateTier(id, request.tier);

    // Here we could also log the tier change with the reason
    // await this.logTierChange(id, existingAccount.tier, request.tier, request.reason);

    const accountWithDetails = await this.largeAccountsRepository.findWithCustomerDetails(id);
    return this.mapToDetailDto(accountWithDetails!);
  }

  async calculateHealthScore(id: string): Promise<AccountHealthScore> {
    const account = await this.largeAccountsRepository.findById(id);

    if (!account) {
      throw new NotFoundException('Large account not found');
    }

    // Get service records for the customer
    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where: { customerId: account.customerId },
      orderBy: { serviceDate: 'desc' },
      take: 12, // Last 12 months
    });

    // Calculate health metrics
    const revenueHealth = this.calculateRevenueHealth(serviceRecords, account.annualRevenue || 0);
    const serviceHealth = this.calculateServiceHealth(serviceRecords);
    const paymentHealth = this.calculatePaymentHealth(serviceRecords);
    const relationshipHealth = this.calculateRelationshipHealth(account);

    const overallScore = Math.round(
      (revenueHealth + serviceHealth + paymentHealth + relationshipHealth) / 4
    );

    const riskFactors = this.identifyRiskFactors(account, serviceRecords, {
      revenueHealth,
      serviceHealth,
      paymentHealth,
      relationshipHealth,
    });

    const recommendations = this.generateRecommendations(account, riskFactors);

    return {
      overallScore,
      revenueHealth,
      serviceHealth,
      paymentHealth,
      relationshipHealth,
      riskFactors,
      recommendations,
    };
  }

  async getAccountNotifications(id: string): Promise<AccountNotification[]> {
    const account = await this.largeAccountsRepository.findById(id);

    if (!account) {
      throw new NotFoundException('Large account not found');
    }

    const notifications: AccountNotification[] = [];

    // Contract renewal notification
    if (account.contractEndDate) {
      const daysToExpiration = Math.ceil(
        (account.contractEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysToExpiration <= 90) {
        notifications.push({
          type: 'CONTRACT_RENEWAL_DUE',
          priority: daysToExpiration <= 30 ? 'HIGH' : 'MEDIUM',
          message: `Contract expires in ${daysToExpiration} days`,
          actionRequired: true,
          dueDate: account.contractEndDate,
        });
      }
    }

    // Revenue tracking notifications
    const healthScore = await this.calculateHealthScore(id);
    if (healthScore.overallScore < 70) {
      notifications.push({
        type: 'ACCOUNT_HEALTH_LOW',
        priority: 'HIGH',
        message: `Account health score is ${healthScore.overallScore}/100`,
        actionRequired: true,
      });
    }

    return notifications;
  }

  async generatePerformanceReport(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceReport> {
    const account = await this.largeAccountsRepository.findById(id);

    if (!account) {
      throw new NotFoundException('Large account not found');
    }

    // Get service records for the period
    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where: {
        customerId: account.customerId,
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { serviceDate: 'asc' },
    });

    const totalRevenue = serviceRecords.reduce((sum, record) =>
      sum + Number(record.partsCost) + Number(record.laborCost), 0);
    const averageTransactionValue = serviceRecords.length > 0 ? totalRevenue / serviceRecords.length : 0;

    // Calculate growth rate (simplified)
    const revenueGrowthRate = this.calculateGrowthRate(serviceRecords);

    const totalServices = serviceRecords.length;
    const averageServiceValue = averageTransactionValue;

    return {
      accountSummary: {
        id: account.id,
        customerId: account.customerId,
        tier: account.tier,
        accountType: account.accountType,
        status: account.status,
      },
      revenueMetrics: {
        totalRevenue,
        averageTransactionValue,
        revenueGrowthRate,
      },
      serviceMetrics: {
        totalServices,
        averageServiceValue,
      },
      trendAnalysis: {
        periodStart: startDate,
        periodEnd: endDate,
        trends: this.analyzeTrends(serviceRecords),
      },
      recommendations: this.generateBusinessRecommendations(account, serviceRecords),
    };
  }

  private mapToDto(account: LargeAccountEntity): LargeAccountDto {
    return {
      id: account.id,
      customerId: account.customerId,
      accountType: account.accountType,
      tier: account.tier,
      annualRevenue: account.annualRevenue,
      contractStartDate: account.contractStartDate?.toISOString().split('T')[0],
      contractEndDate: account.contractEndDate?.toISOString().split('T')[0],
      status: account.status,
      accountManager: account.accountManager,
      specialTerms: account.specialTerms,
      discountTier: account.discountTier,
      serviceLevel: account.serviceLevel,
      priorityRanking: account.priorityRanking,
      contractNumber: account.contractNumber,
      creditLimit: account.creditLimit,
      paymentTerms: account.paymentTerms,
      billingContact: account.billingContact,
      billingEmail: account.billingEmail,
      notes: account.notes,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private mapToDetailDto(account: LargeAccountWithRelations): LargeAccountDetailDto {
    return {
      ...this.mapToDto(account),
      customer: {
        id: account.customer.id,
        companyName: account.customer.companyName,
        contactInfo: {
          firstName: account.customer.firstName,
          lastName: account.customer.lastName,
          email: account.customer.email,
          phone: account.customer.phone,
          address: account.customer.address,
        },
      },
      contracts: [],
      revenueHistory: [],
      serviceHistory: [],
      tierChangeHistory: [],
    };
  }

  private calculateRevenueHealth(serviceRecords: any[], targetRevenue: number): number {
    const actualRevenue = serviceRecords.reduce((sum, record) =>
      sum + Number(record.partsCost) + Number(record.laborCost), 0);
    if (targetRevenue === 0) return 85; // Default if no target set
    const ratio = actualRevenue / targetRevenue;
    return Math.min(100, Math.max(0, ratio * 100));
  }

  private calculateServiceHealth(serviceRecords: any[]): number {
    if (serviceRecords.length === 0) return 50;
    // Simple metric based on service frequency
    const avgServiceInterval = serviceRecords.length > 1 ?
      (new Date().getTime() - new Date(serviceRecords[serviceRecords.length - 1].serviceDate).getTime()) / (1000 * 60 * 60 * 24 * 30) : 1;
    return Math.min(100, Math.max(0, 100 - (avgServiceInterval * 10)));
  }

  private calculatePaymentHealth(serviceRecords: any[]): number {
    // Simplified - assume all payments are good for now
    return 90;
  }

  private calculateRelationshipHealth(account: LargeAccountEntity): number {
    // Based on account tier and service level
    let score = 70;
    if (account.tier === LargeAccountTier.PLATINUM) score += 20;
    else if (account.tier === LargeAccountTier.GOLD) score += 10;

    if (account.serviceLevel === 'PREMIUM') score += 10;
    else if (account.serviceLevel === 'ENHANCED') score += 5;

    return Math.min(100, score);
  }

  private identifyRiskFactors(account: LargeAccountEntity, serviceRecords: any[], scores: any): string[] {
    const risks: string[] = [];

    if (scores.revenueHealth < 70) risks.push('Revenue below target');
    if (scores.serviceHealth < 60) risks.push('Low service frequency');
    if (account.contractEndDate && account.contractEndDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
      risks.push('Contract renewal approaching');
    }

    return risks;
  }

  private generateRecommendations(account: LargeAccountEntity, riskFactors: string[]): string[] {
    const recommendations: string[] = [];

    if (riskFactors.includes('Revenue below target')) {
      recommendations.push('Schedule account review meeting');
      recommendations.push('Explore additional service opportunities');
    }

    if (riskFactors.includes('Contract renewal approaching')) {
      recommendations.push('Initiate contract renewal discussions');
      recommendations.push('Prepare renewal proposal');
    }

    return recommendations;
  }

  private calculateGrowthRate(serviceRecords: any[]): number {
    if (serviceRecords.length < 2) return 0;

    const firstHalf = serviceRecords.slice(0, Math.floor(serviceRecords.length / 2));
    const secondHalf = serviceRecords.slice(Math.floor(serviceRecords.length / 2));

    const firstHalfRevenue = firstHalf.reduce((sum, record) =>
      sum + Number(record.partsCost) + Number(record.laborCost), 0);
    const secondHalfRevenue = secondHalf.reduce((sum, record) =>
      sum + Number(record.partsCost) + Number(record.laborCost), 0);

    if (firstHalfRevenue === 0) return 0;
    return ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
  }

  private analyzeTrends(serviceRecords: any[]): string[] {
    const trends: string[] = [];

    if (serviceRecords.length > 3) {
      const recent = serviceRecords.slice(-3);
      const older = serviceRecords.slice(0, 3);

      const recentAvg = recent.reduce((sum, record) =>
        sum + Number(record.partsCost) + Number(record.laborCost), 0) / recent.length;
      const olderAvg = older.reduce((sum, record) =>
        sum + Number(record.partsCost) + Number(record.laborCost), 0) / older.length;

      if (recentAvg > olderAvg * 1.1) {
        trends.push('Revenue trending upward');
      } else if (recentAvg < olderAvg * 0.9) {
        trends.push('Revenue trending downward');
      } else {
        trends.push('Revenue stable');
      }
    }

    return trends;
  }

  private generateBusinessRecommendations(account: LargeAccountEntity, serviceRecords: any[]): string[] {
    const recommendations: string[] = [];

    if (account.tier === LargeAccountTier.SILVER && serviceRecords.length > 10) {
      recommendations.push('Consider upgrading to Gold tier');
    }

    if (serviceRecords.length === 0) {
      recommendations.push('No recent activity - schedule follow-up');
    }

    return recommendations;
  }
}