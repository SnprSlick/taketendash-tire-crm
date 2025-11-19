import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogEntry {
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

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(logEntry: AuditLogEntry): Promise<void> {
    try {
      // For now, just log to console - TODO: Implement database storage
      console.log('Audit Log:', {
        timestamp: logEntry.timestamp,
        user: logEntry.userName,
        action: logEntry.action,
        resource: `${logEntry.resourceType}:${logEntry.resourceId}`,
        details: logEntry.details,
      });

      // TODO: Store in database when audit log table is created
      // await this.prisma.auditLog.create({
      //   data: {
      //     userId: logEntry.userId,
      //     userName: logEntry.userName,
      //     action: logEntry.action,
      //     resourceType: logEntry.resourceType,
      //     resourceId: logEntry.resourceId,
      //     details: logEntry.details,
      //     timestamp: new Date(logEntry.timestamp),
      //     ipAddress: logEntry.ipAddress,
      //     userAgent: logEntry.userAgent,
      //   },
      // });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - we don't want audit logging failures to break the app
    }
  }
}