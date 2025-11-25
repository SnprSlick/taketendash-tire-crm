
import { TireMasterCsvParser } from './src/csv-import/processors/tiremaster-csv-parser';
import { CsvFileProcessor } from './src/csv-import/processors/csv-file-processor';
import { CsvFormatValidator } from './src/csv-import/processors/csv-format-validator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import * as path from 'path';

// Mock Logger
const mockLogger = {
  log: (msg: string) => console.log(`[LOG] ${msg}`),
  error: (msg: string, stack?: string) => console.error(`[ERROR] ${msg}`, stack),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
} as unknown as Logger;

// Mock EventEmitter
const mockEventEmitter = {
  emit: (event: string, payload: any) => console.log(`[EVENT] ${event}`),
} as unknown as EventEmitter2;

async function run() {
  try {
    console.log('Initializing parser components...');
    
    // Manually instantiate dependencies
    // We need to hack the private logger property or just pass it if the constructor allows
    // Since we can't easily inject, we'll rely on the classes creating their own loggers or being simple enough.
    
    // CsvFormatValidator
    const validator = new CsvFormatValidator();
    (validator as any).logger = mockLogger;

    // CsvFileProcessor
    const processor = new CsvFileProcessor(mockEventEmitter);
    (processor as any).logger = mockLogger;

    // TireMasterCsvParser
    const parser = new TireMasterCsvParser(processor, mockEventEmitter);
    (parser as any).logger = mockLogger;

    const filePath = path.join(__dirname, 'data/invoice2025small.csv');
    console.log(`Debug script started for file: ${filePath}`);
    
    const result = await parser.parseFile(filePath, {
      strictMode: false,
      validateFormat: false
    });

    console.log('\n--- Parsing Result ---');
    console.log(`Success: ${result.success}`);
    console.log(`Total Invoices: ${result.totalInvoices}`);
    console.log(`Total Line Items: ${result.totalLineItems}`);
    console.log(`Errors: ${result.errors.length}`);
    if (result.errors.length > 0) {
      console.log('\n--- Errors ---');
      result.errors.forEach((err: any, index) => {
        const row = err.rowNumber || err.lineNumber || err.line;
        const msg = err.message || err.error;
        const data = err.rawData || err.data || err.rawLine;
        console.log(`Error ${index + 1}: [Row ${row}] ${msg}`);
        console.log(`  Raw Data: ${data}`);
        // console.log('Full Error Object:', JSON.stringify(err));
      });
    }
    
    if (result.invoices.length > 0) {
      console.log('\n--- First Invoice Structure ---');
      const firstInvoice = result.invoices[0];
      console.log('Header:', JSON.stringify(firstInvoice.header, null, 2));
      console.log('Line Items Count:', firstInvoice.lineItems.length);
      console.log('First Line Item:', JSON.stringify(firstInvoice.lineItems[0], null, 2));
      
      if ((firstInvoice as any).transformedData) {
        console.log('\n--- Transformed Data Present ---');
        console.log(JSON.stringify((firstInvoice as any).transformedData, null, 2));
      } else {
        console.log('\n--- Transformed Data MISSING ---');
      }
    } else {
      console.log('No invoices found!');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

run();
