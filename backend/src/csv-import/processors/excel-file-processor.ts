import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Excel File Processor
 *
 * Handles processing of .xls and .xlsx files by converting them to
 * a format compatible with the existing CSV import pipeline.
 */

export interface ExcelProcessingOptions {
  sheetName?: string;
  startRow?: number;
  endRow?: number;
  validateFormat?: boolean;
}

export interface ExcelProcessingResult {
  success: boolean;
  filePath: string;
  fileName: string;
  sheetNames: string[];
  totalRows: number;
  processedRows: number;
  data: string[][];
  errors: string[];
}

@Injectable()
export class ExcelFileProcessor {
  private readonly logger = new Logger(ExcelFileProcessor.name);

  /**
   * Process an Excel file and convert to CSV-like array format
   */
  async processExcelFile(
    filePath: string,
    options: ExcelProcessingOptions = {}
  ): Promise<ExcelProcessingResult> {

    this.logger.debug(`Processing Excel file: ${filePath}`);

    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Excel file not found: ${filePath}`);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();

      this.logger.debug(`Excel file: ${fileName} (${stats.size} bytes)`);

      // For now, return a placeholder structure until xlsx library is available
      if (!this.isXlsxLibraryAvailable()) {
        return this.createPlaceholderResult(filePath, fileName);
      }

      // TODO: Implement actual Excel parsing when xlsx library is installed
      const xlsxData = await this.parseExcelWithXlsx(filePath, options);

      return {
        success: true,
        filePath,
        fileName,
        sheetNames: xlsxData.sheetNames,
        totalRows: xlsxData.data.length,
        processedRows: xlsxData.data.length,
        data: xlsxData.data,
        errors: []
      };

    } catch (error) {
      this.logger.error(`Excel processing failed: ${error.message}`, error.stack);

      return {
        success: false,
        filePath,
        fileName: path.basename(filePath),
        sheetNames: [],
        totalRows: 0,
        processedRows: 0,
        data: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Check if xlsx library is available
   */
  private isXlsxLibraryAvailable(): boolean {
    try {
      require.resolve('xlsx');
      return true;
    } catch (error) {
      this.logger.warn('xlsx library not available, using placeholder data');
      return false;
    }
  }

  /**
   * Create placeholder result when xlsx library is not available
   */
  private createPlaceholderResult(filePath: string, fileName: string): ExcelProcessingResult {
    this.logger.warn('Using placeholder Excel data - xlsx library not installed');

    // Return structure indicating xlsx library is needed
    return {
      success: false,
      filePath,
      fileName,
      sheetNames: ['Sheet1'],
      totalRows: 0,
      processedRows: 0,
      data: [],
      errors: ['xlsx library not installed. Run: npm install xlsx']
    };
  }

  /**
   * Parse Excel file using xlsx library (when available)
   */
  private async parseExcelWithXlsx(
    filePath: string,
    options: ExcelProcessingOptions
  ): Promise<{ sheetNames: string[]; data: string[][] }> {

    // Dynamic import of xlsx when available
    const xlsx = require('xlsx');

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    // Use specified sheet or first sheet
    const sheetName = options.sheetName || sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    // Convert to array format (CSV-like)
    const data: string[][] = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      range: options.startRow ? { s: { r: options.startRow, c: 0 } } : undefined
    });

    // Apply row limit if specified
    if (options.endRow && options.endRow < data.length) {
      data.splice(options.endRow);
    }

    // Convert all values to strings for consistency with CSV parsing
    const stringData = data.map(row =>
      row.map(cell => (cell !== null && cell !== undefined) ? String(cell) : '')
    );

    return {
      sheetNames,
      data: stringData
    };
  }

  /**
   * Convert Excel data to CSV format for existing pipeline compatibility
   */
  convertToCsvFormat(data: string[][]): string {
    return data
      .map(row =>
        row.map(cell => {
          // Handle cells that contain commas or quotes
          if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
      )
      .join('\n');
  }

  /**
   * Validate Excel file format and structure
   */
  async validateExcelFile(filePath: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        errors.push('File does not exist');
        return { isValid: false, errors };
      }

      // Check file extension
      const extension = path.extname(filePath).toLowerCase();
      if (!['.xls', '.xlsx'].includes(extension)) {
        errors.push('Invalid file extension. Expected .xls or .xlsx');
      }

      // Check file size (basic validation)
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        errors.push('File is empty');
      }

      if (stats.size > 100 * 1024 * 1024) { // 100MB limit
        errors.push('File too large (max 100MB)');
      }

      // TODO: Add more specific TireMaster format validation when xlsx library is available

      return { isValid: errors.length === 0, errors };

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { isValid: false, errors };
    }
  }
}