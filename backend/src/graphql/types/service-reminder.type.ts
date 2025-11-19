import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { BaseEntity } from './base.types';
import { ReminderStatus, CommunicationMethod } from '@prisma/client';

registerEnumType(ReminderStatus, {
  name: 'ReminderStatus',
  description: 'Status of a service reminder',
});

registerEnumType(CommunicationMethod, {
  name: 'CommunicationMethod',
  description: 'Method of communication for sending reminders',
});

@ObjectType()
export class ServiceReminder extends BaseEntity {
  @Field()
  customerId: string;

  @Field()
  vehicleId: string;

  @Field()
  serviceType: string;

  @Field()
  reminderDate: Date;

  @Field()
  lastServiceDate: Date;

  @Field({ nullable: true })
  mileage?: number;

  @Field(() => ReminderStatus)
  status: ReminderStatus;

  @Field(() => CommunicationMethod)
  communicationMethod: CommunicationMethod;
}

@ObjectType()
export class GenerateRemindersResponse {
  @Field()
  generated: number;

  @Field()
  message: string;

  @Field({ nullable: true })
  targetDate?: string;

  @Field(() => [String], { nullable: true })
  serviceTypes?: string[];
}