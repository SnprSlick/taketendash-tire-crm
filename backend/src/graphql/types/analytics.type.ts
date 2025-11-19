import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { SalesData } from './sales-data.type';
import { BusinessInsight, SalesTrend, PerformanceMetric } from './insights.type';

@ObjectType()
export class CategorySales {
  @Field()
  category: string;

  @Field(() => Int)
  total: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class EmployeeSales {
  @Field()
  employeeId: string;

  @Field(() => Int)
  total: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class MonthlySales {
  @Field()
  month: string;

  @Field(() => Int)
  total: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class SalesAnalytics {
  @Field(() => Int)
  totalSales: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  averageOrderValue: number;

  @Field(() => [CategorySales])
  salesByCategory: CategorySales[];

  @Field(() => [EmployeeSales])
  salesByEmployee: EmployeeSales[];

  @Field(() => [MonthlySales])
  salesByMonth: MonthlySales[];

  @Field(() => [SalesData])
  recentSales: SalesData[];
}

@ObjectType()
export class EnhancedAnalytics {
  @Field(() => SalesAnalytics)
  basicAnalytics: SalesAnalytics;

  @Field(() => [BusinessInsight])
  insights: BusinessInsight[];

  @Field(() => [SalesTrend])
  trends: SalesTrend[];

  @Field(() => [PerformanceMetric])
  kpis: PerformanceMetric[];
}