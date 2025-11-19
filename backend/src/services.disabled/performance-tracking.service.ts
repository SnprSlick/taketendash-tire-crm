import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsEngineService } from '../lib/analytics-engine/analytics-engine.service';
import { PerformanceLoggingService } from './performance-logging.service';
import { Prisma, EmployeeRole } from '@prisma/client';

interface EmployeePerformanceMetrics {
  employeeId: string;
  employeeName: string;
  totalRevenue: number;
  totalLaborHours: number;
  revenuePerLaborHour: number;
  totalServices: number;
  averageServiceValue: number;
  laborCost: number;
  partsCost: number;
  profitMargin: number;
  serviceBreakdown: Record<string, {
    count: number;
    totalRevenue: number;
    totalHours: number;
  }>;
  trendData: {
    weeklyRevenue: Array<{
      week: string;
      revenue: number;
      hours: number;
    }>;
  };
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
}

interface EmployeePerformanceAnalytics {
  performanceData: EmployeePerformanceMetrics[];
  totalRevenue: number;
  totalLaborHours: number;
  overallRevenuePerLaborHour: number;
  totalEmployees: number;
  periodStart: string;
  periodEnd: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PerformanceTrendData {
  employeeId: string;
  employeeName: string;
  trends: Array<{
    period: string;
    revenue: number;
    laborHours: number;
    revenuePerLaborHour: number;
    servicesCompleted: number;
  }>;
  summary: {
    averageRevenue: number;
    growthRate: number;
    consistency: number;
  };
}

interface TeamPerformanceComparison {
  employees: Array<{
    employeeId: string;
    employeeName: string;
    revenuePerLaborHour: number;
    totalRevenue: number;
    totalServices: number;
    averageServiceValue: number;
    ranking: number;
    percentileRanking: number;
  }>;
  teamAverages: {
    revenuePerLaborHour: number;
    totalRevenue: number;
    totalServices: number;
    averageServiceValue: number;
  };
  topPerformer: {
    employeeId: string;
    employeeName: string;
    metric: string;
    value: number;
  };
  metricName: string;
  periodStart: string;
  periodEnd: string;
}

@Injectable()
export class PerformanceTrackingService {
  private readonly logger = new Logger(PerformanceTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsEngine: AnalyticsEngineService,
    private readonly performanceLogging: PerformanceLoggingService
  ) {}

  async getEmployeePerformanceAnalytics(
    employeeId: string | undefined,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10
  ): Promise<EmployeePerformanceAnalytics> {
    this.logger.log(`Calculating performance analytics for ${employeeId || 'all employees'} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      // Build base where clause for service records
      const whereClause: Prisma.ServiceRecordWhereInput = {
        serviceDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      };

      if (employeeId) {
        whereClause.employeeId = employeeId;
      }

      // Get all relevant service records
      const serviceRecords = await this.prisma.serviceRecord.findMany({
        where: whereClause,
        include: {
          employee: true,
          customer: true,
          vehicle: true
        },
        orderBy: {
          serviceDate: 'desc'
        }
      });

      // Group by employee and calculate metrics
      const employeeMetricsMap = new Map<string, any>();

      for (const record of serviceRecords) {
        const empId = record.employeeId;
        if (!employeeMetricsMap.has(empId)) {
          employeeMetricsMap.set(empId, {
            employeeId: empId,
            employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
            totalRevenue: 0,
            totalLaborHours: 0,
            totalServices: 0,
            laborCost: 0,
            partsCost: 0,
            services: [],
            serviceBreakdown: {}
          });
        }

        const metrics = employeeMetricsMap.get(empId);
        metrics.totalRevenue += record.totalCost || 0;
        metrics.totalLaborHours += record.laborHours || 0;
        metrics.totalServices += 1;
        metrics.laborCost += record.laborCost || 0;
        metrics.partsCost += record.partsCost || 0;
        metrics.services.push(record);

        // Service breakdown
        const serviceType = record.serviceType;
        if (!metrics.serviceBreakdown[serviceType]) {
          metrics.serviceBreakdown[serviceType] = {
            count: 0,
            totalRevenue: 0,
            totalHours: 0
          };
        }
        metrics.serviceBreakdown[serviceType].count += 1;
        metrics.serviceBreakdown[serviceType].totalRevenue += record.totalCost || 0;
        metrics.serviceBreakdown[serviceType].totalHours += record.laborHours || 0;
      }

      // Convert to final format and calculate derived metrics
      const allPerformanceData: EmployeePerformanceMetrics[] = Array.from(employeeMetricsMap.values()).map(metrics => {
        const revenuePerLaborHour = metrics.totalLaborHours > 0 ? metrics.totalRevenue / metrics.totalLaborHours : 0;
        const averageServiceValue = metrics.totalServices > 0 ? metrics.totalRevenue / metrics.totalServices : 0;
        const profitMargin = metrics.totalRevenue - metrics.laborCost - metrics.partsCost;

        // Generate trend data (weekly breakdown)
        const trendData = this.generateWeeklyTrends(metrics.services, startDate, endDate);

        return {
          employeeId: metrics.employeeId,
          employeeName: metrics.employeeName,
          totalRevenue: Number(metrics.totalRevenue.toFixed(2)),
          totalLaborHours: Number(metrics.totalLaborHours.toFixed(2)),
          revenuePerLaborHour: Number(revenuePerLaborHour.toFixed(2)),
          totalServices: metrics.totalServices,
          averageServiceValue: Number(averageServiceValue.toFixed(2)),
          laborCost: Number(metrics.laborCost.toFixed(2)),
          partsCost: Number(metrics.partsCost.toFixed(2)),
          profitMargin: Number(profitMargin.toFixed(2)),
          serviceBreakdown: metrics.serviceBreakdown,
          trendData,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
          lastUpdated: new Date().toISOString()
        };
      });

      // Sort by revenue per labor hour (desc)
      allPerformanceData.sort((a, b) => b.revenuePerLaborHour - a.revenuePerLaborHour);

      // Pagination
      const total = allPerformanceData.length;
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      const performanceData = allPerformanceData.slice(skip, skip + limit);

      // Calculate totals
      const totalRevenue = allPerformanceData.reduce((sum, emp) => sum + emp.totalRevenue, 0);
      const totalLaborHours = allPerformanceData.reduce((sum, emp) => sum + emp.totalLaborHours, 0);
      const overallRevenuePerLaborHour = totalLaborHours > 0 ? totalRevenue / totalLaborHours : 0;

      this.logger.log(`Calculated performance metrics for ${total} employees, showing page ${page}/${totalPages}`);

      return {
        performanceData,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalLaborHours: Number(totalLaborHours.toFixed(2)),
        overallRevenuePerLaborHour: Number(overallRevenuePerLaborHour.toFixed(2)),
        totalEmployees: total,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };

    } catch (error) {
      this.logger.error(`Failed to calculate performance analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async calculateEmployeePerformance(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeePerformanceMetrics> {
    const operationStart = Date.now();
    this.logger.log(`Calculating individual performance for employee ${employeeId}`);

    try {
      // Validate employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Validate date range
    if (startDate > endDate) {
      throw new BadRequestException('Invalid date range');
    }

    const analytics = await this.getEmployeePerformanceAnalytics(
      employeeId,
      startDate,
      endDate,
      1,
      1
    );

    if (analytics.performanceData.length === 0) {
      // Return empty metrics for employee with no services
      const duration = Date.now() - operationStart;
      await this.performanceLogging.logPerformanceCalculation(
        employeeId,
        'Individual Performance (No Data)',
        startDate,
        endDate,
        duration,
        'SUCCESS',
        undefined,
        { totalServices: 0, totalRevenue: 0 }
      );

      return {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        totalRevenue: 0,
        totalLaborHours: 0,
        revenuePerLaborHour: 0,
        totalServices: 0,
        averageServiceValue: 0,
        laborCost: 0,
        partsCost: 0,
        profitMargin: 0,
        serviceBreakdown: {},
        trendData: { weeklyRevenue: [] },
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }

    const result = analytics.performanceData[0];
    const duration = Date.now() - operationStart;

    await this.performanceLogging.logPerformanceCalculation(
      employeeId,
      'Individual Performance',
      startDate,
      endDate,
      duration,
      'SUCCESS',
      undefined,
      {
        totalServices: result.totalServices,
        totalRevenue: result.totalRevenue,
        revenuePerLaborHour: result.revenuePerLaborHour,
        profitMargin: result.profitMargin
      }
    );

    return result;

    } catch (error) {
      const duration = Date.now() - operationStart;
      await this.performanceLogging.logPerformanceCalculation(
        employeeId,
        'Individual Performance',
        startDate,
        endDate,
        duration,
        'ERROR',
        error.message
      );
      throw error;
    }
  }

  async getEmployeePerformanceTrends(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Promise<PerformanceTrendData> {
    this.logger.log(`Calculating performance trends for employee ${employeeId} with ${granularity} granularity`);

    // Validate employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get service records
    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where: {
        employeeId,
        serviceDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      orderBy: {
        serviceDate: 'asc'
      }
    });

    // Generate trend periods
    const trends = this.generateTrendPeriods(serviceRecords, startDate, endDate, granularity);

    // Calculate summary statistics
    const totalRevenue = trends.reduce((sum, trend) => sum + trend.revenue, 0);
    const averageRevenue = trends.length > 0 ? totalRevenue / trends.length : 0;
    const growthRate = this.calculateGrowthRate(trends);
    const consistency = this.calculateConsistencyScore(trends);

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      trends,
      summary: {
        averageRevenue: Number(averageRevenue.toFixed(2)),
        growthRate: Number(growthRate.toFixed(2)),
        consistency: Number(consistency.toFixed(2))
      }
    };
  }

  async compareEmployeePerformance(
    employeeIds: string[],
    startDate: Date,
    endDate: Date,
    metric: string = 'revenuePerLaborHour'
  ): Promise<TeamPerformanceComparison> {
    this.logger.log(`Comparing performance for ${employeeIds.length || 'all'} employees on metric: ${metric}`);

    // If no specific employees, get all service advisors
    if (!employeeIds || employeeIds.length === 0) {
      const allEmployees = await this.prisma.employee.findMany({
        where: {
          role: EmployeeRole.SERVICE_ADVISOR,
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      employeeIds = allEmployees.map(emp => emp.id);
    }

    // Get performance data for all employees
    const performancePromises = employeeIds.map(empId =>
      this.calculateEmployeePerformance(empId, startDate, endDate)
    );

    const performanceResults = await Promise.all(performancePromises);

    // Filter out employees with no performance data
    const validPerformance = performanceResults.filter(perf => perf.totalServices > 0);

    if (validPerformance.length === 0) {
      throw new NotFoundException('No performance data found for the specified employees');
    }

    // Sort by the specified metric
    validPerformance.sort((a, b) => {
      const aValue = this.getMetricValue(a, metric);
      const bValue = this.getMetricValue(b, metric);
      return bValue - aValue; // Descending order
    });

    // Calculate rankings and percentiles
    const employees = validPerformance.map((perf, index) => ({
      employeeId: perf.employeeId,
      employeeName: perf.employeeName,
      revenuePerLaborHour: perf.revenuePerLaborHour,
      totalRevenue: perf.totalRevenue,
      totalServices: perf.totalServices,
      averageServiceValue: perf.averageServiceValue,
      ranking: index + 1,
      percentileRanking: Math.round(((validPerformance.length - index) / validPerformance.length) * 100)
    }));

    // Calculate team averages
    const teamAverages = {
      revenuePerLaborHour: this.average(validPerformance.map(p => p.revenuePerLaborHour)),
      totalRevenue: this.average(validPerformance.map(p => p.totalRevenue)),
      totalServices: this.average(validPerformance.map(p => p.totalServices)),
      averageServiceValue: this.average(validPerformance.map(p => p.averageServiceValue))
    };

    // Find top performer
    const topPerformer = employees[0];

    return {
      employees,
      teamAverages: {
        revenuePerLaborHour: Number(teamAverages.revenuePerLaborHour.toFixed(2)),
        totalRevenue: Number(teamAverages.totalRevenue.toFixed(2)),
        totalServices: Number(teamAverages.totalServices.toFixed(2)),
        averageServiceValue: Number(teamAverages.averageServiceValue.toFixed(2))
      },
      topPerformer: {
        employeeId: topPerformer.employeeId,
        employeeName: topPerformer.employeeName,
        metric,
        value: this.getMetricValue(validPerformance[0], metric)
      },
      metricName: metric,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString()
    };
  }

  async getPerformanceSummary(
    employeeId: string | undefined,
    startDate: Date,
    endDate: Date
  ) {
    this.logger.log(`Generating performance summary for ${employeeId || 'all employees'}`);

    const analytics = await this.getEmployeePerformanceAnalytics(
      employeeId,
      startDate,
      endDate,
      1,
      1000 // Get all employees for summary
    );

    // Calculate additional summary metrics
    const topPerformers = analytics.performanceData.slice(0, 5);
    const bottomPerformers = analytics.performanceData.slice(-5);

    // Calculate distribution statistics
    const revenues = analytics.performanceData.map(p => p.revenuePerLaborHour);
    const median = this.calculateMedian(revenues);
    const standardDeviation = this.calculateStandardDeviation(revenues);

    return {
      ...analytics,
      summary: {
        topPerformers,
        bottomPerformers,
        medianRevenuePerLaborHour: Number(median.toFixed(2)),
        standardDeviation: Number(standardDeviation.toFixed(2)),
        totalProfitMargin: analytics.performanceData.reduce((sum, p) => sum + p.profitMargin, 0)
      }
    };
  }

  async getRealTimePerformance(employeeId: string): Promise<EmployeePerformanceMetrics> {
    this.logger.log(`Getting real-time performance for employee ${employeeId}`);

    // Get current month performance
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.calculateEmployeePerformance(employeeId, startOfMonth, endOfMonth);
  }

  async generateAdvancedAnalytics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ) {
    this.logger.log(`Generating advanced analytics for employee ${employeeId}`);

    // This would integrate with the analytics engine for advanced calculations
    const basicPerformance = await this.calculateEmployeePerformance(employeeId, startDate, endDate);

    // Use analytics engine for advanced calculations
    const advancedMetrics = await this.analyticsEngine.calculatePerformanceMetrics(
      employeeId,
      startDate,
      endDate
    );

    return {
      employeeId,
      performanceMetrics: {
        totalRevenue: basicPerformance.totalRevenue,
        averageMonthlyRevenue: basicPerformance.totalRevenue / this.getMonthsBetween(startDate, endDate),
        revenueGrowthRate: advancedMetrics.growthRate,
        consistencyScore: advancedMetrics.consistencyScore,
        efficiencyScore: advancedMetrics.efficiencyScore
      },
      trendAnalysis: advancedMetrics.trendAnalysis,
      benchmarks: advancedMetrics.benchmarks,
      recommendations: advancedMetrics.recommendations
    };
  }

  // Private helper methods

  private generateWeeklyTrends(services: any[], startDate: Date, endDate: Date) {
    const trends = { weeklyRevenue: [] as any[] };

    const currentWeek = new Date(startDate);
    while (currentWeek <= endDate) {
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekServices = services.filter(service => {
        const serviceDate = new Date(service.serviceDate);
        return serviceDate >= currentWeek && serviceDate <= weekEnd;
      });

      const weekRevenue = weekServices.reduce((sum, service) => sum + (service.totalCost || 0), 0);
      const weekHours = weekServices.reduce((sum, service) => sum + (service.laborHours || 0), 0);

      trends.weeklyRevenue.push({
        week: currentWeek.toISOString().split('T')[0],
        revenue: Number(weekRevenue.toFixed(2)),
        hours: Number(weekHours.toFixed(2))
      });

      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    return trends;
  }

  private generateTrendPeriods(
    serviceRecords: any[],
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly'
  ) {
    const trends = [];
    let currentPeriod = new Date(startDate);

    while (currentPeriod <= endDate) {
      const periodEnd = new Date(currentPeriod);

      switch (granularity) {
        case 'daily':
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'weekly':
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'monthly':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
      }

      const periodServices = serviceRecords.filter(record => {
        const serviceDate = new Date(record.serviceDate);
        return serviceDate >= currentPeriod && serviceDate < periodEnd;
      });

      const revenue = periodServices.reduce((sum, record) => sum + (record.totalCost || 0), 0);
      const laborHours = periodServices.reduce((sum, record) => sum + (record.laborHours || 0), 0);
      const revenuePerLaborHour = laborHours > 0 ? revenue / laborHours : 0;

      trends.push({
        period: currentPeriod.toISOString().split('T')[0],
        revenue: Number(revenue.toFixed(2)),
        laborHours: Number(laborHours.toFixed(2)),
        revenuePerLaborHour: Number(revenuePerLaborHour.toFixed(2)),
        servicesCompleted: periodServices.length
      });

      currentPeriod = periodEnd;
    }

    return trends;
  }

  private calculateGrowthRate(trends: any[]): number {
    if (trends.length < 2) return 0;

    const first = trends[0].revenue;
    const last = trends[trends.length - 1].revenue;

    if (first === 0) return last > 0 ? 100 : 0;

    return ((last - first) / first) * 100;
  }

  private calculateConsistencyScore(trends: any[]): number {
    if (trends.length < 2) return 100;

    const revenues = trends.map(t => t.revenue);
    const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
    const standardDeviation = Math.sqrt(variance);

    // Consistency score: lower std dev relative to mean = higher consistency
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  private getMetricValue(performance: EmployeePerformanceMetrics, metric: string): number {
    switch (metric) {
      case 'revenuePerLaborHour':
        return performance.revenuePerLaborHour;
      case 'totalRevenue':
        return performance.totalRevenue;
      case 'totalServices':
        return performance.totalServices;
      case 'averageServiceValue':
        return performance.averageServiceValue;
      default:
        return performance.revenuePerLaborHour;
    }
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.average(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                   (endDate.getMonth() - startDate.getMonth());
    return Math.max(1, months);
  }
}