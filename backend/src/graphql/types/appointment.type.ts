import { ObjectType, Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { AppointmentStatus } from '@prisma/client';
import { CustomerType } from './customer.type';
import { VehicleType } from './vehicle.type';
import { EmployeeType } from './employee.type';

// Register GraphQL enums
registerEnumType(AppointmentStatus, {
  name: 'AppointmentStatus',
  description: 'Possible appointment statuses'
});

@ObjectType()
export class AppointmentType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  customerId: string;

  @Field(() => ID)
  vehicleId: string;

  @Field(() => ID)
  employeeId: string;

  @Field()
  appointmentDate: Date;

  @Field()
  appointmentTime: string;

  @Field(() => Int)
  duration: number;

  @Field()
  serviceType: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => AppointmentStatus)
  status: AppointmentStatus;

  @Field()
  reminderSent: boolean;

  @Field()
  confirmationSent: boolean;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => CustomerType, { nullable: true })
  customer?: CustomerType;

  @Field(() => VehicleType, { nullable: true })
  vehicle?: VehicleType;

  @Field(() => EmployeeType, { nullable: true })
  employee?: EmployeeType;
}

@InputType()
export class CreateAppointmentInput {
  @Field(() => ID)
  customerId: string;

  @Field(() => ID)
  vehicleId: string;

  @Field(() => ID)
  employeeId: string;

  @Field()
  appointmentDate: string;

  @Field()
  appointmentTime: string;

  @Field(() => Int, { nullable: true })
  duration?: number;

  @Field()
  serviceType: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => AppointmentStatus, { nullable: true })
  status?: AppointmentStatus;

  @Field({ nullable: true })
  notes?: string;
}

@InputType()
export class UpdateAppointmentInput {
  @Field(() => ID, { nullable: true })
  vehicleId?: string;

  @Field(() => ID, { nullable: true })
  employeeId?: string;

  @Field({ nullable: true })
  appointmentDate?: string;

  @Field({ nullable: true })
  appointmentTime?: string;

  @Field(() => Int, { nullable: true })
  duration?: number;

  @Field({ nullable: true })
  serviceType?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => AppointmentStatus, { nullable: true })
  status?: AppointmentStatus;

  @Field({ nullable: true })
  reminderSent?: boolean;

  @Field({ nullable: true })
  confirmationSent?: boolean;

  @Field({ nullable: true })
  notes?: string;
}

@InputType()
export class UpdateAppointmentStatusInput {
  @Field(() => AppointmentStatus)
  status: AppointmentStatus;

  @Field({ nullable: true })
  notes?: string;
}

@InputType()
export class AppointmentFiltersInput {
  @Field(() => ID, { nullable: true })
  customerId?: string;

  @Field(() => ID, { nullable: true })
  employeeId?: string;

  @Field({ nullable: true })
  date?: string;

  @Field(() => AppointmentStatus, { nullable: true })
  status?: AppointmentStatus;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;
}

@ObjectType()
export class AppointmentListResponse {
  @Field(() => [AppointmentType])
  appointments: AppointmentType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class ConflictCheckResponse {
  @Field()
  hasConflict: boolean;

  @Field(() => [AppointmentType], { nullable: true })
  conflictingAppointments?: AppointmentType[];

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class AppointmentNotificationResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  messageId?: string;

  @Field(() => AppointmentType)
  appointment: AppointmentType;

  @Field({ nullable: true })
  error?: string;
}