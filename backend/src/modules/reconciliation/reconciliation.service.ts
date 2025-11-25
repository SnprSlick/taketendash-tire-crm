import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as Papa from 'papaparse';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  async processReconciliationFile(file: Express.Multer.File) {
    const csvContent = file.buffer.toString('utf-8');
    
    // Parse CSV without headers to handle multiple sections
    const parsed = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      this.logger.warn(`CSV parsing errors: ${JSON.stringify(parsed.errors)}`);
    }

    const rows = parsed.data as any[][];
    this.logger.log(`Parsed ${rows.length} rows from CSV`);

    // Create Batch
    const batch = await this.prisma.reconciliationBatch.create({
      data: {
        filename: file.originalname,
        status: 'PROCESSING',
        totalRecords: 0 // Will update later
      }
    });

    let matchedCount = 0;
    let processedCount = 0;
    
    let currentSection = 'National Account';
    let currentAccount = '';

    // Hardcoded headers for Legacy/Other Report (Data at Index 23)
    const legacyHeaders = {
      date: 22,
      invoiceNumber: 23,
      invoiceAmount: 24,
      creditAmount: 28, 
      commission: 29,   
      difference: 30,
      accountName: -1   // Rely on context (currentAccount)
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // 1. Check for "Rec Code" Row (Context + Data)
      const col0 = row[0]?.toString().trim() || '';
      const col22 = row[22]?.toString().trim() || '';
      
      if (col0.toLowerCase().includes('rec code') || col22.toLowerCase().includes('rec code')) {
        const isCol0 = col0.toLowerCase().includes('rec code');
        const accountIdx = isCol0 ? 2 : 24;
        const invoiceIdx = isCol0 ? 4 : 26;

        // Extract Account Name
        let accountName = row[accountIdx]?.toString().trim();
        
        // Filter out report titles
        const lowerName = accountName?.toLowerCase() || '';
        const invalidTerms = ['recon report', 'national account', 'narecon', 'reconciliation', 'rec code'];
        const isInvalid = invalidTerms.some(term => lowerName.includes(term));

        if (accountName && !isInvalid) {
             currentAccount = accountName;
             if (currentAccount.toUpperCase().includes('GOV')) currentSection = 'Government Support';
             else currentSection = 'National Account';
             this.logger.log(`Found Account Context: ${currentAccount} (Row ${i})`);
        } else if (accountName) {
             this.logger.warn(`Ignored Account Name: ${accountName}`);
        }

        // Check for Data in this Rec Code row
        const invoiceNum = row[invoiceIdx]?.toString().trim();
        if (invoiceNum && (invoiceNum.startsWith('3-') || invoiceNum.startsWith('3GS'))) {
            const recCodeHeaders = {
                date: invoiceIdx - 1,
                invoiceNumber: invoiceIdx,
                invoiceAmount: invoiceIdx + 1,
                creditAmount: invoiceIdx + 5,
                commission: invoiceIdx + 6,
                difference: invoiceIdx + 7,
                accountName: -1
            };
            await this.processRecord(row, recCodeHeaders, batch.id, currentSection, currentAccount);
            processedCount++;
        }
        continue;
      }

      // 2. Check for Standard National Data Row (Invoice at Index 1)
      // Mapping: Date=0, Inv=1, Amt=2, Claim=3, CRMemo=4, CRDate=5, CRAmt=6, CRComm=7, Diff=8
      const col1 = row[1]?.toString().trim();
      if (col1 && (col1.startsWith('3-') || col1.startsWith('3GS'))) {
          const stdHeaders = {
              date: 0,
              invoiceNumber: 1,
              invoiceAmount: 2,
              creditAmount: 6,
              commission: 7,
              difference: 8,
              accountName: -1
          };
          await this.processRecord(row, stdHeaders, batch.id, currentSection, currentAccount);
          processedCount++;
          continue;
      }

      // 3. Check for Invoice Detail Report Data Row (Invoice at Index 23)
      const col23 = row[23]?.toString().trim();
      if (col23 && (col23.startsWith('3-') || col23.startsWith('3GS'))) {
           await this.processRecord(row, legacyHeaders, batch.id, currentSection, currentAccount);
           processedCount++;
           continue;
      }
    }

    if (processedCount === 0) {
      this.logger.warn(`No records processed.`);
    }

    // Update batch stats
    const finalStats = await this.prisma.reconciliationRecord.groupBy({
      by: ['status'],
      where: { batchId: batch.id },
      _count: true
    });

    matchedCount = finalStats.find(s => s.status === 'MATCHED')?._count || 0;

    await this.prisma.reconciliationBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        totalRecords: processedCount,
        matchedCount
      }
    });

    return {
      success: true,
      batchId: batch.id,
      totalRecords: processedCount,
      matchedCount
    };
  }

  private async processRecord(
    row: any[], 
    headers: Record<string, number>, 
    batchId: string,
    section: string,
    account: string
  ) {
    const rawInvoiceNumber = row[headers['invoiceNumber']]?.toString().trim() || '';
    const invoiceAmount = this.parseCurrency(row[headers['invoiceAmount']]);
    const creditAmount = this.parseCurrency(row[headers['creditAmount']]);
    const commission = this.parseCurrency(row[headers['commission']]);
    const difference = this.parseCurrency(row[headers['difference']]);
    
    // Use column account name if available, otherwise use context
    let accountName = headers['accountName'] !== undefined && headers['accountName'] !== -1 ? row[headers['accountName']] : account;
    
    // Safety check: If the extracted account name looks like a report title, use the context instead
    if (accountName) {
        const lowerName = accountName.toString().toLowerCase();
        const invalidTerms = ['recon report', 'national account', 'narecon', 'reconciliation', 'rec code'];
        if (invalidTerms.some(term => lowerName.includes(term))) {
            accountName = account;
        }
    }

    if (!accountName && section) accountName = section; // Fallback
    
    const dateStr = headers['date'] !== undefined ? row[headers['date']] : null;
    
    let invoiceDate = null;
    if (dateStr) {
      invoiceDate = new Date(dateStr);
      if (isNaN(invoiceDate.getTime())) invoiceDate = null;
    }

    // Matching Logic
    const matchResult = await this.findMatchingInvoice(rawInvoiceNumber, invoiceAmount);
    
    // Check for existing record to prevent duplicates
    const existingRecord = await this.prisma.reconciliationRecord.findFirst({
      where: { invoiceNumber: rawInvoiceNumber }
    });

    if (existingRecord) {
      // Update existing record with new data (or same data)
      // This handles the "update if new, ignore if same" requirement by overwriting
      await this.prisma.reconciliationRecord.update({
        where: { id: existingRecord.id },
        data: {
          batchId, // Move to current batch
          accountName: accountName || null,
          invoiceDate,
          invoiceAmount,
          creditAmount,
          commission,
          difference,
          status: matchResult.status as any,
          matchedInvoiceId: matchResult.matchedInvoiceId
        }
      });
    } else {
      // Create New Record
      await this.prisma.reconciliationRecord.create({
        data: {
          batchId,
          invoiceNumber: rawInvoiceNumber,
          accountName: accountName || null,
          invoiceDate,
          invoiceAmount,
          creditAmount,
          commission,
          difference,
          status: matchResult.status as any,
          matchedInvoiceId: matchResult.matchedInvoiceId
        }
      });
    }
  }

  private async findMatchingInvoice(rawInvoiceNumber: string, invoiceAmount: number) {
    let status = 'UNMATCHED';
    let matchedInvoiceId = null;

    if (rawInvoiceNumber) {
      const dbInvoiceNumber = this.formatInvoiceNumberForSearch(rawInvoiceNumber);
      
      // Try to find invoice
      // 1. Exact match
      let invoice = await this.prisma.invoice.findFirst({
        where: {
          invoiceNumber: {
            equals: rawInvoiceNumber,
            mode: 'insensitive'
          }
        },
        include: { lineItems: true }
      });

      // 2. Match with hyphen insertion (3-GS319682 -> 3-GS-319682)
      if (!invoice && dbInvoiceNumber !== rawInvoiceNumber) {
        invoice = await this.prisma.invoice.findFirst({
          where: {
            invoiceNumber: {
              equals: dbInvoiceNumber,
              mode: 'insensitive'
            }
          },
          include: { lineItems: true }
        });
      }

      if (invoice) {
        matchedInvoiceId = invoice.id;
        // User requested to match only on Invoice Number, ignoring amount differences
        status = 'MATCHED';
      }
    }

    return { status, matchedInvoiceId };
  }

  async reprocessBatch(batchId: string) {
    const batch = await this.prisma.reconciliationBatch.findUnique({
      where: { id: batchId }
    });
    
    if (!batch) throw new BadRequestException('Batch not found');

    // Get all unmatched or discrepancy records
    const records = await this.prisma.reconciliationRecord.findMany({
      where: {
        batchId,
        status: { in: ['UNMATCHED', 'DISCREPANCY'] }
      }
    });

    let updatedCount = 0;

    for (const record of records) {
      const matchResult = await this.findMatchingInvoice(record.invoiceNumber, Number(record.invoiceAmount));
      
      if (matchResult.status === 'MATCHED' || (matchResult.status === 'DISCREPANCY' && record.status === 'UNMATCHED')) {
        await this.prisma.reconciliationRecord.update({
          where: { id: record.id },
          data: {
            status: matchResult.status as any,
            matchedInvoiceId: matchResult.matchedInvoiceId
          }
        });
        updatedCount++;
      }
    }

    // Update batch stats
    const finalStats = await this.prisma.reconciliationRecord.groupBy({
      by: ['status'],
      where: { batchId: batchId },
      _count: true
    });

    const matchedCount = finalStats.find(s => s.status === 'MATCHED')?._count || 0;

    await this.prisma.reconciliationBatch.update({
      where: { id: batchId },
      data: {
        matchedCount
      }
    });

    return { success: true, updatedCount, matchedCount };
  }

  async rescanBatch(batchId: string) {
    const records = await this.prisma.reconciliationRecord.findMany({
      where: { batchId }
    });

    let matchedCount = 0;

    for (const record of records) {
      const matchResult = await this.findMatchingInvoice(record.invoiceNumber, Number(record.invoiceAmount));
      
      if (matchResult.status !== record.status || matchResult.matchedInvoiceId !== record.matchedInvoiceId) {
        await this.prisma.reconciliationRecord.update({
          where: { id: record.id },
          data: {
            status: matchResult.status as any,
            matchedInvoiceId: matchResult.matchedInvoiceId
          }
        });
      }
      
      if (matchResult.status === 'MATCHED') matchedCount++;
    }

    // Update batch stats
    await this.prisma.reconciliationBatch.update({
      where: { id: batchId },
      data: {
        matchedCount,
        unmatchedCount: records.length - matchedCount
      }
    });

    return { success: true, matchedCount, total: records.length };
  }

  private parseCurrency(val: any): number {
    if (!val) return 0;
    let str = val.toString().trim();
    // Check for negative indicators: () or just ( at start or - at start
    // Handle cases like "(11.46" where closing paren might be missing
    const isNegative = str.includes('(') || str.startsWith('-');
    
    // Remove currency symbols, commas, and parentheses
    str = str.replace(/[$,()]/g, '');
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : (isNegative ? -Math.abs(num) : num);
  }

  private formatInvoiceNumberForSearch(raw: string): string {
    // "3-GS320748" -> "3-GS-320748"
    // "3-NA321261" -> "3-NA-321261"
    if (raw.match(/^3-[A-Z]{2}\d+$/)) {
      return raw.replace(/^(3-[A-Z]{2})(\d+)$/, '$1-$2');
    }
    return raw;
  }

  async getBatches() {
    return this.prisma.reconciliationBatch.findMany({
      orderBy: { uploadDate: 'desc' },
      include: {
        _count: {
          select: { records: true }
        }
      }
    });
  }

  async getBatchDetails(id: string) {
    const batch = await this.prisma.reconciliationBatch.findUnique({
      where: { id }
    });

    const records = await this.prisma.reconciliationRecord.findMany({
      where: { batchId: id },
      include: {
        matchedInvoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            taxAmount: true,
            customer: { select: { name: true } },
            lineItems: true
          }
        }
      },
      orderBy: { status: 'asc' } // UNMATCHED first usually
    });

    return { batch, records };
  }

  async getStats() {
    const totalMatched = await this.prisma.reconciliationRecord.count({
      where: { status: 'MATCHED' }
    });
    const totalUnmatched = await this.prisma.reconciliationRecord.count({
      where: { status: 'UNMATCHED' }
    });
    const totalDiscrepancy = await this.prisma.reconciliationRecord.count({
      where: { status: 'DISCREPANCY' }
    });

    return {
      totalMatched,
      totalUnmatched,
      totalDiscrepancy
    };
  }

  async clearDatabase() {
    // Delete all records first due to foreign key constraints
    await this.prisma.reconciliationRecord.deleteMany({});
    // Then delete batches
    await this.prisma.reconciliationBatch.deleteMany({});
    
    return { success: true, message: 'Database cleared' };
  }
}
