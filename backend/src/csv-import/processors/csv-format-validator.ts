import { TireMasterColumnMapper } from '../mappers/tiremaster-column-mapper';
import { ErrorType } from '../../shared/enums/import.enums';

/**
 * CSV Format Validator
 *
 * Validates TireMaster CSV files to ensure they conform to expected format
 * before processing. Provides detailed error reporting for troubleshooting.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  rowNumber: number;
  errorType: ErrorType;
  message: string;
  field?: string;
  rawData?: string;
}

export interface ValidationWarning {
  rowNumber: number;
  message: string;
  field?: string;
}

export interface ValidationSummary {
  totalRows: number;
  headerRows: number;
  lineItemRows: number;
  ignoredRows: number;
  errorRows: number;
  estimatedInvoices: number;
}

export class CsvFormatValidator {

  /**
   * Validate entire CSV content for TireMaster format
   */
  public static async validateTireMasterCsv(
    csvContent: string[],
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    let headerRows = 0;
    let lineItemRows = 0;
    let ignoredRows = 0;
    let errorRows = 0;
    let currentInvoiceNumber: string | null = null;
    const invoiceNumbers = new Set<string>();

    // Validate each row
    for (let i = 0; i < csvContent.length; i++) {
      const rowNumber = i + 1;
      const row = this.parseCSVRow(csvContent[i]);

      try {
        // Validate row structure
        const rowValidation = TireMasterColumnMapper.validateRow(row);

        if (!rowValidation.isValid) {
          rowValidation.errors.forEach(error => {
            errors.push({
              rowNumber,
              errorType: ErrorType.FORMAT,
              message: error,
              rawData: csvContent[i],
            });
          });
          errorRows++;
          continue;
        }

        // Identify row type and validate content
        const rowType = TireMasterColumnMapper.identifyRowType(row);

        switch (rowType) {
          case 'header':
            headerRows++;
            const headerValidation = this.validateInvoiceHeader(row, rowNumber);
            errors.push(...headerValidation.errors);
            warnings.push(...headerValidation.warnings);

            // Track invoice for duplicate detection
            try {
              const headerData = TireMasterColumnMapper.extractInvoiceHeader(row);
              currentInvoiceNumber = headerData.invoiceNumber;

              if (invoiceNumbers.has(currentInvoiceNumber)) {
                errors.push({
                  rowNumber,
                  errorType: ErrorType.DUPLICATE,
                  message: `Duplicate invoice number: ${currentInvoiceNumber}`,
                  field: 'invoiceNumber',
                });
              } else {
                invoiceNumbers.add(currentInvoiceNumber);
              }
            } catch (error) {
              errors.push({
                rowNumber,
                errorType: ErrorType.FORMAT,
                message: `Failed to extract invoice header: ${error.message}`,
                rawData: csvContent[i],
              });
              errorRows++;
            }
            break;

          case 'lineitem':
            lineItemRows++;
            const lineItemValidation = this.validateLineItem(row, rowNumber, currentInvoiceNumber);
            errors.push(...lineItemValidation.errors);
            warnings.push(...lineItemValidation.warnings);
            break;

          case 'ignore':
            ignoredRows++;
            break;
        }

      } catch (error) {
        errors.push({
          rowNumber,
          errorType: ErrorType.FORMAT,
          message: `Row processing failed: ${error.message}`,
          rawData: csvContent[i],
        });
        errorRows++;
      }
    }

    // Global validations
    const globalValidation = this.validateGlobalRules(headerRows, lineItemRows, invoiceNumbers.size);
    errors.push(...globalValidation.errors);
    warnings.push(...globalValidation.warnings);

    const summary: ValidationSummary = {
      totalRows: csvContent.length,
      headerRows,
      lineItemRows,
      ignoredRows,
      errorRows,
      estimatedInvoices: invoiceNumbers.size,
    };

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      summary,
    };
  }

  /**
   * Validate invoice header row content
   */
  private static validateInvoiceHeader(
    row: string[],
    rowNumber: number
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Extract and validate header data
      const header = TireMasterColumnMapper.extractInvoiceHeader(row);

      // Validate invoice number format
      if (!header.invoiceNumber || header.invoiceNumber.trim().length === 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.MISSING_DATA,
          message: 'Invoice number is required',
          field: 'invoiceNumber',
        });
      } else if (!header.invoiceNumber.match(/^\d+-[\w\-]*\d+$/)) {
        warnings.push({
          rowNumber,
          message: `Unusual invoice number format: ${header.invoiceNumber}`,
          field: 'invoiceNumber',
        });
      }

      // Validate customer name
      if (!header.customerName || header.customerName.trim().length === 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.MISSING_DATA,
          message: 'Customer name is required',
          field: 'customerName',
        });
      }

      // Validate invoice date
      if (isNaN(header.invoiceDate.getTime())) {
        errors.push({
          rowNumber,
          errorType: ErrorType.FORMAT,
          message: 'Invalid invoice date format',
          field: 'invoiceDate',
        });
      } else if (header.invoiceDate > new Date()) {
        errors.push({
          rowNumber,
          errorType: ErrorType.VALIDATION,
          message: 'Invoice date cannot be in the future',
          field: 'invoiceDate',
        });
      }

      // Validate salesperson
      if (!header.salesperson || header.salesperson.trim().length === 0) {
        warnings.push({
          rowNumber,
          message: 'Salesperson is empty',
          field: 'salesperson',
        });
      }

      // Validate amounts
      if (header.totalAmount < 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.VALIDATION,
          message: 'Invoice total cannot be negative',
          field: 'totalAmount',
        });
      }

      if (header.taxAmount < 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.VALIDATION,
          message: 'Tax amount cannot be negative',
          field: 'taxAmount',
        });
      }

    } catch (error) {
      errors.push({
        rowNumber,
        errorType: ErrorType.FORMAT,
        message: `Header validation failed: ${error.message}`,
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate line item row content
   */
  private static validateLineItem(
    row: string[],
    rowNumber: number,
    currentInvoiceNumber: string | null
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if line item has an associated invoice header
    if (!currentInvoiceNumber) {
      errors.push({
        rowNumber,
        errorType: ErrorType.BUSINESS_RULE,
        message: 'Line item found without associated invoice header',
      });
      return { errors, warnings };
    }

    try {
      const lineItem = TireMasterColumnMapper.extractLineItem(row);

      // Validate product code
      if (!lineItem.productCode || lineItem.productCode.trim().length === 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.MISSING_DATA,
          message: 'Product code is required',
          field: 'productCode',
        });
      }

      // Validate description
      if (!lineItem.description || lineItem.description.trim().length === 0) {
        warnings.push({
          rowNumber,
          message: 'Product description is empty',
          field: 'description',
        });
      }

      // Validate quantity
      if (lineItem.quantity <= 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.VALIDATION,
          message: 'Quantity must be greater than 0',
          field: 'quantity',
        });
      } else if (lineItem.quantity > 1000) {
        warnings.push({
          rowNumber,
          message: `Unusually high quantity: ${lineItem.quantity}`,
          field: 'quantity',
        });
      }

      // Validate line total
      if (lineItem.lineTotal < 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.VALIDATION,
          message: 'Line total cannot be negative',
          field: 'lineTotal',
        });
      }

      // Validate cost price
      if (lineItem.costPrice < 0) {
        errors.push({
          rowNumber,
          errorType: ErrorType.VALIDATION,
          message: 'Cost price cannot be negative',
          field: 'costPrice',
        });
      }

      // Validate profit calculations
      if (lineItem.lineTotal > 0 && lineItem.costPrice > 0) {
        const expectedGrossProfit = lineItem.lineTotal - lineItem.costPrice;
        const profitDifference = Math.abs(expectedGrossProfit - lineItem.grossProfit);

        if (profitDifference > 0.01) {
          warnings.push({
            rowNumber,
            message: `Gross profit calculation may be incorrect. Expected: ${expectedGrossProfit.toFixed(2)}, Found: ${lineItem.grossProfit.toFixed(2)}`,
            field: 'grossProfit',
          });
        }
      }

    } catch (error) {
      errors.push({
        rowNumber,
        errorType: ErrorType.FORMAT,
        message: `Line item validation failed: ${error.message}`,
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate global file rules and patterns
   */
  private static validateGlobalRules(
    headerRows: number,
    lineItemRows: number,
    invoiceCount: number
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if file has any data
    if (headerRows === 0 && lineItemRows === 0) {
      errors.push({
        rowNumber: 0,
        errorType: ErrorType.MISSING_DATA,
        message: 'No invoice or line item data found in file',
      });
    }

    // Check if invoices have line items
    if (headerRows > 0 && lineItemRows === 0) {
      warnings.push({
        rowNumber: 0,
        message: 'Found invoice headers but no line items',
      });
    }

    // Check ratio of headers to line items
    if (headerRows > 0 && lineItemRows > 0) {
      const avgItemsPerInvoice = lineItemRows / headerRows;

      if (avgItemsPerInvoice < 1) {
        warnings.push({
          rowNumber: 0,
          message: 'Fewer line items than invoices - some invoices may be missing details',
        });
      } else if (avgItemsPerInvoice > 50) {
        warnings.push({
          rowNumber: 0,
          message: `Very high average line items per invoice (${avgItemsPerInvoice.toFixed(1)}) - verify format`,
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Parse CSV row handling quotes and commas
   */
  private static parseCSVRow(csvLine: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < csvLine.length; i++) {
      const char = csvLine[i];

      if (char === '"') {
        if (inQuotes && csvLine[i + 1] === '"') {
          // Handle escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add final field
    result.push(current);

    return result;
  }

  /**
   * Generate validation report summary
   */
  public static generateValidationReport(result: ValidationResult): string {
    const { summary, errors, warnings } = result;

    const report = [
      '=== TireMaster CSV Validation Report ===',
      '',
      `Total Rows: ${summary.totalRows}`,
      `Invoice Headers: ${summary.headerRows}`,
      `Line Items: ${summary.lineItemRows}`,
      `Ignored Rows: ${summary.ignoredRows}`,
      `Error Rows: ${summary.errorRows}`,
      `Estimated Invoices: ${summary.estimatedInvoices}`,
      '',
      `Validation Result: ${result.isValid ? 'PASSED' : 'FAILED'}`,
      '',
    ];

    if (errors.length > 0) {
      report.push('=== ERRORS ===');
      errors.forEach(error => {
        report.push(`Row ${error.rowNumber}: [${error.errorType}] ${error.message}`);
        if (error.field) report.push(`  Field: ${error.field}`);
      });
      report.push('');
    }

    if (warnings.length > 0) {
      report.push('=== WARNINGS ===');
      warnings.forEach(warning => {
        report.push(`Row ${warning.rowNumber}: ${warning.message}`);
        if (warning.field) report.push(`  Field: ${warning.field}`);
      });
      report.push('');
    }

    if (result.isValid) {
      report.push('✅ File is ready for import');
    } else {
      report.push('❌ File has errors and cannot be imported');
      report.push('Please fix the errors above and try again');
    }

    return report.join('\n');
  }
}

export interface ValidationOptions {
  strictMode?: boolean;
  maxErrors?: number;
  skipWarnings?: boolean;
}