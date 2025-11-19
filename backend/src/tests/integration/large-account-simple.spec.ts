import { Test } from '@nestjs/testing';
import { LargeAccountsService } from '../../modules/large-accounts/large-accounts.service';
import { LargeAccountsRepository } from '../../modules/large-accounts/large-accounts.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('Large Account Management - Simple Test', () => {
  let service: LargeAccountsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LargeAccountsService,
        LargeAccountsRepository,
        {
          provide: PrismaService,
          useValue: {
            largeAccount: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            serviceRecord: {
              findMany: jest.fn(),
            },
            customer: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get<LargeAccountsService>(LargeAccountsService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate health score with empty service records', async () => {
    // Mock the repository findById to return a test account
    const mockAccount = {
      id: 'test-id',
      customerId: 'customer-id',
      accountType: 'COMMERCIAL',
      tier: 'GOLD',
      status: 'ACTIVE',
      accountManager: 'Test Manager',
      serviceLevel: 'STANDARD',
      annualRevenue: 100000,
    };

    jest.spyOn(prisma.largeAccount, 'findUnique').mockResolvedValue(mockAccount as any);
    jest.spyOn(prisma.serviceRecord, 'findMany').mockResolvedValue([]);

    const health = await service.calculateHealthScore('test-id');

    expect(health).toBeDefined();
    expect(health.overallScore).toBeGreaterThanOrEqual(0);
    expect(health.overallScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(health.riskFactors)).toBe(true);
    expect(Array.isArray(health.recommendations)).toBe(true);
  });

  it('should handle designate account request', async () => {
    const mockCustomer = { id: 'customer-id', firstName: 'John', lastName: 'Doe' };
    const mockCreatedAccount = {
      id: 'new-account-id',
      customerId: 'customer-id',
      accountType: 'FLEET',
      tier: 'GOLD',
      status: 'ACTIVE',
      accountManager: 'New Manager',
      serviceLevel: 'STANDARD',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(prisma.largeAccount, 'findUnique').mockResolvedValue(null); // No existing account
    jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(mockCustomer as any);
    jest.spyOn(prisma.largeAccount, 'create').mockResolvedValue(mockCreatedAccount as any);

    const result = await service.designateAccount({
      customerId: 'customer-id',
      accountType: 'FLEET' as any,
      tier: 'GOLD' as any,
      accountManager: 'New Manager',
    });

    expect(result).toBeDefined();
    expect(result.customerId).toBe('customer-id');
    expect(result.tier).toBe('GOLD');
  });
});