import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
// import { ConfigModule } from '@nestjs/config'; // Temporarily disabled
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Entities
import { ImportBatchEntity } from './entities/import-batch.entity';
import { ImportErrorEntity } from './entities/import-error.entity';

// Services
import { ImportBatchService } from './services/import-batch.service';
import { CsvImportService } from './services/csv-import.service';
import { RollbackService } from './services/rollback.service';
import { FileMonitorSchedulerService } from './services/file-monitor-scheduler.service';
import { FileSystemScannerService } from './services/file-system-scanner.service';
import { FileArchiverService } from './services/file-archiver.service';
import { MockConfigService } from './services/mock-config.service';
import { DatabaseImportService } from './services/database-import.service';

// Controllers
import { CsvImportController } from './controllers/csv-import.controller';
import { CsvDatabaseImportController } from './controllers/csv-database-import.controller';

// Gateways
import { ImportProgressGateway } from './gateways/import-progress.gateway';

// Processors
import { CsvFileProcessor } from './processors/csv-file-processor';
import { TireMasterCsvParser } from './processors/tiremaster-csv-parser';
import { CsvFormatValidator } from './processors/csv-format-validator';

// Mappers and Transformers
import { TireMasterColumnMapper } from './mappers/tiremaster-column-mapper';
import { TireMasterDataTransformer } from './mappers/tiremaster-data-transformer';

/**
 * CSV Import Module
 *
 * Provides complete CSV import functionality for TireMaster invoice data.
 * Includes parsing, validation, transformation, batch tracking, error handling,
 * and rollback capabilities.
 */

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
    // ConfigModule, // Temporarily disabled
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/csv',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        }
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
        files: 1
      }
    })
  ],
  controllers: [
    CsvImportController,
    // CsvDatabaseImportController // Temporarily disabled due to ImportProgressGateway dependency
  ],
  providers: [
    // Gateways
    // ImportProgressGateway, // Temporarily disabled due to missing WebSocket driver

    // Entity Services
    ImportBatchEntity,
    ImportErrorEntity,

    // Business Services
    ImportBatchService,
    CsvImportService,
    RollbackService,
    DatabaseImportService,

    // Monitoring Services
    FileMonitorSchedulerService,
    FileSystemScannerService,
    FileArchiverService,

    // Processing Services
    CsvFileProcessor,
    TireMasterCsvParser,
    CsvFormatValidator,

    // Mappers and Transformers (these are static classes, but included for DI consistency)
    {
      provide: 'TireMasterColumnMapper',
      useValue: TireMasterColumnMapper
    },
    {
      provide: 'TireMasterDataTransformer',
      useValue: TireMasterDataTransformer
    },

    // Configuration Service (temporary mock)
    MockConfigService
  ],
  exports: [
    // Export main orchestration service for use by other modules
    CsvImportService,
    ImportBatchService,
    RollbackService,
    DatabaseImportService,

    // Export monitoring services
    FileMonitorSchedulerService,
    FileSystemScannerService,
    FileArchiverService,

    // Export processors for direct use if needed
    CsvFileProcessor,
    TireMasterCsvParser,

    // Export entities for direct database operations if needed
    ImportBatchEntity,
    ImportErrorEntity
  ]
})
export class CsvImportModule {
  constructor() {
    // Log module initialization
    console.log('CSV Import Module initialized');
  }
}