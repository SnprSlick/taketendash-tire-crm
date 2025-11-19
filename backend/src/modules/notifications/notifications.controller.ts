import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('accounts')
  async getAccountNotifications(
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: string,
    @Query('showDismissed') showDismissed?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedShowDismissed = showDismissed === 'true';

    if (parsedLimit > 50) {
      throw new BadRequestException('Limit cannot exceed 50');
    }

    const notifications = await this.notificationsService.getAccountNotifications({
      accountId,
      limit: parsedLimit,
      showDismissed: parsedShowDismissed,
    });

    return { notifications };
  }

  @Post('accounts/:id/dismiss')
  async dismissNotification(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.dismissNotification(id);
    return { success: true };
  }
}