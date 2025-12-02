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
import { InventoryImportService } from '../services/inventory-import.service';
import { EmployeeImportService } from '../services/employee-import.service';
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
    private readonly inventoryImportService: InventoryImportService,
    private readonly employeeImportService: EmployeeImportService,
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
    @Body('options') options?: string,
    @Body('duplicateHandling') duplicateHandling?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    // Validate file size (2GB max)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      throw new BadRequestException('File size cannot exceed 2GB');
    }

    this.logger.log(`=== UPDATED CODE: Processing uploaded file: ${file.originalname} ===`);
    this.logger.log(`File details: path=${file.path}, size=${file.size}, mimetype=${file.mimetype}`);
    this.logger.log(`File buffer available: ${file.buffer ? file.buffer.length + ' bytes' : 'undefined'}`);

    // Handle file path - create temporary file if file.path is undefined
    let filePath = file.path;
    if (!filePath) {
      if (!file.buffer) {
        this.logger.error('File upload failed: Both file path and buffer are missing');
        throw new BadRequestException('File upload failed: Could not access file content');
      }

      const tempDir = path.join(process.cwd(), 'uploads', 'csv');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      filePath = path.join(tempDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`Created temporary file from buffer: ${filePath}`);
    } else {
      // Verify the file exists at the path
      if (!fs.existsSync(filePath)) {
        this.logger.error(`File path provided but file does not exist: ${filePath}`);
        throw new BadRequestException('File upload failed: File not found on server');
      }
    }

    // Parse options
    let importOptions: any = {};
    if (options) {
      try {
        importOptions = JSON.parse(options);
      } catch (e) {
        this.logger.warn('Invalid options JSON provided');
      }
    }

    // Merge direct body parameters
    if (duplicateHandling) {
      importOptions.duplicateHandling = duplicateHandling;
    }

    // Call service
    try {
      const result = await this.csvImportService.importCsv({
        filePath,
        fileName: file.originalname,
        userId: 'system', // TODO: Get from auth
        ...importOptions
      });

      return result;
    } catch (error) {
      this.logger.error(`Import service failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  @Post('inventory')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Upload and import Inventory CSV file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importInventory(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    
    let filePath = file.path;
    if (!filePath) {
      const tempDir = path.join(process.cwd(), 'uploads', 'csv');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      filePath = path.join(tempDir, `inventory-${Date.now()}.csv`);
      fs.writeFileSync(filePath, file.buffer);
    }

    const result = await this.inventoryImportService.importInventory(filePath);
    return { success: true, ...result };
  }

  @Post('brands')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Upload and import Brand Mapping CSV file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importBrands(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    
    let filePath = file.path;
    if (!filePath) {
      const tempDir = path.join(process.cwd(), 'uploads', 'csv');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      filePath = path.join(tempDir, `brands-${Date.now()}.csv`);
      fs.writeFileSync(filePath, file.buffer);
    }

    const result = await this.inventoryImportService.importBrands(filePath);
    return { success: true, ...result };
  }

  @Delete('inventory')
  @ApiOperation({ summary: 'Clear all inventory data' })
  async clearInventory() {
    await this.inventoryImportService.clearInventory();
    return { success: true, message: 'Inventory cleared' };
  }

  @Delete('brands')
  @ApiOperation({ summary: 'Clear all brand data' })
  async clearBrands() {
    await this.inventoryImportService.clearBrands();
    return { success: true, message: 'Brands cleared' };
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

  /**
   * Import employee list CSV
   */
  @Post('employees')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import employee list CSV' })
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
  async importEmployees(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(`Received employee import request: ${file.originalname}`);
    
    // Read file buffer directly since we're using memory storage or need to read it now
    // Note: If using diskStorage, file.buffer might be undefined, use fs.readFileSync(file.path)
    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path) {
      buffer = fs.readFileSync(file.path);
    } else {
      throw new BadRequestException('Could not read file content');
    }

    const result = await this.employeeImportService.importEmployees(buffer);
    
    return {
      message: 'Employee import completed',
      ...result
    };
  }
}