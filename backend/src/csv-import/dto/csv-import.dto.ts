import { ApiProperty, ApiPropertyOptional } from '../utils/mock-swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsDateString,
  ValidateNested,
  IsInt
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ImportStatus, DuplicateHandlingStrategy } from '../../shared/enums/import.enums';

/**
 * Data Transfer Objects for CSV Import API
 *
 * Provides validation and documentation for API endpoints.
 */

export class ImportCsvDto {
  @ApiProperty({
    description: 'Full path to the CSV file on the server',
    example: '/app/data/csv-imports/tiremaster-invoice-2024-01-15.csv'
  })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({
    description: 'Display name for the file (defaults to filename from path)',
    example: 'tiremaster-invoice-2024-01-15.csv'
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'User ID initiating the import',
    example: 'user123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Overwrite existing successful imports for this file',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;

  @ApiPropertyOptional({
    description: 'Only validate format without importing data',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Number of records to process in each batch',
    minimum: 1,
    maximum: 1000,
    default: 100
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({
    description: 'Enable strict mode for validation (fail on any format errors)',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  strictMode?: boolean;

  @ApiPropertyOptional({
    description: 'Strategy for handling duplicate invoice numbers',
    enum: DuplicateHandlingStrategy,
    default: DuplicateHandlingStrategy.SKIP,
    example: DuplicateHandlingStrategy.SKIP
  })
  @IsOptional()
  @IsEnum(DuplicateHandlingStrategy)
  duplicateHandling?: DuplicateHandlingStrategy;
}

export class ValidateFileDto {
  @ApiProperty({
    description: 'Full path to the CSV file to validate',
    example: '/app/data/csv-imports/tiremaster-invoice-2024-01-15.csv'
  })
  @IsString()
  filePath: string;
}

export class ImportProgressDto {
  @ApiProperty({ description: 'Import batch ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Current processing step' })
  @IsString()
  currentStep: string;

  @ApiProperty({ description: 'Number of records processed' })
  @IsNumber()
  processed: number;

  @ApiProperty({ description: 'Total number of records to process' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Completion percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({ description: 'Number of successfully processed records' })
  @IsNumber()
  successfulRecords: number;

  @ApiProperty({ description: 'Number of failed records' })
  @IsNumber()
  failedRecords: number;

  @ApiPropertyOptional({ description: 'Estimated time remaining in seconds' })
  @IsOptional()
  @IsNumber()
  estimatedTimeRemaining?: number;

  @ApiPropertyOptional({ description: 'Currently processing invoice number' })
  @IsOptional()
  @IsString()
  currentInvoice?: string;
}

export class BatchListDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'user123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by import status',
    enum: ImportStatus
  })
  @IsOptional()
  @IsEnum(ImportStatus)
  status?: ImportStatus;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO string)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO string)',
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Field to order results by',
    enum: ['startedAt', 'completedAt', 'fileName'],
    default: 'startedAt'
  })
  @IsOptional()
  @IsString()
  orderBy?: 'startedAt' | 'completedAt' | 'fileName';

  @ApiPropertyOptional({
    description: 'Order direction',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsString()
  orderDirection?: 'asc' | 'desc';
}

export class ScheduleConfigDto {
  @ApiPropertyOptional({
    description: 'Enable scheduled monitoring',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Cron expression for schedule',
    example: '0 0 * * * *'
  })
  @IsOptional()
  @IsString()
  scheduleExpression?: string;

  @ApiPropertyOptional({
    description: 'Directories to monitor for CSV files',
    type: [String],
    example: ['/app/data/csv-imports', '/app/data/manual-uploads']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  watchDirectories?: string[];

  @ApiPropertyOptional({
    description: 'File patterns to match',
    type: [String],
    example: ['*.csv', 'tiremaster-*.csv']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Automatically import found files',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  autoImport?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of concurrent imports',
    minimum: 1,
    maximum: 10,
    default: 3
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxConcurrentImports?: number;

  @ApiPropertyOptional({
    description: 'Retry failed imports after X minutes',
    minimum: 5,
    maximum: 1440,
    default: 60
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  retryFailedAfter?: number;
}

export class FileUploadOptionsDto {
  @ApiPropertyOptional({
    description: 'User ID for the import',
    example: 'user123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Overwrite existing imports',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;

  @ApiPropertyOptional({
    description: 'Validate only without importing',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Batch size for processing',
    minimum: 1,
    maximum: 1000,
    default: 100
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({
    description: 'Enable strict validation mode',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  strictMode?: boolean;
}

export class RollbackRequestDto {
  @ApiPropertyOptional({
    description: 'Reason for rollback',
    example: 'Data import contained errors'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RetryBatchDto {
  @ApiPropertyOptional({
    description: 'User ID for the retry attempt',
    example: 'user123'
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class ManualScanDto {
  @ApiPropertyOptional({
    description: 'Specific directories to scan (overrides configuration)',
    type: [String],
    example: ['/app/data/manual-scan']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  directories?: string[];
}

export class StatisticsFilterDto {
  @ApiPropertyOptional({
    description: 'Start date for statistics range',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for statistics range',
    example: '2024-01-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Group statistics by period',
    enum: ['day', 'week', 'month'],
    default: 'day'
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}

// Response DTOs for documentation

export class ImportResultDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Import batch ID' })
  batchId: string;

  @ApiProperty({ description: 'Result message' })
  message: string;

  @ApiProperty({ description: 'Detailed import results' })
  result: any;
}

export class ValidationResultDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Validation results' })
  validation: {
    isValid: boolean;
    errors: string[];
    estimatedRecords: number;
    fileInfo: {
      size: number;
      totalLines: number;
      sampleInvoices: string[];
    };
  };

  @ApiProperty({ description: 'Result message' })
  message: string;
}

export class BatchDetailsDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Batch information' })
  batch: any;

  @ApiProperty({ description: 'Recent errors (limited)' })
  errors: any[];

  @ApiProperty({ description: 'Error summary statistics' })
  errorSummary: any;

  @ApiProperty({ description: 'Total number of errors' })
  totalErrors: number;
}

export class SchedulerStatusDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Scheduler status information' })
  status: {
    isRunning: boolean;
    nextRunTime: Date | null;
    lastRunTime: Date | null;
    lastRunResult: any;
    currentlyScanning: boolean;
  };

  @ApiProperty({ description: 'Scheduler configuration' })
  config: any;
}