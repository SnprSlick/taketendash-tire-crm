import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface PerformanceMetrics {
  growthRate: number;
  consistencyScore: number;
  efficiencyScore: number;
  trendAnalysis: {
    monthlyTrends: Array<{
      month: string;
      revenue: number;
      hours: number;
      servicesCompleted: number;
    }>;
    seasonalityIndex: number;
    predictedNextMonthRevenue: number;
  };
  benchmarks: {
    companyAverage: number;
    industryAverage: number;
    percentileRanking: number;
  };
  recommendations: Array<{
    category: string;
    suggestion: string;
    impactScore: number;
  }>;
}

// Temporarily disabled analytics engine service due to Prisma model mismatches
/*
@Injectable()
export class AnalyticsEngineService {
  private readonly logger = new Logger(AnalyticsEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculatePerformanceMetrics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    this.logger.log(`Calculating advanced performance metrics for employee ${employeeId}`);

    try {
      // Get historical service records
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

      // Calculate growth rate
      const growthRate = await this.calculateRevenueGrowthRate(serviceRecords);

      // Calculate consistency score
      const consistencyScore = await this.calculateConsistencyScore(serviceRecords);

      // Calculate efficiency score
      const efficiencyScore = await this.calculateEfficiencyScore(serviceRecords);

      // Generate trend analysis
      const trendAnalysis = await this.generateTrendAnalysis(serviceRecords, startDate, endDate);

      // Calculate benchmarks
      const benchmarks = await this.calculateBenchmarks(employeeId, serviceRecords);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(employeeId, serviceRecords);

      return {
        growthRate,
        consistencyScore,
        efficiencyScore,
        trendAnalysis,
        benchmarks,
        recommendations
      };

    } catch (error) {
      this.logger.error(`Failed to calculate performance metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async calculateRevenueGrowthRate(serviceRecords: any[]): Promise<number> {
    if (serviceRecords.length < 2) return 0;

    // Group by month
    const monthlyRevenue = new Map<string, number>();

    for (const record of serviceRecords) {
      const month = new Date(record.serviceDate).toISOString().substring(0, 7); // YYYY-MM
      const currentRevenue = monthlyRevenue.get(month) || 0;
      monthlyRevenue.set(month, currentRevenue + (record.totalCost || 0));
    }

    const months = Array.from(monthlyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (months.length < 2) return 0;

    // Calculate month-over-month growth rate (average)
    let totalGrowthRate = 0;
    let growthPeriods = 0;

    for (let i = 1; i < months.length; i++) {
      const previousRevenue = months[i - 1][1];
      const currentRevenue = months[i][1];

      if (previousRevenue > 0) {
        const periodGrowthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        totalGrowthRate += periodGrowthRate;
        growthPeriods++;
      }
    }

    return growthPeriods > 0 ? Number((totalGrowthRate / growthPeriods).toFixed(2)) : 0;
  }

  private async calculateConsistencyScore(serviceRecords: any[]): Promise<number> {
    if (serviceRecords.length < 3) return 100; // Perfect score for minimal data

    // Calculate weekly revenue patterns
    const weeklyRevenue = new Map<string, number>();

    for (const record of serviceRecords) {
      const serviceDate = new Date(record.serviceDate);
      const weekStart = new Date(serviceDate);
      weekStart.setDate(serviceDate.getDate() - serviceDate.getDay()); // Start of week
      const weekKey = weekStart.toISOString().substring(0, 10);

      const currentRevenue = weeklyRevenue.get(weekKey) || 0;
      weeklyRevenue.set(weekKey, currentRevenue + (record.totalCost || 0));
    }

    const revenues = Array.from(weeklyRevenue.values());

    if (revenues.length < 2) return 100;

    // Calculate coefficient of variation (lower = more consistent)
    const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
    const standardDeviation = Math.sqrt(variance);

    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;

    // Convert to 0-100 scale (higher = more consistent)
    const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));

    return Number(consistencyScore.toFixed(2));
  }

  private async calculateEfficiencyScore(serviceRecords: any[]): Promise<number> {
    if (serviceRecords.length === 0) return 0;

    // Efficiency based on revenue per labor hour compared to service complexity
    let totalRevenue = 0;
    let totalHours = 0;
    let complexServiceCount = 0;

    // Define complex services (higher labor requirements)
    const complexServices = ['Tire Installation', 'Brake Service', 'Transmission Service', 'Engine Repair'];

    for (const record of serviceRecords) {
      totalRevenue += record.totalCost || 0;
      totalHours += record.laborHours || 0;

      if (complexServices.includes(record.serviceType)) {
        complexServiceCount++;
      }
    }

    if (totalHours === 0) return 0;

    const baseRevenuePerHour = totalRevenue / totalHours;

    // Bonus for handling complex services efficiently
    const complexServiceRatio = complexServiceCount / serviceRecords.length;
    const complexityBonus = complexServiceRatio * 20; // Up to 20 point bonus

    // Industry benchmark (this would be configurable)
    const industryBenchmark = 150; // $150/hour benchmark

    const efficiencyRatio = baseRevenuePerHour / industryBenchmark;
    const baseScore = Math.min(100, efficiencyRatio * 100);

    const finalScore = Math.min(100, baseScore + complexityBonus);

    return Number(finalScore.toFixed(2));
  }

  private async generateTrendAnalysis(
    serviceRecords: any[],
    startDate: Date,
    endDate: Date
  ) {
    // Generate monthly trends
    const monthlyTrends = [];
    const monthlyData = new Map<string, { revenue: number; hours: number; count: number }>();

    for (const record of serviceRecords) {
      const month = new Date(record.serviceDate).toISOString().substring(0, 7);
      const current = monthlyData.get(month) || { revenue: 0, hours: 0, count: 0 };

      current.revenue += record.totalCost || 0;
      current.hours += record.laborHours || 0;
      current.count += 1;

      monthlyData.set(month, current);
    }

    // Convert to array format
    const sortedMonths = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [month, data] of sortedMonths) {
      monthlyTrends.push({
        month,
        revenue: Number(data.revenue.toFixed(2)),
        hours: Number(data.hours.toFixed(2)),
        servicesCompleted: data.count
      });
    }

    // Calculate seasonality index
    const seasonalityIndex = this.calculateSeasonalityIndex(monthlyTrends);

    // Predict next month revenue (simple linear regression)
    const predictedNextMonthRevenue = this.predictNextMonthRevenue(monthlyTrends);

    return {
      monthlyTrends,
      seasonalityIndex,
      predictedNextMonthRevenue
    };
  }

  private calculateSeasonalityIndex(monthlyTrends: any[]): number {
    if (monthlyTrends.length < 4) return 0;

    // Calculate the coefficient of variation for revenues to measure seasonality
    const revenues = monthlyTrends.map(trend => trend.revenue);
    const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
    const standardDeviation = Math.sqrt(variance);

    const coefficientOfVariation = mean > 0 ? (standardDeviation / mean) * 100 : 0;

    return Number(coefficientOfVariation.toFixed(2));
  }

  private predictNextMonthRevenue(monthlyTrends: any[]): number {
    if (monthlyTrends.length < 2) return 0;

    // Simple linear regression on the last 6 months
    const recentTrends = monthlyTrends.slice(-6);
    const n = recentTrends.length;

    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1; // Time index
      const y = recentTrends[i].revenue;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next month (x = n + 1)
    const prediction = slope * (n + 1) + intercept;

    return Number(Math.max(0, prediction).toFixed(2));
  }

  private async calculateBenchmarks(employeeId: string, serviceRecords: any[]) {
    // Calculate company average
    const allEmployeeRecords = await this.prisma.serviceRecord.findMany({
      where: {
        status: 'COMPLETED',
        serviceDate: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        },
        employeeId: {
          not: employeeId
        }
      }
    });

    let companyTotalRevenue = 0;
    let companyTotalHours = 0;

    for (const record of allEmployeeRecords) {
      companyTotalRevenue += record.totalCost || 0;
      companyTotalHours += record.laborHours || 0;
    }

    const companyAverage = companyTotalHours > 0 ? companyTotalRevenue / companyTotalHours : 0;

    // Employee's performance
    let employeeRevenue = 0;
    let employeeHours = 0;

    for (const record of serviceRecords) {
      employeeRevenue += record.totalCost || 0;
      employeeHours += record.laborHours || 0;
    }

    const employeeAverage = employeeHours > 0 ? employeeRevenue / employeeHours : 0;

    // Industry average (would typically come from external data)
    const industryAverage = 150; // $150/hour industry benchmark

    // Calculate percentile ranking among company employees
    const allEmployees = await this.prisma.employee.findMany({
      where: {
        role: 'SERVICE_ADVISOR',
        status: 'ACTIVE',
        id: { not: employeeId }
      }
    });

    let betterThanCount = 0;
    for (const employee of allEmployees) {
      const empRecords = await this.prisma.serviceRecord.findMany({
        where: {
          employeeId: employee.id,
          status: 'COMPLETED',
          serviceDate: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          }
        }
      });

      let empRevenue = 0;
      let empHours = 0;
      for (const record of empRecords) {
        empRevenue += record.totalCost || 0;
        empHours += record.laborHours || 0;
      }

      const empAverage = empHours > 0 ? empRevenue / empHours : 0;
      if (employeeAverage > empAverage) {
        betterThanCount++;
      }
    }

    const percentileRanking = allEmployees.length > 0
      ? Math.round((betterThanCount / allEmployees.length) * 100)
      : 50;

    return {
      companyAverage: Number(companyAverage.toFixed(2)),
      industryAverage: Number(industryAverage.toFixed(2)),
      percentileRanking
    };
  }

  private async generateRecommendations(employeeId: string, serviceRecords: any[]) {
    const recommendations = [];

    if (serviceRecords.length === 0) {
      recommendations.push({
        category: 'Activity',
        suggestion: 'Increase service activity to establish performance baseline',
        impactScore: 90
      });
      return recommendations;
    }

    // Analyze service patterns
    const serviceTypes = new Map<string, { count: number; revenue: number; hours: number }>();

    for (const record of serviceRecords) {
      const type = record.serviceType;
      const current = serviceTypes.get(type) || { count: 0, revenue: 0, hours: 0 };

      current.count += 1;
      current.revenue += record.totalCost || 0;
      current.hours += record.laborHours || 0;

      serviceTypes.set(type, current);
    }

    // Find most profitable service types
    const serviceEfficiency = Array.from(serviceTypes.entries())
      .map(([type, data]) => ({
        type,
        revenuePerHour: data.hours > 0 ? data.revenue / data.hours : 0,
        count: data.count
      }))
      .sort((a, b) => b.revenuePerHour - a.revenuePerHour);

    if (serviceEfficiency.length > 1) {
      const topService = serviceEfficiency[0];
      const totalServices = serviceRecords.length;

      if (topService.count / totalServices < 0.3) {
        recommendations.push({
          category: 'Service Focus',
          suggestion: `Consider specializing more in ${topService.type} services (highest revenue per hour: $${topService.revenuePerHour.toFixed(2)})`,
          impactScore: 75
        });
      }
    }

    // Check for low-efficiency services
    const lowEfficiencyServices = serviceEfficiency.filter(s => s.revenuePerHour < 100);
    if (lowEfficiencyServices.length > 0 && lowEfficiencyServices[0].count > 2) {
      recommendations.push({
        category: 'Efficiency',
        suggestion: `Review processes for ${lowEfficiencyServices[0].type} services to improve efficiency`,
        impactScore: 60
      });
    }

    // Check revenue consistency
    const monthlyRevenues = this.groupByMonth(serviceRecords);
    const revenueValues = Array.from(monthlyRevenues.values());

    if (revenueValues.length > 1) {
      const mean = revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length;
      const variance = revenueValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenueValues.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;

      if (coefficientOfVariation > 0.5) {
        recommendations.push({
          category: 'Consistency',
          suggestion: 'Focus on maintaining consistent monthly revenue through steady service scheduling',
          impactScore: 65
        });
      }
    }

    // Growth opportunity
    const recentRevenue = this.getRecentMonthlyRevenue(serviceRecords);
    const averageRevenue = revenueValues.length > 0
      ? revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length
      : 0;

    if (recentRevenue < averageRevenue * 0.8) {
      recommendations.push({
        category: 'Growth',
        suggestion: 'Recent performance is below average - consider additional training or process improvements',
        impactScore: 80
      });
    }

    return recommendations;
  }

  private groupByMonth(serviceRecords: any[]): Map<string, number> {
    const monthlyRevenue = new Map<string, number>();

    for (const record of serviceRecords) {
      const month = new Date(record.serviceDate).toISOString().substring(0, 7);
      const current = monthlyRevenue.get(month) || 0;
      monthlyRevenue.set(month, current + (record.totalCost || 0));
    }

    return monthlyRevenue;
  }

  private getRecentMonthlyRevenue(serviceRecords: any[]): number {
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);

    return serviceRecords
      .filter(record => new Date(record.serviceDate).toISOString().substring(0, 7) === currentMonth)
      .reduce((sum, record) => sum + (record.totalCost || 0), 0);
  }
}
*/

// Placeholder class for temporarily disabled analytics engine service
@Injectable()
export class AnalyticsEngineService {}