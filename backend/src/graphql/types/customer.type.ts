import { ObjectType, Field, ID } from '@nestjs/graphql';
import { BaseEntity } from './base.types';

@ObjectType()
export class Customer extends BaseEntity {
  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  zipCode?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  tirePreferenceBrand?: string;

  @Field({ nullable: true })
  communicationPreference?: string;
}