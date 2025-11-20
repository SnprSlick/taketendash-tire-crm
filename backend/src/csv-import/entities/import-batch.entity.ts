import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportStatus } from '../../shared/enums/import.enums';

/**
 * ImportBatch Entity Service
 *
 * Handles database operations for import batch tracking and management.
 * Each CSV import operation creates one import batch for audit and monitoring.
 */

export interface ImportBatchData {
  id: string;
  fileName: string;
  originalPath: string;
  processedPath?: string;
  startedAt: Date;
  completedAt?: Date;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  status: ImportStatus;
  userId?: string;
  errorSummary?: string;
}

export interface CreateImportBatchInput {
  fileName: string;
  originalPath: string;
  totalRecords: number;
  userId?: string;
}

export interface UpdateImportBatchInput {
  processedPath?: string;
  completedAt?: Date;
  successfulRecords?: number;
  failedRecords?: number;
  status?: ImportStatus;
  errorSummary?: string;
}

export interface ImportBatchFilter {
  status?: ImportStatus[];
  userId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  hasErrors?: boolean;
}

@Injectable()
export class ImportBatchEntity {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new import batch record
   */
  async create(input: CreateImportBatchInput): Promise<ImportBatchData> {
    const importBatch = await this.prisma.importBatch.create({
      data: {
        fileName: input.fileName,
        originalPath: input.originalPath,
        totalRecords: input.totalRecords,
        successfulRecords: 0,
        failedRecords: 0,
        status: ImportStatus.STARTED,
        userId: input.userId,
      },
    });

    return this.mapToEntity(importBatch);
  }

  /**
   * Update an existing import batch
   */
  async update(id: string, input: UpdateImportBatchInput): Promise<ImportBatchData> {
    const importBatch = await this.prisma.importBatch.update({
      where: { id },
      data: {
        processedPath: input.processedPath,
        completedAt: input.completedAt,
        successfulRecords: input.successfulRecords,
        failedRecords: input.failedRecords,
        status: input.status,
        errorSummary: input.errorSummary,
      },
    });

    return this.mapToEntity(importBatch);
  }

  /**
   * Find import batch by ID
   */
  async findById(id: string): Promise<ImportBatchData | null> {
    const importBatch = await this.prisma.importBatch.findUnique({
      where: { id },
      include: {
        invoices: {
          select: { id: true, invoiceNumber: true },
        },
        errors: {
          select: { id: true, errorType: true },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    return importBatch ? this.mapToEntity(importBatch) : null;
  }

  /**
   * Find all import batches with optional filtering
   */
  async findMany(
    filter?: ImportBatchFilter,
    options?: {
      page?: number;
      limit?: number;
      orderBy?: 'startedAt' | 'completedAt' | 'fileName';
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<{
    data: ImportBatchData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (filter?.status && filter.status.length > 0) {
      whereClause.status = { in: filter.status };
    }

    if (filter?.userId) {
      whereClause.userId = filter.userId;
    }

    if (filter?.dateRange) {
      whereClause.startedAt = {
        gte: filter.dateRange.startDate,
        lte: filter.dateRange.endDate,
      };
    }

    if (filter?.hasErrors !== undefined) {
      if (filter.hasErrors) {
        whereClause.failedRecords = { gt: 0 };
      } else {
        whereClause.failedRecords = 0;
      }
    }

    // Build order by
    const orderBy: any = {};
    const orderField = options?.orderBy || 'startedAt';
    const orderDirection = options?.orderDirection || 'desc';
    orderBy[orderField] = orderDirection;

    // Execute queries
    const [data, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              invoices: true,
              errors: true,
            },
          },
        },
      }),
      this.prisma.importBatch.count({ where: whereClause }),
    ]);

    return {
      data: data.map(batch => this.mapToEntity(batch)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get import batch statistics
   */
  async getStatistics(filter?: ImportBatchFilter): Promise<{
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    inProgressBatches: number;
    totalRecordsProcessed: number;
    totalRecordsSuccessful: number;
    totalRecordsFailed: number;
    averageProcessingTime: number; // in seconds
    successRate: number; // percentage
  }> {
    // Build where clause
    const whereClause: any = {};
    if (filter?.status && filter.status.length > 0) {
      whereClause.status = { in: filter.status };
    }
    if (filter?.userId) {
      whereClause.userId = filter.userId;
    }
    if (filter?.dateRange) {
      whereClause.startedAt = {
        gte: filter.dateRange.startDate,
        lte: filter.dateRange.endDate,
      };
    }

    const batches = await this.prisma.importBatch.findMany({
      where: whereClause,
      select: {
        status: true,
        totalRecords: true,
        successfulRecords: true,
        failedRecords: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const totalBatches = batches.length;
    const successfulBatches = batches.filter(b => b.status === ImportStatus.COMPLETED).length;
    const failedBatches = batches.filter(b => b.status === ImportStatus.FAILED).length;
    const inProgressBatches = batches.filter(b =>
      b.status === ImportStatus.STARTED || b.status === ImportStatus.IN_PROGRESS
    ).length;

    const totalRecordsProcessed = batches.reduce((sum, b) => sum + b.totalRecords, 0);
    const totalRecordsSuccessful = batches.reduce((sum, b) => sum + b.successfulRecords, 0);
    const totalRecordsFailed = batches.reduce((sum, b) => sum + b.failedRecords, 0);

    // Calculate average processing time for completed batches
    const completedBatches = batches.filter(b =>
      b.status === ImportStatus.COMPLETED && b.completedAt && b.startedAt
    );

    let averageProcessingTime = 0;
    if (completedBatches.length > 0) {
      const totalProcessingTime = completedBatches.reduce((sum, b) => {
        const duration = b.completedAt!.getTime() - b.startedAt.getTime();
        return sum + (duration / 1000); // Convert to seconds
      }, 0);
      averageProcessingTime = totalProcessingTime / completedBatches.length;
    }

    const successRate = totalRecordsProcessed > 0
      ? (totalRecordsSuccessful / totalRecordsProcessed) * 100
      : 0;

    return {
      totalBatches,
      successfulBatches,
      failedBatches,
      inProgressBatches,
      totalRecordsProcessed,
      totalRecordsSuccessful,
      totalRecordsFailed,
      averageProcessingTime: Math.round(averageProcessingTime),
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Mark batch as in progress
   */
  async markInProgress(id: string): Promise<ImportBatchData> {
    return this.update(id, {
      status: ImportStatus.IN_PROGRESS,
    });
  }

  /**
   * Mark batch as completed
   */
  async markCompleted(
    id: string,
    successfulRecords: number,
    failedRecords: number,
    errorSummary?: string
  ): Promise<ImportBatchData> {
    return this.update(id, {
      status: ImportStatus.COMPLETED,
      completedAt: new Date(),
      successfulRecords,
      failedRecords,
      errorSummary,
    });
  }

  /**
   * Mark batch as failed
   */
  async markFailed(id: string, errorSummary: string): Promise<ImportBatchData> {
    return this.update(id, {
      status: ImportStatus.FAILED,
      completedAt: new Date(),
      errorSummary,
    });
  }

  /**
   * Update processing progress
   */
  async updateProgress(
    id: string,
    successfulRecords: number,
    failedRecords: number
  ): Promise<ImportBatchData> {
    return this.update(id, {
      successfulRecords,
      failedRecords,
    });
  }

  /**
   * Delete import batch and all related data
   */
  async delete(id: string): Promise<void> {
    await this.prisma.importBatch.delete({
      where: { id },
    });
  }

  /**
   * Find recent import batches for monitoring
   */
  async findRecent(limit: number = 10): Promise<ImportBatchData[]> {
    const batches = await this.prisma.importBatch.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            invoices: true,
            errors: true,
          },
        },
      },
    });

    return batches.map(batch => this.mapToEntity(batch));
  }

  /**
   * Check if a file has already been processed
   */
  async findByFileName(fileName: string): Promise<ImportBatchData | null> {
    const batch = await this.prisma.importBatch.findFirst({
      where: { fileName },
      orderBy: { startedAt: 'desc' },
    });

    return batch ? this.mapToEntity(batch) : null;
  }

  /**
   * Map database record to entity
   */
  private mapToEntity(batch: any): ImportBatchData {
    return {
      id: batch.id,
      fileName: batch.fileName,
      originalPath: batch.originalPath,
      processedPath: batch.processedPath,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      totalRecords: batch.totalRecords,
      successfulRecords: batch.successfulRecords,
      failedRecords: batch.failedRecords,
      status: batch.status as ImportStatus,
      userId: batch.userId,
      errorSummary: batch.errorSummary,
    };
  }
}