import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, ReadStream } from 'fs';
import { createInterface, Interface } from 'readline';
import { stat } from 'fs/promises';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * CSV File Processor Service
 *
 * Handles streaming processing of large CSV files with progress tracking
 * and memory-efficient line-by-line processing.
 */

export interface ProcessingOptions {
  batchSize?: number; // Number of rows to process in each batch
  skipEmptyLines?: boolean;
  encoding?: BufferEncoding;
  maxFileSize?: number; // Maximum file size in bytes
  progressCallback?: (progress: ProcessingProgress) => void;
}

export interface ProcessingProgress {
  totalLines: number;
  processedLines: number;
  currentLine: number;
  percentage: number;
  bytesRead: number;
  totalBytes: number;
}

export interface ProcessingResult {
  success: boolean;
  totalLines: number;
  processedLines: number;
  skippedLines: number;
  errors: ProcessingError[];
  processingTimeMs: number;
}

export interface ProcessingError {
  lineNumber: number;
  error: string;
  rawLine: string;
}

@Injectable()
export class CsvFileProcessor {
  private readonly logger = new Logger(CsvFileProcessor.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Process CSV file line by line with streaming
   */
  async processFile<T>(
    filePath: string,
    lineProcessor: (line: string, lineNumber: number) => Promise<T | null>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const {
      batchSize = 100,
      skipEmptyLines = true,
      encoding = 'utf8',
      maxFileSize = 100 * 1024 * 1024, // 100MB default
      progressCallback
    } = options;

    this.logger.log(`Starting CSV file processing: ${filePath}`);

    try {
      // Validate file size
      const fileStats = await stat(filePath);
      if (fileStats.size > maxFileSize) {
        throw new Error(`File size (${fileStats.size} bytes) exceeds maximum allowed size (${maxFileSize} bytes)`);
      }

      const totalBytes = fileStats.size;
      let bytesRead = 0;
      let lineNumber = 0;
      let processedLines = 0;
      let skippedLines = 0;
      const errors: ProcessingError[] = [];

      // Create read stream
      const stream = createReadStream(filePath, { encoding });
      const readline = createInterface({
        input: stream,
        crlfDelay: Infinity, // Handle Windows line endings
      });

      // Estimate total lines (rough approximation)
      const averageLineLength = Math.max(100, Math.min(500, totalBytes / 1000)); // Estimate between 100-500 chars per line
      const estimatedTotalLines = Math.ceil(totalBytes / averageLineLength);

      let currentProgress: ProcessingProgress = {
        totalLines: estimatedTotalLines,
        processedLines: 0,
        currentLine: 0,
        percentage: 0,
        bytesRead: 0,
        totalBytes,
      };

      // Process lines in batches
      const lineBatch: { line: string; number: number }[] = [];

      for await (const line of readline) {
        lineNumber++;
        bytesRead += Buffer.byteLength(line, encoding) + 1; // +1 for newline

        // Skip empty lines if configured
        if (skipEmptyLines && line.trim().length === 0) {
          skippedLines++;
          continue;
        }

        // Add to current batch
        lineBatch.push({ line, number: lineNumber });

        // Process batch when it's full or we're at the end
        if (lineBatch.length >= batchSize) {
          const batchResult = await this.processBatch(lineBatch, lineProcessor, errors);
          processedLines += batchResult.processedCount;
          lineBatch.length = 0; // Clear batch

          // Update progress
          currentProgress = {
            totalLines: Math.max(estimatedTotalLines, lineNumber),
            processedLines,
            currentLine: lineNumber,
            percentage: Math.min(100, Math.round((bytesRead / totalBytes) * 100)),
            bytesRead,
            totalBytes,
          };

          // Call progress callback
          if (progressCallback) {
            progressCallback(currentProgress);
          }

          // Emit progress event
          this.eventEmitter.emit('csv.processing.progress', {
            filePath,
            progress: currentProgress,
          });
        }
      }

      // Process remaining lines in final batch
      if (lineBatch.length > 0) {
        const batchResult = await this.processBatch(lineBatch, lineProcessor, errors);
        processedLines += batchResult.processedCount;
      }

      const processingTimeMs = Date.now() - startTime;

      const result: ProcessingResult = {
        success: true,
        totalLines: lineNumber,
        processedLines,
        skippedLines,
        errors,
        processingTimeMs,
      };

      this.logger.log(
        `CSV processing completed: ${processedLines}/${lineNumber} lines processed in ${processingTimeMs}ms`
      );

      // Emit completion event
      this.eventEmitter.emit('csv.processing.completed', {
        filePath,
        result,
      });

      return result;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`CSV processing failed: ${errorMessage}`, error.stack);

      // Emit error event
      this.eventEmitter.emit('csv.processing.error', {
        filePath,
        error: errorMessage,
        processingTimeMs,
      });

      return {
        success: false,
        totalLines: 0,
        processedLines: 0,
        skippedLines: 0,
        errors: [{ lineNumber: 0, error: errorMessage, rawLine: '' }],
        processingTimeMs,
      };
    }
  }

  /**
   * Process a batch of lines
   */
  private async processBatch<T>(
    lineBatch: { line: string; number: number }[],
    lineProcessor: (line: string, lineNumber: number) => Promise<T | null>,
    errors: ProcessingError[]
  ): Promise<{ processedCount: number }> {
    let processedCount = 0;

    for (const { line, number } of lineBatch) {
      try {
        const result = await lineProcessor(line, number);
        if (result !== null) {
          processedCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        errors.push({
          lineNumber: number,
          error: errorMessage,
          rawLine: line,
        });

        // Log individual processing errors (but don't stop processing)
        this.logger.warn(`Error processing line ${number}: ${errorMessage}`);
      }
    }

    return { processedCount };
  }

  /**
   * Count total lines in file (for accurate progress tracking)
   */
  async countLines(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      const stream = createReadStream(filePath);
      const readline = createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      readline.on('line', () => {
        lineCount++;
      });

      readline.on('close', () => {
        resolve(lineCount);
      });

      readline.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Validate file accessibility and format
   */
  async validateFile(filePath: string): Promise<{
    isValid: boolean;
    errors: string[];
    fileSize: number;
    estimatedLines: number;
  }> {
    const errors: string[] = [];

    try {
      // Check if file exists and get stats
      const fileStats = await stat(filePath);

      if (!fileStats.isFile()) {
        errors.push('Path is not a file');
      }

      if (fileStats.size === 0) {
        errors.push('File is empty');
      }

      // Estimate lines based on file size
      const estimatedLines = Math.ceil(fileStats.size / 150); // Rough estimate: 150 bytes per line

      // Try to read first few lines to validate format
      try {
        const stream = createReadStream(filePath, { encoding: 'utf8' });
        const readline = createInterface({
          input: stream,
          crlfDelay: Infinity,
        });

        let linesRead = 0;
        const maxLinesToCheck = 5;

        for await (const line of readline) {
          linesRead++;

          // Basic CSV format validation
          if (line.length > 10000) {
            errors.push(`Line ${linesRead} is too long (${line.length} characters)`);
          }

          if (linesRead >= maxLinesToCheck) {
            break;
          }
        }

        readline.close();

        if (linesRead === 0) {
          errors.push('File appears to be empty or unreadable');
        }

      } catch (readError) {
        errors.push(`Unable to read file content: ${readError.message}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        fileSize: fileStats.size,
        estimatedLines,
      };

    } catch (error) {
      errors.push(`File validation failed: ${error.message}`);
      return {
        isValid: false,
        errors,
        fileSize: 0,
        estimatedLines: 0,
      };
    }
  }

  /**
   * Get file information without processing
   */
  async getFileInfo(filePath: string): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    totalLines: number;
    firstLines: string[];
    lastModified: Date;
  }> {
    const fileStats = await stat(filePath);
    const totalLines = await this.countLines(filePath);

    // Read first 5 lines for preview
    const firstLines: string[] = [];
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    const readline = createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let linesRead = 0;
    for await (const line of readline) {
      firstLines.push(line);
      linesRead++;
      if (linesRead >= 5) break;
    }
    readline.close();

    return {
      filePath,
      fileName: filePath.split('/').pop() || '',
      fileSize: fileStats.size,
      totalLines,
      firstLines,
      lastModified: fileStats.mtime,
    };
  }

  /**
   * Parse CSV line into fields (handles quoted fields and commas)
   */
  parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add final field
    fields.push(current);

    return fields;
  }
}