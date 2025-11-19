import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppointmentService } from '../services/appointment.service';
import { CreateAppointmentDto, UpdateAppointmentDto, UpdateAppointmentStatusDto } from '../dto/appointment.dto';
import { EmployeeRole } from '@prisma/client';

@Controller('api/v1/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  private readonly logger = new Logger(AppointmentController.name);

  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(@Body() createAppointmentDto: CreateAppointmentDto) {
    this.logger.log(`Creating appointment for customer ${createAppointmentDto.customerId}`);
    try {
      const appointment = await this.appointmentService.createAppointment(createAppointmentDto);
      this.logger.log(`Successfully created appointment ${appointment.id}`);
      return appointment;
    } catch (error) {
      this.logger.error(`Failed to create appointment: ${error.message}`, error.stack);
      if (error.code === 'P2002') {
        throw new ConflictException('Appointment scheduling conflict detected');
      }
      if (error.message?.includes('validation')) {
        throw new BadRequestException(error.message);
      }
      if (error.message?.includes('conflict') || error.message?.includes('overlapping')) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER, EmployeeRole.ACCOUNT_MANAGER)
  async getAppointments(
    @Query('customerId') customerId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filters = {
      customerId,
      employeeId,
      date,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10
    };

    this.logger.log(`Fetching appointments with filters: ${JSON.stringify(filters)}`);
    const result = await this.appointmentService.getAppointments(filters);
    this.logger.log(`Retrieved ${result.total} appointments`);
    return result;
  }

  @Get(':id')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER, EmployeeRole.ACCOUNT_MANAGER)
  async getAppointmentById(@Param('id') id: string) {
    this.logger.log(`Fetching appointment by ID: ${id}`);
    const appointment = await this.appointmentService.getAppointmentById(id);
    if (!appointment) {
      this.logger.warn(`Appointment not found: ${id}`);
      throw new NotFoundException('Appointment not found');
    }
    this.logger.log(`Retrieved appointment ${id}`);
    return appointment;
  }

  @Put(':id')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async updateAppointment(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto
  ) {
    this.logger.log(`Updating appointment ${id}`);
    try {
      const appointment = await this.appointmentService.updateAppointment(id, updateAppointmentDto);
      if (!appointment) {
        this.logger.warn(`Appointment not found for update: ${id}`);
        throw new NotFoundException('Appointment not found');
      }
      this.logger.log(`Successfully updated appointment ${id}`);
      return appointment;
    } catch (error) {
      this.logger.error(`Failed to update appointment ${id}: ${error.message}`, error.stack);
      if (error.message?.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      if (error.message?.includes('validation')) {
        throw new BadRequestException(error.message);
      }
      if (error.message?.includes('conflict') || error.message?.includes('overlapping')) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Put(':id/status')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async updateAppointmentStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateAppointmentStatusDto
  ) {
    this.logger.log(`Updating appointment ${id} status to ${updateStatusDto.status}`);
    try {
      const appointment = await this.appointmentService.updateAppointmentStatus(id, updateStatusDto);
      if (!appointment) {
        this.logger.warn(`Appointment not found for status update: ${id}`);
        throw new NotFoundException('Appointment not found');
      }
      this.logger.log(`Successfully updated appointment ${id} status to ${updateStatusDto.status}`);
      return appointment;
    } catch (error) {
      this.logger.error(`Failed to update appointment ${id} status: ${error.message}`, error.stack);
      if (error.message?.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      if (error.message?.includes('validation')) {
        throw new BadRequestException(error.message);
      }
      if (error.message?.includes('transition') || error.message?.includes('invalid')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER)
  async deleteAppointment(@Param('id') id: string) {
    this.logger.log(`Deleting appointment ${id}`);
    try {
      const result = await this.appointmentService.deleteAppointment(id);
      if (!result) {
        this.logger.warn(`Appointment not found for deletion: ${id}`);
        throw new NotFoundException('Appointment not found');
      }
      this.logger.log(`Successfully deleted appointment ${id}`);
      return { message: 'Appointment deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete appointment ${id}: ${error.message}`, error.stack);
      if (error.message?.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/send-confirmation')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async sendAppointmentConfirmation(@Param('id') id: string) {
    this.logger.log(`Sending confirmation for appointment ${id}`);
    try {
      const result = await this.appointmentService.sendAppointmentConfirmation(id);
      if (!result) {
        this.logger.warn(`Appointment not found for confirmation: ${id}`);
        throw new NotFoundException('Appointment not found');
      }
      this.logger.log(`Successfully sent confirmation for appointment ${id}`);
      return { message: 'Confirmation sent successfully', ...result };
    } catch (error) {
      this.logger.error(`Failed to send confirmation for appointment ${id}: ${error.message}`, error.stack);
      if (error.message?.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/send-reminder')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async sendAppointmentReminder(@Param('id') id: string) {
    this.logger.log(`Sending reminder for appointment ${id}`);
    try {
      const result = await this.appointmentService.sendAppointmentReminder(id);
      if (!result) {
        this.logger.warn(`Appointment not found for reminder: ${id}`);
        throw new NotFoundException('Appointment not found');
      }
      this.logger.log(`Successfully sent reminder for appointment ${id}`);
      return { message: 'Reminder sent successfully', ...result };
    } catch (error) {
      this.logger.error(`Failed to send reminder for appointment ${id}: ${error.message}`, error.stack);
      if (error.message?.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/send-cancellation')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async sendAppointmentCancellation(@Param('id') id: string) {
    this.logger.log(`Sending cancellation notification for appointment ${id}`);
    try {
      const result = await this.appointmentService.sendAppointmentCancellation(id);
      if (!result) {
        this.logger.warn(`Appointment not found for cancellation: ${id}`);
        throw new NotFoundException('Appointment not found');
      }
      this.logger.log(`Successfully sent cancellation notification for appointment ${id}`);
      return { message: 'Cancellation notification sent successfully', ...result };
    } catch (error) {
      this.logger.error(`Failed to send cancellation for appointment ${id}: ${error.message}`, error.stack);
      if (error.message?.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get('employee/:employeeId/schedule')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async getEmployeeSchedule(
    @Param('employeeId') employeeId: string,
    @Query('date') date?: string,
    @Query('days') days?: string
  ) {
    const daysCount = days ? parseInt(days, 10) : 7;
    this.logger.log(`Fetching schedule for employee ${employeeId}, date: ${date}, days: ${daysCount}`);
    const schedule = await this.appointmentService.getEmployeeSchedule(employeeId, date, daysCount);
    this.logger.log(`Retrieved ${schedule.length} appointments for employee ${employeeId}`);
    return schedule;
  }

  @Get('conflicts/check')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER)
  async checkSchedulingConflicts(
    @Query('employeeId') employeeId: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('duration') duration: string,
    @Query('excludeAppointmentId') excludeAppointmentId?: string
  ) {
    if (!employeeId || !date || !time || !duration) {
      throw new BadRequestException('Missing required parameters: employeeId, date, time, duration');
    }

    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException('Invalid duration value');
    }

    this.logger.log(`Checking conflicts for employee ${employeeId} on ${date} at ${time}`);
    const conflicts = await this.appointmentService.checkSchedulingConflicts(
      employeeId,
      date,
      time,
      durationMinutes,
      excludeAppointmentId
    );
    this.logger.log(`Conflict check result: ${conflicts.hasConflict ? 'CONFLICT' : 'AVAILABLE'}`);
    return conflicts;
  }

  @Get('customer/:customerId/history')
  @Roles(EmployeeRole.SERVICE_ADVISOR, EmployeeRole.MANAGER, EmployeeRole.ACCOUNT_MANAGER)
  async getCustomerAppointmentHistory(
    @Param('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    this.logger.log(`Fetching appointment history for customer ${customerId}`);
    const history = await this.appointmentService.getCustomerAppointmentHistory(
      customerId,
      pageNumber,
      limitNumber
    );
    this.logger.log(`Retrieved ${history.total} appointments for customer ${customerId}`);
    return history;
  }
}