import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum InsightType {
  OPPORTUNITY = 'opportunity',
  CONCERN = 'concern',
  ACHIEVEMENT = 'achievement',
}

export enum Impact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum Trend {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

registerEnumType(InsightType, { name: 'InsightType' });
registerEnumType(Impact, { name: 'Impact' });
registerEnumType(Trend, { name: 'Trend' });

@ObjectType()
export class BusinessInsight {
  @Field(() => InsightType)
  type: InsightType;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => Impact)
  impact: Impact;

  @Field()
  actionable: boolean;
}

@ObjectType()
export class SalesTrend {
  @Field()
  period: string;

  @Field()
  value: number;

  @Field()
  change: number;

  @Field()
  changePercent: number;
}

@ObjectType()
export class PerformanceMetric {
  @Field()
  name: string;

  @Field()
  value: number;

  @Field({ nullable: true })
  target?: number;

  @Field()
  unit: string;

  @Field(() => Trend)
  trend: Trend;
}