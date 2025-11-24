import { ProductCategory } from '../../shared/enums/import.enums';
import { TireMasterPatternDetector } from '../utils/pattern-detector';
import { FinancialValidator, LineItemData } from '../utils/financial-validator';

/**
 * TireMaster Column Mapper
 *
 * Handles the complex TireMaster "Invoice Detail Report" CSV format which contains:
 * - Invoice header rows (metadata)
 * - Line item rows (product/service details)
 * - Report totals (ignored)
 */

export interface TireMasterInvoiceHeader {
  invoiceNumber: string;      // Column A: Invoice #
  customerName: string;       // From Customer row - Column A
  vehicleInfo?: string;       // From Customer row - Column F
  mileage?: string;           // From Customer row - Column I
  invoiceDate: Date;          // Column C: Invoice Date
  salesperson: string;        // Column F: Salesperson
  taxAmount: number;          // Column I: Tax
  totalAmount: number;        // Column K: Total
}

export interface TireMasterLineItem {
  productCode: string;        // Column A: Product Code
  description: string;        // Column B: Size & Desc.
  adjustment?: string;        // Column C: Adjustment
  quantity: number;           // Column D: QTY
  partsCost: number;          // Column E: Parts
  laborCost: number;          // Column F: Labor
  fet: number;                // Column G: FET (Federal Excise Tax)
  lineTotal: number;          // Column H: Total
  cost: number;               // Column I: Cost
  grossProfitMargin: number;  // Column J: GPM% (Gross Profit Margin %)
  grossProfit: number;        // Column K: GP$ (Gross Profit $)
  category: ProductCategory;
}

export interface TireMasterRow {
  type: 'customer_start' | 'invoice_header' | 'invoice_end' | 'lineitem' | 'lineitem_in_report' | 'ignore';
  data?: TireMasterInvoiceHeader | TireMasterLineItem | { customerName?: string; invoiceNumber?: string };
}

export class TireMasterColumnMapper {

  /**
   * Identify the type of row based on content patterns using intelligent detection
   *
   * Updated to use pattern detection for improved accuracy:
   * - Uses TireMasterPatternDetector for intelligent line item detection
   * - Handles both standard format (columns 0-10) and report format (columns 11-21)
   * - Maintains existing invoice header and customer detection logic
   */
  public static identifyRowType(row: string[]): 'customer_start' | 'invoice_header' | 'invoice_end' | 'lineitem' | 'lineitem_in_report' | 'ignore' {
    if (!row || row.length === 0) return 'ignore';

    console.log(`[DEBUG] identifyRowType called with row: [${row.join('|')}]`);

    const firstColumn = row[0] || '';
    const trimmedFirstColumn = firstColumn.trim();

    // STEP 1: Check for invoice termination - "Totals for Invoice" anywhere in row
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Totals for Invoice') ||
          cell.includes('Invoice Total') ||
          cell.includes('Total for Invoice')) {
        return 'invoice_end';
      }
    }

    // STEP 2: Check for invoice header - "Invoice #" anywhere in row
    // This handles comma-separated format: "Invoice #   3-327553,Invoice Date:  11/21/2025,..."
    if (trimmedFirstColumn.includes('Invoice #')) {
      return 'invoice_header';
    }

    // Also check other columns for invoice header patterns
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Invoice #') || cell.includes('Invoice Number')) {
        return 'invoice_header';
      }
    }

    // STEP 3: Handle Report Headers and Embedded Line Items
    
    // Special handling for "Invoice Detail Report" which may contain line items
    if (trimmedFirstColumn.includes('Invoice Detail Report')) {
      // Check if this report row actually contains a line item (usually at offset 26)
      const patternResult = TireMasterPatternDetector.detectLineItemPattern(row);
      if (patternResult.isLineItem && patternResult.confidence >= 60) {
        return 'lineitem_in_report';
      }
      return 'ignore';
    }

    // Ignore other report headers
    if (trimmedFirstColumn.includes('Report') ||
        trimmedFirstColumn.includes('Page ') ||
        trimmedFirstColumn.includes('Site#') ||
        trimmedFirstColumn.includes('Total #') ||
        trimmedFirstColumn.includes('Average') ||
        trimmedFirstColumn.includes('Selected Date Range') ||
        trimmedFirstColumn.includes('Report Notes') ||
        trimmedFirstColumn.includes('Printed:') ||
        trimmedFirstColumn.includes('Product Code') ||
        trimmedFirstColumn.includes('Totals for Report')) {
      return 'ignore';
    }

    // STEP 4: Check for customer name - simple name format
    // For CSV like "JOHNSON STEVE" - just the customer name on its own line
    if (trimmedFirstColumn.length > 0 && TireMasterColumnMapper.looksLikeCustomerName(trimmedFirstColumn)) {
      console.log(`[DEBUG] Row identified as customer_start: "${trimmedFirstColumn}" (looks like customer name: ${TireMasterColumnMapper.looksLikeCustomerName(trimmedFirstColumn)})`);
      return 'customer_start';
    }

    // STEP 5: Use intelligent pattern detection for line items
    // This handles both standard format and report format with column offsets
    const patternResult = TireMasterPatternDetector.detectLineItemPattern(row);
    if (patternResult.isLineItem && patternResult.confidence >= 60) { // Increased threshold to reduce false positives
      console.log(`[DEBUG] Line item detected with confidence ${patternResult.confidence}% using ${patternResult.detectedFormat} format`);
      return patternResult.detectedFormat === 'standard' ? 'lineitem' : 'lineitem_in_report';
    }

    return 'ignore';
  }

  /**
   * Extract invoice header information from header row
   * This extracts all data from the invoice header row including customer info
   */
  public static extractInvoiceHeader(row: string[]): TireMasterInvoiceHeader {
    try {
      // Extract all invoice info including customer data from the same row
      const invoiceNumber = TireMasterColumnMapper.extractInvoiceNumberFromRow(row);
      const customerName = TireMasterColumnMapper.extractCustomerNameFromRow(row);
      const vehicleInfo = TireMasterColumnMapper.extractVehicleInfoFromRow(row);
      const mileage = TireMasterColumnMapper.extractMileageFromRow(row);
      const invoiceDate = TireMasterColumnMapper.extractInvoiceDateFromRow(row);
      const salesperson = TireMasterColumnMapper.extractSalespersonFromRow(row);
      const taxAmount = TireMasterColumnMapper.extractTaxFromRow(row);
      const totalAmount = TireMasterColumnMapper.extractTotalFromRow(row);

      return {
        invoiceNumber: invoiceNumber || '',
        customerName: customerName,
        vehicleInfo: vehicleInfo,
        mileage: mileage,
        invoiceDate: invoiceDate || new Date(),
        salesperson: salesperson || '',
        taxAmount: taxAmount || 0,
        totalAmount: totalAmount || 0,
      };
    } catch (error) {
      throw new Error(`Failed to extract invoice header from row: ${error.message}`);
    }
  }

  /**
   * Extract line item information using intelligent pattern detection
   * Automatically detects column positions and validates financial data
   */
  public static extractLineItem(row: string[]): TireMasterLineItem {
    try {
      // Use pattern detection to identify column positions
      const patternResult = TireMasterPatternDetector.detectLineItemPattern(row);

      if (!patternResult.isLineItem || !patternResult.pattern) {
        throw new Error('Row does not contain valid line item data');
      }

      // Extract data using detected pattern
      const extractedData = TireMasterPatternDetector.extractLineItemData(row, patternResult.pattern);

      // Validate financial consistency
      const validation = FinancialValidator.validateLineItem(extractedData as LineItemData);

      if (!validation.isValid && validation.confidence < 60) { // Increased threshold to match pattern detector
        console.warn(`[WARNING] Line item validation failed (confidence: ${validation.confidence}%):`, validation.errors);
        // Attempt auto-correction
        const correctedData = FinancialValidator.attemptCorrection(extractedData as LineItemData);
        Object.assign(extractedData, correctedData);
        console.log(`[INFO] Applied auto-correction to financial data`);
      } else if (validation.warnings.length > 0) {
        console.warn(`[WARNING] Line item validation warnings:`, validation.warnings);
      }

      return {
        productCode: extractedData.productCode,
        description: extractedData.description,
        adjustment: extractedData.adjustment || undefined,
        quantity: extractedData.quantity,
        partsCost: extractedData.partsCost,
        laborCost: extractedData.laborCost,
        fet: extractedData.fet,
        lineTotal: extractedData.lineTotal,
        cost: extractedData.cost,
        grossProfitMargin: extractedData.grossProfitMargin,
        grossProfit: extractedData.grossProfit,
        category: TireMasterColumnMapper.determineProductCategory(extractedData.productCode),
      };
    } catch (error) {
      throw new Error(`Failed to extract line item from row: ${error.message}`);
    }
  }

  /**
   * Extract line item information from "Invoice Detail Report" row using intelligent detection
   * This method now uses the same intelligent pattern detection as extractLineItem
   */
  public static extractLineItemFromReport(row: string[]): TireMasterLineItem {
    // Use the same intelligent extraction method
    return TireMasterColumnMapper.extractLineItem(row);
  }

  /**
   * Process a single CSV row and return structured data
   */
  public static mapRow(row: string[]): TireMasterRow {
    const rowType = TireMasterColumnMapper.identifyRowType(row);

    switch (rowType) {
      case 'customer_start':
        return {
          type: 'customer_start',
          data: { customerName: TireMasterColumnMapper.extractCustomerName(row[0] || '') },
        };

      case 'invoice_header':
        return {
          type: 'invoice_header',
          data: TireMasterColumnMapper.extractInvoiceHeader(row),
        };

      case 'invoice_end':
        return {
          type: 'invoice_end',
        };

      case 'lineitem':
        return {
          type: 'lineitem',
          data: TireMasterColumnMapper.extractLineItem(row),
        };

      case 'lineitem_in_report':
        return {
          type: 'lineitem_in_report',
          data: TireMasterColumnMapper.extractLineItem(row), // Now uses intelligent detection
        };

      default:
        return { type: 'ignore' };
    }
  }

  // Private helper methods for field extraction

  private static extractInvoiceNumber(value: string): string {
    // Very permissive extraction: "Invoice # 3-NA-328035" → "3-NA-328035"
    // Accept any format after "Invoice #" - no validation
    const result = value.replace(/^.*Invoice #\s*/, '').trim();

    // If result contains comma, take the first part (handles "Invoice # 3-327551,Customer Name...")
    return result.split(',')[0].trim();
  }

  private static extractVehicleInfo(value: string): string {
    // "Vehicle:   TUBE 145/70-6 " → "TUBE 145/70-6"
    return value.replace(/^Vehicle:\s+/, '').trim();
  }

  private static extractMileage(value: string): string {
    // "Mileage: 0 / 0" → "0 / 0"
    return value.replace(/^Mileage:\s+/, '').trim();
  }

  private static extractInvoiceDate(value: string): Date {
    // "Invoice Date:  9/2/2025" → Date object
    const dateStr = value.replace(/^Invoice Date:\s+/, '').trim();
    const [month, day, year] = dateStr.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }

    return date;
  }

  private static extractSalesperson(value: string): string {
    // "Salesperson:  CHAD C GOAD" → "CHAD C GOAD"
    return value.replace(/^Salesperson:\s+/, '').trim();
  }

  private static extractTaxAmount(value: string): number {
    // "Tax:  $0.00" → 0.00
    const amount = value.replace(/^Tax:\s+/, '').trim();
    return TireMasterColumnMapper.parseAmount(amount);
  }

  private static extractTotalAmount(value: string): number {
    // "Total:  $0.00" → 0.00
    const amount = value.replace(/^Total:\s+/, '').trim();
    return TireMasterColumnMapper.parseAmount(amount);
  }

  private static parseAmount(amountStr: string): number {
    // "$0.00" or "0.00" → 0.00
    const cleaned = amountStr.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Determine product category based on product code patterns
   */
  private static determineProductCategory(productCode: string): ProductCategory {
    if (!productCode) return ProductCategory.OTHER;

    const code = productCode.toUpperCase().trim();

    // Tire products
    if (code.includes('OP') && code.length <= 10) return ProductCategory.TIRES;
    if (code.includes('TIRE') || code.includes('CASING')) return ProductCategory.TIRES;

    // Services (mount, balance, shop supplies, etc.)
    if (code.startsWith('SRV-')) return ProductCategory.SERVICES;
    if (code.startsWith('STW-')) return ProductCategory.SERVICES;

    // Environmental fees, scrap, disposal
    if (code.startsWith('ENV-')) return ProductCategory.FEES;
    if (code.includes('SCRAP')) return ProductCategory.FEES;
    if (code.startsWith('48-01-')) return ProductCategory.FEES; // Tire scrap codes

    // Default to parts for unrecognized codes
    return ProductCategory.PARTS;
  }

  /**
   * Check if a string looks like a customer name
   * Updated to handle production TireMaster format: "Customer Name:  AKERS, KENNETH"
   */
  private static looksLikeCustomerName(value: string): boolean {
    const trimmed = value.trim();

    // Skip if empty or too short
    if (trimmed.length < 3) return false;

    // Check for "Customer Name:" prefix format (production TireMaster)
    if (trimmed.includes('Customer Name:')) {
      // Extract the name part after "Customer Name:"
      const namepart = trimmed.replace(/^Customer Name:\s*/, '').trim();
      // Should have a valid customer name after the prefix
      return namepart.length > 0 && !namepart.includes('$') && !namepart.includes('%');
    }

    const upper = trimmed.toUpperCase();

    // Skip if it contains patterns that indicate it's not a customer name
    if (upper.includes('INVOICE') ||
        upper.includes('REPORT') ||
        upper.includes('TOTAL') ||
        upper.includes('SUMMARY') ||
        upper.includes('$') ||
        upper.includes('%') ||
        /^\d+$/.test(trimmed)) { // Pure numbers
      return false;
    }

    // Look for patterns typical of customer names
    // Simple pattern for "JOHNSON STEVE" format - two words, all letters
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);

    // Customer name should be 1-3 words, all alphabetic
    if (words.length >= 1 && words.length <= 3) {
      // All words should be primarily alphabetic (allow some punctuation like apostrophes)
      const allWordsValid = words.every(word =>
        /^[A-Z][A-Z\s'.-]*$/.test(word) && word.length >= 2
      );

      if (allWordsValid) {
        // Additional check: at least one word should be longer than 2 characters
        const hasSubstantialWord = words.some(word => word.length >= 3);
        return hasSubstantialWord;
      }
    }

    // Legacy pattern: "LASTNAME, FIRSTNAME" format (TireMaster standard)
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      if (parts.length === 2 &&
          parts[0].trim().length >= 2 &&
          parts[1].trim().length >= 2 &&
          /^[A-Z\s]+$/.test(parts[0].trim()) &&
          /^[A-Z\s]+$/.test(parts[1].trim())) {
        return true;
      }
    }

    // Secondary pattern: Multiple words that look like names (fallback)
    // Handle formats like "JOHNSON STEVE" (space-separated) - reuse words variable
    if (words.length >= 2 &&
        words.length <= 4 && // Reasonable name length
        words.every(word => /^[A-Z]{2,}$/.test(word))) {
      return true;
    }

    return false;
  }


  /**
   * Extract customer name from a customer row
   * Customer name typically appears in Column A when it's the start of an invoice
   * Updated to handle raw customer names without "Customer Name:" prefix
   */
  public static extractCustomerName(value: string): string {
    // Handle both formats:
    // 1. "Customer Name:  AKERS, KENNETH" → "AKERS, KENNETH" (legacy)
    // 2. "AKERS, KENNETH" → "AKERS, KENNETH" (actual TireMaster format)

    if (value.includes('Customer Name:')) {
      return value.replace(/^Customer Name:\s+/, '').trim();
    }

    // For raw customer names, just return trimmed value
    return value.trim();
  }

  /**
   * Extract customer name from an invoice header row
   * Scans all columns to find "Customer Name:" pattern
   */
  private static extractCustomerNameFromRow(row: string[]): string {
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Customer Name:')) {
        return TireMasterColumnMapper.extractCustomerName(cell);
      }
    }
    return '';
  }

  /**
   * Extract vehicle information from an invoice header row
   * Looks for "Vehicle:" pattern in any column
   */
  private static extractVehicleInfoFromRow(row: string[]): string {
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Vehicle:')) {
        return cell.replace(/^Vehicle:\s*/, '').trim();
      }
    }
    return '';
  }

  /**
   * Extract mileage information from an invoice header row
   * Looks for "Mileage:" pattern in any column
   */
  private static extractMileageFromRow(row: string[]): string {
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Mileage:')) {
        return cell.replace(/^Mileage:\s*/, '').trim();
      }
    }
    return '';
  }

  /**
   * Look for invoice number in current or nearby rows
   * Since user indicated invoice number appears "a couple rows down" from customer
   */
  public static findInvoiceNumberInArea(rows: string[][], startIndex: number): {
    invoiceNumber: string;
    foundAtIndex: number;
    vehicleInfo?: string;
    mileage?: string;
    salesperson?: string;
  } | null {

    // Search in the next few rows after customer name for invoice number
    const searchRange = Math.min(5, rows.length - startIndex);

    for (let i = startIndex; i < startIndex + searchRange; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Check each column in the row for invoice number patterns
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex] || '';
        const trimmedCell = cell.trim();

        // Check if this contains "Invoice #" - trust any format after that
        if (trimmedCell.includes('Invoice #')) {

          const invoiceNumber = TireMasterColumnMapper.extractInvoiceNumber(trimmedCell);

          if (invoiceNumber) {
            // Also look for vehicle, mileage, salesperson in the same area
            const additionalInfo = TireMasterColumnMapper.extractAdditionalInfoFromArea(rows, startIndex, startIndex + searchRange);

            return {
              invoiceNumber,
              foundAtIndex: i,
              ...additionalInfo
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract invoice date from invoice row (Column C)
   */
  private static extractInvoiceDateFromRow(row: string[]): Date | null {
    // Handle comma-separated format
    const firstColumn = row[0] || '';
    if (firstColumn.includes('Invoice Date:')) {
      const parts = firstColumn.split(',');
      for (const part of parts) {
        if (part.includes('Invoice Date:')) {
          return TireMasterColumnMapper.extractInvoiceDate(part.trim());
        }
      }
    }

    // Fallback: Look for "Invoice Date:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Invoice Date:')) {
        return TireMasterColumnMapper.extractInvoiceDate(cell);
      }
    }
    return null;
  }

  /**
   * Extract tax amount from invoice row (Column I)
   */
  private static extractTaxFromRow(row: string[]): number | null {
    // Handle comma-separated format
    const firstColumn = row[0] || '';
    if (firstColumn.includes('Tax:')) {
      const parts = firstColumn.split(',');
      for (const part of parts) {
        if (part.includes('Tax:')) {
          return TireMasterColumnMapper.extractTaxAmount(part.trim());
        }
      }
    }

    // Fallback: Look for "Tax:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Tax:')) {
        return TireMasterColumnMapper.extractTaxAmount(cell);
      }
    }
    return null;
  }

  /**
   * Extract total amount from invoice row (Column K)
   */
  private static extractTotalFromRow(row: string[]): number | null {
    // Handle comma-separated format
    const firstColumn = row[0] || '';
    if (firstColumn.includes('Total:')) {
      const parts = firstColumn.split(',');
      for (const part of parts) {
        if (part.includes('Total:')) {
          return TireMasterColumnMapper.extractTotalAmount(part.trim());
        }
      }
    }

    // Fallback: Look for "Total:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Total:')) {
        return TireMasterColumnMapper.extractTotalAmount(cell);
      }
    }
    return null;
  }

  /**
   * Extract invoice number from invoice row
   */
  private static extractInvoiceNumberFromRow(row: string[]): string | null {
    // Handle comma-separated format: "Invoice #   3-327553,Invoice Date:  11/21/2025,..."
    const firstColumn = row[0] || '';
    if (firstColumn.includes('Invoice #')) {
      // Parse comma-separated values and find the invoice number
      const parts = firstColumn.split(',');
      for (const part of parts) {
        if (part.includes('Invoice #')) {
          return TireMasterColumnMapper.extractInvoiceNumber(part.trim());
        }
      }
    }

    // Fallback: Look for "Invoice #" in any column (legacy format)
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Invoice #')) {
        return TireMasterColumnMapper.extractInvoiceNumber(cell);
      }
    }
    return null;
  }

  /**
   * Extract salesperson from invoice row
   */
  private static extractSalespersonFromRow(row: string[]): string | null {
    // Handle comma-separated format
    const firstColumn = row[0] || '';
    if (firstColumn.includes('Salesperson:')) {
      const parts = firstColumn.split(',');
      for (const part of parts) {
        if (part.includes('Salesperson:')) {
          return TireMasterColumnMapper.extractSalesperson(part.trim());
        }
      }
    }

    // Fallback: Look for "Salesperson:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Salesperson:')) {
        return TireMasterColumnMapper.extractSalesperson(cell);
      }
    }
    return null;
  }

  /**
   * Extract vehicle info, mileage, and salesperson from the invoice area
   */
  private static extractAdditionalInfoFromArea(
    rows: string[][],
    startIndex: number,
    endIndex: number
  ): { vehicleInfo?: string; mileage?: string; salesperson?: string } {

    let vehicleInfo: string | undefined;
    let mileage: string | undefined;
    let salesperson: string | undefined;

    for (let i = startIndex; i < endIndex && i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex] || '';
        const trimmedCell = cell.trim();

        // Look for vehicle info patterns
        if (trimmedCell.includes('Vehicle:') && !vehicleInfo) {
          vehicleInfo = TireMasterColumnMapper.extractVehicleInfo(trimmedCell);
        }

        // Look for mileage patterns
        if (trimmedCell.includes('Mileage:') && !mileage) {
          mileage = TireMasterColumnMapper.extractMileage(trimmedCell);
        }

        // Look for salesperson patterns
        if (trimmedCell.includes('Salesperson:') && !salesperson) {
          salesperson = TireMasterColumnMapper.extractSalesperson(trimmedCell);
        }
      }
    }

    return { vehicleInfo, mileage, salesperson };
  }

  /**
   * Validate if a row appears to be valid TireMaster format
   */
  public static validateRow(row: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!row || row.length === 0) {
      errors.push('Row is empty');
      return { isValid: false, errors };
    }

    const rowType = TireMasterColumnMapper.identifyRowType(row);

    // Debug logging for customer rows
    if (rowType === 'customer_start') {
      console.log(`[DEBUG] Customer validation - Row data: [${row.join('|')}], First cell: "${row[0]}", Trimmed: "${row[0]?.trim()}", Length: ${row[0]?.trim()?.length || 0}`);

      const customerName = row[0]?.trim();
      if (!customerName) {
        console.log(`[DEBUG] Customer validation failed - no customer name found`);
        errors.push('Customer name is required');
      } else {
        console.log(`[DEBUG] Customer validation passed - customer name: "${customerName}"`);
      }
    } else if (rowType === 'invoice_header') {
      if (!row[0]?.trim()) {
        errors.push('Invoice number is required');
      }
    } else if (rowType === 'lineitem') {
      if (row.length < 4) { // Reduced minimum columns for line items
        errors.push('Line item row must have at least 4 columns (product, description, quantity, total)');
      }
      if (!row[0]?.trim()) {
        errors.push('Product code is required for line items');
      }

      // Additional validation for production data
      try {
        const patternResult = TireMasterPatternDetector.detectLineItemPattern(row);
        if (!patternResult.isLineItem) {
          errors.push('Row does not match expected line item pattern');
        }
      } catch (error) {
        errors.push(`Pattern detection failed: ${error.message}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}