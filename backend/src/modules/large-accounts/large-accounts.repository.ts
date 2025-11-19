import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LargeAccountEntity,
  LargeAccountWithRelations,
  LargeAccountFilters
} from './entities/large-account.entity';
import { LargeAccountType, LargeAccountTier, LargeAccountStatus, ServiceLevel } from '@prisma/client';

@Injectable()
export class LargeAccountsRepository extends BaseRepository<LargeAccountEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'largeAccount');
  }

  async findByCustomerId(customerId: string): Promise<LargeAccountEntity | null> {
    return this.findOne({
      where: { customerId },
    });
  }

  async findByTier(tier: LargeAccountTier): Promise<LargeAccountEntity[]> {
    return this.findMany({
      where: { tier },
      orderBy: { priorityRanking: 'asc' },
    });
  }

  async findByStatus(status: LargeAccountStatus): Promise<LargeAccountEntity[]> {
    return this.findMany({
      where: { status },
      orderBy: { tier: 'desc' },
    });
  }

  async findWithCustomerDetails(id: string): Promise<LargeAccountWithRelations | null> {
    const account = await this.prisma.largeAccount.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            accountType: true,
            status: true,
          },
        },
      },
    });

    if (!account) return null;

    return {
      ...account,
      annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : undefined,
      creditLimit: account.creditLimit ? Number(account.creditLimit) : undefined,
      customer: {
        ...account.customer,
        companyName: `${account.customer.firstName} ${account.customer.lastName}`,
        contactName: `${account.customer.firstName} ${account.customer.lastName}`,
        accountType: account.customer.accountType,
        status: account.customer.status,
      },
    } as LargeAccountWithRelations;
  }

  async findWithFilters(filters: LargeAccountFilters): Promise<{
    accounts: LargeAccountEntity[];
    total: number;
  }> {
    const where: any = {};

    if (filters.tier) where.tier = filters.tier;
    if (filters.status) where.status = filters.status;
    if (filters.accountType) where.accountType = filters.accountType;
    if (filters.accountManager) where.accountManager = { contains: filters.accountManager };
    if (filters.serviceLevel) where.serviceLevel = filters.serviceLevel;
    if (filters.priorityRanking) where.priorityRanking = filters.priorityRanking;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      this.findMany({
        where,
        orderBy: [
          { priorityRanking: 'asc' },
          { tier: 'desc' },
          { annualRevenue: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.largeAccount.count({ where }),
    ]);

    return {
      accounts: accounts.map(account => ({
        ...account,
        annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : undefined,
        creditLimit: account.creditLimit ? Number(account.creditLimit) : undefined,
      })),
      total,
    };
  }

  async updateTier(id: string, tier: LargeAccountTier): Promise<LargeAccountEntity> {
    return this.update(id, { tier });
  }

  async findAccountsByContractExpiration(daysAhead: number = 30): Promise<LargeAccountEntity[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    return this.findMany({
      where: {
        contractEndDate: {
          lte: targetDate,
        },
        status: LargeAccountStatus.ACTIVE,
      },
      orderBy: { contractEndDate: 'asc' },
    });
  }

  async findTopAccountsByRevenue(limit: number = 10): Promise<LargeAccountEntity[]> {
    return this.findMany({
      where: {
        status: LargeAccountStatus.ACTIVE,
        annualRevenue: {
          not: null,
        },
      },
      orderBy: { annualRevenue: 'desc' },
      take: limit,
    });
  }

  async findAccountsByManager(accountManager: string): Promise<LargeAccountEntity[]> {
    return this.findMany({
      where: {
        accountManager: { contains: accountManager },
        status: LargeAccountStatus.ACTIVE,
      },
      orderBy: { priorityRanking: 'asc' },
    });
  }
}