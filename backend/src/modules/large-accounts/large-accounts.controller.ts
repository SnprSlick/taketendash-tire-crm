import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { LargeAccountsService } from './large-accounts.service';
import {
  CreateLargeAccountRequest,
  UpdateLargeAccountRequest,
  LargeAccountFilters,
  TierUpdateRequest,
} from './entities/large-account.entity';
import { LargeAccountType, LargeAccountTier, LargeAccountStatus, ServiceLevel } from '@prisma/client';

@Controller('api/v1/large-accounts')
export class LargeAccountsController {
  constructor(private readonly largeAccountsService: LargeAccountsService) {}

  @Get()
  async findAll(@Query() query: any) {
    const filters: LargeAccountFilters = {};

    // Parse query parameters
    if (query.tier && this.isValidTier(query.tier)) {
      filters.tier = query.tier as LargeAccountTier;
    }

    if (query.status && this.isValidStatus(query.status)) {
      filters.status = query.status as LargeAccountStatus;
    }

    if (query.accountType && this.isValidAccountType(query.accountType)) {
      filters.accountType = query.accountType as LargeAccountType;
    }

    if (query.accountManager) {
      filters.accountManager = query.accountManager;
    }

    if (query.serviceLevel && this.isValidServiceLevel(query.serviceLevel)) {
      filters.serviceLevel = query.serviceLevel as ServiceLevel;
    }

    if (query.priorityRanking) {
      const ranking = parseInt(query.priorityRanking);
      if (!isNaN(ranking)) {
        filters.priorityRanking = ranking;
      }
    }

    if (query.page) {
      const page = parseInt(query.page);
      if (!isNaN(page) && page > 0) {
        filters.page = page;
      }
    }

    if (query.limit) {
      const limit = parseInt(query.limit);
      if (!isNaN(limit) && limit > 0 && limit <= 100) {
        filters.limit = limit;
      }
    }

    return this.largeAccountsService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const account = await this.largeAccountsService.findById(id);
    return { data: account };
  }

  @Post('designate')
  async designateAccount(@Body() createRequest: CreateLargeAccountRequest) {
    this.validateCreateRequest(createRequest);
    const account = await this.largeAccountsService.designateAccount(createRequest);
    return { data: account };
  }

  @Put(':id/tier')
  async updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() tierRequest: TierUpdateRequest,
  ) {
    this.validateTierUpdateRequest(tierRequest);
    const account = await this.largeAccountsService.updateTier(id, tierRequest);
    return { data: account };
  }

  @Get(':id/health')
  async getHealthScore(@Param('id', ParseUUIDPipe) id: string) {
    const health = await this.largeAccountsService.calculateHealthScore(id);
    return { data: health };
  }

  @Get(':id/notifications')
  async getNotifications(@Param('id', ParseUUIDPipe) id: string) {
    const notifications = await this.largeAccountsService.getAccountNotifications(id);
    return { data: notifications };
  }

  @Get(':id/performance-report')
  async getPerformanceReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    const report = await this.largeAccountsService.generatePerformanceReport(id, start, end);
    return { data: report };
  }

  private validateCreateRequest(request: CreateLargeAccountRequest): void {
    if (!request.customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    if (!request.accountType || !this.isValidAccountType(request.accountType)) {
      throw new BadRequestException('Valid account type is required');
    }

    if (!request.tier || !this.isValidTier(request.tier)) {
      throw new BadRequestException('Valid tier is required');
    }

    if (!request.accountManager) {
      throw new BadRequestException('Account manager is required');
    }

    if (request.serviceLevel && !this.isValidServiceLevel(request.serviceLevel)) {
      throw new BadRequestException('Invalid service level');
    }

    if (request.discountTier && (request.discountTier < 0 || request.discountTier > 50)) {
      throw new BadRequestException('Discount tier must be between 0 and 50');
    }

    if (request.priorityRanking && (request.priorityRanking < 1 || request.priorityRanking > 10)) {
      throw new BadRequestException('Priority ranking must be between 1 and 10');
    }

    if (request.contractStartDate && request.contractEndDate) {
      const start = new Date(request.contractStartDate);
      const end = new Date(request.contractEndDate);

      if (start > end) {
        throw new BadRequestException('Contract start date must be before end date');
      }
    }
  }

  private validateTierUpdateRequest(request: TierUpdateRequest): void {
    if (!request.tier || !this.isValidTier(request.tier)) {
      throw new BadRequestException('Valid tier is required');
    }

    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('Reason for tier update is required');
    }

    if (request.reason.length > 500) {
      throw new BadRequestException('Reason must be less than 500 characters');
    }
  }

  private isValidTier(tier: any): tier is LargeAccountTier {
    return Object.values(LargeAccountTier).includes(tier);
  }

  private isValidStatus(status: any): status is LargeAccountStatus {
    return Object.values(LargeAccountStatus).includes(status);
  }

  private isValidAccountType(type: any): type is LargeAccountType {
    return Object.values(LargeAccountType).includes(type);
  }

  private isValidServiceLevel(level: any): level is ServiceLevel {
    return Object.values(ServiceLevel).includes(level);
  }
}