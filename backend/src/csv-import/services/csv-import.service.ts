import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
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
          await this.persistInvoiceData(invoice, batchId);
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
      this.logger.error(`Failed to persist invoice ${header.invoiceNumber}:`, {
        message: error.message,
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
      duplicateInvoices: parsingResult.duplicateInvoices || []
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
}