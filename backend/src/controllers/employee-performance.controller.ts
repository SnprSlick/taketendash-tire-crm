import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
  Request
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
// Temporarily disabled performance tracking service
// import { PerformanceTrackingService } from '../services/performance-tracking.service';
import { EmployeeRole } from '@prisma/client';

interface EmployeePerformanceFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Temporarily disabled employee performance controller
/*
@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeePerformanceController {
  private readonly logger = new Logger(EmployeePerformanceController.name);

  constructor(
    private readonly performanceTrackingService: PerformanceTrackingService
  ) {}

  @Get('employee-performance')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.SERVICE_ADVISOR)
  @HttpCode(HttpStatus.OK)
  async getEmployeePerformance(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any
  ) {
    this.logger.log(`Fetching employee performance metrics`);

    try {
      // Parse and validate query parameters
      const filters: EmployeePerformanceFilters = {
        employeeId,
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10
      };

      // Validate page and limit
      if (filters.page && (filters.page < 1 || isNaN(filters.page))) {
        throw new BadRequestException('Page must be a positive number');
      }

      if (filters.limit && (filters.limit < 1 || filters.limit > 100 || isNaN(filters.limit))) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      // Parse and validate date range
      let startDateObj: Date | undefined;
      let endDateObj: Date | undefined;

      if (startDate) {
        startDateObj = new Date(startDate);
        if (isNaN(startDateObj.getTime())) {
          throw new BadRequestException('Invalid start date format');
        }
      }

      if (endDate) {
        endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          throw new BadRequestException('Invalid end date format');
        }
      }

      if (startDateObj && endDateObj && startDateObj > endDateObj) {
        throw new BadRequestException('Start date must be before end date');
      }

      // Default to last 30 days if no date range provided
      if (!startDateObj && !endDateObj) {
        endDateObj = new Date();
        startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 30);
      } else if (!startDateObj) {
        startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 30);
      } else if (!endDateObj) {
        endDateObj = new Date();
      }

      // Handle role-based access control
      const userRole = req?.user?.role;
      const userId = req?.user?.sub;

      // Service advisors can only see their own performance
      if (userRole === EmployeeRole.SERVICE_ADVISOR) {
        if (employeeId && employeeId !== userId) {
          throw new BadRequestException('Service advisors can only view their own performance');
        }
        filters.employeeId = userId;
      }

      this.logger.log(`Fetching performance data with filters: ${JSON.stringify({
        employeeId: filters.employeeId,
        startDate: startDateObj?.toISOString(),
        endDate: endDateObj?.toISOString(),
        page: filters.page,
        limit: filters.limit
      })}`);

      // Get performance data
      const performanceData = await this.performanceTrackingService.getEmployeePerformanceAnalytics(
        filters.employeeId,
        startDateObj!,
        endDateObj!,
        filters.page!,
        filters.limit!
      );

      this.logger.log(`Retrieved performance data for ${performanceData.performanceData.length} employees`);

      return performanceData;

    } catch (error) {
      this.logger.error(`Failed to fetch employee performance: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch employee performance data');
    }
  }

  @Get('employee-performance/:employeeId/trends')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.SERVICE_ADVISOR)
  @HttpCode(HttpStatus.OK)
  async getEmployeePerformanceTrends(
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity: string = 'weekly',
    @Request() req?: any
  ) {
    this.logger.log(`Fetching performance trends for employee ${employeeId}`);

    try {
      if (!employeeId) {
        throw new BadRequestException('Employee ID is required');
      }

      // Handle role-based access control
      const userRole = req?.user?.role;
      const userId = req?.user?.sub;

      if (userRole === EmployeeRole.SERVICE_ADVISOR && employeeId !== userId) {
        throw new BadRequestException('Service advisors can only view their own performance trends');
      }

      // Validate granularity
      if (!['daily', 'weekly', 'monthly'].includes(granularity)) {
        throw new BadRequestException('Granularity must be daily, weekly, or monthly');
      }

      // Parse dates
      const startDateObj = startDate ? new Date(startDate) : new Date();
      const endDateObj = endDate ? new Date(endDate) : new Date();

      if (!startDate) {
        startDateObj.setDate(startDateObj.getDate() - 90); // Default to 3 months
      }

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (startDateObj > endDateObj) {
        throw new BadRequestException('Start date must be before end date');
      }

      const trendData = await this.performanceTrackingService.getEmployeePerformanceTrends(
        employeeId,
        startDateObj,
        endDateObj,
        granularity as 'daily' | 'weekly' | 'monthly'
      );

      this.logger.log(`Retrieved ${trendData.trends.length} trend data points for employee ${employeeId}`);

      return trendData;

    } catch (error) {
      this.logger.error(`Failed to fetch performance trends: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch performance trend data');
    }
  }

  @Get('team-performance/comparison')
  @Roles(EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async getTeamPerformanceComparison(
    @Query('employeeIds') employeeIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('metric') metric: string = 'revenuePerLaborHour'
  ) {
    this.logger.log(`Fetching team performance comparison`);

    try {
      // Parse employee IDs
      let employeeIdArray: string[] = [];
      if (employeeIds) {
        employeeIdArray = employeeIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
      }

      // Validate metric
      const validMetrics = ['revenuePerLaborHour', 'totalRevenue', 'totalServices', 'averageServiceValue'];
      if (!validMetrics.includes(metric)) {
        throw new BadRequestException(`Metric must be one of: ${validMetrics.join(', ')}`);
      }

      // Parse dates (default to last 30 days)
      const endDateObj = endDate ? new Date(endDate) : new Date();
      const startDateObj = startDate ? new Date(startDate) : new Date();

      if (!startDate) {
        startDateObj.setDate(startDateObj.getDate() - 30);
      }

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (startDateObj > endDateObj) {
        throw new BadRequestException('Start date must be before end date');
      }

      const comparisonData = await this.performanceTrackingService.compareEmployeePerformance(
        employeeIdArray,
        startDateObj,
        endDateObj,
        metric
      );

      this.logger.log(`Retrieved team comparison data for ${comparisonData.employees.length} employees`);

      return comparisonData;

    } catch (error) {
      this.logger.error(`Failed to fetch team performance comparison: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch team performance comparison data');
    }
  }

  @Get('performance-summary')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.SERVICE_ADVISOR)
  @HttpCode(HttpStatus.OK)
  async getPerformanceSummary(
    @Query('period') period: string = '30',
    @Request() req?: any
  ) {
    this.logger.log(`Fetching performance summary for period: ${period} days`);

    try {
      const periodDays = parseInt(period, 10);
      if (isNaN(periodDays) || periodDays < 1 || periodDays > 365) {
        throw new BadRequestException('Period must be between 1 and 365 days');
      }

      const userRole = req?.user?.role;
      const userId = req?.user?.sub;

      // For service advisors, only show their own summary
      const employeeId = userRole === EmployeeRole.SERVICE_ADVISOR ? userId : undefined;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const summary = await this.performanceTrackingService.getPerformanceSummary(
        employeeId,
        startDate,
        endDate
      );

      this.logger.log(`Retrieved performance summary with ${summary.totalEmployees} employees`);

      return summary;

    } catch (error) {
      this.logger.error(`Failed to fetch performance summary: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch performance summary data');
    }
  }
}
*/

// Placeholder class for temporarily disabled employee performance controller
export class EmployeePerformanceController {}