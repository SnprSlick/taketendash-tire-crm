import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { BaseEntity } from './base.types';

@ObjectType()
export class SalesData extends BaseEntity {
  @Field(() => Date)
  salesDate: Date;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => Float)
  discountAmount: number;

  @Field(() => Float)
  taxAmount: number;

  @Field(() => Float)
  netAmount: number;

  @Field()
  paymentMethod: string;

  @Field({ nullable: true })
  customerId?: string;

  @Field({ nullable: true })
  employeeId?: string;

  @Field()
  category: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  itemsSold: number;

  @Field(() => Float, { nullable: true })
  laborHours?: number;

  @Field(() => Float, { nullable: true })
  partsCost?: number;

  @Field(() => Float, { nullable: true })
  laborCost?: number;

  @Field({ nullable: true })
  invoiceNumber?: string;
}