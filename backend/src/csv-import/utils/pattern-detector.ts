/**
 * Pattern Detection Utility for TireMaster CSV Files
 *
 * Handles .rpt-to-CSV conversion artifacts by intelligently detecting
 * line item data patterns regardless of column position.
 */

export interface LineItemPattern {
  productCodeIndex: number;
  descriptionIndex: number;
  adjustmentIndex: number;
  quantityIndex: number;
  partsIndex: number;
  laborIndex: number;
  fetIndex: number;
  totalIndex: number;
  costIndex: number;
  gpmIndex: number;
  gpIndex: number;
  confidence: number; // 0-100, how confident we are in this pattern
}

export interface PatternDetectionResult {
  pattern: LineItemPattern | null;
  isLineItem: boolean;
  detectedFormat: 'standard' | 'report' | 'unknown';
  confidence: number;
}

export class TireMasterPatternDetector {

  // Product code patterns for TireMaster (enhanced for production data)
  private static readonly PRODUCT_CODE_PATTERNS = [
    /^[A-Z0-9][A-Z0-9\-]{2,15}$/,  // V86216-2, SRV-SHOP01, ENV-F01
    /^OP\d+$/,                      // OP19, OP789
    /^\d{2}-\d{2}-\d{3}-\d$/,      // 48-01-091-1
    /^[A-Z]{2,5}-[A-Z0-9]+$/,      // STW-BAL01, LAB-OIL
    /^\d{6}$/,                      // 046240 (6-digit numeric codes)
    /^[A-Z]{3}-[A-Z0-9]{3,8}$/,    // SRV-SHOP01, SRV-TEST01
    /^[A-Z0-9]{3,12}$/,             // General alphanumeric codes
    /^\d{3,8}$/                    // 3-8 digit numeric codes
  ];

  // Currency/numeric patterns
  private static readonly CURRENCY_PATTERN = /^\$?\d+\.?\d{0,2}$/;
  private static readonly DECIMAL_PATTERN = /^\d+\.?\d{0,3}$/;
  private static readonly PERCENTAGE_PATTERN = /^\d+\.?\d{0,2}%?$/;

  /**
   * Detect if a row contains line item data and identify column positions
   * Enhanced for TireMaster production CSV format
   */
  public static detectLineItemPattern(row: string[]): PatternDetectionResult {
    if (!row || row.length < 8) {
      return {
        pattern: null,
        isLineItem: false,
        detectedFormat: 'unknown',
        confidence: 0
      };
    }

    // Skip obvious non-line-item rows early
    // BUT: Don't skip "Invoice Detail Report" rows as they may contain embedded line items at offset 26
    const firstColumn = (row[0] || '').trim();
    const isReportRow = firstColumn.toUpperCase().includes('INVOICE DETAIL REPORT');
    
    if (!isReportRow && this.isObviousNonLineItem(firstColumn)) {
      return {
        pattern: null,
        isLineItem: false,
        detectedFormat: 'unknown',
        confidence: 0
      };
    }

    // Try to find line item patterns at different offsets
    const patterns: Array<{ pattern: LineItemPattern; offset: number }> = [];

    // Check standard format (columns 0-10)
    const standardPattern = this.tryExtractPattern(row, 0);
    if (standardPattern) {
      patterns.push({ pattern: standardPattern, offset: 0 });
    }

    // Check report format (columns 11-21, adjusted for 0-based indexing)
    if (row.length >= 22) {
      const reportPattern = this.tryExtractPattern(row, 11);
      if (reportPattern) {
        patterns.push({ pattern: reportPattern, offset: 11 });
      }
    }

    // Check report format with line items at offset 26
    // This handles rows that have report headers (0-25) + line item data (26-36)
    if (row.length >= 35) {
      // Only check offset 26 if first column contains report headers
      const firstCol = (row[0] || '').trim().toUpperCase();
      if (firstCol.includes('INVOICE DETAIL REPORT') || firstCol.includes('REPORT')) {
        const reportPattern2 = this.tryExtractPattern(row, 26);
        if (reportPattern2) {
          // Additional validation: product code at offset 26 should be valid
          const productCode = (row[26] || '').trim().toUpperCase();
          if (!productCode.includes('TOTAL') && !productCode.includes('AVERAGE') &&
              !productCode.includes('REPORT')) {
            patterns.push({ pattern: reportPattern2, offset: 26 });
          }
        }
      }
    }

    // Select the best pattern based on confidence
    if (patterns.length === 0) {
      return {
        pattern: null,
        isLineItem: false,
        detectedFormat: 'unknown',
        confidence: 0
      };
    }

    // Sort by confidence and take the best one
    patterns.sort((a, b) => b.pattern.confidence - a.pattern.confidence);
    const bestPattern = patterns[0];

    return {
      pattern: bestPattern.pattern,
      isLineItem: true,
      detectedFormat: bestPattern.offset === 0 ? 'standard' : 'report',
      confidence: bestPattern.pattern.confidence
    };
  }

  /**
   * Try to extract a line item pattern starting at a specific column offset
   */
  private static tryExtractPattern(row: string[], offset: number): LineItemPattern | null {
    if (row.length < offset + 11) return null;

    const productCode = (row[offset] || '').trim();
    const description = (row[offset + 1] || '').trim();
    const adjustment = (row[offset + 2] || '').trim();
    const quantity = (row[offset + 3] || '').trim();
    const parts = (row[offset + 4] || '').trim();
    const labor = (row[offset + 5] || '').trim();
    const fet = (row[offset + 6] || '').trim();
    const total = (row[offset + 7] || '').trim();
    const cost = (row[offset + 8] || '').trim();
    const gpm = (row[offset + 9] || '').trim();
    const gp = (row[offset + 10] || '').trim();

    let confidence = 0;

    // Check product code pattern (high weight)
    if (this.isValidProductCode(productCode)) {
      confidence += 30;
    }

    // Check quantity pattern (medium weight)
    if (this.isValidQuantity(quantity)) {
      confidence += 20;
    }

    // Check financial data patterns (high weight)
    if (this.isValidCurrency(parts) && this.isValidCurrency(labor) &&
        this.isValidCurrency(fet) && this.isValidCurrency(total)) {
      confidence += 25;
    }

    // Check cost and profit patterns (medium weight)
    if (this.isValidCurrency(cost) && this.isValidCurrency(gp)) {
      confidence += 15;
    }

    // Check percentage pattern (low weight)
    if (this.isValidPercentage(gpm)) {
      confidence += 10;
    }

    // Increased confidence threshold to reduce false positives from report totals
    // Require at least 60% confidence to accept a pattern
    if (confidence < 60) {
      return null;
    }

    return {
      productCodeIndex: offset,
      descriptionIndex: offset + 1,
      adjustmentIndex: offset + 2,
      quantityIndex: offset + 3,
      partsIndex: offset + 4,
      laborIndex: offset + 5,
      fetIndex: offset + 6,
      totalIndex: offset + 7,
      costIndex: offset + 8,
      gpmIndex: offset + 9,
      gpIndex: offset + 10,
      confidence
    };
  }

  /**
   * Check if a value looks like a valid TireMaster product code
   * Enhanced for production data patterns
   */
  private static isValidProductCode(value: string): boolean {
    if (!value || value.length < 2) return false;

    const trimmed = value.trim().toUpperCase();

    // Skip obvious non-product codes (expanded list)
    if (trimmed.includes('INVOICE') || trimmed.includes('REPORT') ||
        trimmed.includes('TOTAL') || trimmed.includes('CUSTOMER') ||
        trimmed.includes('SELECTED') || trimmed.includes('PRINTED') ||
        trimmed.includes('PAGE') || trimmed.includes('AVERAGE') ||
        trimmed.includes('SUMMARY') || trimmed.includes('NOTES') ||
        trimmed.startsWith('TOTALS') || trimmed.endsWith('TOTAL')) {
      return false;
    }

    // Reject pure numeric values that are likely financial totals
    // (valid product codes have alpha characters)
    // DISABLED: Some product codes ARE numeric (e.g. "380259", "10524")
    // if (/^\d+\.?\d*$/.test(trimmed)) {
    //   return false;
    // }

    // Test against patterns
    return this.PRODUCT_CODE_PATTERNS.some(pattern => pattern.test(trimmed)) || /^\d+$/.test(trimmed);
  }

  /**
   * Check if a value looks like a valid quantity
   */
  private static isValidQuantity(value: string): boolean {
    if (!value) return false;

    // Handle accounting format negative numbers: (123.45) or (123.45
    let cleanValue = value.replace(/[$,]/g, '');
    if (cleanValue.startsWith('(')) {
      if (cleanValue.endsWith(')')) {
        cleanValue = '-' + cleanValue.slice(1, -1);
      } else {
        cleanValue = '-' + cleanValue.slice(1);
      }
    }

    const num = parseFloat(cleanValue);
    // Quantities are typically small numbers (can be negative for returns)
    return !isNaN(num) && Math.abs(num) <= 1000 && this.DECIMAL_PATTERN.test(value.replace(/[()]/g, ''));
  }

  /**
   * Check if a value looks like a valid currency amount
   */
  private static isValidCurrency(value: string): boolean {
    if (!value) return true; // Empty values are OK for currency fields

    // Handle accounting format negative numbers: (123.45) or (123.45
    let cleanValue = value.replace(/[$,]/g, '');
    if (cleanValue.startsWith('(')) {
      if (cleanValue.endsWith(')')) {
        cleanValue = '-' + cleanValue.slice(1, -1);
      } else {
        cleanValue = '-' + cleanValue.slice(1);
      }
    }

    const num = parseFloat(cleanValue);
    // Allow negative currency values
    return !isNaN(num) && this.DECIMAL_PATTERN.test(value.replace(/[()$,]/g, ''));
  }

  /**
   * Check if a value looks like a valid percentage
   */
  private static isValidPercentage(value: string): boolean {
    if (!value) return true; // Empty percentages are OK

    // Handle accounting format negative numbers: (123.45) or (123.45
    let cleanValue = value.replace(/[%]/g, '');
    if (cleanValue.startsWith('(')) {
      if (cleanValue.endsWith(')')) {
        cleanValue = '-' + cleanValue.slice(1, -1);
      } else {
        cleanValue = '-' + cleanValue.slice(1);
      }
    }

    const num = parseFloat(cleanValue);
    return !isNaN(num) && num >= -1000 && num <= 1000 && this.PERCENTAGE_PATTERN.test(value.replace(/[()%]/g, ''));
  }

  /**
   * Check if a value is obviously not a line item (early filtering)
   */
  private static isObviousNonLineItem(value: string): boolean {
    if (!value) return false;

    const trimmed = value.trim().toUpperCase();
    return trimmed.includes('INVOICE DETAIL REPORT') ||
           trimmed.includes('TAKE TEN TULSA') ||
           trimmed.includes('SELECTED DATE RANGE') ||
           trimmed.includes('PRINTED:') ||
           trimmed.includes('PRODUCT CODE') ||
           trimmed === 'PRODUCT CODE';
  }

  /**
   * Extract line item data using detected pattern
   */
  public static extractLineItemData(row: string[], pattern: LineItemPattern) {
    return {
      productCode: (row[pattern.productCodeIndex] || '').trim(),
      description: (row[pattern.descriptionIndex] || '').trim(),
      adjustment: (row[pattern.adjustmentIndex] || '').trim(),
      quantity: this.parseCurrency(row[pattern.quantityIndex]), // Use parseCurrency to handle (123) format
      partsCost: this.parseCurrency(row[pattern.partsIndex]),
      laborCost: this.parseCurrency(row[pattern.laborIndex]),
      fet: this.parseCurrency(row[pattern.fetIndex]),
      lineTotal: this.parseCurrency(row[pattern.totalIndex]),
      cost: this.parseCurrency(row[pattern.costIndex]),
      grossProfitMargin: this.parsePercentage(row[pattern.gpmIndex]),
      grossProfit: this.parseCurrency(row[pattern.gpIndex])
    };
  }

  /**
   * Parse currency value, handling $ signs, commas, and accounting format (123.45)
   */
  private static parseCurrency(value: string): number {
    if (!value) return 0;
    
    let cleaned = value.replace(/[$,]/g, '');
    if (cleaned.startsWith('(')) {
      if (cleaned.endsWith(')')) {
        cleaned = '-' + cleaned.slice(1, -1);
      } else {
        cleaned = '-' + cleaned.slice(1);
      }
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse percentage value, handling % signs and accounting format (12.34)
   */
  private static parsePercentage(value: string): number {
    if (!value) return 0;
    
    let cleaned = value.replace(/%/g, '');
    if (cleaned.startsWith('(')) {
      if (cleaned.endsWith(')')) {
        cleaned = '-' + cleaned.slice(1, -1);
      } else {
        cleaned = '-' + cleaned.slice(1);
      }
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}