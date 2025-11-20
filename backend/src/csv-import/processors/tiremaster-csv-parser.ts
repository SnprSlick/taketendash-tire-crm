import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CsvFileProcessor, ProcessingOptions, ProcessingResult } from './csv-file-processor';
import { CsvFormatValidator, ValidationResult } from './csv-format-validator';
import {
  TireMasterColumnMapper,
  TireMasterInvoiceHeader,
  TireMasterLineItem,
  TireMasterRow
} from '../mappers/tiremaster-column-mapper';
import {
  TireMasterDataTransformer,
  TransformedInvoiceData
} from '../mappers/tiremaster-data-transformer';
import { ErrorType } from '../../shared/enums/import.enums';

/**
 * TireMaster CSV Parser
 *
 * Specialized parser for TireMaster "Invoice Detail Report" format.
 * Handles the complex multi-section format and groups data into complete invoices.
 */

export interface TireMasterParsingOptions extends ProcessingOptions {
  validateFormat?: boolean;
  strictMode?: boolean;
  skipValidationErrors?: boolean;
}

export interface TireMasterParsingResult extends ProcessingResult {
  validation: ValidationResult;
  invoices: ParsedInvoice[];
  totalInvoices: number;
  totalLineItems: number;
  duplicateInvoices: string[];
}

export interface ParsedInvoice {
  header: TireMasterInvoiceHeader;
  lineItems: TireMasterLineItem[];
  transformedData: TransformedInvoiceData;
  rawHeaderLine: string;
  rawLineItemLines: string[];
  headerRowNumber: number;
  lineItemRowNumbers: number[];
}

export interface ParsingError {
  rowNumber: number;
  errorType: ErrorType;
  message: string;
  field?: string;
  rawData: string;
}

export interface ParsingProgress {
  currentStep: string;
  processedRows: number;
  totalRows: number;
  foundInvoices: number;
  processedInvoices: number;
  currentInvoice?: string;
  errors: number;
}

@Injectable()
export class TireMasterCsvParser {
  private readonly logger = new Logger(TireMasterCsvParser.name);

  constructor(
    private readonly csvFileProcessor: CsvFileProcessor,
    private readonly csvFormatValidator: CsvFormatValidator,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Parse TireMaster CSV file into structured invoice data
   */
  async parseFile(
    filePath: string,
    options: TireMasterParsingOptions = {}
  ): Promise<TireMasterParsingResult> {
    this.logger.log(`Starting TireMaster CSV parsing: ${filePath}`);

    const {
      validateFormat = true,
      strictMode = false,
      skipValidationErrors = false,
      progressCallback
    } = options;

    try {
      // Step 1: Get file info
      const fileInfo = await this.csvFileProcessor.getFileInfo(filePath);
      this.logger.log(`File info - Size: ${fileInfo.fileSize} bytes, Lines: ${fileInfo.totalLines}`);

      // Step 2: Validate format if requested
      let validation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        summary: {
          totalRows: fileInfo.totalLines,
          headerRows: 0,
          lineItemRows: 0,
          ignoredRows: 0,
          errorRows: 0,
          estimatedInvoices: 0,
        },
      };

      if (validateFormat) {
        this.logger.log('Validating CSV format...');
        validation = await (this.csvFormatValidator as any).validateTireMasterCsv(fileInfo.firstLines);

        if (!validation.isValid && strictMode && !skipValidationErrors) {
          throw new Error(`CSV validation failed: ${validation.errors.length} errors found`);
        }
      }

      // Step 3: Parse the file
      const parsingState = new TireMasterParsingState();
      const parsingErrors: ParsingError[] = [];

      const lineProcessor = async (line: string, lineNumber: number): Promise<boolean> => {
        try {
          return await this.processLine(line, lineNumber, parsingState, parsingErrors);
        } catch (error) {
          parsingErrors.push({
            rowNumber: lineNumber,
            errorType: ErrorType.FORMAT,
            message: error.message,
            rawData: line,
          });
          return false;
        }
      };

      // Enhanced progress callback
      const enhancedProgressCallback = (progress: any) => {
        const parsingProgress: ParsingProgress = {
          currentStep: 'Processing CSV rows',
          processedRows: progress.processedLines,
          totalRows: progress.totalLines,
          foundInvoices: parsingState.invoices.length,
          processedInvoices: parsingState.completedInvoices.length,
          currentInvoice: parsingState.currentInvoice?.header?.invoiceNumber,
          errors: parsingErrors.length,
        };

        if (progressCallback) {
          progressCallback(parsingProgress as any);
        }

        // Emit parsing progress event
        this.eventEmitter.emit('tiremaster.parsing.progress', {
          filePath,
          progress: parsingProgress,
        });
      };

      const processingResult = await this.csvFileProcessor.processFile(
        filePath,
        lineProcessor,
        { ...options, progressCallback: enhancedProgressCallback }
      );

      // Step 4: Finalize parsing and transform data
      this.finalizeParsing(parsingState);
      const invoices = await this.transformInvoices(parsingState.completedInvoices);

      // Step 5: Detect duplicates
      const duplicateInvoices = this.detectDuplicates(invoices);

      const result: TireMasterParsingResult = {
        success: processingResult.success && parsingErrors.length === 0,
        totalLines: processingResult.totalLines,
        processedLines: processingResult.processedLines,
        skippedLines: processingResult.skippedLines,
        errors: [...processingResult.errors, ...parsingErrors.map(e => ({
          lineNumber: e.rowNumber,
          error: e.message,
          rawLine: e.rawData,
        }))],
        processingTimeMs: processingResult.processingTimeMs,
        validation,
        invoices,
        totalInvoices: invoices.length,
        totalLineItems: invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0),
        duplicateInvoices,
      };

      this.logger.log(
        `TireMaster parsing completed: ${result.totalInvoices} invoices, ${result.totalLineItems} line items`
      );

      // Emit completion event
      this.eventEmitter.emit('tiremaster.parsing.completed', {
        filePath,
        result: {
          invoices: result.totalInvoices,
          lineItems: result.totalLineItems,
          errors: result.errors.length,
          duplicates: duplicateInvoices.length,
        },
      });

      return result;

    } catch (error) {
      this.logger.error(`TireMaster parsing failed: ${error.message}`, error.stack);

      // Emit error event
      this.eventEmitter.emit('tiremaster.parsing.error', {
        filePath,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process a single CSV line
   * CRITICAL FIX: Process line items FIRST before checking for invoice termination
   * This handles the case where the last line item and "Totals for Invoice #" are on the same row
   */
  private async processLine(
    line: string,
    lineNumber: number,
    state: TireMasterParsingState,
    errors: ParsingError[]
  ): Promise<boolean> {
    try {
      // Parse CSV line into fields
      const fields = this.csvFileProcessor.parseCsvLine(line);
      const firstColumn = (fields[0] || '').trim();

      // CRITICAL FIX: Check for line items FIRST, before checking invoice termination
      // This handles the case where the last line item and "Totals for Invoice #" are on the same row

      // Check if this row has line item data in columns 27+ (even if it also has invoice termination)
      if (firstColumn.includes('Invoice Detail Report') && fields.length > 30) {
        const potentialProductCode = (fields[27] || '').trim();
        const potentialQty = (fields[30] || '').trim();

        if (potentialProductCode.length > 0 &&
            potentialQty.length > 0 &&
            !potentialProductCode.includes('Invoice #') &&
            !potentialProductCode.includes('Customer Name') &&
            !potentialProductCode.includes('Total') &&
            !potentialProductCode.includes('Report') &&
            !potentialProductCode.includes('Totals for') &&
            !potentialProductCode.includes('Site#') &&
            !potentialProductCode.includes('Page ')) {

          // Process the line item FIRST
          if (state.currentInvoice) {
            const lineItemData = TireMasterColumnMapper.extractLineItemFromReport(fields);
            state.currentInvoice.lineItems.push(lineItemData);
            state.currentInvoice.rawLineItemLines.push(line);
            state.currentInvoice.lineItemRowNumbers.push(lineNumber);
          }
        }
      }

      // Now get the row type for other processing
      const mappedRow = TireMasterColumnMapper.mapRow(fields);

      switch (mappedRow.type) {
        case 'invoice_header':
          this.processInvoiceHeader(mappedRow, lineNumber, line, state);
          return true;

        case 'invoice_end':
          if (state.currentInvoice) {
            state.completedInvoices.push(state.currentInvoice);
            state.currentInvoice = null;
          }
          return true;

        case 'lineitem':
          this.processLineItem(mappedRow, lineNumber, line, state, errors);
          return true;

        case 'lineitem_in_report':
          // Skip this case since we already processed line items above
          return true;

        case 'ignore':
          // Skip report headers and summary rows
          return false;

        default:
          return false;
      }

    } catch (error) {
      errors.push({
        rowNumber: lineNumber,
        errorType: ErrorType.FORMAT,
        message: `Line processing failed: ${error.message}`,
        rawData: line,
      });
      return false;
    }
  }

  /**
   * Process invoice header row
   */
  private processInvoiceHeader(
    mappedRow: TireMasterRow,
    lineNumber: number,
    rawLine: string,
    state: TireMasterParsingState
  ): void {
    const headerData = mappedRow.data as TireMasterInvoiceHeader;

    // Finalize previous invoice if exists
    if (state.currentInvoice) {
      state.completedInvoices.push(state.currentInvoice);
    }

    // Start new invoice
    state.currentInvoice = {
      header: headerData,
      lineItems: [],
      rawHeaderLine: rawLine,
      rawLineItemLines: [],
      headerRowNumber: lineNumber,
      lineItemRowNumbers: [],
    };

    state.invoices.push(state.currentInvoice);
  }

  /**
   * Process line item row
   */
  private processLineItem(
    mappedRow: TireMasterRow,
    lineNumber: number,
    rawLine: string,
    state: TireMasterParsingState,
    errors: ParsingError[]
  ): void {
    const lineItemData = mappedRow.data as TireMasterLineItem;

    if (!state.currentInvoice) {
      errors.push({
        rowNumber: lineNumber,
        errorType: ErrorType.BUSINESS_RULE,
        message: 'Line item found without associated invoice header',
        rawData: rawLine,
      });
      return;
    }

    // Add line item to current invoice
    state.currentInvoice.lineItems.push(lineItemData);
    state.currentInvoice.rawLineItemLines.push(rawLine);
    state.currentInvoice.lineItemRowNumbers.push(lineNumber);
  }

  /**
   * Finalize parsing (complete last invoice)
   */
  private finalizeParsing(state: TireMasterParsingState): void {
    if (state.currentInvoice) {
      state.completedInvoices.push(state.currentInvoice);
      state.currentInvoice = null;
    }
  }

  /**
   * Transform parsed invoices to database format
   */
  private async transformInvoices(
    parsedInvoices: Omit<ParsedInvoice, 'transformedData'>[]
  ): Promise<ParsedInvoice[]> {
    const transformedInvoices: ParsedInvoice[] = [];

    for (const invoice of parsedInvoices) {
      try {
        const transformedData = TireMasterDataTransformer.transformInvoiceData(
          invoice.header,
          invoice.lineItems
        );

        // Validate transformed data
        const validation = TireMasterDataTransformer.validateTransformedData(transformedData);
        if (!validation.isValid) {
          this.logger.warn(
            `Validation warnings for invoice ${invoice.header.invoiceNumber}: ${validation.errors.join(', ')}`
          );
        }

        transformedInvoices.push({
          ...invoice,
          transformedData,
        });

      } catch (error) {
        this.logger.error(
          `Failed to transform invoice ${invoice.header.invoiceNumber}: ${error.message}`
        );
        // Skip invalid invoices but continue processing others
      }
    }

    return transformedInvoices;
  }

  /**
   * Detect duplicate invoices
   */
  private detectDuplicates(invoices: ParsedInvoice[]): string[] {
    const invoiceNumbers = new Set<string>();
    const duplicates: string[] = [];

    for (const invoice of invoices) {
      const invoiceNumber = invoice.header.invoiceNumber;
      if (invoiceNumbers.has(invoiceNumber)) {
        duplicates.push(invoiceNumber);
      } else {
        invoiceNumbers.add(invoiceNumber);
      }
    }

    return duplicates;
  }

  /**
   * Get parsing summary for quick file analysis
   */
  async getFileSummary(filePath: string): Promise<{
    isValidFormat: boolean;
    estimatedInvoices: number;
    estimatedLineItems: number;
    fileSize: number;
    totalLines: number;
    sampleInvoices: string[];
    formatErrors: string[];
  }> {
    const fileInfo = await this.csvFileProcessor.getFileInfo(filePath);

    // Quick validation with first 20 lines
    const sampleLines = fileInfo.firstLines;
    const validation = await (this.csvFormatValidator as any).validateTireMasterCsv(sampleLines);

    // Extract sample invoice numbers
    const sampleInvoices: string[] = [];
    for (const line of sampleLines) {
      if (line.includes('Invoice #')) {
        const fields = this.csvFileProcessor.parseCsvLine(line);
        try {
          const mappedRow = TireMasterColumnMapper.mapRow(fields);
          if (mappedRow.type === 'header') {
            const header = mappedRow.data as TireMasterInvoiceHeader;
            sampleInvoices.push(header.invoiceNumber);
          }
        } catch {
          // Ignore parsing errors in summary
        }
      }
      if (sampleInvoices.length >= 3) break;
    }

    return {
      isValidFormat: validation.isValid,
      estimatedInvoices: validation.summary.estimatedInvoices,
      estimatedLineItems: validation.summary.lineItemRows,
      fileSize: fileInfo.fileSize,
      totalLines: fileInfo.totalLines,
      sampleInvoices,
      formatErrors: validation.errors.slice(0, 5).map(e => e.message),
    };
  }
}

/**
 * Internal state management for parsing process
 */
class TireMasterParsingState {
  currentInvoice: Omit<ParsedInvoice, 'transformedData'> | null = null;
  invoices: Omit<ParsedInvoice, 'transformedData'>[] = [];
  completedInvoices: Omit<ParsedInvoice, 'transformedData'>[] = [];
}