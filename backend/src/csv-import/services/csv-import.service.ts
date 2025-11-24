import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportBatchService, BatchCompletionResult } from './import-batch.service';
import { TireMasterCsvParser, TireMasterParsingResult, TireMasterParsingOptions } from '../processors/tiremaster-csv-parser';
import { CsvFileProcessor } from '../processors/csv-file-processor';
import { CreateImportBatchInput } from '../entities/import-batch.entity';
import { CreateImportErrorInput } from '../entities/import-error.entity';
import { ImportStatus, ErrorType, DuplicateHandlingStrategy } from '../../shared/enums/import.enums';

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
  duplicateHandling?: string;
  deleteFileAfterProcessing?: boolean;
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
  skippedDuplicates: number;
  updatedDuplicates: number;
  renamedDuplicates: number;
  mergedDuplicates: number;
  failedDuplicates: number;
  isHistorical?: boolean;
  originalProcessingDate?: Date;
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
    private readonly prisma: PrismaService,
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
      strictMode = false,
      duplicateHandling = 'SKIP'
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
          duplicateInvoices: [],
          skippedDuplicates: 0,
          updatedDuplicates: 0,
          renamedDuplicates: 0,
          mergedDuplicates: 0,
          failedDuplicates: 0
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
          // Extract previous batch ID from error message
          const batchIdMatch = error.message.match(/Previous batch ID: ([\w-]+)/);
          if (batchIdMatch) {
            const previousBatchId = batchIdMatch[1];
            this.logger.log(`Returning existing batch data for: ${fileName} (Batch ID: ${previousBatchId})`);
            return await this.buildHistoricalResult(previousBatchId);
          }
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      this.logger.log(`Created import batch: ${batch.id}`);

      // Step 4: Start processing (Async or Sync based on caller)
      const parsingOptions: TireMasterParsingOptions = {
        validateFormat: !validationResult.isValid, // Re-validate if initial validation failed
        strictMode,
        skipValidationErrors: !strictMode,
        batchSize,
        progressCallback: (progress) => this.handleParsingProgress(batch.id, progress)
      };

      return await this.processBatch(
        batch,
        filePath,
        fileName,
        validationResult,
        parsingOptions,
        batchSize,
        duplicateHandling,
        startTime,
        request.deleteFileAfterProcessing
      );

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
   * Import CSV file asynchronously (returns immediately after batch creation)
   */
  async importCsvAsync(request: CsvImportRequest): Promise<{ batchId: string, message: string, isHistorical: boolean }> {
    const startTime = Date.now();
    this.logger.log(`Starting Async CSV import: ${request.fileName}`);

    const {
      filePath,
      fileName,
      userId,
      overwriteExisting = false,
      validateOnly = false,
      batchSize = 100,
      strictMode = false,
      duplicateHandling = 'SKIP'
    } = request;

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
        const batchIdMatch = error.message.match(/Previous batch ID: ([\w-]+)/);
        if (batchIdMatch) {
          return { 
            batchId: batchIdMatch[1], 
            message: 'Displaying results from previous processing',
            isHistorical: true
          };
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    this.logger.log(`Created import batch for async processing: ${batch.id}`);

    // Start processing in background
    const parsingOptions: TireMasterParsingOptions = {
      validateFormat: !validationResult.isValid,
      strictMode,
      skipValidationErrors: !strictMode,
      batchSize,
      progressCallback: (progress) => this.handleParsingProgress(batch.id, progress)
    };

    // Fire and forget (with error logging)
    this.processBatch(
      batch,
      filePath,
      fileName,
      validationResult,
      parsingOptions,
      batchSize,
      duplicateHandling,
      startTime,
      request.deleteFileAfterProcessing
    ).catch(err => {
      this.logger.error(`Background import failed for batch ${batch.id}`, err);
    });

    return {
      batchId: batch.id,
      message: 'Import started successfully in background',
      isHistorical: false
    };
  }

  /**
   * Internal method to process the batch
   */
  private async processBatch(
    batch: any,
    filePath: string,
    fileName: string,
    validationResult: any,
    parsingOptions: TireMasterParsingOptions,
    batchSize: number,
    duplicateHandling: string,
    startTime: number,
    deleteFileAfterProcessing: boolean = false
  ): Promise<CsvImportResult> {
    try {
      // Step 4: Start processing
      await this.importBatchService.startProcessing(batch.id);

      // Step 5: Parse CSV file
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
      const {
        successfulRecords,
        failedRecords,
        errorSummary,
        duplicateStatistics
      } = await this.processInvoices(
        batch.id,
        parsingResult.invoices,
        batchSize,
        duplicateHandling
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
        duplicateInvoices: parsingResult.duplicateInvoices,
        skippedDuplicates: duplicateStatistics.skippedDuplicates,
        updatedDuplicates: duplicateStatistics.updatedDuplicates,
        renamedDuplicates: duplicateStatistics.renamedDuplicates,
        mergedDuplicates: duplicateStatistics.mergedDuplicates,
        failedDuplicates: duplicateStatistics.failedDuplicates
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
       // Ensure batch is marked as failed if something goes wrong in processBatch
       try {
         await this.importBatchService.failBatch(batch.id, error.message);
       } catch (e) {
         this.logger.error(`Failed to mark batch ${batch.id} as failed`, e);
       }
       throw error;
    } finally {
      // Cleanup file if requested
      if (deleteFileAfterProcessing && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.log(`Cleaned up temporary file after processing: ${filePath}`);
        } catch (cleanupError) {
          this.logger.warn(`Failed to cleanup temporary file: ${cleanupError.message}`);
        }
      }
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
    batchSize: number,
    duplicateHandling: string = 'SKIP'
  ): Promise<{
    successfulRecords: number;
    failedRecords: number;
    errorSummary?: string;
    duplicateStatistics: {
      skippedDuplicates: number;
      updatedDuplicates: number;
      renamedDuplicates: number;
      mergedDuplicates: number;
      failedDuplicates: number;
    };
  }> {
    let successfulRecords = 0;
    let failedRecords = 0;
    const errors: CreateImportErrorInput[] = [];

    // Track duplicate statistics
    const duplicateStatistics = {
      skippedDuplicates: 0,
      updatedDuplicates: 0,
      renamedDuplicates: 0,
      mergedDuplicates: 0,
      failedDuplicates: 0,
    };

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
          const duplicateResult = await this.handleDuplicateInvoice(invoice, batchId, duplicateHandling);

          // Only count as successful if not failed
          if (duplicateResult.action !== 'FAILED') {
            successfulRecords++;
          }

          // Track duplicate statistics
          switch (duplicateResult.action) {
            case 'SKIPPED':
              duplicateStatistics.skippedDuplicates++;
              break;
            case 'UPDATED':
              if (duplicateHandling === 'MERGE') {
                duplicateStatistics.mergedDuplicates++;
              } else {
                duplicateStatistics.updatedDuplicates++;
              }
              break;
            case 'RENAMED':
              duplicateStatistics.renamedDuplicates++;
              break;
            case 'FAILED':
              duplicateStatistics.failedDuplicates++;
              failedRecords++;

              // Record the error for this failed duplicate
              const errorInput = {
                importBatchId: batchId,
                rowNumber: invoice.headerRowNumber,
                errorType: 'DUPLICATE' as any,
                errorMessage: `Duplicate handling failed: ${duplicateResult.error}`,
                originalData: invoice.rawHeaderLine,
              };
              errors.push(errorInput);
              break;
          }

          this.logger.debug(`Successfully processed invoice: ${invoice.header.invoiceNumber} - Action: ${duplicateResult.action}`);

        } catch (error) {
          failedRecords++;

          // This catch block should only handle unexpected errors since
          // duplicate handling is now done in the main flow above
          let errorType = 'BUSINESS_RULE' as any;
          let errorCode = 'UNEXPECTED_ERROR';

          if (error.message.includes('validation')) {
            errorType = 'VALIDATION' as any;
            errorCode = 'VALIDATION_FAILED';
          } else if (error.message.includes('Missing data') || error.message.includes('required')) {
            errorType = 'MISSING_DATA' as any;
            errorCode = 'MISSING_REQUIRED_FIELD';
          } else if (error.message.includes('Invalid format')) {
            errorType = 'FORMAT' as any;
            errorCode = 'INVALID_DATA_FORMAT';
          }

          errors.push({
            importBatchId: batchId,
            rowNumber: invoice.headerRowNumber,
            errorType,
            errorMessage: `[${errorCode}] Unexpected invoice processing error: ${error.message}`,
            originalData: invoice.rawHeaderLine,
          });

          this.logger.error(
            `Unexpected error processing invoice ${invoice.header.invoiceNumber}: [${errorCode}] ${error.message}`,
            error.stack
          );
        }
      }

      // Record errors for this batch
      if (errors.length > 0) {
        await this.importBatchService.recordErrors(errors);
        errors.length = 0; // Clear the array for the next batch
      }
    }

    // Enhanced error summary with statistics
    let errorSummary: string | undefined;
    if (failedRecords > 0) {
      const duplicatesSummary = Object.entries(duplicateStatistics)
        .filter(([_, count]) => count > 0)
        .map(([action, count]) => `${action}: ${count}`)
        .join(', ');

      errorSummary = `${failedRecords} invoices failed to process. ` +
        (duplicatesSummary ? `Duplicates handled: ${duplicatesSummary}. ` : '') +
        'Check error details for specifics.';
    } else if (Object.values(duplicateStatistics).some(count => count > 0)) {
      // Show duplicate statistics even when no failures occurred
      const duplicatesSummary = Object.entries(duplicateStatistics)
        .filter(([_, count]) => count > 0)
        .map(([action, count]) => `${action}: ${count}`)
        .join(', ');
      errorSummary = `Duplicates handled: ${duplicatesSummary}`;
    }

    return {
      successfulRecords,
      failedRecords,
      errorSummary,
      duplicateStatistics
    };
  }

  /**
   * Persist invoice data to database
   */
  private async persistInvoiceData(invoice: any, importBatchId: string): Promise<void> {
    const { header, lineItems, transformedData } = invoice;

    this.logger.debug(`Persisting invoice: ${header.invoiceNumber}`);
    this.logger.debug(`Invoice data structure:`, {
      header: JSON.stringify(header, null, 2),
      lineItemsCount: lineItems?.length || 0,
      transformedData: JSON.stringify(transformedData, null, 2)
    });

    try {
      // Validate required fields and provide fallbacks
      const customerName = header.customerName?.trim() || 'Unknown Customer';
      const invoiceNumber = header.invoiceNumber?.trim() || `INV-${Date.now()}`;
      const invoiceDate = header.invoiceDate ? new Date(header.invoiceDate) : new Date();

      // Log validation results
      this.logger.debug(`Validated fields:`, {
        originalCustomerName: header.customerName,
        validatedCustomerName: customerName,
        originalInvoiceNumber: header.invoiceNumber,
        validatedInvoiceNumber: invoiceNumber,
        originalDate: header.invoiceDate,
        validatedDate: invoiceDate
      });

      // Use a transaction to ensure data consistency
      await this.prisma.$transaction(async (tx) => {
        // 1. Check if customer exists, create if not
        let customer = await tx.invoiceCustomer.findFirst({
          where: { name: customerName }
        });

        if (!customer) {
          customer = await tx.invoiceCustomer.create({
            data: {
              name: customerName,
              email: null,
              phone: null,
              address: null,
              customerCode: null
            }
          });
          this.logger.debug(`Created new customer: ${customerName}`);
        }

        // 2. Create invoice record with proper type conversions and validation
        const invoiceData = {
          invoiceNumber: invoiceNumber,
          customer: { connect: { id: customer.id } },
          invoiceDate: invoiceDate,
          salesperson: header.salesperson?.trim() || 'Unknown',
          vehicleInfo: header.vehicleInfo?.trim() || null,
          mileage: header.mileage?.trim() || null,
          subtotal: this.parseDecimal(transformedData?.invoice?.subtotal || header.totalAmount || 0),
          taxAmount: this.parseDecimal(transformedData?.invoice?.taxAmount || header.taxAmount || 0),
          totalAmount: this.parseDecimal(transformedData?.invoice?.totalAmount || header.totalAmount || 0),
          laborCost: this.parseDecimal(transformedData?.invoice?.laborCost || 0),
          partsCost: this.parseDecimal(transformedData?.invoice?.partsCost || 0),
          fetTotal: this.parseDecimal(transformedData?.invoice?.fetTotal || 0),
          environmentalFee: this.parseDecimal(transformedData?.invoice?.environmentalFee || 0),
          totalCost: this.parseDecimal(transformedData?.invoice?.totalCost || 0),
          grossProfit: this.parseDecimal(transformedData?.invoice?.grossProfit || 0),
          status: 'ACTIVE' as const,
          importBatch: { connect: { id: importBatchId } }
        };

        this.logger.debug(`About to create invoice with data:`, JSON.stringify(invoiceData, null, 2));

        const createdInvoice = await tx.invoice.create({
          data: invoiceData
        });

        this.logger.debug(`Created invoice: ${createdInvoice.invoiceNumber}`);

        // 3. Create line item records with proper validation
        for (let i = 0; i < lineItems.length; i++) {
          const lineItem = lineItems[i];
          const transformedLineItem = transformedData?.lineItems?.[i];

          const lineItemData = {
            invoiceId: createdInvoice.id,
            lineNumber: lineItem.lineNumber || i + 1,
            productCode: (lineItem.productCode?.trim() || 'UNKNOWN').substring(0, 100),
            description: (lineItem.description?.trim() || 'No description').substring(0, 500),
            adjustment: lineItem.adjustment?.trim() || null,
            quantity: this.parseDecimal(transformedLineItem?.quantity || lineItem.quantity || 0),
            partsCost: this.parseDecimal(transformedLineItem?.partsCost || lineItem.partsCost || 0),
            laborCost: this.parseDecimal(transformedLineItem?.laborCost || lineItem.laborCost || 0),
            fet: this.parseDecimal(transformedLineItem?.fet || lineItem.fet || 0),
            lineTotal: this.parseDecimal(transformedLineItem?.lineTotal || lineItem.lineTotal || 0),
            costPrice: this.parseDecimal(transformedLineItem?.costPrice || lineItem.cost || 0),
            grossProfitMargin: this.parseDecimal(transformedLineItem?.grossProfitMargin || lineItem.grossProfitMargin || 0),
            grossProfit: this.parseDecimal(transformedLineItem?.grossProfit || lineItem.grossProfit || 0),
            category: this.categorizeProduct(lineItem.description || lineItem.productCode || 'OTHER')
          };

          this.logger.debug(`Creating line item ${i + 1}:`, JSON.stringify(lineItemData, null, 2));

          await tx.invoiceLineItem.create({
            data: lineItemData
          });
        }

        this.logger.debug(`Created ${lineItems.length} line items for invoice ${header.invoiceNumber}`);
      });

    } catch (error) {
      // Handle P2002 unique constraint violations (race conditions)
      if (error.code === 'P2002' && error.meta?.target?.includes('invoiceNumber')) {
        this.logger.warn(`Race condition detected for invoice ${header.invoiceNumber}, attempting fallback handling`);

        // Use the configured duplicate handling strategy
        const duplicateResult = await this.handleDuplicateInvoice(
          { header, lineItems, transformedData },
          importBatchId,
          'SKIP' // Default to skip for race conditions
        );

        if (duplicateResult.action === 'SKIPPED') {
          this.logger.log(`Skipped duplicate invoice due to race condition: ${header.invoiceNumber}`);
          return; // Exit gracefully
        } else {
          this.logger.error(`Failed to handle duplicate invoice race condition: ${header.invoiceNumber}`);
          throw new Error(`Duplicate invoice number: ${header.invoiceNumber}`);
        }
      }

      this.logger.error(`Failed to persist invoice ${header.invoiceNumber}:`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
        invoiceData: {
          invoiceNumber: header.invoiceNumber,
          customerName: header.customerName,
          invoiceDate: header.invoiceDate,
          totalAmount: header.totalAmount
        },
        errorDetails: error
      });
      throw error;
    }
  }

  /**
   * Handle duplicate invoice detection and resolution
   */
  private async handleDuplicateInvoice(
    invoice: any,
    importBatchId: string,
    strategy: string
  ): Promise<{
    action: 'PROCESSED' | 'SKIPPED' | 'UPDATED' | 'RENAMED' | 'FAILED';
    newInvoiceNumber?: string;
    error?: string;
  }> {
    const invoiceNumber = invoice.header.invoiceNumber?.trim();

    if (!invoiceNumber) {
      // If no invoice number, let normal processing handle it
      await this.persistInvoiceData(invoice, importBatchId);
      return { action: 'PROCESSED' };
    }

    // Check if invoice already exists
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        lineItems: true,
        customer: true
      }
    });

    if (!existingInvoice) {
      // No duplicate, process normally
      await this.persistInvoiceData(invoice, importBatchId);
      return { action: 'PROCESSED' };
    }

    // Handle duplicate based on strategy
    switch (strategy) {
      case 'SKIP':
        this.logger.log(`Skipping duplicate invoice: ${invoiceNumber}`);
        return { action: 'SKIPPED' };

      case 'UPDATE':
        try {
          await this.updateExistingInvoice(existingInvoice, invoice, importBatchId);
          return { action: 'UPDATED' };
        } catch (error) {
          return { action: 'FAILED', error: `Update failed: ${error.message}` };
        }

      case 'RENAME':
        try {
          const newInvoiceNumber = await this.generateUniqueInvoiceNumber(invoiceNumber);
          invoice.header.invoiceNumber = newInvoiceNumber;
          await this.persistInvoiceData(invoice, importBatchId);
          return { action: 'RENAMED', newInvoiceNumber };
        } catch (error) {
          return { action: 'FAILED', error: `Rename failed: ${error.message}` };
        }

      case 'MERGE':
        try {
          await this.mergeInvoiceLineItems(existingInvoice, invoice, importBatchId);
          return { action: 'UPDATED' };
        } catch (error) {
          return { action: 'FAILED', error: `Merge failed: ${error.message}` };
        }

      case 'FAIL':
      default:
        return {
          action: 'FAILED',
          error: `Duplicate invoice number: ${invoiceNumber}`
        };
    }
  }

  /**
   * Update an existing invoice with new data
   */
  private async updateExistingInvoice(
    existingInvoice: any,
    newInvoice: any,
    importBatchId: string
  ): Promise<void> {
    const { header, lineItems, transformedData } = newInvoice;

    await this.prisma.$transaction(async (tx) => {
      // Update invoice data
      await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          invoiceDate: header.invoiceDate ? new Date(header.invoiceDate) : existingInvoice.invoiceDate,
          salesperson: header.salesperson?.trim() || existingInvoice.salesperson,
          vehicleInfo: header.vehicleInfo?.trim() || existingInvoice.vehicleInfo,
          mileage: header.mileage?.trim() || existingInvoice.mileage,
          subtotal: this.parseDecimal(transformedData?.invoice?.subtotal || header.totalAmount || existingInvoice.subtotal),
          taxAmount: this.parseDecimal(transformedData?.invoice?.taxAmount || header.taxAmount || existingInvoice.taxAmount),
          totalAmount: this.parseDecimal(transformedData?.invoice?.totalAmount || header.totalAmount || existingInvoice.totalAmount),
          laborCost: this.parseDecimal(transformedData?.invoice?.laborCost || existingInvoice.laborCost),
          partsCost: this.parseDecimal(transformedData?.invoice?.partsCost || existingInvoice.partsCost),
          fetTotal: this.parseDecimal(transformedData?.invoice?.fetTotal || existingInvoice.fetTotal),
          environmentalFee: this.parseDecimal(transformedData?.invoice?.environmentalFee || existingInvoice.environmentalFee),
          totalCost: this.parseDecimal(transformedData?.invoice?.totalCost || existingInvoice.totalCost),
          grossProfit: this.parseDecimal(transformedData?.invoice?.grossProfit || existingInvoice.grossProfit),
          importBatch: { connect: { id: importBatchId } }
        }
      });

      // Delete existing line items
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: existingInvoice.id }
      });

      // Add new line items
      for (let i = 0; i < lineItems.length; i++) {
        const lineItem = lineItems[i];
        const transformedLineItem = transformedData?.lineItems?.[i];

        await tx.invoiceLineItem.create({
          data: {
            invoiceId: existingInvoice.id,
            lineNumber: lineItem.lineNumber || i + 1,
            productCode: (lineItem.productCode?.trim() || 'UNKNOWN').substring(0, 100),
            description: (lineItem.description?.trim() || 'No description').substring(0, 500),
            adjustment: lineItem.adjustment?.trim() || null,
            quantity: this.parseDecimal(transformedLineItem?.quantity || lineItem.quantity || 0),
            partsCost: this.parseDecimal(transformedLineItem?.partsCost || lineItem.partsCost || 0),
            laborCost: this.parseDecimal(transformedLineItem?.laborCost || lineItem.laborCost || 0),
            fet: this.parseDecimal(transformedLineItem?.fet || lineItem.fet || 0),
            lineTotal: this.parseDecimal(transformedLineItem?.lineTotal || lineItem.lineTotal || 0),
            costPrice: this.parseDecimal(transformedLineItem?.costPrice || lineItem.cost || 0),
            grossProfitMargin: this.parseDecimal(transformedLineItem?.grossProfitMargin || lineItem.grossProfitMargin || 0),
            grossProfit: this.parseDecimal(transformedLineItem?.grossProfit || lineItem.grossProfit || 0),
            category: this.categorizeProduct(lineItem.description || lineItem.productCode || 'OTHER')
          }
        });
      }
    });

    this.logger.log(`Updated existing invoice: ${header.invoiceNumber}`);
  }

  /**
   * Merge line items from new invoice into existing invoice
   */
  private async mergeInvoiceLineItems(
    existingInvoice: any,
    newInvoice: any,
    importBatchId: string
  ): Promise<void> {
    const { lineItems, transformedData } = newInvoice;

    await this.prisma.$transaction(async (tx) => {
      // Find the highest line number in existing invoice
      const maxLineNumber = existingInvoice.lineItems.length > 0
        ? Math.max(...existingInvoice.lineItems.map((li: any) => li.lineNumber))
        : 0;

      // Add new line items with incremented line numbers
      for (let i = 0; i < lineItems.length; i++) {
        const lineItem = lineItems[i];
        const transformedLineItem = transformedData?.lineItems?.[i];

        await tx.invoiceLineItem.create({
          data: {
            invoiceId: existingInvoice.id,
            lineNumber: maxLineNumber + i + 1,
            productCode: (lineItem.productCode?.trim() || 'UNKNOWN').substring(0, 100),
            description: (lineItem.description?.trim() || 'No description').substring(0, 500),
            adjustment: lineItem.adjustment?.trim() || null,
            quantity: this.parseDecimal(transformedLineItem?.quantity || lineItem.quantity || 0),
            partsCost: this.parseDecimal(transformedLineItem?.partsCost || lineItem.partsCost || 0),
            laborCost: this.parseDecimal(transformedLineItem?.laborCost || lineItem.laborCost || 0),
            fet: this.parseDecimal(transformedLineItem?.fet || lineItem.fet || 0),
            lineTotal: this.parseDecimal(transformedLineItem?.lineTotal || lineItem.lineTotal || 0),
            costPrice: this.parseDecimal(transformedLineItem?.costPrice || lineItem.cost || 0),
            grossProfitMargin: this.parseDecimal(transformedLineItem?.grossProfitMargin || lineItem.grossProfitMargin || 0),
            grossProfit: this.parseDecimal(transformedLineItem?.grossProfit || lineItem.grossProfit || 0),
            category: this.categorizeProduct(lineItem.description || lineItem.productCode || 'OTHER')
          }
        });
      }

      // Recalculate invoice totals
      const allLineItems = await tx.invoiceLineItem.findMany({
        where: { invoiceId: existingInvoice.id }
      });

      const newSubtotal = allLineItems.reduce((sum, li) => sum + Number(li.lineTotal), 0);
      const newLaborCost = allLineItems.reduce((sum, li) => sum + Number(li.laborCost), 0);
      const newPartsCost = allLineItems.reduce((sum, li) => sum + Number(li.partsCost), 0);
      const newFetTotal = allLineItems.reduce((sum, li) => sum + Number(li.fet), 0);
      const newTotalCost = allLineItems.reduce((sum, li) => sum + Number(li.costPrice), 0);
      const newGrossProfit = allLineItems.reduce((sum, li) => sum + Number(li.grossProfit), 0);

      // Update invoice totals
      await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          subtotal: this.parseDecimal(newSubtotal),
          laborCost: this.parseDecimal(newLaborCost),
          partsCost: this.parseDecimal(newPartsCost),
          fetTotal: this.parseDecimal(newFetTotal),
          totalCost: this.parseDecimal(newTotalCost),
          grossProfit: this.parseDecimal(newGrossProfit),
          totalAmount: this.parseDecimal(newSubtotal + existingInvoice.taxAmount),
          importBatch: { connect: { id: importBatchId } }
        }
      });
    });

    this.logger.log(`Merged line items into existing invoice: ${existingInvoice.invoiceNumber}`);
  }

  /**
   * Generate a unique invoice number by adding suffix
   */
  private async generateUniqueInvoiceNumber(baseNumber: string): Promise<string> {
    let suffix = 1;
    let candidate = `${baseNumber}-DUP${suffix}`;

    while (await this.invoiceNumberExists(candidate)) {
      suffix++;
      candidate = `${baseNumber}-DUP${suffix}`;
    }

    return candidate;
  }

  /**
   * Check if an invoice number already exists
   */
  private async invoiceNumberExists(invoiceNumber: string): Promise<boolean> {
    const existing = await this.prisma.invoice.findUnique({
      where: { invoiceNumber }
    });
    return !!existing;
  }

  /**
   * Parse a value to a safe decimal number for Prisma
   */
  private parseDecimal(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const parsed = Number(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return 0;
    }

    // Round to 2 decimal places to avoid precision issues
    return Math.round(parsed * 100) / 100;
  }

  /**
   * Categorize product based on description or product code
   */
  private categorizeProduct(description: string): 'TIRES' | 'SERVICES' | 'PARTS' | 'FEES' | 'OTHER' {
    const desc = description.toLowerCase();

    if (desc.includes('tire') || desc.includes('wheel')) {
      return 'TIRES';
    } else if (desc.includes('service') || desc.includes('labor') || desc.includes('install')) {
      return 'SERVICES';
    } else if (desc.includes('part') || desc.includes('filter') || desc.includes('oil')) {
      return 'PARTS';
    } else if (desc.includes('fee') || desc.includes('tax') || desc.includes('environmental')) {
      return 'FEES';
    } else {
      return 'OTHER';
    }
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
      duplicateInvoices: parsingResult.duplicateInvoices || [],
      skippedDuplicates: parsingResult.skippedDuplicates || 0,
      updatedDuplicates: parsingResult.updatedDuplicates || 0,
      renamedDuplicates: parsingResult.renamedDuplicates || 0,
      mergedDuplicates: 0,
      failedDuplicates: 0
    };
  }

  /**
   * Build historical result from existing batch data
   */
  private async buildHistoricalResult(batchId: string): Promise<CsvImportResult> {
    const batch = await this.importBatchService.getBatch(batchId);
    if (!batch) {
      throw new BadRequestException(`Batch ${batchId} not found`);
    }

    // Calculate processing time from batch data
    const processingTimeMs = batch.completedAt && batch.startedAt
      ? new Date(batch.completedAt).getTime() - new Date(batch.startedAt).getTime()
      : 0;

    const successRate = batch.totalRecords > 0
      ? (batch.successfulRecords / batch.totalRecords) * 100
      : 0;

    return {
      batchId: batch.id,
      success: batch.status === 'COMPLETED',
      totalRecords: batch.totalRecords,
      successfulRecords: batch.successfulRecords,
      failedRecords: batch.failedRecords,
      processingTimeMs,
      successRate,
      errorSummary: batch.errorSummary || undefined,
      validationResult: {
        isValid: batch.status === 'COMPLETED',
        formatErrors: [],
        estimatedRecords: batch.totalRecords
      },
      duplicateInvoices: [],
      skippedDuplicates: 0,
      updatedDuplicates: 0,
      renamedDuplicates: 0,
      mergedDuplicates: 0,
      failedDuplicates: 0,
      isHistorical: true,
      originalProcessingDate: batch.startedAt
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

  /**
   * Clear all data from the database
   * Used for testing and resetting the system
   */
  async clearDatabase(): Promise<void> {
    this.logger.warn('🧹 Clearing database requested via API');

    try {
      // Delete in order of dependencies (child tables first)
      
      this.logger.log('Deleting InvoiceLineItems...');
      await this.prisma.invoiceLineItem.deleteMany({});
      
      this.logger.log('Deleting Invoices...');
      await this.prisma.invoice.deleteMany({});
      
      this.logger.log('Deleting InvoiceCustomers...');
      await this.prisma.invoiceCustomer.deleteMany({});
      
      this.logger.log('Deleting ImportErrors...');
      await this.prisma.importError.deleteMany({});
      
      this.logger.log('Deleting ImportBatches...');
      await this.prisma.importBatch.deleteMany({});

      this.logger.log('✅ Database cleared successfully');
    } catch (error) {
      this.logger.error('❌ Error clearing database:', error);
      throw new InternalServerErrorException('Failed to clear database', error.message);
    }
  }
}