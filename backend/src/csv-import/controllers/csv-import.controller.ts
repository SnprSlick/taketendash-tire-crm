import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '../utils/mock-swagger';
import { CsvImportService } from '../services/csv-import.service';
import { ImportBatchService } from '../services/import-batch.service';
import { FileMonitorSchedulerService } from '../services/file-monitor-scheduler.service';
import { RollbackService } from '../services/rollback.service';
import {
  ImportCsvDto,
  ValidateFileDto,
  ImportProgressDto,
  BatchListDto,
  ScheduleConfigDto
} from '../dto/csv-import.dto';

/**
 * CSV Import Controller
 *
 * REST API endpoints for manual CSV import operations, batch management,
 * scheduler control, and file validation.
 */

@ApiTags('CSV Import')
@Controller('csv-import')
export class CsvImportController {
  private readonly logger = new Logger(CsvImportController.name);

  constructor(
    private readonly csvImportService: CsvImportService,
    private readonly importBatchService: ImportBatchService,
    private readonly fileMonitorScheduler: FileMonitorSchedulerService,
    private readonly rollbackService: RollbackService
  ) {}

  /**
   * Import CSV file via file upload
   */
  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Upload and import CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file to import'
        },
        options: {
          type: 'string',
          description: 'JSON string of import options'
        }
      }
    }
  })
  @ApiResponse({ status: 202, description: 'Import started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndImport(
    @UploadedFile() file: any,
    @Body('options') options?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException('File size cannot exceed 100MB');
    }

    this.logger.log(`=== UPDATED CODE: Processing uploaded file: ${file.originalname} ===`);
    this.logger.log(`File buffer available: ${file.buffer ? file.buffer.length + ' bytes' : 'undefined'}`);

    // Handle file path - create temporary file if file.path is undefined
    let filePath: string;
    let shouldCleanup = false;

    try {
      const parsedOptions = options ? JSON.parse(options) : {};

      if (file.path) {
        // Use the existing file path from disk storage
        filePath = file.path;
      } else {
        // Create temporary file from buffer
        const tempDir = './uploads/csv';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const tempFileName = `file-${uniqueSuffix}${ext}`;
        filePath = path.join(tempDir, tempFileName);

        // Ensure the directory exists
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write buffer to temporary file
        fs.writeFileSync(filePath, file.buffer);
        shouldCleanup = true;

        this.logger.log(`Created temporary file: ${filePath}`);
      }

      const importRequest = {
        filePath: filePath,
        fileName: file.originalname,
        userId: 'upload-user', // TODO: Get from authentication
        deleteFileAfterProcessing: shouldCleanup,
        ...parsedOptions
      };

      const result = await this.csvImportService.importCsvAsync(importRequest);

      // File cleanup is handled by the service after processing completes
      shouldCleanup = false;

      return {
        success: true,
        batchId: result.batchId,
        message: result.message,
        isHistorical: result.isHistorical || false,
        originalProcessingDate: undefined,
        result: {
          batchId: result.batchId,
          success: true,
          totalRecords: 0,
          successfulRecords: 0,
          failedRecords: 0,
          processingTimeMs: 0,
          successRate: 0,
          validationResult: { isValid: true, formatErrors: [], estimatedRecords: 0 },
          duplicateInvoices: [],
          skippedDuplicates: 0,
          updatedDuplicates: 0,
          renamedDuplicates: 0,
          mergedDuplicates: 0,
          failedDuplicates: 0
        }
      };

    } catch (error) {
      // Cleanup temporary file on error
      if (filePath && shouldCleanup && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.log(`Cleaned up temporary file after error: ${filePath}`);
        } catch (cleanupError) {
          this.logger.warn(`Failed to cleanup temporary file after error: ${cleanupError.message}`);
        }
      }

      this.logger.error(`Upload import failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Import CSV file from server path
   */
  @Post('import')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Import CSV file from server path' })
  @ApiResponse({ status: 202, description: 'Import started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file path or parameters' })
  async importFile(@Body() importDto: ImportCsvDto) {
    this.logger.log(`Starting import for file: ${importDto.filePath}`);

    try {
      const result = await this.csvImportService.importCsv({
        filePath: importDto.filePath,
        fileName: importDto.fileName || importDto.filePath.split('/').pop() || 'unknown.csv',
        userId: importDto.userId,
        overwriteExisting: importDto.overwriteExisting,
        validateOnly: importDto.validateOnly,
        batchSize: importDto.batchSize,
        strictMode: importDto.strictMode,
        duplicateHandling: importDto.duplicateHandling
      });

      return {
        success: true,
        batchId: result.batchId,
        message: result.success ? 'Import completed successfully' : 'Import completed with errors',
        result
      };

    } catch (error) {
      this.logger.error(`File import failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Validate CSV file format without importing
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate CSV file format without importing' })
  @ApiResponse({ status: 200, description: 'File validation completed' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async validateFile(@Body() validateDto: ValidateFileDto) {
    try {
      const result = await this.csvImportService.validateFileFormat(validateDto.filePath);

      return {
        success: true,
        validation: result,
        message: result.isValid ? 'File format is valid' : 'File format validation failed'
      };

    } catch (error) {
      this.logger.error(`File validation failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get import progress for a batch
   */
  @Get('progress/:batchId')
  @ApiOperation({ summary: 'Get import progress for a batch' })
  @ApiResponse({ status: 200, description: 'Progress information retrieved' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getImportProgress(@Param('batchId') batchId: string) {
    const progress = await this.csvImportService.getImportProgress(batchId);

    if (!progress) {
      throw new NotFoundException('No active import found for this batch');
    }

    return {
      success: true,
      progress
    };
  }

  /**
   * List import batches with filtering
   */
  @Get('batches')
  @ApiOperation({ summary: 'List import batches with filtering' })
  @ApiResponse({ status: 200, description: 'Batch list retrieved' })
  async listBatches(@Query() query: BatchListDto) {
    const filter = {
      userId: query.userId,
      status: query.status ? [query.status] : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined
    };

    const options = {
      page: query.page || 1,
      limit: query.limit || 20,
      orderBy: query.orderBy || 'startedAt',
      orderDirection: query.orderDirection || 'desc'
    };

    const result = await this.importBatchService.listBatches(filter, options);

    return {
      success: true,
      batches: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit)
      }
    };
  }

  /**
   * Get batch details
   */
  @Get('batches/:batchId')
  @ApiOperation({ summary: 'Get batch details' })
  @ApiResponse({ status: 200, description: 'Batch details retrieved' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBatchDetails(@Param('batchId') batchId: string) {
    const batch = await this.importBatchService.getBatch(batchId);
    const errors = await this.importBatchService.getBatchErrors(batchId, { limit: 100 });
    const errorSummary = await this.importBatchService.getBatchErrorSummary(batchId);

    return {
      success: true,
      batch,
      errors: errors.slice(0, 20), // Limit errors in response
      errorSummary,
      totalErrors: errors.length
    };
  }

  /**
   * Get batch errors with pagination
   */
  @Get('batches/:batchId/errors')
  @ApiOperation({ summary: 'Get batch errors with pagination' })
  @ApiResponse({ status: 200, description: 'Batch errors retrieved' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBatchErrors(
    @Param('batchId') batchId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('errorType') errorType?: string
  ) {
    const errors = await this.importBatchService.getBatchErrors(batchId, {
      page,
      limit,
      errorType: errorType as any
    });

    return {
      success: true,
      errors,
      pagination: {
        page,
        limit
      }
    };
  }

  /**
   * Export batch errors to CSV
   */
  @Get('batches/:batchId/errors/export')
  @ApiOperation({ summary: 'Export batch errors to CSV' })
  @ApiResponse({ status: 200, description: 'Error CSV generated' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async exportBatchErrors(@Param('batchId') batchId: string) {
    const csvContent = await this.importBatchService.exportBatchErrors(batchId);

    return {
      success: true,
      filename: `batch-${batchId}-errors.csv`,
      content: csvContent,
      mimeType: 'text/csv'
    };
  }

  /**
   * Delete an import batch
   */
  @Delete('batches/:batchId')
  @ApiOperation({ summary: 'Delete import batch and all its data' })
  @ApiResponse({ status: 200, description: 'Batch deleted successfully' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async deleteBatch(@Param('batchId') batchId: string) {
    await this.importBatchService.deleteBatch(batchId);

    return {
      success: true,
      message: 'Batch deleted successfully'
    };
  }

  /**
   * Rollback an import batch
   */
  @Post('batches/:batchId/rollback')
  @ApiOperation({ summary: 'Rollback import batch data' })
  @ApiResponse({ status: 200, description: 'Rollback completed successfully' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  @ApiResponse({ status: 400, description: 'Rollback not possible' })
  async rollbackBatch(
    @Param('batchId') batchId: string,
    @Body('reason') reason?: string
  ) {
    // Check if rollback is possible
    const rollbackCheck = await this.rollbackService.canRollback(batchId);

    if (!rollbackCheck.canRollback) {
      throw new BadRequestException(rollbackCheck.reason || 'Rollback not possible');
    }

    const result = await this.rollbackService.rollbackImportBatch(batchId, reason);

    return {
      success: true,
      rollback: result,
      message: `Rollback completed: ${result.operationsRolledBack} operations reversed`
    };
  }

  /**
   * Get scheduler status and configuration
   */
  @Get('scheduler/status')
  @ApiOperation({ summary: 'Get file monitor scheduler status' })
  @ApiResponse({ status: 200, description: 'Scheduler status retrieved' })
  async getSchedulerStatus() {
    const status = this.fileMonitorScheduler.getScheduleStatus();
    const config = this.fileMonitorScheduler.getConfiguration();

    return {
      success: true,
      status,
      config
    };
  }

  /**
   * Start file monitor scheduler
   */
  @Post('scheduler/start')
  @ApiOperation({ summary: 'Start file monitor scheduler' })
  @ApiResponse({ status: 200, description: 'Scheduler started successfully' })
  async startScheduler() {
    await this.fileMonitorScheduler.startScheduledMonitoring();

    return {
      success: true,
      message: 'File monitor scheduler started'
    };
  }

  /**
   * Stop file monitor scheduler
   */
  @Post('scheduler/stop')
  @ApiOperation({ summary: 'Stop file monitor scheduler' })
  @ApiResponse({ status: 200, description: 'Scheduler stopped successfully' })
  async stopScheduler() {
    await this.fileMonitorScheduler.stopScheduledMonitoring();

    return {
      success: true,
      message: 'File monitor scheduler stopped'
    };
  }

  /**
   * Execute manual file scan
   */
  @Post('scheduler/scan')
  @ApiOperation({ summary: 'Execute manual file scan' })
  @ApiResponse({ status: 200, description: 'Manual scan completed' })
  async executeManualScan(@Body('directories') directories?: string[]) {
    const result = await this.fileMonitorScheduler.executeManualScan(directories);

    return {
      success: true,
      scan: result,
      message: `Manual scan completed: ${result.filesProcessed}/${result.filesFound} files processed`
    };
  }

  /**
   * Update scheduler configuration
   */
  @Post('scheduler/config')
  @ApiOperation({ summary: 'Update scheduler configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateSchedulerConfig(@Body() configDto: ScheduleConfigDto) {
    await this.fileMonitorScheduler.updateConfiguration(configDto);

    return {
      success: true,
      message: 'Scheduler configuration updated'
    };
  }

  /**
   * Get import statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get import statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getImportStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const filter = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    const stats = await this.importBatchService.getBatchStatistics(filter as any);

    return {
      success: true,
      statistics: stats
    };
  }

  /**
   * Retry a failed batch
   */
  @Post('batches/:batchId/retry')
  @ApiOperation({ summary: 'Retry a failed import batch' })
  @ApiResponse({ status: 200, description: 'Retry batch created' })
  @ApiResponse({ status: 400, description: 'Cannot retry this batch' })
  async retryBatch(
    @Param('batchId') batchId: string,
    @Body('userId') userId?: string
  ) {
    const retryBatch = await this.importBatchService.retryBatch(batchId, userId);

    return {
      success: true,
      retryBatch,
      message: 'Retry batch created successfully'
    };
  }

  /**
   * Clear all database data
   */
  @Delete('database')
  @ApiOperation({ summary: 'Clear all database data' })
  @ApiResponse({ status: 200, description: 'Database cleared successfully' })
  @ApiResponse({ status: 500, description: 'Failed to clear database' })
  async clearDatabase() {
    await this.csvImportService.clearDatabase();
    return {
      success: true,
      message: 'Database cleared successfully'
    };
  }
}