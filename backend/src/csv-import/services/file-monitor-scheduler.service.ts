import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MockConfigService } from './mock-config.service';
import { FileSystemScannerService } from './file-system-scanner.service';
import { CsvImportService } from './csv-import.service';

/**
 * File Monitor Scheduler Service
 *
 * Manages scheduled monitoring of configured directories for new CSV files.
 * Supports hourly scans with configurable intervals and immediate manual triggering.
 */

export interface MonitoringConfig {
  enabled: boolean;
  scheduleExpression: string; // Cron expression
  watchDirectories: string[];
  filePatterns: string[];
  autoImport: boolean;
  maxConcurrentImports: number;
  retryFailedAfter: number; // minutes
}

export interface ScheduleStatus {
  isRunning: boolean;
  nextRunTime: Date | null;
  lastRunTime: Date | null;
  lastRunResult: {
    filesFound: number;
    filesProcessed: number;
    errors: number;
    duration: number;
  } | null;
  currentlyScanning: boolean;
}

@Injectable()
export class FileMonitorSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(FileMonitorSchedulerService.name);
  private readonly JOB_NAME = 'csv-file-monitor';
  private config: MonitoringConfig;
  private isCurrentlyScanning = false;
  private lastRunResult: ScheduleStatus['lastRunResult'] = null;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: MockConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly fileSystemScanner: FileSystemScannerService,
    private readonly csvImportService: CsvImportService
  ) {
    this.initializeConfig();
  }

  async onModuleInit() {
    if (this.config.enabled) {
      this.logger.log('File monitor scheduler is enabled, starting monitoring...');
      await this.startScheduledMonitoring();
    } else {
      this.logger.log('File monitor scheduler is disabled in configuration');
    }
  }

  /**
   * Start scheduled file monitoring
   */
  async startScheduledMonitoring(): Promise<void> {
    try {
      // Remove existing job if it exists
      await this.stopScheduledMonitoring();

      const job = new CronJob(
        this.config.scheduleExpression,
        async () => {
          await this.executeScheduledScan();
        },
        null, // onComplete callback
        false, // start immediately
        'America/New_York' // timezone (adjust based on business location)
      );

      this.schedulerRegistry.addCronJob(this.JOB_NAME, job);
      job.start();

      const nextRun = job.nextDate();
      this.logger.log(
        `Scheduled CSV file monitoring started. Next scan at: ${nextRun.toLocaleString()}`
      );

      this.eventEmitter.emit('file.monitor.started', {
        scheduleExpression: this.config.scheduleExpression,
        nextRunTime: nextRun.toJSDate(),
        watchDirectories: this.config.watchDirectories
      });

    } catch (error) {
      this.logger.error(`Failed to start scheduled monitoring: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Stop scheduled file monitoring
   */
  async stopScheduledMonitoring(): Promise<void> {
    try {
      if (this.schedulerRegistry.doesExist('cron', this.JOB_NAME)) {
        this.schedulerRegistry.deleteCronJob(this.JOB_NAME);
        this.logger.log('Scheduled CSV file monitoring stopped');

        this.eventEmitter.emit('file.monitor.stopped', {
          stoppedAt: new Date()
        });
      }
    } catch (error) {
      this.logger.warn(`Error stopping scheduled monitoring: ${error.message}`);
    }
  }

  /**
   * Execute manual file scan immediately
   */
  async executeManualScan(directories?: string[]): Promise<{
    filesFound: number;
    filesProcessed: number;
    errors: number;
    duration: number;
    results: any[];
  }> {
    const startTime = Date.now();

    this.logger.log('Starting manual file scan...');

    if (this.isCurrentlyScanning) {
      throw new Error('File scan already in progress. Please wait for completion.');
    }

    const scanDirectories = directories || this.config.watchDirectories;
    const result = await this.performFileScan(scanDirectories, 'manual');

    const duration = Date.now() - startTime;

    this.logger.log(
      `Manual scan completed in ${duration}ms: ${result.filesProcessed}/${result.filesFound} files processed`
    );

    return {
      ...result,
      duration
    };
  }

  /**
   * Get current scheduler status
   */
  getScheduleStatus(): ScheduleStatus {
    let nextRunTime: Date | null = null;
    let isRunning = false;

    try {
      if (this.schedulerRegistry.doesExist('cron', this.JOB_NAME)) {
        const job = this.schedulerRegistry.getCronJob(this.JOB_NAME);
        isRunning = (job as any).running || false;
        const nextDate = job.nextDate();
        nextRunTime = nextDate ? nextDate.toJSDate() : null;
      }
    } catch (error) {
      this.logger.warn(`Error getting schedule status: ${error.message}`);
    }

    return {
      isRunning,
      nextRunTime,
      lastRunTime: this.lastRunResult ? new Date(Date.now() - (this.lastRunResult.duration || 0)) : null,
      lastRunResult: this.lastRunResult,
      currentlyScanning: this.isCurrentlyScanning
    };
  }

  /**
   * Update monitoring configuration
   */
  async updateConfiguration(config: Partial<MonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Restart monitoring with new config if it was running
    const wasRunning = this.getScheduleStatus().isRunning;
    if (wasRunning) {
      await this.stopScheduledMonitoring();
      if (this.config.enabled) {
        await this.startScheduledMonitoring();
      }
    }

    this.logger.log('File monitoring configuration updated');

    this.eventEmitter.emit('file.monitor.config.updated', {
      newConfig: this.config,
      restarted: wasRunning && this.config.enabled
    });
  }

  /**
   * Execute scheduled scan (internal method)
   */
  private async executeScheduledScan(): Promise<void> {
    const startTime = Date.now();

    this.logger.log('Executing scheduled file scan...');

    if (this.isCurrentlyScanning) {
      this.logger.warn('Skipping scheduled scan - previous scan still in progress');
      return;
    }

    try {
      const result = await this.performFileScan(this.config.watchDirectories, 'scheduled');
      const duration = Date.now() - startTime;

      this.lastRunResult = {
        filesFound: result.filesFound,
        filesProcessed: result.filesProcessed,
        errors: result.errors,
        duration
      };

      this.logger.log(
        `Scheduled scan completed in ${duration}ms: ${result.filesProcessed}/${result.filesFound} files processed`
      );

    } catch (error) {
      const duration = Date.now() - startTime;

      this.lastRunResult = {
        filesFound: 0,
        filesProcessed: 0,
        errors: 1,
        duration
      };

      this.logger.error(`Scheduled scan failed: ${error.message}`, error.stack);

      this.eventEmitter.emit('file.monitor.scan.failed', {
        error: error.message,
        duration,
        scanType: 'scheduled'
      });
    }
  }

  /**
   * Perform file scan and processing
   */
  private async performFileScan(
    directories: string[],
    scanType: 'manual' | 'scheduled'
  ): Promise<{
    filesFound: number;
    filesProcessed: number;
    errors: number;
    results: any[];
  }> {
    this.isCurrentlyScanning = true;

    try {
      // Emit scan started event
      this.eventEmitter.emit('file.monitor.scan.started', {
        scanType,
        directories,
        startTime: new Date()
      });

      // Scan for CSV files
      const foundFiles = await this.fileSystemScanner.scanDirectories(
        directories,
        this.config.filePatterns
      );

      this.logger.log(`Found ${foundFiles.length} CSV files to process`);

      const results: any[] = [];
      let processedCount = 0;
      let errorCount = 0;

      // Process each file if auto-import is enabled
      if (this.config.autoImport && foundFiles.length > 0) {
        // Limit concurrent imports
        const maxConcurrent = this.config.maxConcurrentImports;

        for (let i = 0; i < foundFiles.length; i += maxConcurrent) {
          const batch = foundFiles.slice(i, i + maxConcurrent);

          const batchPromises = batch.map(async (file) => {
            try {
              const result = await this.csvImportService.importCsv({
                filePath: file.fullPath,
                fileName: file.fileName,
                userId: 'scheduler',
                validateOnly: false
              });

              processedCount++;
              return { file: file.fileName, success: true, result };

            } catch (error) {
              errorCount++;
              this.logger.error(`Failed to import file ${file.fileName}: ${error.message}`);
              return { file: file.fileName, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);

          // Small delay between batches to prevent overwhelming the system
          if (i + maxConcurrent < foundFiles.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Emit scan completed event
      this.eventEmitter.emit('file.monitor.scan.completed', {
        scanType,
        filesFound: foundFiles.length,
        filesProcessed: processedCount,
        errors: errorCount,
        results
      });

      return {
        filesFound: foundFiles.length,
        filesProcessed: processedCount,
        errors: errorCount,
        results
      };

    } finally {
      this.isCurrentlyScanning = false;
    }
  }

  /**
   * Initialize configuration from environment/config
   */
  private initializeConfig(): void {
    this.config = {
      enabled: this.configService.get<boolean>('CSV_MONITOR_ENABLED', true),
      scheduleExpression: this.configService.get<string>('CSV_MONITOR_SCHEDULE', '0 0 * * * *'), // Every hour
      watchDirectories: this.getWatchDirectories(),
      filePatterns: this.configService.get<string>('CSV_FILE_PATTERNS', '*.csv')
        .split(',')
        .map(p => p.trim()),
      autoImport: this.configService.get<boolean>('CSV_AUTO_IMPORT', true),
      maxConcurrentImports: this.configService.get<number>('CSV_MAX_CONCURRENT_IMPORTS', 3),
      retryFailedAfter: this.configService.get<number>('CSV_RETRY_FAILED_AFTER', 60),
    };

    this.logger.log(`File monitoring configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Get watch directories from configuration
   */
  private getWatchDirectories(): string[] {
    const dirString = this.configService.get<string>('CSV_WATCH_DIRECTORIES', '/app/data/csv-imports');
    return dirString.split(',').map(dir => dir.trim()).filter(dir => dir.length > 0);
  }

  /**
   * Get monitoring configuration
   */
  getConfiguration(): MonitoringConfig {
    return { ...this.config };
  }
}