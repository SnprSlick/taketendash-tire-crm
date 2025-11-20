import { ProductCategory } from '../../shared/enums/import.enums';

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
   * Identify the type of row based on content patterns
   *
   * Updated based on user feedback:
   * - Customer name comes first, then invoice number appears a couple rows down
   * - Each time Column A is NOT "Invoice Detail Report" = new invoice starts
   * - "Totals for Invoice" marks the end of each invoice
   *
   * CRITICAL FIX: Check for line items in "Invoice Detail Report" rows
   * - Line items can appear in columns 27-37 even in rows marked "Invoice Detail Report"
   * - This handles the case where the last line item and "Totals for Invoice #" are on the same row
   */
  public static identifyRowType(row: string[]): 'customer_start' | 'invoice_header' | 'invoice_end' | 'lineitem' | 'lineitem_in_report' | 'ignore' {
    if (!row || row.length === 0) return 'ignore';

    const firstColumn = row[0] || '';
    const trimmedFirstColumn = firstColumn.trim();

    // Check for invoice termination in ANY column - "Totals for Invoice" marks end of invoice
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Totals for Invoice') ||
          cell.includes('Invoice Total') ||
          cell.includes('Total for Invoice')) {
        return 'invoice_end';
      }
    }

    // Check for invoice start - "Invoice #" in ANY column indicates new invoice
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || '').trim();
      if (cell.includes('Invoice #') ||
          cell.includes('Invoice Number')) {
        return 'invoice_header';
      }
    }

    // CRITICAL FIX: Check for line items hidden in "Invoice Detail Report" rows
    if (trimmedFirstColumn.includes('Invoice Detail Report')) {
      // Look for line items in columns 27+ (after the report headers)
      if (row.length > 30) {
        // Look for line items at the exact column position (27 based on CSV analysis)
        const potentialProductCode = (row[27] || '').trim();
        const potentialQty = (row[30] || '').trim();

        // Validate this looks like a real line item
        if (potentialProductCode.length > 0 &&
            potentialQty.length > 0 &&
            !potentialProductCode.includes('Invoice #') &&
            !potentialProductCode.includes('Customer Name') &&
            !potentialProductCode.includes('Total') &&
            !potentialProductCode.includes('Report') &&
            !potentialProductCode.includes('Totals for') &&
            !potentialProductCode.includes('Site#') &&
            !potentialProductCode.includes('Page ')) {
          return 'lineitem_in_report';
        }
      }
      return 'ignore';
    }

    // If Column A is NOT "Invoice Detail Report" and has content, it could be start of new invoice
    // Look for customer name patterns or invoice number patterns
    if (trimmedFirstColumn.length > 0) {

      // Check for explicit invoice number (appears a couple rows down from customer)
      if (this.looksLikeInvoiceNumber(trimmedFirstColumn)) {
        return 'invoice_header';
      }

      // Check if this looks like a customer name (typically appears first)
      if (this.looksLikeCustomerName(trimmedFirstColumn)) {
        return 'customer_start';
      }

      // Skip known header/summary patterns
      if (trimmedFirstColumn.includes('Total #') ||
          trimmedFirstColumn.includes('Average') ||
          trimmedFirstColumn.includes('Selected Date Range') ||
          trimmedFirstColumn.includes('Report Notes') ||
          trimmedFirstColumn.includes('Printed:') ||
          trimmedFirstColumn.includes('Product Code') ||
          trimmedFirstColumn.includes('Totals for Report')) {
        return 'ignore';
      }

      // If first column has content and doesn't match above patterns, likely a line item
      if (!trimmedFirstColumn.includes('Report') &&
          !trimmedFirstColumn.includes('Total')) {
        return 'lineitem';
      }
    }

    return 'ignore';
  }

  /**
   * Extract invoice header information from header row
   * This extracts from the invoice row itself, customer info is extracted separately
   */
  public static extractInvoiceHeader(row: string[]): TireMasterInvoiceHeader {
    try {
      // Extract basic invoice info - customer info will be filled in later from customer row
      const invoiceNumber = this.extractInvoiceNumberFromRow(row);
      const invoiceDate = this.extractInvoiceDateFromRow(row);
      const salesperson = this.extractSalespersonFromRow(row);
      const taxAmount = this.extractTaxFromRow(row);
      const totalAmount = this.extractTotalFromRow(row);

      return {
        invoiceNumber: invoiceNumber || '',
        customerName: '', // Will be filled from customer row
        vehicleInfo: '',  // Will be filled from customer row
        mileage: '',      // Will be filled from customer row
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
   * Extract line item information from product/service row
   * Based on Excel header: Product Code | Size & Desc. | Adjustment | QTY | Parts | Labor | FET | Total | Cost | GPM% | GP$
   */
  public static extractLineItem(row: string[]): TireMasterLineItem {
    try {
      const productCode = row[0]?.trim() || '';                    // Column A: Product Code
      const description = row[1]?.trim() || '';                    // Column B: Size & Desc.
      const adjustment = row[2]?.trim() || '';                     // Column C: Adjustment
      const quantity = parseFloat(row[3]) || 0;                    // Column D: QTY
      const partsCost = parseFloat(row[4]) || 0;                   // Column E: Parts
      const laborCost = parseFloat(row[5]) || 0;                   // Column F: Labor
      const fet = parseFloat(row[6]) || 0;                         // Column G: FET (Federal Excise Tax)
      const lineTotal = parseFloat(row[7]) || 0;                   // Column H: Total
      const cost = parseFloat(row[8]) || 0;                        // Column I: Cost
      const grossProfitMargin = parseFloat(row[9]) || 0;           // Column J: GPM% (Gross Profit Margin %)
      const grossProfit = parseFloat(row[10]) || 0;                // Column K: GP$ (Gross Profit $)

      return {
        productCode,
        description,
        adjustment: adjustment || undefined,
        quantity,
        partsCost,
        laborCost,
        fet,
        lineTotal,
        cost,
        grossProfitMargin,
        grossProfit,
        category: this.determineProductCategory(productCode),
      };
    } catch (error) {
      throw new Error(`Failed to extract line item from row: ${error.message}`);
    }
  }

  /**
   * Extract line item information from "Invoice Detail Report" row (columns 26-36)
   * CRITICAL FIX: Line items can appear in columns 26-36 even in rows marked "Invoice Detail Report"
   */
  public static extractLineItemFromReport(row: string[]): TireMasterLineItem {
    try {
      const productCode = (row[26] || '').trim();                  // Column 26: Product Code
      const description = (row[27] || '').trim();                  // Column 27: Size & Desc.
      const adjustment = (row[28] || '').trim();                   // Column 28: Adjustment
      const quantity = parseFloat(row[29]) || 0;                   // Column 29: QTY
      const partsCost = parseFloat(row[30]) || 0;                  // Column 30: Parts
      const laborCost = parseFloat(row[31]) || 0;                  // Column 31: Labor
      const fet = parseFloat(row[32]) || 0;                        // Column 32: FET (Federal Excise Tax)
      const lineTotal = parseFloat(row[33]) || 0;                  // Column 33: Total
      const cost = parseFloat(row[34]) || 0;                       // Column 34: Cost
      const grossProfitMargin = parseFloat(row[35]) || 0;          // Column 35: GPM% (Gross Profit Margin %)
      const grossProfit = parseFloat(row[36]) || 0;                // Column 36: GP$ (Gross Profit $)

      return {
        productCode,
        description,
        adjustment: adjustment || undefined,
        quantity,
        partsCost,
        laborCost,
        fet,
        lineTotal,
        cost,
        grossProfitMargin,
        grossProfit,
        category: this.determineProductCategory(productCode),
      };
    } catch (error) {
      throw new Error(`Failed to extract line item from report row: ${error.message}`);
    }
  }

  /**
   * Process a single CSV row and return structured data
   */
  public static mapRow(row: string[]): TireMasterRow {
    const rowType = this.identifyRowType(row);

    switch (rowType) {
      case 'customer_start':
        return {
          type: 'customer_start',
          data: { customerName: this.extractCustomerName(row[0] || '') },
        };

      case 'invoice_header':
        return {
          type: 'invoice_header',
          data: this.extractInvoiceHeader(row),
        };

      case 'invoice_end':
        return {
          type: 'invoice_end',
        };

      case 'lineitem':
        return {
          type: 'lineitem',
          data: this.extractLineItem(row),
        };

      case 'lineitem_in_report':
        return {
          type: 'lineitem_in_report',
          data: this.extractLineItemFromReport(row),
        };

      default:
        return { type: 'ignore' };
    }
  }

  // Private helper methods for field extraction

  private static extractInvoiceNumber(value: string): string {
    // "Invoice #   3-327551" → "3-327551"
    return value.replace(/^Invoice #\s+/, '').trim();
  }

  private static extractCustomerName(value: string): string {
    // "Customer Name:  AKERS, KENNETH" → "AKERS, KENNETH"
    return value.replace(/^Customer Name:\s+/, '').trim();
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
    return this.parseAmount(amount);
  }

  private static extractTotalAmount(value: string): number {
    // "Total:  $0.00" → 0.00
    const amount = value.replace(/^Total:\s+/, '').trim();
    return this.parseAmount(amount);
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
   * Customer names typically appear first and contain last name, first name format
   */
  private static looksLikeCustomerName(value: string): boolean {
    const trimmed = value.trim().toUpperCase();

    // Skip if empty or too short
    if (trimmed.length < 3) return false;

    // Skip if it contains patterns that indicate it's not a customer name
    if (trimmed.includes('INVOICE') ||
        trimmed.includes('REPORT') ||
        trimmed.includes('TOTAL') ||
        trimmed.includes('SUMMARY') ||
        trimmed.includes('$') ||
        trimmed.includes('%') ||
        /^\d+$/.test(trimmed)) { // Pure numbers
      return false;
    }

    // Look for patterns typical of customer names
    // - Contains comma (LAST, FIRST format)
    // - Contains multiple words with letters
    // - Not purely numeric
    if (trimmed.includes(',') && /[A-Z]{2,}/.test(trimmed)) {
      return true;
    }

    // Multiple words that look like names
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.every(word => /^[A-Z]{2,}$/.test(word))) {
      return true;
    }

    return false;
  }

  /**
   * Check if a string looks like an invoice number
   * Invoice numbers typically have specific patterns like "3-327551"
   */
  private static looksLikeInvoiceNumber(value: string): boolean {
    const trimmed = value.trim();

    // Skip if empty
    if (trimmed.length === 0) return false;

    // Look for invoice number patterns
    // Format like "3-327551", "INV-12345", etc.
    if (/^\d+-\d+$/.test(trimmed) ||        // "3-327551"
        /^INV-?\d+$/i.test(trimmed) ||      // "INV-12345" or "INV12345"
        /^\d{5,}$/.test(trimmed)) {         // "327551" (pure numbers, 5+ digits)
      return true;
    }

    return false;
  }

  /**
   * Extract customer name from a customer row
   * Customer name typically appears in Column A when it's the start of an invoice
   */
  public static extractCustomerName(value: string): string {
    return value.trim();
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

        // Check if this looks like an invoice number
        if (this.looksLikeInvoiceNumber(trimmedCell) ||
            trimmedCell.includes('Invoice #')) {

          const invoiceNumber = this.extractInvoiceNumber(trimmedCell);

          if (invoiceNumber) {
            // Also look for vehicle, mileage, salesperson in the same area
            const additionalInfo = this.extractAdditionalInfoFromArea(rows, startIndex, startIndex + searchRange);

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
    // Look for "Invoice Date:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Invoice Date:')) {
        return this.extractInvoiceDate(cell);
      }
    }
    return null;
  }

  /**
   * Extract tax amount from invoice row (Column I)
   */
  private static extractTaxFromRow(row: string[]): number | null {
    // Look for "Tax:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Tax:')) {
        return this.extractTaxAmount(cell);
      }
    }
    return null;
  }

  /**
   * Extract total amount from invoice row (Column K)
   */
  private static extractTotalFromRow(row: string[]): number | null {
    // Look for "Total:" in any column
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] || '';
      if (cell.includes('Total:')) {
        return this.extractTotalAmount(cell);
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
          vehicleInfo = this.extractVehicleInfo(trimmedCell);
        }

        // Look for mileage patterns
        if (trimmedCell.includes('Mileage:') && !mileage) {
          mileage = this.extractMileage(trimmedCell);
        }

        // Look for salesperson patterns
        if (trimmedCell.includes('Salesperson:') && !salesperson) {
          salesperson = this.extractSalesperson(trimmedCell);
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

    const rowType = this.identifyRowType(row);

    if (rowType === 'customer_start') {
      if (!row[0]?.trim()) {
        errors.push('Customer name is required');
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
    }

    return { isValid: errors.length === 0, errors };
  }
}