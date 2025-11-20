import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImportBatchService } from './import-batch.service';
import { ImportStatus } from '../../shared/enums/import.enums';

/**
 * Rollback Service
 *
 * Handles rollback operations for failed or cancelled import batches.
 * Provides transaction-safe cleanup of partially imported data.
 */

export interface RollbackOperation {
  batchId: string;
  operationType: 'customer' | 'invoice' | 'lineItem' | 'inventory';
  recordId: string;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  originalData?: any;
  newData?: any;
  timestamp: Date;
}

export interface RollbackResult {
  batchId: string;
  success: boolean;
  operationsRolledBack: number;
  errorCount: number;
  rollbackTimeMs: number;
  errors: Array<{
    operation: RollbackOperation;
    error: string;
  }>;
}

@Injectable()
export class RollbackService {
  private readonly logger = new Logger(RollbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly importBatchService: ImportBatchService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Execute complete rollback for an import batch
   */
  async rollbackImportBatch(batchId: string, reason?: string): Promise<RollbackResult> {
    const startTime = Date.now();
    this.logger.log(`Starting rollback for batch: ${batchId}`);

    try {
      // Verify batch exists and can be rolled back
      const batch = await this.importBatchService.getBatch(batchId);
      if (batch.status !== ImportStatus.COMPLETED && batch.status !== ImportStatus.FAILED) {
        throw new Error(`Cannot rollback batch in status: ${batch.status}`);
      }

      // Get rollback operations for this batch
      const operations = await this.getRollbackOperations(batchId);

      if (operations.length === 0) {
        this.logger.warn(`No rollback operations found for batch: ${batchId}`);
        return {
          batchId,
          success: true,
          operationsRolledBack: 0,
          errorCount: 0,
          rollbackTimeMs: Date.now() - startTime,
          errors: []
        };
      }

      // Execute rollback in transaction
      const result = await this.executeRollbackTransaction(batchId, operations);

      // Update batch status
      await this.markBatchRolledBack(batchId, reason);

      // Emit rollback completion event
      this.eventEmitter.emit('import.batch.rolledback', {
        batchId,
        operationsRolledBack: result.operationsRolledBack,
        errors: result.errorCount,
        reason
      });

      this.logger.log(
        `Rollback completed for batch ${batchId}: ${result.operationsRolledBack} operations reversed`
      );

      return {
        batchId,
        success: result.operationsRolledBack > 0,
        ...result,
        rollbackTimeMs: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error(`Rollback failed for batch ${batchId}: ${error.message}`, error.stack);

      this.eventEmitter.emit('import.batch.rollback.failed', {
        batchId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Record a rollback operation during import
   */
  async recordRollbackOperation(operation: Omit<RollbackOperation, 'timestamp'>): Promise<void> {
    try {
      await this.prisma.importRollbackOperation.create({
        data: {
          importBatchId: operation.batchId,
          operationType: operation.operationType,
          recordId: operation.recordId,
          tableName: operation.tableName,
          operation: operation.operation,
          originalData: operation.originalData ? JSON.stringify(operation.originalData) : null,
          newData: operation.newData ? JSON.stringify(operation.newData) : null,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Failed to record rollback operation: ${error.message}`);
      // Don't throw - rollback operation recording shouldn't break the import
    }
  }

  /**
   * Get rollback operations for a batch
   */
  private async getRollbackOperations(batchId: string): Promise<RollbackOperation[]> {
    const operations = await this.prisma.importRollbackOperation.findMany({
      where: { importBatchId: batchId },
      orderBy: { timestamp: 'desc' } // Rollback in reverse order
    });

    return operations.map(op => ({
      batchId: op.importBatchId,
      operationType: op.operationType as RollbackOperation['operationType'],
      recordId: op.recordId,
      tableName: op.tableName,
      operation: op.operation as RollbackOperation['operation'],
      originalData: op.originalData ? JSON.parse(op.originalData) : undefined,
      newData: op.newData ? JSON.parse(op.newData) : undefined,
      timestamp: op.timestamp
    }));
  }

  /**
   * Execute rollback operations in transaction
   */
  private async executeRollbackTransaction(
    batchId: string,
    operations: RollbackOperation[]
  ): Promise<{
    operationsRolledBack: number;
    errorCount: number;
    errors: Array<{ operation: RollbackOperation; error: string }>;
  }> {
    let operationsRolledBack = 0;
    let errorCount = 0;
    const errors: Array<{ operation: RollbackOperation; error: string }> = [];

    // Execute rollback in database transaction
    await this.prisma.$transaction(async (prisma) => {
      for (const operation of operations) {
        try {
          await this.executeRollbackOperation(prisma, operation);
          operationsRolledBack++;
        } catch (error) {
          errorCount++;
          errors.push({
            operation,
            error: error.message
          });
          this.logger.warn(`Rollback operation failed: ${error.message}`);
          // Continue with other operations instead of failing entire transaction
        }
      }
    });

    return { operationsRolledBack, errorCount, errors };
  }

  /**
   * Execute individual rollback operation
   */
  private async executeRollbackOperation(
    prisma: any,
    operation: RollbackOperation
  ): Promise<void> {
    const { tableName, recordId, operation: opType, originalData } = operation;

    switch (opType) {
      case 'INSERT':
        // Reverse INSERT by deleting the record
        await this.deleteRecord(prisma, tableName, recordId);
        break;

      case 'UPDATE':
        // Reverse UPDATE by restoring original data
        if (originalData) {
          await this.updateRecord(prisma, tableName, recordId, originalData);
        }
        break;

      case 'DELETE':
        // Reverse DELETE by inserting original data back
        if (originalData) {
          await this.insertRecord(prisma, tableName, originalData);
        }
        break;

      default:
        throw new Error(`Unknown operation type: ${opType}`);
    }
  }

  /**
   * Delete a record from specified table
   */
  private async deleteRecord(prisma: any, tableName: string, recordId: string): Promise<void> {
    switch (tableName) {
      case 'Customer':
        await prisma.customer.delete({ where: { id: recordId } });
        break;
      case 'Invoice':
        await prisma.invoice.delete({ where: { id: recordId } });
        break;
      case 'InvoiceLineItem':
        await prisma.invoiceLineItem.delete({ where: { id: recordId } });
        break;
      case 'Inventory':
        await prisma.inventory.delete({ where: { id: recordId } });
        break;
      default:
        throw new Error(`Unsupported table for delete: ${tableName}`);
    }
  }

  /**
   * Update a record with original data
   */
  private async updateRecord(prisma: any, tableName: string, recordId: string, data: any): Promise<void> {
    switch (tableName) {
      case 'Customer':
        await prisma.customer.update({
          where: { id: recordId },
          data: this.sanitizeDataForUpdate(data)
        });
        break;
      case 'Invoice':
        await prisma.invoice.update({
          where: { id: recordId },
          data: this.sanitizeDataForUpdate(data)
        });
        break;
      case 'InvoiceLineItem':
        await prisma.invoiceLineItem.update({
          where: { id: recordId },
          data: this.sanitizeDataForUpdate(data)
        });
        break;
      case 'Inventory':
        await prisma.inventory.update({
          where: { id: recordId },
          data: this.sanitizeDataForUpdate(data)
        });
        break;
      default:
        throw new Error(`Unsupported table for update: ${tableName}`);
    }
  }

  /**
   * Insert a record back to specified table
   */
  private async insertRecord(prisma: any, tableName: string, data: any): Promise<void> {
    switch (tableName) {
      case 'Customer':
        await prisma.customer.create({
          data: this.sanitizeDataForCreate(data)
        });
        break;
      case 'Invoice':
        await prisma.invoice.create({
          data: this.sanitizeDataForCreate(data)
        });
        break;
      case 'InvoiceLineItem':
        await prisma.invoiceLineItem.create({
          data: this.sanitizeDataForCreate(data)
        });
        break;
      case 'Inventory':
        await prisma.inventory.create({
          data: this.sanitizeDataForCreate(data)
        });
        break;
      default:
        throw new Error(`Unsupported table for insert: ${tableName}`);
    }
  }

  /**
   * Remove system fields for update operations
   */
  private sanitizeDataForUpdate(data: any): any {
    const { id, createdAt, updatedAt, ...updateData } = data;
    return updateData;
  }

  /**
   * Remove auto-generated fields for create operations
   */
  private sanitizeDataForCreate(data: any): any {
    const { createdAt, updatedAt, ...createData } = data;
    return createData;
  }

  /**
   * Mark batch as rolled back
   */
  private async markBatchRolledBack(batchId: string, reason?: string): Promise<void> {
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: ImportStatus.ROLLED_BACK,
        errorSummary: reason || 'Import rolled back'
      }
    });
  }

  /**
   * Check if batch can be rolled back
   */
  async canRollback(batchId: string): Promise<{
    canRollback: boolean;
    reason?: string;
    operationCount: number;
  }> {
    try {
      const batch = await this.importBatchService.getBatch(batchId);

      if (batch.status !== ImportStatus.COMPLETED && batch.status !== ImportStatus.FAILED) {
        return {
          canRollback: false,
          reason: `Cannot rollback batch in status: ${batch.status}`,
          operationCount: 0
        };
      }

      const operations = await this.getRollbackOperations(batchId);

      return {
        canRollback: true,
        operationCount: operations.length
      };
    } catch (error) {
      return {
        canRollback: false,
        reason: `Error checking rollback eligibility: ${error.message}`,
        operationCount: 0
      };
    }
  }

  /**
   * Get rollback history for a batch
   */
  async getRollbackHistory(batchId: string): Promise<RollbackOperation[]> {
    return this.getRollbackOperations(batchId);
  }

  /**
   * Clean up old rollback operations
   */
  async cleanupOldRollbackOperations(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.importRollbackOperation.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    this.logger.log(`Cleaned up ${result.count} old rollback operations`);
    return result.count;
  }
}