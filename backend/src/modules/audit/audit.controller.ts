import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { AuditService } from './audit.service';

interface AuditLogRequest {
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('log')
  async logAction(@Body() logRequest: AuditLogRequest) {
    await this.auditService.logAction(logRequest);
    return { success: true };
  }
}