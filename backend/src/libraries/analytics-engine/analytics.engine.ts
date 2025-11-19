import { Injectable } from '@nestjs/common';

export interface SalesTrend {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

import { Trend, InsightType, Impact } from '../../graphql/types/insights.type';

export interface PerformanceMetric {
  name: string;
  value: number;
  target?: number;
  unit: string;
  trend: Trend;
}

export interface InsightData {
  type: InsightType;
  title: string;
  description: string;
  impact: Impact;
  actionable: boolean;
}

@Injectable()
export class AnalyticsEngine {
  /**
   * Calculate sales trends over time periods
   */
  calculateSalesTrends(salesData: Array<{ date: Date; amount: number }>): SalesTrend[] {
    // Group sales by month
    const monthlyData = new Map<string, number>();

    salesData.forEach(sale => {
      const monthKey = sale.date.toISOString().substring(0, 7); // YYYY-MM
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + sale.amount);
    });

    // Convert to sorted array and calculate trends
    const sortedMonths = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    return sortedMonths.map((entry, index) => {
      const [period, value] = entry;
      const previousValue = index > 0 ? sortedMonths[index - 1][1] : value;
      const change = value - previousValue;
      const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

      return {
        period,
        value,
        change,
        changePercent,
      };
    });
  }

  /**
   * Generate performance insights from sales data
   */
  generateInsights(salesData: Array<{
    date: Date;
    amount: number;
    category: string;
    employeeId?: string;
  }>): InsightData[] {
    const insights: InsightData[] = [];

    // Analyze category performance
    const categoryPerformance = this.analyzeCategoryPerformance(salesData);
    insights.push(...categoryPerformance);

    // Analyze time-based patterns
    const timePatterns = this.analyzeTimePatterns(salesData);
    insights.push(...timePatterns);

    // Analyze employee performance if data available
    const employeeInsights = this.analyzeEmployeePerformance(salesData);
    insights.push(...employeeInsights);

    return insights;
  }

  /**
   * Calculate key performance metrics
   */
  calculateKPIs(salesData: Array<{
    date: Date;
    amount: number;
    category: string;
  }>): PerformanceMetric[] {
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.amount, 0);
    const totalTransactions = salesData.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate trends for revenue and transactions
    const last30Days = salesData.filter(sale => {
      const daysDiff = (new Date().getTime() - sale.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    const previous30Days = salesData.filter(sale => {
      const daysDiff = (new Date().getTime() - sale.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 30 && daysDiff <= 60;
    });

    const currentRevenue = last30Days.reduce((sum, sale) => sum + sale.amount, 0);
    const previousRevenue = previous30Days.reduce((sum, sale) => sum + sale.amount, 0);
    const revenueTrend = previousRevenue > 0 ?
      (currentRevenue > previousRevenue ? Trend.UP : currentRevenue < previousRevenue ? Trend.DOWN : Trend.STABLE) : Trend.STABLE;

    return [
      {
        name: 'Total Revenue',
        value: totalRevenue,
        unit: 'USD',
        trend: revenueTrend,
      },
      {
        name: 'Total Transactions',
        value: totalTransactions,
        unit: 'count',
        trend: last30Days.length > previous30Days.length ? Trend.UP :
               last30Days.length < previous30Days.length ? Trend.DOWN : Trend.STABLE,
      },
      {
        name: 'Average Order Value',
        value: averageOrderValue,
        target: 150, // Example target
        unit: 'USD',
        trend: Trend.STABLE,
      },
    ];
  }

  private analyzeCategoryPerformance(salesData: Array<{
    amount: number;
    category: string;
  }>): InsightData[] {
    const insights: InsightData[] = [];
    const categoryTotals = new Map<string, number>();

    salesData.forEach(sale => {
      categoryTotals.set(sale.category, (categoryTotals.get(sale.category) || 0) + sale.amount);
    });

    const sortedCategories = Array.from(categoryTotals.entries())
      .sort(([, a], [, b]) => b - a);

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      insights.push({
        type: InsightType.ACHIEVEMENT,
        title: `${topCategory[0]} Leading Sales`,
        description: `${topCategory[0]} generated $${topCategory[1].toFixed(2)} in revenue, making it your top performing category.`,
        impact: Impact.HIGH,
        actionable: false,
      });

      // Identify underperforming categories
      if (sortedCategories.length > 2) {
        const bottomCategory = sortedCategories[sortedCategories.length - 1];
        const avgRevenue = Array.from(categoryTotals.values()).reduce((a, b) => a + b) / categoryTotals.size;

        if (bottomCategory[1] < avgRevenue * 0.5) {
          insights.push({
            type: InsightType.OPPORTUNITY,
            title: `${bottomCategory[0]} Underperforming`,
            description: `${bottomCategory[0]} is significantly below average revenue. Consider reviewing pricing or promotion strategies.`,
            impact: Impact.MEDIUM,
            actionable: true,
          });
        }
      }
    }

    return insights;
  }

  private analyzeTimePatterns(salesData: Array<{
    date: Date;
    amount: number;
  }>): InsightData[] {
    const insights: InsightData[] = [];

    // Analyze weekly patterns
    const dayOfWeekSales = new Map<number, number>();
    salesData.forEach(sale => {
      const dayOfWeek = sale.date.getDay();
      dayOfWeekSales.set(dayOfWeek, (dayOfWeekSales.get(dayOfWeek) || 0) + sale.amount);
    });

    const sortedDays = Array.from(dayOfWeekSales.entries())
      .sort(([, a], [, b]) => b - a);

    if (sortedDays.length > 0) {
      const bestDay = sortedDays[0];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      insights.push({
        type: InsightType.ACHIEVEMENT,
        title: `${dayNames[bestDay[0]]} is Your Best Day`,
        description: `${dayNames[bestDay[0]]} consistently generates the highest revenue. Consider special promotions on other days.`,
        impact: Impact.MEDIUM,
        actionable: true,
      });
    }

    return insights;
  }

  private analyzeEmployeePerformance(salesData: Array<{
    amount: number;
    employeeId?: string;
  }>): InsightData[] {
    const insights: InsightData[] = [];
    const employeePerformance = new Map<string, { total: number; count: number }>();

    salesData.forEach(sale => {
      if (sale.employeeId) {
        const existing = employeePerformance.get(sale.employeeId) || { total: 0, count: 0 };
        employeePerformance.set(sale.employeeId, {
          total: existing.total + sale.amount,
          count: existing.count + 1,
        });
      }
    });

    if (employeePerformance.size > 1) {
      const sortedEmployees = Array.from(employeePerformance.entries())
        .sort(([, a], [, b]) => b.total - a.total);

      if (sortedEmployees.length > 0) {
        const topPerformer = sortedEmployees[0];
        insights.push({
          type: InsightType.ACHIEVEMENT,
          title: 'Top Sales Performer Identified',
          description: `Employee ${topPerformer[0]} has generated $${topPerformer[1].total.toFixed(2)} in sales.`,
          impact: Impact.HIGH,
          actionable: false,
        });
      }
    }

    return insights;
  }
}