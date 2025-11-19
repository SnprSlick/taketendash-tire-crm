import { ObjectType, Field, Float, Int, InputType, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsISO8601 } from 'class-validator';

// Enums
enum GranularityType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

enum MetricType {
  REVENUE_PER_LABOR_HOUR = 'revenuePerLaborHour',
  TOTAL_REVENUE = 'totalRevenue',
  TOTAL_SERVICES = 'totalServices',
  AVERAGE_SERVICE_VALUE = 'averageServiceValue'
}

registerEnumType(GranularityType, {
  name: 'GranularityType',
});

registerEnumType(MetricType, {
  name: 'MetricType',
});

// Service breakdown type
@ObjectType()
export class ServiceBreakdownType {
  @Field(() => Int)
  count: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  totalHours: number;
}

// Weekly revenue trend type
@ObjectType()
export class WeeklyRevenueTrendType {
  @Field()
  week: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Float)
  hours: number;
}

// Trend data type
@ObjectType()
export class TrendDataType {
  @Field(() => [WeeklyRevenueTrendType])
  weeklyRevenue: WeeklyRevenueTrendType[];
}

// Main employee performance type
@ObjectType()
export class EmployeePerformanceType {
  @Field()
  employeeId: string;

  @Field()
  employeeName: string;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  totalLaborHours: number;

  @Field(() => Float)
  revenuePerLaborHour: number;

  @Field(() => Int)
  totalServices: number;

  @Field(() => Float)
  averageServiceValue: number;

  @Field(() => Float)
  laborCost: number;

  @Field(() => Float)
  partsCost: number;

  @Field(() => Float)
  profitMargin: number;

  @Field(() => String, { description: 'JSON string of service breakdown' })
  serviceBreakdownJson: string;

  @Field(() => TrendDataType)
  trendData: TrendDataType;

  @Field()
  periodStart: string;

  @Field()
  periodEnd: string;

  @Field()
  lastUpdated: string;
}

// Pagination type
@ObjectType()
export class PaginationType {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;
}

// Employee performance analytics type
@ObjectType()
export class EmployeePerformanceAnalyticsType {
  @Field(() => [EmployeePerformanceType])
  performanceData: EmployeePerformanceType[];

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  totalLaborHours: number;

  @Field(() => Float)
  overallRevenuePerLaborHour: number;

  @Field(() => Int)
  totalEmployees: number;

  @Field()
  periodStart: string;

  @Field()
  periodEnd: string;

  @Field(() => PaginationType, { nullable: true })
  pagination?: PaginationType;
}

// Performance trend data point type
@ObjectType()
export class PerformanceTrendDataPointType {
  @Field()
  period: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Float)
  laborHours: number;

  @Field(() => Float)
  revenuePerLaborHour: number;

  @Field(() => Int)
  servicesCompleted: number;
}

// Performance trend summary type
@ObjectType()
export class PerformanceTrendSummaryType {
  @Field(() => Float)
  averageRevenue: number;

  @Field(() => Float)
  growthRate: number;

  @Field(() => Float)
  consistency: number;
}

// Performance trend type
@ObjectType()
export class PerformanceTrendType {
  @Field()
  employeeId: string;

  @Field()
  employeeName: string;

  @Field(() => [PerformanceTrendDataPointType])
  trends: PerformanceTrendDataPointType[];

  @Field(() => PerformanceTrendSummaryType)
  summary: PerformanceTrendSummaryType;
}

// Team comparison employee type
@ObjectType()
export class TeamComparisonEmployeeType {
  @Field()
  employeeId: string;

  @Field()
  employeeName: string;

  @Field(() => Float)
  revenuePerLaborHour: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Int)
  totalServices: number;

  @Field(() => Float)
  averageServiceValue: number;

  @Field(() => Int)
  ranking: number;

  @Field(() => Int)
  percentileRanking: number;
}

// Team averages type
@ObjectType()
export class TeamAveragesType {
  @Field(() => Float)
  revenuePerLaborHour: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  totalServices: number;

  @Field(() => Float)
  averageServiceValue: number;
}

// Top performer type
@ObjectType()
export class TopPerformerType {
  @Field()
  employeeId: string;

  @Field()
  employeeName: string;

  @Field()
  metric: string;

  @Field(() => Float)
  value: number;
}

// Team performance comparison type
@ObjectType()
export class TeamPerformanceComparisonType {
  @Field(() => [TeamComparisonEmployeeType])
  employees: TeamComparisonEmployeeType[];

  @Field(() => TeamAveragesType)
  teamAverages: TeamAveragesType;

  @Field(() => TopPerformerType)
  topPerformer: TopPerformerType;

  @Field()
  metricName: string;

  @Field()
  periodStart: string;

  @Field()
  periodEnd: string;
}

// Performance summary type (extends analytics type)
@ObjectType()
export class PerformanceSummaryType extends EmployeePerformanceAnalyticsType {
  @Field(() => String, { description: 'JSON string of summary details including top/bottom performers' })
  summaryJson: string;
}

// Input types for queries

@InputType()
export class EmployeePerformanceFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@InputType()
export class PerformanceTrendFiltersInput {
  @Field()
  @IsString()
  employeeId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @Field(() => GranularityType, { nullable: true, defaultValue: GranularityType.WEEKLY })
  @IsOptional()
  @IsEnum(GranularityType)
  granularity?: GranularityType;
}

@InputType()
export class TeamComparisonFiltersInput {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  employeeIds?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @Field(() => MetricType, { nullable: true, defaultValue: MetricType.REVENUE_PER_LABOR_HOUR })
  @IsOptional()
  @IsEnum(MetricType)
  metric?: MetricType;
}