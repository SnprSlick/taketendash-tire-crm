import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, IsDateString, IsArray, IsEnum, IsNumber, Min } from 'class-validator';
import { ReminderStatus, CommunicationMethod } from '@prisma/client';

@InputType()
export class ServiceReminderFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @Field(() => ReminderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @Field(() => CommunicationMethod, { nullable: true })
  @IsOptional()
  @IsEnum(CommunicationMethod)
  communicationMethod?: CommunicationMethod;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

@InputType()
export class SendReminderInput {
  @Field(() => CommunicationMethod)
  @IsEnum(CommunicationMethod)
  communicationMethod: CommunicationMethod;
}

@InputType()
export class GenerateRemindersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daysAhead?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceTypes?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

@InputType()
export class UpdateReminderStatusInput {
  @Field(() => ReminderStatus)
  @IsEnum(ReminderStatus)
  status: ReminderStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}