/**
 * Financial Data Validation Utility
 *
 * Validates extracted line item data to ensure mathematical consistency
 * and detect parsing errors from column misalignment.
 */

export interface LineItemData {
  productCode: string;
  description: string;
  adjustment: string;
  quantity: number;
  partsCost: number;
  laborCost: number;
  fet: number;
  lineTotal: number;
  cost: number;
  grossProfitMargin: number;
  grossProfit: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  errors: string[];
  warnings: string[];
  correctedData?: Partial<LineItemData>;
}

export class FinancialValidator {

  private static readonly TOLERANCE = 0.05; // Allow 5 cent rounding differences for production data

  /**
   * Validate line item financial data for mathematical consistency
   */
  public static validateLineItem(data: LineItemData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 100;

    // Validate basic data presence
    if (!data.productCode || data.productCode.trim().length === 0) {
      errors.push('Missing product code');
      confidence -= 20;
    }

    if (data.quantity <= 0) {
      errors.push('Invalid quantity: must be greater than 0');
      confidence -= 15;
    }

    // Validate financial calculations
    const totalValidation = this.validateTotal(data);
    if (!totalValidation.isValid) {
      errors.push(...totalValidation.errors);
      warnings.push(...totalValidation.warnings);
      confidence -= totalValidation.penalty;
    }

    const profitValidation = this.validateProfitCalculations(data);
    if (!profitValidation.isValid) {
      errors.push(...profitValidation.errors);
      warnings.push(...profitValidation.warnings);
      confidence -= profitValidation.penalty;
    }

    // Validate reasonable ranges
    const rangeValidation = this.validateReasonableRanges(data);
    if (!rangeValidation.isValid) {
      warnings.push(...rangeValidation.warnings);
      confidence -= rangeValidation.penalty;
    }

    return {
      isValid: errors.length === 0 && confidence >= 60, // Increased threshold to match pattern detector
      confidence: Math.max(0, confidence),
      errors,
      warnings
    };
  }

  /**
   * Validate that Parts + Labor + FET = Total
   * Enhanced tolerance for TireMaster rounding differences
   */
  private static validateTotal(data: LineItemData): { isValid: boolean; errors: string[]; warnings: string[]; penalty: number } {
    const calculatedTotal = data.partsCost + data.laborCost + data.fet;
    const difference = Math.abs(calculatedTotal - data.lineTotal);

    // Allow larger tolerance for small amounts (rounding issues)
    const dynamicTolerance = Math.max(this.TOLERANCE, data.lineTotal * 0.01); // 1% or 5 cents, whichever is larger

    if (difference > dynamicTolerance) {
      // For service items, parts might legitimately be zero
      if (data.partsCost === 0 && data.laborCost > 0 && Math.abs(data.laborCost + data.fet - data.lineTotal) <= this.TOLERANCE) {
        return { isValid: true, errors: [], warnings: [], penalty: 0 };
      }

      return {
        isValid: false,
        errors: [`Total calculation error: ${data.partsCost} + ${data.laborCost} + ${data.fet} = ${calculatedTotal.toFixed(2)}, but lineTotal is ${data.lineTotal.toFixed(2)}`],
        warnings: [],
        penalty: 25 // Reduced penalty
      };
    }

    return { isValid: true, errors: [], warnings: [], penalty: 0 };
  }

  /**
   * Validate profit calculations: Total - Cost = GP$, GP$/Total = GPM%
   */
  private static validateProfitCalculations(data: LineItemData): { isValid: boolean; errors: string[]; warnings: string[]; penalty: number } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    // Calculate expected gross profit
    const expectedGrossProfit = data.lineTotal - data.cost;
    const gpDifference = Math.abs(expectedGrossProfit - data.grossProfit);

    if (gpDifference > this.TOLERANCE) {
      errors.push(`Gross profit calculation error: ${data.lineTotal} - ${data.cost} = ${expectedGrossProfit.toFixed(2)}, but GP$ is ${data.grossProfit.toFixed(2)}`);
      penalty += 25;
    }

    // Calculate expected gross profit margin
    if (data.lineTotal > 0) {
      const expectedGPM = (data.grossProfit / data.lineTotal) * 100;
      const gpmDifference = Math.abs(expectedGPM - data.grossProfitMargin);

      if (gpmDifference > 2.0) { // Allow 2% margin of error for percentage (increased tolerance)
        warnings.push(`Gross profit margin calculation discrepancy: (${data.grossProfit} / ${data.lineTotal}) * 100 = ${expectedGPM.toFixed(2)}%, but GPM% is ${data.grossProfitMargin.toFixed(2)}%`);
        penalty += 10; // Reduced penalty and made it a warning
      }
    }

    // Check for impossible profit margins
    if (data.grossProfitMargin > 100 && data.cost > 0) {
      errors.push(`Impossible profit margin: ${data.grossProfitMargin}% with positive cost ${data.cost}`);
      penalty += 35;
    }

    if (data.grossProfitMargin < -100) {
      warnings.push(`Extremely negative profit margin: ${data.grossProfitMargin}%`);
      penalty += 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      penalty
    };
  }

  /**
   * Validate that values are within reasonable business ranges
   */
  private static validateReasonableRanges(data: LineItemData): { isValid: boolean; warnings: string[]; penalty: number } {
    const warnings: string[] = [];
    let penalty = 0;

    // Check for unreasonably high quantities
    if (data.quantity > 100) {
      warnings.push(`High quantity: ${data.quantity} - verify this is correct`);
      penalty += 5;
    }

    // Check for unreasonably high unit prices
    const unitPrice = data.quantity > 0 ? data.lineTotal / data.quantity : 0;
    if (unitPrice > 10000) {
      warnings.push(`High unit price: $${unitPrice.toFixed(2)} - verify this is correct`);
      penalty += 5;
    }

    // Check for negative financial values where they shouldn't be
    if (data.partsCost < 0 || data.laborCost < 0 || data.fet < 0 || data.lineTotal < 0) {
      warnings.push('Negative financial values detected - verify data integrity');
      penalty += 10;
    }

    // Check for zero total with positive costs
    if (data.lineTotal === 0 && (data.partsCost > 0 || data.laborCost > 0 || data.fet > 0)) {
      warnings.push('Zero total with positive component costs');
      penalty += 10;
    }

    return {
      isValid: penalty < 20, // Consider valid if penalty is low
      warnings,
      penalty
    };
  }

  /**
   * Attempt to correct common parsing errors
   */
  public static attemptCorrection(data: LineItemData): LineItemData {
    const corrected = { ...data };

    // If total calculation is wrong but components look right, recalculate total
    const calculatedTotal = data.partsCost + data.laborCost + data.fet;
    if (Math.abs(calculatedTotal - data.lineTotal) > this.TOLERANCE) {
      if (calculatedTotal > 0 && (data.lineTotal === 0 || Math.abs(calculatedTotal - data.lineTotal) > data.lineTotal * 0.5)) {
        corrected.lineTotal = calculatedTotal;
      }
    }

    // If gross profit calculation is wrong but total and cost look right, recalculate
    const calculatedGP = corrected.lineTotal - data.cost;
    if (Math.abs(calculatedGP - data.grossProfit) > this.TOLERANCE) {
      corrected.grossProfit = calculatedGP;
    }

    // If gross profit margin calculation is wrong, recalculate
    if (corrected.lineTotal > 0) {
      const calculatedGPM = (corrected.grossProfit / corrected.lineTotal) * 100;
      if (Math.abs(calculatedGPM - data.grossProfitMargin) > 1.0) {
        corrected.grossProfitMargin = calculatedGPM;
      }
    }

    return corrected;
  }

  /**
   * Check if the data represents a valid line item vs report noise
   * Enhanced for TireMaster production data
   */
  public static isValidLineItem(data: LineItemData): boolean {
    // Must have a product code that looks legitimate
    if (!data.productCode || data.productCode.trim().length < 2) {
      return false;
    }

    // Skip obvious report artifacts
    const productCode = data.productCode.toUpperCase().trim();
    if (productCode.includes('TOTAL') ||
        productCode.includes('REPORT') ||
        productCode.includes('INVOICE') ||
        productCode.includes('CUSTOMER') ||
        productCode.includes('SELECTED') ||
        productCode.includes('PRINTED') ||
        productCode.includes('AVERAGE') ||
        productCode === 'PRODUCT CODE') {
      return false;
    }

    // Must have valid quantity (increased upper limit for bulk items)
    if (data.quantity <= 0 || data.quantity > 50000) {
      return false;
    }

    // Allow items with zero costs (promotional items, adjustments, service items)
    // Service codes (SRV-, ENV-, STW-, LAB-, etc.) are legitimate even with zero values
    if (data.partsCost === 0 && data.laborCost === 0 && data.fet === 0 && data.lineTotal === 0 && data.quantity <= 1) {
      // Check if it's a service or fee code - these are legitimate even with zero costs
      const isServiceCode = productCode.startsWith('SRV-') ||
                            productCode.startsWith('ENV-') ||
                            productCode.startsWith('STW-') ||
                            productCode.startsWith('LAB-') ||
                            productCode.startsWith('MSHD-') ||
                            productCode.includes('SERVICE') ||
                            productCode.includes('SUPPLIES') ||
                            productCode.includes('FEE');

      if (!isServiceCode) {
        return false;
      }
    }

    return true;
  }
}