import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  ForbiddenException
} from '@nestjs/common';
import { ServiceRemindersService } from './service-reminders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { User } from '../../common/decorators/user.decorator';
import {
  ServiceReminderDto,
  SendReminderRequest,
  GenerateRemindersRequest,
  GenerateRemindersResponse
} from './entities/service-reminder.entity';
import { ReminderStatus, CommunicationMethod } from '@prisma/client';

@Controller('service-reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceRemindersController {
  constructor(private readonly serviceRemindersService: ServiceRemindersService) {}

  @Get()
  async getServiceReminders(
    @Query('status') status?: ReminderStatus,
    @Query('reminderDate') reminderDate?: string,
    @User() user?: any
  ): Promise<ServiceReminderDto[]> {
    try {
      // Validate status parameter
      if (status && !Object.values(ReminderStatus).includes(status)) {
        throw new BadRequestException(`Invalid status. Must be one of: ${Object.values(ReminderStatus).join(', ')}`);
      }

      // Validate and parse date parameter
      let parsedDate: Date | undefined;
      if (reminderDate) {
        parsedDate = new Date(reminderDate);
        if (isNaN(parsedDate.getTime())) {
          throw new BadRequestException('Invalid date format. Use YYYY-MM-DD format.');
        }
      }

      // TODO: Implement store filtering based on user.stores
      // For now, we allow access but ideally this should be filtered

      if (status) {
        return await this.serviceRemindersService.findRemindersByStatus(status);
      } else if (parsedDate) {
        return await this.serviceRemindersService.findRemindersByDate(parsedDate);
      } else {
        return await this.serviceRemindersService.findPendingReminders();
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve service reminders');
    }
  }

  @Post(':reminderId/send')
  async sendServiceReminder(
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
    @Body() sendRequest: SendReminderRequest,
    @User() user: any
  ): Promise<ServiceReminderDto> {
    if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Access denied');
    }
    try {
      // Validate communication method
      if (!sendRequest.communicationMethod) {
        throw new BadRequestException('Communication method is required');
      }

      if (!Object.values(CommunicationMethod).includes(sendRequest.communicationMethod)) {
        throw new BadRequestException(`Invalid communication method. Must be one of: ${Object.values(CommunicationMethod).join(', ')}`);
      }

      return await this.serviceRemindersService.sendReminder(reminderId, sendRequest.communicationMethod);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error.message?.toLowerCase() || '';

      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        throw new NotFoundException('Service reminder not found');
      }

      if (errorMessage.includes('already sent') || errorMessage.includes('duplicate')) {
        throw new ConflictException('Service reminder has already been sent');
      }

      if (errorMessage.includes('notification') || errorMessage.includes('service unavailable')) {
        throw new ServiceUnavailableException('Notification service is currently unavailable');
      }

      throw new BadRequestException('Failed to send service reminder');
    }
  }

  @Post('generate')
  async generateServiceReminders(
    @Body() generateRequest: GenerateRemindersRequest,
    @User() user: any
  ): Promise<GenerateRemindersResponse> {
    if (user.role !== 'ADMINISTRATOR' && user.role !== 'CORPORATE' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Access denied');
    }
    try {
      // Validate daysAhead parameter
      if (generateRequest.daysAhead !== undefined && generateRequest.daysAhead < 0) {
        throw new BadRequestException('daysAhead must be a non-negative number');
      }

      // Validate targetDate parameter
      if (generateRequest.targetDate) {
        const parsedDate = new Date(generateRequest.targetDate);
        if (isNaN(parsedDate.getTime())) {
          throw new BadRequestException('Invalid targetDate format');
        }
        generateRequest.targetDate = parsedDate;
      }

      return await this.serviceRemindersService.generateReminders(generateRequest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to generate service reminders');
    }
  }

  @Get(':reminderId')
  async getServiceReminder(
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
  ): Promise<ServiceReminderDto> {
    try {
      const reminder = await this.serviceRemindersService.findReminderById(reminderId);
      if (!reminder) {
        throw new NotFoundException('Service reminder not found');
      }
      return reminder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve service reminder');
    }
  }

  @Put(':reminderId/status')
  async updateReminderStatus(
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
    @Body() updateData: { status: ReminderStatus; notes?: string },
  ): Promise<ServiceReminderDto> {
    try {
      // Validate status parameter
      if (!Object.values(ReminderStatus).includes(updateData.status)) {
        throw new BadRequestException(`Invalid status. Must be one of: ${Object.values(ReminderStatus).join(', ')}`);
      }

      return await this.serviceRemindersService.updateReminderStatus(reminderId, updateData.status);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.message?.includes('not found')) {
        throw new NotFoundException('Service reminder not found');
      }

      throw new BadRequestException('Failed to update reminder status');
    }
  }

  @Delete(':reminderId')
  async deleteServiceReminder(
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
  ): Promise<{ message: string }> {
    try {
      await this.serviceRemindersService.deleteReminder(reminderId);
      return { message: 'Service reminder deleted successfully' };
    } catch (error) {
      if (error.message?.includes('not found')) {
        throw new NotFoundException('Service reminder not found');
      }
      throw new BadRequestException('Failed to delete service reminder');
    }
  }

  // Additional utility endpoints for dashboard functionality

  @Get('customer/:customerId')
  async getCustomerReminders(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('status') status?: ReminderStatus,
  ): Promise<ServiceReminderDto[]> {
    try {
      if (status && !Object.values(ReminderStatus).includes(status)) {
        throw new BadRequestException(`Invalid status. Must be one of: ${Object.values(ReminderStatus).join(', ')}`);
      }

      return await this.serviceRemindersService.findRemindersByCustomer(customerId, status);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve customer reminders');
    }
  }

  @Get('vehicle/:vehicleId')
  async getVehicleReminders(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query('status') status?: ReminderStatus,
  ): Promise<ServiceReminderDto[]> {
    try {
      if (status && !Object.values(ReminderStatus).includes(status)) {
        throw new BadRequestException(`Invalid status. Must be one of: ${Object.values(ReminderStatus).join(', ')}`);
      }

      return await this.serviceRemindersService.findRemindersByVehicle(vehicleId, status);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve vehicle reminders');
    }
  }
}