import { Injectable, Logger } from '@nestjs/common';
import { CsvFileProcessor, ProcessingOptions, ProcessingResult } from './csv-file-processor';
import * as fs from 'fs';
import * as Papa from 'papaparse';

export interface TireMasterInventoryParsingResult extends ProcessingResult {
  inventoryItems: ParsedInventoryItem[];
}

export interface ParsedInventoryItem {
  siteCode: string;
  productCode: string;
  size: string;
  description: string;
  onHand: number;
  unpriced: number;
  total: number;
  parts: number;
  labor: number;
  fet: number;
}

@Injectable()
export class TireMasterInventoryParser {
  private readonly logger = new Logger(TireMasterInventoryParser.name);

  constructor(private readonly csvFileProcessor: CsvFileProcessor) {}

  async parse(filePath: string, options: ProcessingOptions = {}): Promise<TireMasterInventoryParsingResult> {
    this.logger.log(`Starting inventory parsing for ${filePath}`);
    const startTime = Date.now();

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    const result: TireMasterInventoryParsingResult = {
      success: true,
      totalLines: 0,
      processedLines: 0,
      skippedLines: 0,
      errors: [],
      processingTimeMs: 0,
      inventoryItems: []
    };

    let currentSiteCode: string | null = null;

    Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true,
      step: (results) => {
        result.totalLines++;
        const row = results.data as string[];
        
        // Clean row data
        const cleanRow = row.map(cell => cell?.trim() || '');

        // Determine data start index
        // Default start index for product data is 22
        let dataStartIndex = 22;
        
        // Check for Site Header in column 22
        // Example: ..., "Site#:", "1", "ProductCode", ...
        if (cleanRow[22] === 'Site#:') {
          currentSiteCode = cleanRow[23];
          dataStartIndex = 24; // Data shifts by 2 columns when Site#: is present
          // this.logger.debug(`Switched to Site: ${currentSiteCode}`);
        }

        // If we haven't found a site yet, we can't process inventory
        if (!currentSiteCode) {
          result.skippedLines++;
          return;
        }

        // Extract Product Code
        const productCode = cleanRow[dataStartIndex];

        // Validation: Skip invalid rows, headers, or footer garbage
        // "..." is used in the footer
        // "Product Code" might appear if headers are repeated in data columns (unlikely but possible)
        if (!productCode || productCode === '...' || productCode === '.' || productCode === 'Product Code') {
            result.skippedLines++;
            return;
        }

        const parseNum = (val: string) => {
            const num = parseFloat(val?.replace(/,/g, '') || '0');
            return isNaN(num) ? 0 : num;
        };

        const item: ParsedInventoryItem = {
          siteCode: currentSiteCode,
          productCode: productCode,
          size: cleanRow[dataStartIndex + 1],
          description: cleanRow[dataStartIndex + 2],
          onHand: parseNum(cleanRow[dataStartIndex + 3]),
          unpriced: parseNum(cleanRow[dataStartIndex + 4]),
          total: parseNum(cleanRow[dataStartIndex + 5]),
          parts: parseNum(cleanRow[dataStartIndex + 6]),
          labor: parseNum(cleanRow[dataStartIndex + 7]),
          fet: parseNum(cleanRow[dataStartIndex + 8]),
        };

        result.inventoryItems.push(item);
        result.processedLines++;
      },
      complete: () => {
        result.processingTimeMs = Date.now() - startTime;
        this.logger.log(`Inventory parsing complete. Found ${result.inventoryItems.length} items.`);
      },
      error: (error: any) => {
        this.logger.error('Error parsing CSV', error);
        result.errors.push(error.message);
        result.success = false;
      }
    });

    return result;
  }
}
