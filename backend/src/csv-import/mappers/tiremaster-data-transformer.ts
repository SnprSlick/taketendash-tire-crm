import {
  TireMasterInvoiceHeader,
  TireMasterLineItem
} from './tiremaster-column-mapper';
import {
  InvoiceStatus,
  ProductCategory
} from '../../shared/enums/import.enums';

/**
 * TireMaster Data Transformer
 *
 * Transforms parsed TireMaster data into database-ready format for:
 * - InvoiceCustomer entities
 * - Invoice entities
 * - InvoiceLineItem entities
 */

export interface TransformedInvoiceData {
  customer: TransformedCustomer;
  invoice: TransformedInvoice;
  lineItems: TransformedLineItem[];
}

export interface TransformedCustomer {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerCode?: string;
}

export interface TransformedInvoice {
  invoiceNumber: string;
  invoiceDate: Date;
  salesperson: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  laborCost: number;
  partsCost: number;
  environmentalFee: number;
  status: InvoiceStatus;
}

export interface TransformedLineItem {
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  cost: number;
  grossProfitMargin: number;
  grossProfit: number;
  category: ProductCategory;
}

export class TireMasterDataTransformer {

  /**
   * Transform complete invoice data (header + line items) into database format
   */
  public static transformInvoiceData(
    header: TireMasterInvoiceHeader,
    lineItems: TireMasterLineItem[]
  ): TransformedInvoiceData {

    // Transform customer data
    const customer = this.transformCustomer(header);

    // Transform invoice header
    const invoice = this.transformInvoice(header, lineItems);

    // Transform line items
    const transformedLineItems = lineItems.map(item => this.transformLineItem(item));

    return {
      customer,
      invoice,
      lineItems: transformedLineItems,
    };
  }

  /**
   * Transform customer information from invoice header
   */
  public static transformCustomer(header: TireMasterInvoiceHeader): TransformedCustomer {
    const customerName = this.normalizeCustomerName(header.customerName);

    return {
      name: customerName,
      email: undefined, // Not available in TireMaster export
      phone: undefined, // Not available in TireMaster export
      address: undefined, // Not available in TireMaster export
      customerCode: undefined, // Could be derived from invoice number if needed
    };
  }

  /**
   * Transform invoice header with calculated totals from line items
   */
  public static transformInvoice(
    header: TireMasterInvoiceHeader,
    lineItems: TireMasterLineItem[]
  ): TransformedInvoice {

    // Calculate totals from line items (more accurate than header totals)
    const calculations = this.calculateInvoiceTotals(lineItems);

    return {
      invoiceNumber: this.normalizeInvoiceNumber(header.invoiceNumber),
      invoiceDate: header.invoiceDate,
      salesperson: this.normalizeSalesperson(header.salesperson),
      subtotal: calculations.subtotal,
      taxAmount: header.taxAmount,
      totalAmount: calculations.subtotal + header.taxAmount,
      laborCost: calculations.laborCost,
      partsCost: calculations.partsCost,
      environmentalFee: calculations.environmentalFee,
      status: InvoiceStatus.ACTIVE, // Default status for new imports
    };
  }

  /**
   * Transform individual line item
   */
  public static transformLineItem(item: TireMasterLineItem): TransformedLineItem {
    // Calculate unit price from line total and quantity
    const unitPrice = item.quantity > 0 ? item.lineTotal / item.quantity : 0;

    return {
      productCode: this.normalizeProductCode(item.productCode),
      description: this.normalizeDescription(item.description),
      quantity: item.quantity,
      unitPrice: this.roundToTwoDecimals(unitPrice),
      lineTotal: item.lineTotal,
      cost: item.cost,
      grossProfitMargin: item.grossProfitMargin,
      grossProfit: item.grossProfit,
      category: item.category,
    };
  }

  /**
   * Calculate invoice totals from line items for accuracy
   */
  private static calculateInvoiceTotals(lineItems: TireMasterLineItem[]) {
    let subtotal = 0;
    let laborCost = 0;
    let partsCost = 0;
    let environmentalFee = 0;

    for (const item of lineItems) {
      subtotal += item.lineTotal;
      laborCost += item.laborCost;
      partsCost += item.partsCost;

      // Environmental fees and FET
      if (item.category === ProductCategory.FEES) {
        environmentalFee += item.lineTotal;
      }
      environmentalFee += item.fet;
    }

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      laborCost: this.roundToTwoDecimals(laborCost),
      partsCost: this.roundToTwoDecimals(partsCost),
      environmentalFee: this.roundToTwoDecimals(environmentalFee),
    };
  }

  // Data normalization helper methods

  /**
   * Normalize customer names to consistent format
   */
  private static normalizeCustomerName(name: string): string {
    if (!name) return 'Unknown Customer';

    // Trim whitespace and normalize spacing
    let normalized = name.trim().replace(/\s+/g, ' ');

    // Convert to title case for better readability
    normalized = this.toTitleCase(normalized);

    return normalized;
  }

  /**
   * Normalize invoice numbers to consistent format
   */
  private static normalizeInvoiceNumber(invoiceNumber: string): string {
    if (!invoiceNumber) throw new Error('Invoice number is required');

    // Remove extra whitespace and normalize format
    let normalized = invoiceNumber.trim();

    // Ensure format consistency (e.g., "3-327551" stays as is)
    if (!normalized.match(/^\d+-\w*\d+/)) {
      throw new Error(`Invalid invoice number format: ${invoiceNumber}`);
    }

    return normalized;
  }

  /**
   * Normalize salesperson names
   */
  private static normalizeSalesperson(salesperson: string): string {
    if (!salesperson) return 'Unknown';

    let normalized = salesperson.trim().replace(/\s+/g, ' ');
    return this.toTitleCase(normalized);
  }

  /**
   * Normalize product codes
   */
  private static normalizeProductCode(productCode: string): string {
    if (!productCode) throw new Error('Product code is required');

    return productCode.trim().toUpperCase();
  }

  /**
   * Normalize product/service descriptions
   */
  private static normalizeDescription(description: string): string {
    if (!description) return '';

    let normalized = description.trim();

    // Remove leading dots that are common in TireMaster descriptions
    normalized = normalized.replace(/^\.+\s*/, '');

    // Normalize spacing
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized;
  }

  /**
   * Convert string to title case
   */
  private static toTitleCase(text: string): string {
    return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Round decimal values to two decimal places
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Validate transformed invoice data before database insert
   */
  public static validateTransformedData(data: TransformedInvoiceData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate customer
    if (!data.customer.name || data.customer.name.trim().length === 0) {
      errors.push('Customer name is required');
    }

    // Validate invoice
    if (!data.invoice.invoiceNumber || data.invoice.invoiceNumber.trim().length === 0) {
      errors.push('Invoice number is required');
    }

    if (!data.invoice.invoiceDate || isNaN(data.invoice.invoiceDate.getTime())) {
      errors.push('Valid invoice date is required');
    }

    if (data.invoice.invoiceDate > new Date()) {
      errors.push('Invoice date cannot be in the future');
    }

    if (!data.invoice.salesperson || data.invoice.salesperson.trim().length === 0) {
      errors.push('Salesperson is required');
    }

    if (data.invoice.totalAmount < 0) {
      errors.push('Invoice total amount cannot be negative');
    }

    // Validate line items
    if (!data.lineItems || data.lineItems.length === 0) {
      errors.push('At least one line item is required');
    }

    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];

      if (!item.productCode || item.productCode.trim().length === 0) {
        errors.push(`Line item ${i + 1}: Product code is required`);
      }

      if (item.quantity <= 0) {
        errors.push(`Line item ${i + 1}: Quantity must be greater than 0`);
      }

      if (item.lineTotal < 0) {
        errors.push(`Line item ${i + 1}: Line total cannot be negative`);
      }

      if (!Object.values(ProductCategory).includes(item.category)) {
        errors.push(`Line item ${i + 1}: Invalid product category`);
      }
    }

    // Cross-validation: line items should sum to invoice subtotal
    const calculatedSubtotal = data.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const subtotalDifference = Math.abs(calculatedSubtotal - data.invoice.subtotal);

    if (subtotalDifference > 0.01) { // Allow for small rounding differences
      errors.push(`Subtotal mismatch: line items sum to ${calculatedSubtotal.toFixed(2)}, but invoice subtotal is ${data.invoice.subtotal.toFixed(2)}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Generate unique customer identifier for deduplication
   */
  public static generateCustomerIdentifier(customer: TransformedCustomer): string {
    // Use normalized name as identifier since TireMaster export doesn't include unique customer IDs
    return customer.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Check if an invoice already exists (for duplicate prevention)
   */
  public static generateInvoiceIdentifier(invoice: TransformedInvoice): string {
    return invoice.invoiceNumber.toLowerCase();
  }
}