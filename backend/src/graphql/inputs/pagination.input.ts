import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsPositive, Max, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsPositive()
  @Max(100)
  limit?: number = 20;
}

@InputType()
export class SortInput {
  @Field({ nullable: true })
  @IsOptional()
  field?: string;

  @Field({ nullable: true, defaultValue: 'ASC' })
  @IsOptional()
  direction?: 'ASC' | 'DESC' = 'ASC';
}