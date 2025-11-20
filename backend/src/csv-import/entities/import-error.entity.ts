import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorType } from '../../shared/enums/import.enums';

/**
 * ImportError Entity Service
 *
 * Handles database operations for import error tracking and reporting.
 * Captures detailed error information for failed import records.
 */

export interface ImportErrorData {
  id: string;
  importBatchId: string;
  rowNumber: number;
  errorType: ErrorType;
  errorMessage: string;
  originalData: string;
  fieldName?: string;
  createdAt: Date;
}

export interface CreateImportErrorInput {
  importBatchId: string;
  rowNumber: number;
  errorType: ErrorType;
  errorMessage: string;
  originalData: string;
  fieldName?: string;
}

export interface ImportErrorFilter {
  importBatchId?: string;
  errorType?: ErrorType[];
  fieldName?: string;
  rowNumberRange?: {
    start: number;
    end: number;
  };
}

export interface ImportErrorSummary {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsByField: Record<string, number>;
  mostCommonError: {
    type: ErrorType;
    message: string;
    count: number;
  };
  affectedRows: number[];
}

@Injectable()
export class ImportErrorEntity {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new import error record
   */
  async create(input: CreateImportErrorInput): Promise<ImportErrorData> {
    const importError = await this.prisma.importError.create({
      data: {
        importBatchId: input.importBatchId,
        rowNumber: input.rowNumber,
        errorType: input.errorType,
        errorMessage: input.errorMessage,
        originalData: input.originalData,
        fieldName: input.fieldName,
      },
    });

    return this.mapToEntity(importError);
  }

  /**
   * Create multiple import errors in batch
   */
  async createMany(inputs: CreateImportErrorInput[]): Promise<number> {
    const result = await this.prisma.importError.createMany({
      data: inputs.map(input => ({
        importBatchId: input.importBatchId,
        rowNumber: input.rowNumber,
        errorType: input.errorType,
        errorMessage: input.errorMessage,
        originalData: input.originalData,
        fieldName: input.fieldName,
      })),
    });

    return result.count;
  }

  /**
   * Find import error by ID
   */
  async findById(id: string): Promise<ImportErrorData | null> {
    const importError = await this.prisma.importError.findUnique({
      where: { id },
    });

    return importError ? this.mapToEntity(importError) : null;
  }

  /**
   * Find all import errors with optional filtering
   */
  async findMany(
    filter?: ImportErrorFilter,
    options?: {
      page?: number;
      limit?: number;
      orderBy?: 'rowNumber' | 'createdAt' | 'errorType';
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<{
    data: ImportErrorData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (filter?.importBatchId) {
      whereClause.importBatchId = filter.importBatchId;
    }

    if (filter?.errorType && filter.errorType.length > 0) {
      whereClause.errorType = { in: filter.errorType };
    }

    if (filter?.fieldName) {
      whereClause.fieldName = filter.fieldName;
    }

    if (filter?.rowNumberRange) {
      whereClause.rowNumber = {
        gte: filter.rowNumberRange.start,
        lte: filter.rowNumberRange.end,
      };
    }

    // Build order by
    const orderBy: any = {};
    const orderField = options?.orderBy || 'rowNumber';
    const orderDirection = options?.orderDirection || 'asc';
    orderBy[orderField] = orderDirection;

    // Execute queries
    const [data, total] = await Promise.all([
      this.prisma.importError.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.importError.count({ where: whereClause }),
    ]);

    return {
      data: data.map(error => this.mapToEntity(error)),
      total,
      page,
      limit,
    };
  }

  /**
   * Find errors for a specific import batch
   */
  async findByImportBatchId(
    importBatchId: string,
    options?: {
      limit?: number;
      errorType?: ErrorType;
      orderBy?: 'rowNumber' | 'errorType';
    }
  ): Promise<ImportErrorData[]> {
    const whereClause: any = { importBatchId };

    if (options?.errorType) {
      whereClause.errorType = options.errorType;
    }

    const orderBy: any = {};
    const orderField = options?.orderBy || 'rowNumber';
    orderBy[orderField] = 'asc';

    const errors = await this.prisma.importError.findMany({
      where: whereClause,
      orderBy,
      take: options?.limit,
    });

    return errors.map(error => this.mapToEntity(error));
  }

  /**
   * Get error summary for an import batch
   */
  async getErrorSummary(importBatchId: string): Promise<ImportErrorSummary> {
    const errors = await this.prisma.importError.findMany({
      where: { importBatchId },
      select: {
        errorType: true,
        errorMessage: true,
        fieldName: true,
        rowNumber: true,
      },
    });

    const totalErrors = errors.length;
    const errorsByType: Record<ErrorType, number> = {
      [ErrorType.VALIDATION]: 0,
      [ErrorType.DUPLICATE]: 0,
      [ErrorType.MISSING_DATA]: 0,
      [ErrorType.FORMAT]: 0,
      [ErrorType.BUSINESS_RULE]: 0,
    };
    const errorsByField: Record<string, number> = {};
    const errorMessageCounts: Record<string, { type: ErrorType; count: number }> = {};

    errors.forEach(error => {
      // Count by type
      errorsByType[error.errorType]++;

      // Count by field
      if (error.fieldName) {
        errorsByField[error.fieldName] = (errorsByField[error.fieldName] || 0) + 1;
      }

      // Count error messages
      const messageKey = `${error.errorType}:${error.errorMessage}`;
      if (errorMessageCounts[messageKey]) {
        errorMessageCounts[messageKey].count++;
      } else {
        errorMessageCounts[messageKey] = {
          type: error.errorType,
          count: 1,
        };
      }
    });

    // Find most common error
    let mostCommonError: any = {
      type: ErrorType.VALIDATION,
      message: 'No errors found',
      count: 0,
    };

    Object.entries(errorMessageCounts).forEach(([messageKey, data]) => {
      if (data.count > mostCommonError.count) {
        const [type, message] = messageKey.split(':', 2);
        mostCommonError = {
          type: data.type,
          message: message || 'Unknown error',
          count: data.count,
        };
      }
    });

    // Get affected row numbers
    const affectedRows = [...new Set(errors.map(e => e.rowNumber))].sort((a, b) => a - b);

    return {
      totalErrors,
      errorsByType,
      errorsByField,
      mostCommonError,
      affectedRows,
    };
  }

  /**
   * Get error statistics across multiple import batches
   */
  async getErrorStatistics(filter?: {
    importBatchIds?: string[];
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
  }): Promise<{
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    topErrorMessages: Array<{
      message: string;
      type: ErrorType;
      count: number;
      percentage: number;
    }>;
    errorTrends: Array<{
      date: string;
      errorCount: number;
      errorsByType: Record<ErrorType, number>;
    }>;
  }> {
    // Build where clause for import errors
    const whereClause: any = {};

    if (filter?.importBatchIds && filter.importBatchIds.length > 0) {
      whereClause.importBatchId = { in: filter.importBatchIds };
    } else if (filter?.dateRange) {
      // Join with import batches to filter by date
      whereClause.importBatch = {
        startedAt: {
          gte: filter.dateRange.startDate,
          lte: filter.dateRange.endDate,
        },
      };
    }

    const errors = await this.prisma.importError.findMany({
      where: whereClause,
      include: {
        importBatch: {
          select: {
            startedAt: true,
          },
        },
      },
    });

    const totalErrors = errors.length;
    const errorsByType: Record<ErrorType, number> = {
      [ErrorType.VALIDATION]: 0,
      [ErrorType.DUPLICATE]: 0,
      [ErrorType.MISSING_DATA]: 0,
      [ErrorType.FORMAT]: 0,
      [ErrorType.BUSINESS_RULE]: 0,
    };

    const errorMessageCounts: Record<string, { type: ErrorType; count: number }> = {};
    const dailyErrors: Record<string, Record<ErrorType, number>> = {};

    errors.forEach(error => {
      // Count by type
      errorsByType[error.errorType]++;

      // Count error messages
      const messageKey = error.errorMessage;
      if (errorMessageCounts[messageKey]) {
        errorMessageCounts[messageKey].count++;
      } else {
        errorMessageCounts[messageKey] = {
          type: error.errorType,
          count: 1,
        };
      }

      // Daily trends
      const dateKey = error.createdAt.toISOString().split('T')[0];
      if (!dailyErrors[dateKey]) {
        dailyErrors[dateKey] = {
          [ErrorType.VALIDATION]: 0,
          [ErrorType.DUPLICATE]: 0,
          [ErrorType.MISSING_DATA]: 0,
          [ErrorType.FORMAT]: 0,
          [ErrorType.BUSINESS_RULE]: 0,
        };
      }
      dailyErrors[dateKey][error.errorType]++;
    });

    // Top error messages
    const topErrorMessages = Object.entries(errorMessageCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([message, data]) => ({
        message,
        type: data.type,
        count: data.count,
        percentage: totalErrors > 0 ? Math.round((data.count / totalErrors) * 100 * 100) / 100 : 0,
      }));

    // Error trends
    const errorTrends = Object.entries(dailyErrors)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, errorsByType]) => ({
        date,
        errorCount: Object.values(errorsByType).reduce((sum, count) => sum + count, 0),
        errorsByType,
      }));

    return {
      totalErrors,
      errorsByType,
      topErrorMessages,
      errorTrends,
    };
  }

  /**
   * Delete all errors for an import batch
   */
  async deleteByImportBatchId(importBatchId: string): Promise<number> {
    const result = await this.prisma.importError.deleteMany({
      where: { importBatchId },
    });

    return result.count;
  }

  /**
   * Export errors to CSV format for analysis
   */
  async exportToCsv(importBatchId: string): Promise<string> {
    const errors = await this.findByImportBatchId(importBatchId);

    const headers = 'Row Number,Error Type,Field,Error Message,Original Data';
    const rows = errors.map(error => {
      const originalData = error.originalData.replace(/"/g, '""'); // Escape quotes
      return `${error.rowNumber},"${error.errorType}","${error.fieldName || ''}","${error.errorMessage}","${originalData}"`;
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Map database record to entity
   */
  private mapToEntity(error: any): ImportErrorData {
    return {
      id: error.id,
      importBatchId: error.importBatchId,
      rowNumber: error.rowNumber,
      errorType: error.errorType as ErrorType,
      errorMessage: error.errorMessage,
      originalData: error.originalData,
      fieldName: error.fieldName,
      createdAt: error.createdAt,
    };
  }
}