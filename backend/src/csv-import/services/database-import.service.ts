import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ProductCategory } from '@prisma/client';
import { TireMasterDataTransformer } from '../mappers/tiremaster-data-transformer';
import { ParsedInvoice } from '../processors/tiremaster-csv-parser';

export interface ImportProgress {
  totalInvoices: number;
  processedInvoices: number;
  totalLineItems: number;
  processedLineItems: number;
  currentInvoice?: string;
  errors: number;
}

export interface ImportResult {
  success: boolean;
  importBatchId: string;
  totalInvoices: number;
  successfulInvoices: number;
  failedInvoices: number;
  totalLineItems: number;
  errors: Array<{
    invoiceNumber: string;
    error: string;
  }>;
  duration: number;
}

/**
 * Efficient Database Import Service
 * 
 * Handles bulk import of parsed CSV invoices to PostgreSQL with:
 * - Batch processing for large datasets
 * - Transaction management for data integrity
 * - Deduplication of customers
 * - Progress tracking
 * - Error handling and rollback
 * - Optimized for large quantities of data
 */
@Injectable()
export class DatabaseImportService {
  private readonly logger = new Logger(DatabaseImportService.name);
  private readonly BATCH_SIZE = 50; // Process 50 invoices at a time
  private readonly CUSTOMER_CACHE = new Map<string, string>(); // Cache customer IDs

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import parsed invoices to database with efficient batching
   */
  async importInvoices(
    invoices: ParsedInvoice[],
    fileName: string,
    filePath: string,
    progressCallback?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const startTime = Date.now();
    this.logger.log(`Starting database import for ${invoices.length} invoices from ${fileName}`);

    // Clear customer cache for this import
    this.CUSTOMER_CACHE.clear();

    // Create import batch record
    const importBatch = await this.prisma.importBatch.create({
      data: {
        fileName,
        originalPath: filePath,
        totalRecords: invoices.length,
        status: 'STARTED',
      },
    });

    const errors: Array<{ invoiceNumber: string; error: string }> = [];
    let successfulInvoices = 0;
    let totalLineItems = 0;

    try {
      // Process invoices in batches for efficiency
      for (let i = 0; i < invoices.length; i += this.BATCH_SIZE) {
        const batch = invoices.slice(i, i + this.BATCH_SIZE);
        
        this.logger.log(`Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(invoices.length / this.BATCH_SIZE)}`);

        // Process batch in a transaction
        const batchResult = await this.processBatch(batch, importBatch.id);
        
        successfulInvoices += batchResult.successful;
        totalLineItems += batchResult.lineItems;
        errors.push(...batchResult.errors);

        // Report progress
        if (progressCallback) {
          progressCallback({
            totalInvoices: invoices.length,
            processedInvoices: i + batch.length,
            totalLineItems,
            processedLineItems: totalLineItems,
            currentInvoice: batch[batch.length - 1]?.header.invoiceNumber,
            errors: errors.length,
          });
        }
      }

      // Update import batch status
      await this.prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: errors.length === 0 ? 'COMPLETED' : 'COMPLETED',
          completedAt: new Date(),
          successfulRecords: successfulInvoices,
          failedRecords: errors.length,
          errorSummary: errors.length > 0 ? this.summarizeErrors(errors) : null,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Import completed in ${duration}ms: ${successfulInvoices}/${invoices.length} invoices, ${totalLineItems} line items`
      );

      return {
        success: errors.length === 0,
        importBatchId: importBatch.id,
        totalInvoices: invoices.length,
        successfulInvoices,
        failedInvoices: errors.length,
        totalLineItems,
        errors,
        duration,
      };

    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);

      // Update import batch as failed
      await this.prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorSummary: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Process a batch of invoices in a single transaction
   */
  private async processBatch(
    invoices: ParsedInvoice[],
    importBatchId: string
  ): Promise<{ successful: number; lineItems: number; errors: Array<{ invoiceNumber: string; error: string }> }> {
    const errors: Array<{ invoiceNumber: string; error: string }> = [];
    let successful = 0;
    let lineItems = 0;

    // Use transaction for atomic batch processing
    await this.prisma.$transaction(async (tx) => {
      for (const invoice of invoices) {
        try {
          // Get or create customer (with caching)
          const customerId = await this.getOrCreateCustomer(
            invoice.header.customerName,
            tx
          );

          // Invoice date is already a Date object
          const invoiceDate = invoice.header.invoiceDate;

          // Calculate totals from line items
          const partsCost = invoice.lineItems.reduce((sum, item) => sum + item.partsCost, 0);
          const laborCost = invoice.lineItems.reduce((sum, item) => sum + item.laborCost, 0);
          const fetTotal = invoice.lineItems.reduce((sum, item) => sum + item.fet, 0);
          const totalCost = invoice.lineItems.reduce((sum, item) => sum + item.cost, 0);
          const grossProfit = invoice.lineItems.reduce((sum, item) => sum + item.grossProfit, 0);
          const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

          // Create invoice
          const createdInvoice = await tx.invoice.create({
            data: {
              invoiceNumber: invoice.header.invoiceNumber,
              customerId,
              invoiceDate,
              salesperson: invoice.header.salesperson || 'Unknown',
              vehicleInfo: invoice.header.vehicleInfo,
              mileage: invoice.header.mileage,
              subtotal: new Prisma.Decimal(subtotal),
              taxAmount: new Prisma.Decimal(invoice.header.taxAmount || 0),
              totalAmount: new Prisma.Decimal(invoice.header.totalAmount || subtotal),
              laborCost: new Prisma.Decimal(laborCost),
              partsCost: new Prisma.Decimal(partsCost),
              fetTotal: new Prisma.Decimal(fetTotal),
              totalCost: new Prisma.Decimal(totalCost),
              grossProfit: new Prisma.Decimal(grossProfit),
              importBatchId,
              status: 'ACTIVE',
            },
          });

          // Create line items in bulk
          if (invoice.lineItems.length > 0) {
            await tx.invoiceLineItem.createMany({
              data: invoice.lineItems.map((item, index) => ({
                invoiceId: createdInvoice.id,
                lineNumber: index + 1,
                productCode: item.productCode,
                description: item.description || '',
                adjustment: item.adjustment,
                quantity: new Prisma.Decimal(item.quantity),
                partsCost: new Prisma.Decimal(item.partsCost),
                laborCost: new Prisma.Decimal(item.laborCost),
                fet: new Prisma.Decimal(item.fet),
                lineTotal: new Prisma.Decimal(item.lineTotal),
                costPrice: new Prisma.Decimal(item.cost),
                grossProfitMargin: new Prisma.Decimal(item.grossProfitMargin),
                grossProfit: new Prisma.Decimal(item.grossProfit),
                category: this.determineCategory(item.productCode),
              })),
            });

            lineItems += invoice.lineItems.length;
          }

          successful++;

        } catch (error) {
          this.logger.warn(
            `Failed to import invoice ${invoice.header.invoiceNumber}: ${error.message}`
          );
          errors.push({
            invoiceNumber: invoice.header.invoiceNumber,
            error: error.message,
          });
        }
      }
    }, {
      maxWait: 30000, // 30 seconds
      timeout: 60000, // 60 seconds
    });

    return { successful, lineItems, errors };
  }

  /**
   * Get existing customer or create new one (with caching for efficiency)
   */
  private async getOrCreateCustomer(
    customerName: string,
    tx: any
  ): Promise<string> {
    // Check cache first
    if (this.CUSTOMER_CACHE.has(customerName)) {
      return this.CUSTOMER_CACHE.get(customerName)!;
    }

    // Try to find existing customer
    let customer = await tx.invoiceCustomer.findFirst({
      where: { name: customerName },
    });

    // Create if doesn't exist
    if (!customer) {
      customer = await tx.invoiceCustomer.create({
        data: { name: customerName },
      });
    }

    // Cache for future lookups
    this.CUSTOMER_CACHE.set(customerName, customer.id);
    return customer.id;
  }

  /**
   * Parse invoice date from various formats
   */
  /**
   * Determine product category from product code
   */
  private determineCategory(productCode: string): ProductCategory {
    const code = productCode.toUpperCase();

    if (code.includes('TIRE') || code.includes('OP19') || code.match(/\d{2,}x\d{2,}/)) {
      return 'TIRES';
    }
    if (code.includes('SRV-') || code.includes('SERVICE') || code.includes('MOUNT') || code.includes('BALANCE')) {
      return 'SERVICES';
    }
    if (code.includes('ENV') || code.includes('FEE') || code.includes('SHOP') || code.includes('SCRAP')) {
      return 'FEES';
    }
    if (code.includes('PART') || code.includes('FILTER') || code.includes('OIL')) {
      return 'PARTS';
    }

    return 'OTHER';
  }

  /**
   * Create error summary from errors
   */
  private summarizeErrors(errors: Array<{ invoiceNumber: string; error: string }>): string {
    const errorTypes = new Map<string, number>();
    
    errors.forEach(({ error }) => {
      const type = error.split(':')[0];
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    });

    const summary: string[] = [];
    errorTypes.forEach((count, type) => {
      summary.push(`${type}: ${count}`);
    });

    return summary.join(', ');
  }

  /**
   * Rollback an import batch
   */
  async rollbackImport(importBatchId: string): Promise<void> {
    this.logger.log(`Rolling back import batch: ${importBatchId}`);

    await this.prisma.$transaction(async (tx) => {
      // Delete all line items for this batch
      await tx.invoiceLineItem.deleteMany({
        where: {
          invoice: {
            importBatchId,
          },
        },
      });

      // Delete all invoices for this batch
      await tx.invoice.deleteMany({
        where: { importBatchId },
      });

      // Update batch status
      await tx.importBatch.update({
        where: { id: importBatchId },
        data: {
          status: 'ROLLED_BACK',
        },
      });
    });

    this.logger.log(`Rollback completed for batch: ${importBatchId}`);
  }

  /**
   * Get import statistics
   */
  async getImportStats(importBatchId: string) {
    const batch = await this.prisma.importBatch.findUnique({
      where: { id: importBatchId },
      include: {
        invoices: {
          include: {
            lineItems: true,
          },
        },
        errors: true,
      },
    });

    if (!batch) {
      throw new Error(`Import batch not found: ${importBatchId}`);
    }

    const totalLineItems = batch.invoices.reduce(
      (sum, inv) => sum + inv.lineItems.length,
      0
    );

    return {
      batchId: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      totalRecords: batch.totalRecords,
      successfulRecords: batch.successfulRecords,
      failedRecords: batch.failedRecords,
      totalLineItems,
      errors: batch.errors.map(e => ({
        rowNumber: e.rowNumber,
        type: e.errorType,
        message: e.errorMessage,
      })),
    };
  }
}
