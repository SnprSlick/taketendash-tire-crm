import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImportBatchService, BatchCompletionResult } from './import-batch.service';
import { TireMasterCsvParser, TireMasterParsingResult, TireMasterParsingOptions } from '../processors/tiremaster-csv-parser';
import { CsvFileProcessor } from '../processors/csv-file-processor';
import { CreateImportBatchInput } from '../entities/import-batch.entity';
import { CreateImportErrorInput } from '../entities/import-error.entity';
import { ImportStatus, ErrorType } from '../../shared/enums/import.enums';

/**
 * CSV Import Orchestration Service
 *
 * High-level service that coordinates the complete CSV import process.
 * Manages file validation, parsing, data transformation, batch tracking,
 * error handling, and database persistence.
 */

export interface CsvImportRequest {
  filePath: string;
  fileName: string;
  userId?: string;
  overwriteExisting?: boolean;
  validateOnly?: boolean;
  batchSize?: number;
  strictMode?: boolean;
}

export interface CsvImportResult {
  batchId: string;
  success: boolean;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  processingTimeMs: number;
  successRate: number;
  errorSummary?: string;
  validationResult: {
    isValid: boolean;
    formatErrors: string[];
    estimatedRecords: number;
  };
  duplicateInvoices: string[];
}

export interface ImportProgress {
  batchId: string;
  currentStep: string;
  processed: number;
  total: number;
  percentage: number;
  successfulRecords: number;
  failedRecords: number;
  estimatedTimeRemaining?: number;
  currentInvoice?: string;
}

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    private readonly importBatchService: ImportBatchService,
    private readonly csvFileProcessor: CsvFileProcessor,
    private readonly tireMasterCsvParser: TireMasterCsvParser,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Import CSV file with complete orchestration
   */
  async importCsv(request: CsvImportRequest): Promise<CsvImportResult> {
    const startTime = Date.now();
    this.logger.log(`Starting CSV import: ${request.fileName}`);

    const {
      filePath,
      fileName,
      userId,
      overwriteExisting = false,
      validateOnly = false,
      batchSize = 100,
      strictMode = false
    } = request;

    try {
      // Step 1: Validate file accessibility
      const fileValidation = await this.csvFileProcessor.validateFile(filePath);
      if (!fileValidation.isValid) {
        throw new BadRequestException(
          `File validation failed: ${fileValidation.errors.join(', ')}`
        );
      }

      // Step 2: Get file summary and validate format
      const fileSummary = await this.tireMasterCsvParser.getFileSummary(filePath);

      const validationResult = {
        isValid: fileSummary.isValidFormat,
        formatErrors: fileSummary.formatErrors,
        estimatedRecords: fileSummary.estimatedInvoices
      };

      if (!validationResult.isValid && strictMode) {
        throw new BadRequestException(
          `TireMaster format validation failed: ${validationResult.formatErrors.join(', ')}`
        );
      }

      // If validation only, return early
      if (validateOnly) {
        return {
          batchId: '',
          success: true,
          totalRecords: validationResult.estimatedRecords,
          successfulRecords: 0,
          failedRecords: 0,
          processingTimeMs: Date.now() - startTime,
          successRate: 0,
          validationResult,
          duplicateInvoices: []
        };
      }

      // Step 3: Create import batch
      const batchInput: CreateImportBatchInput = {
        fileName,
        originalPath: filePath,
        totalRecords: validationResult.estimatedRecords,
        userId
      };

      let batch;
      try {
        batch = await this.importBatchService.createBatch(batchInput);
      } catch (error) {
        if (error.message.includes('already been successfully processed') && !overwriteExisting) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      this.logger.log(`Created import batch: ${batch.id}`);

      // Step 4: Start processing
      await this.importBatchService.startProcessing(batch.id);

      // Step 5: Parse CSV file
      const parsingOptions: TireMasterParsingOptions = {
        validateFormat: !validationResult.isValid, // Re-validate if initial validation failed
        strictMode,
        skipValidationErrors: !strictMode,
        batchSize,
        progressCallback: (progress) => this.handleParsingProgress(batch.id, progress)
      };

      const parsingResult = await this.tireMasterCsvParser.parseFile(filePath, parsingOptions);

      // Step 6: Process parsing results
      if (!parsingResult.success) {
        const errorMessage = `CSV parsing failed: ${parsingResult.errors.length} errors found`;
        await this.importBatchService.failBatch(batch.id, errorMessage);

        // Record parsing errors
        await this.recordParsingErrors(batch.id, parsingResult.errors);

        return this.buildFailureResult(batch.id, parsingResult, validationResult, Date.now() - startTime);
      }

      // Step 7: Process invoices and persist to database
      const { successfulRecords, failedRecords, errorSummary } = await this.processInvoices(
        batch.id,
        parsingResult.invoices,
        batchSize
      );

      // Step 8: Complete the batch
      const completionResult = await this.importBatchService.completeBatch(
        batch.id,
        successfulRecords,
        failedRecords,
        errorSummary
      );

      const result: CsvImportResult = {
        batchId: batch.id,
        success: completionResult.status === ImportStatus.COMPLETED,
        totalRecords: parsingResult.totalInvoices,
        successfulRecords,
        failedRecords,
        processingTimeMs: Date.now() - startTime,
        successRate: completionResult.successRate,
        errorSummary,
        validationResult,
        duplicateInvoices: parsingResult.duplicateInvoices
      };

      this.logger.log(
        `CSV import completed: ${result.successfulRecords}/${result.totalRecords} records processed successfully`
      );

      // Emit completion event
      this.eventEmitter.emit('csv.import.completed', {
        batchId: batch.id,
        fileName,
        result
      });

      return result;

    } catch (error) {
      this.logger.error(`CSV import failed: ${error.message}`, error.stack);

      // Emit error event
      this.eventEmitter.emit('csv.import.failed', {
        fileName,
        error: error.message,
        processingTimeMs: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Get import progress for active batch
   */
  async getImportProgress(batchId: string): Promise<ImportProgress | null> {
    const batchProgress = await this.importBatchService.getCurrentProgress(batchId);

    if (!batchProgress) {
      return null;
    }

    return {
      batchId: batchProgress.batchId,
      currentStep: batchProgress.currentStep,
      processed: batchProgress.processed,
      total: batchProgress.total,
      percentage: batchProgress.percentage,
      successfulRecords: batchProgress.successfulRecords,
      failedRecords: batchProgress.failedRecords,
      estimatedTimeRemaining: batchProgress.estimatedTimeRemaining
    };
  }

  /**
   * Process parsed invoices and persist to database
   */
  private async processInvoices(
    batchId: string,
    invoices: any[],
    batchSize: number
  ): Promise<{
    successfulRecords: number;
    failedRecords: number;
    errorSummary?: string;
  }> {
    let successfulRecords = 0;
    let failedRecords = 0;
    const errors: CreateImportErrorInput[] = [];

    this.logger.log(`Processing ${invoices.length} invoices in batches of ${batchSize}`);

    // Process invoices in batches for memory efficiency
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);
      const processed = Math.min(i + batchSize, invoices.length);
      const currentStep = `Processing invoices ${i + 1}-${processed}`;

      // Update progress
      await this.importBatchService.updateProgress(
        batchId,
        processed,
        successfulRecords,
        failedRecords,
        currentStep
      );

      // Emit real-time progress update
      this.eventEmitter.emit('csv.import.progress', {
        batchId,
        step: 'persistence',
        progress: {
          currentStep,
          processedInvoices: processed,
          totalRows: invoices.length,
          percentage: Math.round((processed / invoices.length) * 100),
          errors: failedRecords
        },
        timestamp: new Date()
      });

      // Process each invoice in the batch
      for (const invoice of batch) {
        try {
          await this.persistInvoiceData(invoice);
          successfulRecords++;

          this.logger.debug(`Successfully processed invoice: ${invoice.header.invoiceNumber}`);

        } catch (error) {
          failedRecords++;

          errors.push({
            importBatchId: batchId,
            rowNumber: invoice.headerRowNumber,
            errorType: ErrorType.BUSINESS_RULE,
            errorMessage: `Invoice persistence failed: ${error.message}`,
            originalData: invoice.rawHeaderLine,
          });

          this.logger.warn(
            `Failed to process invoice ${invoice.header.invoiceNumber}: ${error.message}`
          );
        }
      }

      // Record errors for this batch
      if (errors.length > 0) {
        await this.importBatchService.recordErrors(errors);
        errors.length = 0; // Clear the array for the next batch
      }
    }

    const errorSummary = failedRecords > 0
      ? `${failedRecords} invoices failed to process. Check error details for specifics.`
      : undefined;

    return { successfulRecords, failedRecords, errorSummary };
  }

  /**
   * Persist invoice data to database
   * TODO: Implement actual database persistence logic based on data model
   */
  private async persistInvoiceData(invoice: any): Promise<void> {
    // This is a placeholder for the actual database persistence logic
    // The implementation will depend on the final data model and entities

    const { transformedData } = invoice;

    // Simulate database operations
    // In real implementation, this would:
    // 1. Check if customer exists, create if not
    // 2. Create/update invoice record
    // 3. Create line item records
    // 4. Update inventory if applicable
    // 5. Handle any business logic constraints

    this.logger.debug(`Persisting invoice: ${invoice.header.invoiceNumber}`);

    // Placeholder delay to simulate database operations
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  /**
   * Handle parsing progress updates
   */
  private async handleParsingProgress(batchId: string, progress: any): Promise<void> {
    // Update batch progress
    await this.importBatchService.updateProgress(
      batchId,
      progress.processedRows || 0,
      progress.processedInvoices || 0,
      progress.errors || 0,
      progress.currentStep || 'Parsing CSV'
    );

    // Calculate percentage
    const percentage = progress.totalRows > 0
      ? Math.round((progress.processedRows / progress.totalRows) * 100)
      : 0;

    // Emit real-time progress event
    this.eventEmitter.emit('csv.import.progress', {
      batchId,
      step: 'parsing',
      progress: {
        currentStep: progress.currentStep,
        processedRows: progress.processedRows,
        totalRows: progress.totalRows,
        foundInvoices: progress.foundInvoices,
        processedInvoices: progress.processedInvoices,
        currentInvoice: progress.currentInvoice,
        errors: progress.errors,
        percentage
      },
      timestamp: new Date()
    });
  }

  /**
   * Record parsing errors to database
   */
  private async recordParsingErrors(
    batchId: string,
    parsingErrors: any[]
  ): Promise<void> {
    const errorInputs: CreateImportErrorInput[] = parsingErrors.map(error => ({
      importBatchId: batchId,
      rowNumber: error.lineNumber,
      errorType: ErrorType.FORMAT,
      errorMessage: error.error,
      originalData: error.rawLine,
    }));

    if (errorInputs.length > 0) {
      await this.importBatchService.recordErrors(errorInputs);
    }
  }

  /**
   * Build failure result object
   */
  private buildFailureResult(
    batchId: string,
    parsingResult: TireMasterParsingResult,
    validationResult: any,
    processingTimeMs: number
  ): CsvImportResult {
    return {
      batchId,
      success: false,
      totalRecords: parsingResult.totalLines,
      successfulRecords: 0,
      failedRecords: parsingResult.errors.length,
      processingTimeMs,
      successRate: 0,
      errorSummary: `Parsing failed: ${parsingResult.errors.length} errors found`,
      validationResult,
      duplicateInvoices: parsingResult.duplicateInvoices || []
    };
  }

  /**
   * Validate import request parameters
   */
  private validateImportRequest(request: CsvImportRequest): void {
    if (!request.filePath) {
      throw new BadRequestException('File path is required');
    }

    if (!request.fileName) {
      throw new BadRequestException('File name is required');
    }

    if (request.batchSize && (request.batchSize < 1 || request.batchSize > 1000)) {
      throw new BadRequestException('Batch size must be between 1 and 1000');
    }
  }

  /**
   * Quick file format validation (without full parsing)
   */
  async validateFileFormat(filePath: string): Promise<{
    isValid: boolean;
    errors: string[];
    estimatedRecords: number;
    fileInfo: {
      size: number;
      totalLines: number;
      sampleInvoices: string[];
    };
  }> {
    try {
      const fileSummary = await this.tireMasterCsvParser.getFileSummary(filePath);

      return {
        isValid: fileSummary.isValidFormat,
        errors: fileSummary.formatErrors,
        estimatedRecords: fileSummary.estimatedInvoices,
        fileInfo: {
          size: fileSummary.fileSize,
          totalLines: fileSummary.totalLines,
          sampleInvoices: fileSummary.sampleInvoices
        }
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`File validation failed: ${error.message}`],
        estimatedRecords: 0,
        fileInfo: {
          size: 0,
          totalLines: 0,
          sampleInvoices: []
        }
      };
    }
  }
}