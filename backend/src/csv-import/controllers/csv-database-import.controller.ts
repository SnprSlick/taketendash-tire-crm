import { Controller, Post, Body, Get, Param, Delete, Logger, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { DatabaseImportService } from '../services/database-import.service';
import { TireMasterCsvParser } from '../processors/tiremaster-csv-parser';
import { ImportProgressGateway } from '../gateways/import-progress.gateway';
import * as fs from 'fs';

@ApiTags('CSV Import - Database')
@Controller('csv-import/database')
export class CsvDatabaseImportController {
  private readonly logger = new Logger(CsvDatabaseImportController.name);

  constructor(
    private readonly databaseImportService: DatabaseImportService,
    private readonly csvParser: TireMasterCsvParser,
    private readonly progressGateway: ImportProgressGateway
  ) {}

  /**
   * Import CSV file to database
   */
  @Post('import')
  @ApiOperation({ summary: 'Parse CSV and import to database' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/csv',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv|xls|xlsx)$/)) {
          return cb(new Error('Only CSV and Excel files are allowed!'), false);
        }
        cb(null, true);
      },
    })
  )
  async importCsvToDatabase(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`Starting database import for file: ${file.originalname}`);

    try {
      // Step 1: Parse the CSV file
      const parseResult = await this.csvParser.parseFile(file.path, {
        validateFormat: true,
        progressCallback: (progress) => {
          // Emit parsing progress via WebSocket
          this.progressGateway.emitParsingProgress({
            fileName: file.originalname,
            processedLines: progress.processedLines,
            totalLines: progress.totalLines,
          });
        },
      });

      if (!parseResult.success) {
        throw new Error(`CSV parsing failed: ${parseResult.errors.length} errors found`);
      }

      this.logger.log(
        `CSV parsed successfully: ${parseResult.totalInvoices} invoices, ${parseResult.totalLineItems} line items`
      );

      // Step 2: Import to database
      const importResult = await this.databaseImportService.importInvoices(
        parseResult.invoices,
        file.originalname,
        file.path,
        (progress) => {
          // Emit import progress via WebSocket
          this.progressGateway.emitImportProgress({
            fileName: file.originalname,
            processedInvoices: progress.processedInvoices,
            totalInvoices: progress.totalInvoices,
            currentInvoice: progress.currentInvoice,
          });
        }
      );

      // Move file to processed folder
      const processedPath = join('./uploads/csv/processed', file.filename);
      await fs.promises.rename(file.path, processedPath);

      this.logger.log(
        `Database import completed: ${importResult.successfulInvoices}/${importResult.totalInvoices} invoices imported`
      );

      return {
        success: importResult.success,
        message: `Successfully imported ${importResult.successfulInvoices} of ${importResult.totalInvoices} invoices`,
        data: {
          importBatchId: importResult.importBatchId,
          fileName: file.originalname,
          parsing: {
            totalLines: parseResult.totalLines,
            totalInvoices: parseResult.totalInvoices,
            totalLineItems: parseResult.totalLineItems,
          },
          import: {
            totalInvoices: importResult.totalInvoices,
            successfulInvoices: importResult.successfulInvoices,
            failedInvoices: importResult.failedInvoices,
            totalLineItems: importResult.totalLineItems,
            duration: importResult.duration,
          },
          errors: importResult.errors,
        },
      };

    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);
      
      // Clean up file on error
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }

      throw error;
    }
  }

  /**
   * Get import batch statistics
   */
  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get import batch statistics' })
  async getImportBatchStats(@Param('batchId') batchId: string) {
    return this.databaseImportService.getImportStats(batchId);
  }

  /**
   * Rollback an import batch
   */
  @Delete('batch/:batchId')
  @ApiOperation({ summary: 'Rollback an import batch' })
  async rollbackImportBatch(@Param('batchId') batchId: string) {
    await this.databaseImportService.rollbackImport(batchId);
    return {
      success: true,
      message: `Import batch ${batchId} rolled back successfully`,
    };
  }

  /**
   * Get list of all import batches
   */
  @Get('batches')
  @ApiOperation({ summary: 'Get all import batches' })
  async getAllImportBatches() {
    // This would be implemented in the service
    return {
      success: true,
      batches: [],
    };
  }
}
