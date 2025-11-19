import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PerformanceLogEntry {
  employeeId?: string;
  action: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'CALCULATE' | 'EXPORT' | 'IMPORT';
  details: Record<string, any>;
  duration?: number;
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
  errorMessage?: string;
  userId?: string;
  userRole?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  operationsByType: Record<string, number>;
  errorsByType: Record<string, number>;
  recentActivity: PerformanceLogEntry[];
}

@Injectable()
export class PerformanceLoggingService {
  private readonly logger = new Logger(PerformanceLoggingService.name);
  private inMemoryLogs: PerformanceLogEntry[] = [];
  private readonly maxInMemoryLogs = 1000;

  constructor(private prisma: PrismaService) {}

  /**
   * Log a performance tracking operation
   */
  async logPerformanceOperation(entry: Omit<PerformanceLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: PerformanceLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    try {
      // Add to in-memory logs for quick access
      this.addToInMemoryLogs(logEntry);

      // Log to console with appropriate level
      this.logToConsole(logEntry);

      // In a production environment, you might want to persist to database
      // await this.persistToDatabase(logEntry);

      // Track metrics
      await this.updateMetrics(logEntry);

    } catch (error) {
      this.logger.error(`Failed to log performance operation: ${error.message}`, error.stack);
    }
  }

  /**
   * Log performance calculation operation
   */
  async logPerformanceCalculation(
    employeeId: string,
    calculationType: string,
    startDate: Date,
    endDate: Date,
    duration: number,
    status: 'SUCCESS' | 'ERROR',
    errorMessage?: string,
    resultMetrics?: Record<string, any>
  ): Promise<void> {
    await this.logPerformanceOperation({
      employeeId,
      action: `Calculate ${calculationType}`,
      operation: 'CALCULATE',
      details: {
        calculationType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        resultMetrics
      },
      duration,
      status,
      errorMessage,
      metadata: {
        periodDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    });
  }

  /**
   * Log performance data retrieval
   */
  async logPerformanceDataRetrieval(
    operation: string,
    employeeIds: string[],
    filters: Record<string, any>,
    duration: number,
    resultCount: number,
    status: 'SUCCESS' | 'ERROR',
    errorMessage?: string
  ): Promise<void> {
    await this.logPerformanceOperation({
      action: `Retrieve ${operation}`,
      operation: 'READ',
      details: {
        operation,
        employeeCount: employeeIds.length,
        employeeIds: employeeIds.slice(0, 10), // Limit to first 10 for logging
        filters,
        resultCount
      },
      duration,
      status,
      errorMessage,
      metadata: {
        isTeamQuery: employeeIds.length > 1
      }
    });
  }

  /**
   * Log performance report generation
   */
  async logReportGeneration(
    reportType: string,
    format: string,
    employeeIds: string[],
    filters: Record<string, any>,
    duration: number,
    status: 'SUCCESS' | 'ERROR',
    errorMessage?: string,
    reportSize?: number
  ): Promise<void> {
    await this.logPerformanceOperation({
      action: `Generate ${reportType} Report`,
      operation: 'EXPORT',
      details: {
        reportType,
        format,
        employeeCount: employeeIds.length,
        filters,
        reportSize
      },
      duration,
      status,
      errorMessage,
      metadata: {
        outputFormat: format,
        isTeamReport: employeeIds.length > 1
      }
    });
  }

  /**
   * Log performance data import/update operations
   */
  async logPerformanceDataUpdate(
    operation: string,
    employeeId: string,
    updateType: 'CREATE' | 'UPDATE' | 'DELETE',
    dataUpdated: Record<string, any>,
    duration: number,
    status: 'SUCCESS' | 'ERROR',
    errorMessage?: string
  ): Promise<void> {
    await this.logPerformanceOperation({
      employeeId,
      action: `${updateType} ${operation}`,
      operation: updateType,
      details: {
        operation,
        updateType,
        dataKeys: Object.keys(dataUpdated),
        recordsAffected: Array.isArray(dataUpdated) ? dataUpdated.length : 1
      },
      duration,
      status,
      errorMessage
    });
  }

  /**
   * Log user access to performance data
   */
  async logUserAccess(
    userId: string,
    userRole: string,
    accessType: string,
    employeeId: string | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logPerformanceOperation({
      employeeId: employeeId || undefined,
      action: `User Access - ${accessType}`,
      operation: 'READ',
      details: {
        accessType,
        targetEmployeeId: employeeId,
        ipAddress,
        userAgent
      },
      status: 'SUCCESS',
      userId,
      userRole,
      metadata: {
        isOwnDataAccess: userId === employeeId,
        accessLevel: userRole
      }
    });
  }

  /**
   * Get performance logging metrics
   */
  async getPerformanceLoggingMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics> {
    const filteredLogs = this.inMemoryLogs.filter(log => {
      if (startDate && log.timestamp < startDate) return false;
      if (endDate && log.timestamp > endDate) return false;
      return true;
    });

    const totalOperations = filteredLogs.length;
    const successfulOperations = filteredLogs.filter(log => log.status === 'SUCCESS').length;
    const failedOperations = filteredLogs.filter(log => log.status === 'ERROR').length;

    const operationsWithDuration = filteredLogs.filter(log => log.duration !== undefined);
    const averageResponseTime = operationsWithDuration.length > 0
      ? operationsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / operationsWithDuration.length
      : 0;

    const operationsByType: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    filteredLogs.forEach(log => {
      operationsByType[log.operation] = (operationsByType[log.operation] || 0) + 1;
      if (log.status === 'ERROR') {
        errorsByType[log.operation] = (errorsByType[log.operation] || 0) + 1;
      }
    });

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      operationsByType,
      errorsByType,
      recentActivity: filteredLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20)
    };
  }

  /**
   * Get recent performance logs
   */
  getRecentLogs(limit: number = 50): PerformanceLogEntry[] {
    return this.inMemoryLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get logs for a specific employee
   */
  getEmployeeLogs(employeeId: string, limit: number = 20): PerformanceLogEntry[] {
    return this.inMemoryLogs
      .filter(log => log.employeeId === employeeId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 30): PerformanceLogEntry[] {
    return this.inMemoryLogs
      .filter(log => log.status === 'ERROR')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old logs to prevent memory issues
   */
  clearOldLogs(olderThanDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.inMemoryLogs.length;
    this.inMemoryLogs = this.inMemoryLogs.filter(log => log.timestamp >= cutoffDate);
    const clearedCount = initialCount - this.inMemoryLogs.length;

    if (clearedCount > 0) {
      this.logger.log(`Cleared ${clearedCount} old log entries older than ${olderThanDays} days`);
    }

    return clearedCount;
  }

  /**
   * Add log entry to in-memory storage
   */
  private addToInMemoryLogs(entry: PerformanceLogEntry): void {
    this.inMemoryLogs.push(entry);

    // Keep only the most recent logs
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      this.inMemoryLogs = this.inMemoryLogs.slice(0, this.maxInMemoryLogs);
    }
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(entry: PerformanceLogEntry): void {
    const logMessage = `Performance ${entry.operation}: ${entry.action}`;
    const contextInfo = {
      employeeId: entry.employeeId,
      duration: entry.duration ? `${entry.duration}ms` : undefined,
      status: entry.status,
      details: entry.details
    };

    switch (entry.status) {
      case 'SUCCESS':
        this.logger.log(`${logMessage} - ${JSON.stringify(contextInfo)}`);
        break;
      case 'ERROR':
        this.logger.error(`${logMessage} - ${entry.errorMessage}`, JSON.stringify(contextInfo));
        break;
      case 'WARNING':
        this.logger.warn(`${logMessage} - ${JSON.stringify(contextInfo)}`);
        break;
    }
  }

  /**
   * Update internal metrics (could be expanded to use Redis or database)
   */
  private async updateMetrics(entry: PerformanceLogEntry): Promise<void> {
    // This is a placeholder for metrics updates
    // In a production system, you might update Redis counters, Prometheus metrics, etc.

    if (entry.duration) {
      // Track response time metrics
      this.logger.debug(`Operation ${entry.action} took ${entry.duration}ms`);
    }

    if (entry.status === 'ERROR') {
      // Track error rates
      this.logger.warn(`Error in ${entry.action}: ${entry.errorMessage}`);
    }
  }

  /**
   * Persist log to database (placeholder for production implementation)
   */
  private async persistToDatabase(entry: PerformanceLogEntry): Promise<void> {
    // In a production environment, you would persist logs to a database
    // This could be a separate logging table or a time-series database like InfluxDB

    try {
      // Example: Save to a performance_logs table
      // await this.prisma.performanceLog.create({
      //   data: {
      //     employeeId: entry.employeeId,
      //     action: entry.action,
      //     operation: entry.operation,
      //     details: entry.details,
      //     duration: entry.duration,
      //     status: entry.status,
      //     errorMessage: entry.errorMessage,
      //     userId: entry.userId,
      //     userRole: entry.userRole,
      //     timestamp: entry.timestamp,
      //     metadata: entry.metadata
      //   }
      // });
    } catch (error) {
      this.logger.error(`Failed to persist log to database: ${error.message}`);
    }
  }
}