import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ImportBatchEntity,
  ImportBatchData,
  CreateImportBatchInput,
  ImportBatchFilter
} from '../entities/import-batch.entity';
import {
  ImportErrorEntity,
  ImportErrorData,
  CreateImportErrorInput,
  ImportErrorSummary
} from '../entities/import-error.entity';
import { ImportStatus, ErrorType } from '../../shared/enums/import.enums';

/**
 * ImportBatchService
 *
 * High-level service for managing import batches and their lifecycle.
 * Handles batch creation, progress tracking, error management, and completion.
 */

export interface ImportProgressUpdate {
  batchId: string;
  processed: number;
  total: number;
  percentage: number;
  currentStep: string;
  successfulRecords: number;
  failedRecords: number;
  estimatedTimeRemaining?: number;
}

export interface BatchCompletionResult {
  batchId: string;
  status: ImportStatus;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  processingTimeSeconds: number;
  successRate: number;
  errorSummary?: string;
}

@Injectable()
export class ImportBatchService {
  constructor(
    private readonly importBatchEntity: ImportBatchEntity,
    private readonly importErrorEntity: ImportErrorEntity,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Create a new import batch and start tracking
   */
  async createBatch(input: CreateImportBatchInput): Promise<ImportBatchData> {
    // Check if file has already been processed
    const existingBatch = await this.importBatchEntity.findByFileName(input.fileName);
    if (existingBatch && existingBatch.status === ImportStatus.COMPLETED) {
      throw new BadRequestException(
        `File '${input.fileName}' has already been successfully processed. ` +
        `Previous batch ID: ${existingBatch.id}`
      );
    }

    const batch = await this.importBatchEntity.create(input);

    // Emit batch created event
    this.eventEmitter.emit('import.batch.created', {
      batchId: batch.id,
      fileName: batch.fileName,
      totalRecords: batch.totalRecords,
      userId: batch.userId,
    });

    return batch;
  }

  /**
   * Start processing a batch
   */
  async startProcessing(batchId: string): Promise<ImportBatchData> {
    const batch = await this.getBatch(batchId);

    if (batch.status !== ImportStatus.STARTED) {
      throw new BadRequestException(
        `Cannot start processing batch in status: ${batch.status}`
      );
    }

    const updatedBatch = await this.importBatchEntity.markInProgress(batchId);

    // Emit processing started event
    this.eventEmitter.emit('import.batch.started', {
      batchId: updatedBatch.id,
      fileName: updatedBatch.fileName,
      totalRecords: updatedBatch.totalRecords,
    });

    return updatedBatch;
  }

  /**
   * Update progress during processing
   */
  async updateProgress(
    batchId: string,
    processed: number,
    successfulRecords: number,
    failedRecords: number,
    currentStep: string
  ): Promise<ImportProgressUpdate> {
    const batch = await this.getBatch(batchId);

    // Update database counters
    await this.importBatchEntity.updateProgress(batchId, successfulRecords, failedRecords);

    const total = batch.totalRecords;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

    // Calculate estimated time remaining (simple linear projection)
    let estimatedTimeRemaining: number | undefined;
    if (batch.status === ImportStatus.IN_PROGRESS && processed > 0 && processed < total) {
      const elapsedSeconds = (Date.now() - batch.startedAt.getTime()) / 1000;
      const rate = processed / elapsedSeconds; // records per second
      const remaining = total - processed;
      estimatedTimeRemaining = remaining > 0 ? Math.ceil(remaining / rate) : 0;
    }

    const progressUpdate: ImportProgressUpdate = {
      batchId,
      processed,
      total,
      percentage,
      currentStep,
      successfulRecords,
      failedRecords,
      estimatedTimeRemaining,
    };

    // Emit progress update event
    this.eventEmitter.emit('import.progress.updated', progressUpdate);

    return progressUpdate;
  }

  /**
   * Record an import error
   */
  async recordError(errorInput: CreateImportErrorInput): Promise<ImportErrorData> {
    const error = await this.importErrorEntity.create(errorInput);

    // Emit error recorded event
    this.eventEmitter.emit('import.error.recorded', {
      batchId: errorInput.importBatchId,
      rowNumber: errorInput.rowNumber,
      errorType: errorInput.errorType,
      errorMessage: errorInput.errorMessage,
    });

    return error;
  }

  /**
   * Record multiple import errors in batch
   */
  async recordErrors(errors: CreateImportErrorInput[]): Promise<number> {
    if (errors.length === 0) return 0;

    const count = await this.importErrorEntity.createMany(errors);

    // Emit batch error event
    this.eventEmitter.emit('import.errors.recorded', {
      batchId: errors[0].importBatchId,
      errorCount: count,
      errors: errors.slice(0, 5), // Emit first 5 errors for event details
    });

    return count;
  }

  /**
   * Complete a batch processing
   */
  async completeBatch(
    batchId: string,
    successfulRecords: number,
    failedRecords: number,
    errorSummary?: string
  ): Promise<BatchCompletionResult> {
    const batch = await this.getBatch(batchId);

    if (batch.status === ImportStatus.COMPLETED || batch.status === ImportStatus.FAILED) {
      throw new BadRequestException(
        `Batch is already ${batch.status.toLowerCase()}`
      );
    }

    const updatedBatch = await this.importBatchEntity.markCompleted(
      batchId,
      successfulRecords,
      failedRecords,
      errorSummary
    );

    const processingTimeSeconds = updatedBatch.completedAt
      ? Math.round((updatedBatch.completedAt.getTime() - updatedBatch.startedAt.getTime()) / 1000)
      : 0;

    const successRate = updatedBatch.totalRecords > 0
      ? Math.round((successfulRecords / updatedBatch.totalRecords) * 100 * 100) / 100
      : 0;

    const result: BatchCompletionResult = {
      batchId,
      status: ImportStatus.COMPLETED,
      totalRecords: updatedBatch.totalRecords,
      successfulRecords,
      failedRecords,
      processingTimeSeconds,
      successRate,
      errorSummary,
    };

    // Emit completion event
    this.eventEmitter.emit('import.batch.completed', result);

    return result;
  }

  /**
   * Mark a batch as failed
   */
  async failBatch(batchId: string, errorMessage: string): Promise<BatchCompletionResult> {
    const batch = await this.getBatch(batchId);

    const updatedBatch = await this.importBatchEntity.markFailed(batchId, errorMessage);

    const processingTimeSeconds = updatedBatch.completedAt
      ? Math.round((updatedBatch.completedAt.getTime() - updatedBatch.startedAt.getTime()) / 1000)
      : 0;

    const result: BatchCompletionResult = {
      batchId,
      status: ImportStatus.FAILED,
      totalRecords: updatedBatch.totalRecords,
      successfulRecords: updatedBatch.successfulRecords,
      failedRecords: updatedBatch.failedRecords,
      processingTimeSeconds,
      successRate: 0,
      errorSummary: errorMessage,
    };

    // Emit failure event
    this.eventEmitter.emit('import.batch.failed', result);

    return result;
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string): Promise<ImportBatchData> {
    const batch = await this.importBatchEntity.findById(batchId);
    if (!batch) {
      throw new NotFoundException(`Import batch not found: ${batchId}`);
    }
    return batch;
  }

  /**
   * List batches with filtering and pagination
   */
  async listBatches(
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
    return this.importBatchEntity.findMany(filter, options);
  }

  /**
   * Get batch statistics
   */
  async getBatchStatistics(filter?: ImportBatchFilter) {
    return this.importBatchEntity.getStatistics(filter);
  }

  /**
   * Get recent batches for monitoring
   */
  async getRecentBatches(limit: number = 10): Promise<ImportBatchData[]> {
    return this.importBatchEntity.findRecent(limit);
  }

  /**
   * Get errors for a batch
   */
  async getBatchErrors(
    batchId: string,
    options?: {
      limit?: number;
      errorType?: ErrorType;
      page?: number;
    }
  ): Promise<ImportErrorData[]> {
    await this.getBatch(batchId); // Verify batch exists

    if (options?.page) {
      const result = await this.importErrorEntity.findMany(
        { importBatchId: batchId, errorType: options.errorType ? [options.errorType] : undefined },
        {
          page: options.page,
          limit: options.limit || 50,
          orderBy: 'rowNumber'
        }
      );
      return result.data;
    }

    return this.importErrorEntity.findByImportBatchId(batchId, {
      limit: options?.limit,
      errorType: options?.errorType,
    });
  }

  /**
   * Get error summary for a batch
   */
  async getBatchErrorSummary(batchId: string): Promise<ImportErrorSummary> {
    await this.getBatch(batchId); // Verify batch exists
    return this.importErrorEntity.getErrorSummary(batchId);
  }

  /**
   * Export batch errors to CSV
   */
  async exportBatchErrors(batchId: string): Promise<string> {
    await this.getBatch(batchId); // Verify batch exists
    return this.importErrorEntity.exportToCsv(batchId);
  }

  /**
   * Delete a batch and all its data
   */
  async deleteBatch(batchId: string): Promise<void> {
    await this.getBatch(batchId); // Verify batch exists

    // Delete all errors first
    await this.importErrorEntity.deleteByImportBatchId(batchId);

    // Delete the batch
    await this.importBatchEntity.delete(batchId);

    // Emit deletion event
    this.eventEmitter.emit('import.batch.deleted', { batchId });
  }

  /**
   * Get current processing status
   */
  async getCurrentProgress(batchId: string): Promise<ImportProgressUpdate | null> {
    const batch = await this.getBatch(batchId);

    if (batch.status === ImportStatus.COMPLETED || batch.status === ImportStatus.FAILED) {
      return null; // No active progress
    }

    const processed = batch.successfulRecords + batch.failedRecords;
    const percentage = batch.totalRecords > 0 ? Math.round((processed / batch.totalRecords) * 100) : 0;

    let currentStep = 'Initializing';
    if (batch.status === ImportStatus.IN_PROGRESS) {
      currentStep = processed === 0 ? 'Starting processing' : 'Processing records';
    }

    return {
      batchId,
      processed,
      total: batch.totalRecords,
      percentage,
      currentStep,
      successfulRecords: batch.successfulRecords,
      failedRecords: batch.failedRecords,
    };
  }

  /**
   * Retry a failed batch (creates new batch with same file)
   */
  async retryBatch(batchId: string, userId?: string): Promise<ImportBatchData> {
    const originalBatch = await this.getBatch(batchId);

    if (originalBatch.status !== ImportStatus.FAILED) {
      throw new BadRequestException(
        `Can only retry failed batches. Current status: ${originalBatch.status}`
      );
    }

    // Create new batch with same parameters
    const retryBatch = await this.createBatch({
      fileName: originalBatch.fileName,
      originalPath: originalBatch.originalPath,
      totalRecords: originalBatch.totalRecords,
      userId: userId || originalBatch.userId,
    });

    // Emit retry event
    this.eventEmitter.emit('import.batch.retried', {
      originalBatchId: batchId,
      newBatchId: retryBatch.id,
      fileName: retryBatch.fileName,
    });

    return retryBatch;
  }
}