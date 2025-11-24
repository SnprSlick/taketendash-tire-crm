export enum ImportStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

// Import the ErrorType from Prisma client to ensure consistency
export { ErrorType } from '@prisma/client';

export enum InvoiceStatus {
  ACTIVE = 'ACTIVE',
  VOIDED = 'VOIDED',
  RETURNED = 'RETURNED',
}

export enum ProductCategory {
  TIRES = 'TIRES',
  SERVICES = 'SERVICES',
  PARTS = 'PARTS',
  FEES = 'FEES',
  OTHER = 'OTHER',
}

export enum DataSourceType {
  TIRE_MASTER_SYNC = 'TIRE_MASTER_SYNC',
  INVOICE_IMPORT = 'INVOICE_IMPORT',
}

export enum DuplicateHandlingStrategy {
  SKIP = 'SKIP',           // Skip duplicate invoices, continue with others
  UPDATE = 'UPDATE',       // Update existing invoice with new data
  FAIL = 'FAIL',          // Fail the entire import (current behavior)
  MERGE = 'MERGE',        // Merge line items into existing invoice
  RENAME = 'RENAME'       // Auto-rename duplicate with suffix
}