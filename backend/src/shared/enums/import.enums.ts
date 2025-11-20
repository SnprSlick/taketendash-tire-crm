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