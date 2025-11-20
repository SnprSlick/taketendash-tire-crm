import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, basename, dirname } from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MockConfigService } from './mock-config.service';

/**
 * File Archiver Service
 *
 * Handles archiving of processed CSV files after successful import.
 * Provides organized storage, cleanup, and retrieval of archived files.
 */

export interface ArchiveConfig {
  enabled: boolean;
  archiveDirectory: string;
  organizationStrategy: 'date' | 'batch' | 'source';
  keepOriginal: boolean;
  compressFiles: boolean;
  retentionDays: number;
  maxArchiveSize: number; // bytes
}

export interface ArchiveOperation {
  sourceFile: string;
  archivedFile: string;
  archiveDate: Date;
  batchId?: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
}

export interface ArchiveStats {
  totalFiles: number;
  totalSize: number;
  oldestFile: Date;
  newestFile: Date;
  compressionSavings: number;
  retentionPolicy: {
    enabled: boolean;
    retentionDays: number;
    filesEligibleForCleanup: number;
  };
}

@Injectable()
export class FileArchiverService {
  private readonly logger = new Logger(FileArchiverService.name);
  private config: ArchiveConfig;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: MockConfigService
  ) {
    this.initializeConfig();
  }

  /**
   * Archive a processed CSV file
   */
  async archiveFile(
    sourceFilePath: string,
    batchId?: string,
    metadata?: any
  ): Promise<ArchiveOperation> {
    if (!this.config.enabled) {
      throw new Error('File archiving is disabled');
    }

    this.logger.log(`Archiving file: ${sourceFilePath}`);

    try {
      // Verify source file exists
      const sourceStats = await fs.stat(sourceFilePath);
      const fileName = basename(sourceFilePath);

      // Determine archive location
      const archivePath = await this.determineArchivePath(fileName, batchId);

      // Ensure archive directory exists
      await this.ensureDirectoryExists(dirname(archivePath));

      // Copy or move file to archive
      if (this.config.keepOriginal) {
        await fs.copyFile(sourceFilePath, archivePath);
      } else {
        await fs.rename(sourceFilePath, archivePath);
      }

      // Get archived file stats
      const archivedStats = await fs.stat(archivePath);

      const operation: ArchiveOperation = {
        sourceFile: sourceFilePath,
        archivedFile: archivePath,
        archiveDate: new Date(),
        batchId,
        originalSize: sourceStats.size,
        compressedSize: archivedStats.size,
        compressionRatio: 1.0 // No compression in this implementation
      };

      // Store archive metadata
      await this.storeArchiveMetadata(operation, metadata);

      this.logger.log(`File archived successfully: ${fileName} -> ${archivePath}`);

      // Emit archive event
      this.eventEmitter.emit('file.archived', {
        operation,
        metadata
      });

      return operation;

    } catch (error) {
      this.logger.error(`Failed to archive file ${sourceFilePath}: ${error.message}`, error.stack);

      this.eventEmitter.emit('file.archive.failed', {
        sourceFile: sourceFilePath,
        batchId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Archive multiple files from an import batch
   */
  async archiveBatch(
    files: string[],
    batchId: string,
    batchMetadata?: any
  ): Promise<ArchiveOperation[]> {
    this.logger.log(`Archiving ${files.length} files for batch: ${batchId}`);

    const operations: ArchiveOperation[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        const operation = await this.archiveFile(file, batchId, batchMetadata);
        operations.push(operation);
      } catch (error) {
        errors.push({ file, error: error.message });
        this.logger.warn(`Failed to archive file ${file}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Batch archiving completed with ${errors.length} errors`);
    }

    // Emit batch archive event
    this.eventEmitter.emit('batch.archived', {
      batchId,
      successfulFiles: operations.length,
      failedFiles: errors.length,
      errors
    });

    return operations;
  }

  /**
   * Retrieve archived file
   */
  async retrieveArchivedFile(archiveFilePath: string, destinationPath: string): Promise<void> {
    try {
      // Verify archived file exists
      await fs.access(archiveFilePath);

      // Ensure destination directory exists
      await this.ensureDirectoryExists(dirname(destinationPath));

      // Copy archived file to destination
      await fs.copyFile(archiveFilePath, destinationPath);

      this.logger.log(`Archived file retrieved: ${archiveFilePath} -> ${destinationPath}`);

      this.eventEmitter.emit('file.retrieved', {
        archiveFile: archiveFilePath,
        destination: destinationPath,
        retrievalDate: new Date()
      });

    } catch (error) {
      this.logger.error(`Failed to retrieve archived file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<ArchiveStats> {
    if (!this.config.enabled) {
      throw new Error('File archiving is disabled');
    }

    try {
      const archiveFiles = await this.scanArchiveDirectory();

      let totalSize = 0;
      let oldestFile = new Date();
      let newestFile = new Date(0);
      let filesEligibleForCleanup = 0;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of archiveFiles) {
        const stats = await fs.stat(file.path);
        totalSize += stats.size;

        if (stats.mtime < oldestFile) {
          oldestFile = stats.mtime;
        }

        if (stats.mtime > newestFile) {
          newestFile = stats.mtime;
        }

        if (stats.mtime < cutoffDate) {
          filesEligibleForCleanup++;
        }
      }

      return {
        totalFiles: archiveFiles.length,
        totalSize,
        oldestFile,
        newestFile,
        compressionSavings: 0, // No compression in this implementation
        retentionPolicy: {
          enabled: this.config.retentionDays > 0,
          retentionDays: this.config.retentionDays,
          filesEligibleForCleanup
        }
      };

    } catch (error) {
      this.logger.error(`Failed to get archive stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old archived files based on retention policy
   */
  async cleanupOldArchives(): Promise<{
    deletedFiles: number;
    freedSpace: number;
    errors: string[];
  }> {
    if (!this.config.enabled || this.config.retentionDays <= 0) {
      throw new Error('Archive cleanup is disabled or retention policy not set');
    }

    this.logger.log(`Starting archive cleanup - retention: ${this.config.retentionDays} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const archiveFiles = await this.scanArchiveDirectory();
    const filesToDelete = archiveFiles.filter(file => file.modifiedDate < cutoffDate);

    let deletedFiles = 0;
    let freedSpace = 0;
    const errors: string[] = [];

    for (const file of filesToDelete) {
      try {
        const stats = await fs.stat(file.path);
        await fs.unlink(file.path);

        deletedFiles++;
        freedSpace += stats.size;

        // Also delete metadata file if it exists
        const metadataPath = file.path + '.meta';
        try {
          await fs.unlink(metadataPath);
        } catch {
          // Metadata file may not exist, ignore
        }

        this.logger.debug(`Deleted old archive: ${file.path}`);

      } catch (error) {
        errors.push(`Failed to delete ${file.path}: ${error.message}`);
        this.logger.warn(`Failed to delete old archive ${file.path}: ${error.message}`);
      }
    }

    this.logger.log(
      `Archive cleanup completed: ${deletedFiles} files deleted, ${this.formatBytes(freedSpace)} freed`
    );

    // Emit cleanup event
    this.eventEmitter.emit('archive.cleanup.completed', {
      deletedFiles,
      freedSpace,
      errors: errors.length,
      retentionDays: this.config.retentionDays
    });

    return { deletedFiles, freedSpace, errors };
  }

  /**
   * Find archived files by batch ID
   */
  async findArchivedFilesByBatch(batchId: string): Promise<Array<{
    filePath: string;
    fileName: string;
    archiveDate: Date;
    size: number;
  }>> {
    const batchArchivePath = join(this.config.archiveDirectory, 'batches', batchId);

    try {
      const files = await fs.readdir(batchArchivePath);
      const results = [];

      for (const fileName of files) {
        if (fileName.endsWith('.meta')) continue; // Skip metadata files

        const filePath = join(batchArchivePath, fileName);
        const stats = await fs.stat(filePath);

        results.push({
          filePath,
          fileName,
          archiveDate: stats.mtime,
          size: stats.size
        });
      }

      return results;

    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // No files found for this batch
      }
      throw error;
    }
  }

  /**
   * Determine archive path for a file
   */
  private async determineArchivePath(fileName: string, batchId?: string): Promise<string> {
    const now = new Date();
    let subPath: string;

    switch (this.config.organizationStrategy) {
      case 'date':
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        subPath = join('by-date', `${year}`, `${month}`, `${day}`);
        break;

      case 'batch':
        if (batchId) {
          subPath = join('batches', batchId);
        } else {
          // Fallback to date if no batch ID
          subPath = join('by-date', now.toISOString().split('T')[0]);
        }
        break;

      case 'source':
        // Group by apparent source (TireMaster, etc.)
        const source = this.detectSource(fileName);
        subPath = join('by-source', source);
        break;

      default:
        subPath = 'general';
    }

    return join(this.config.archiveDirectory, subPath, fileName);
  }

  /**
   * Store archive metadata
   */
  private async storeArchiveMetadata(operation: ArchiveOperation, metadata?: any): Promise<void> {
    const metadataPath = operation.archivedFile + '.meta';
    const metadataContent = {
      operation,
      metadata,
      archivedAt: new Date().toISOString(),
      archiverVersion: '1.0.0'
    };

    try {
      await fs.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2));
    } catch (error) {
      this.logger.warn(`Failed to store archive metadata: ${error.message}`);
    }
  }

  /**
   * Scan archive directory for files
   */
  private async scanArchiveDirectory(): Promise<Array<{
    path: string;
    fileName: string;
    modifiedDate: Date;
  }>> {
    const files: Array<{ path: string; fileName: string; modifiedDate: Date }> = [];

    const scanDir = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
            const stats = await fs.stat(fullPath);
            files.push({
              path: fullPath,
              fileName: entry.name,
              modifiedDate: stats.mtime
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to scan directory ${dirPath}: ${error.message}`);
      }
    };

    await scanDir(this.config.archiveDirectory);
    return files;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Detect source from filename
   */
  private detectSource(fileName: string): string {
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('tiremaster') || lowerName.includes('tire-master')) {
      return 'tiremaster';
    }

    if (lowerName.includes('invoice')) {
      return 'invoices';
    }

    return 'unknown';
  }

  /**
   * Format bytes for human readability
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Initialize configuration
   */
  private initializeConfig(): void {
    this.config = {
      enabled: this.configService.get<boolean>('ARCHIVE_ENABLED', true),
      archiveDirectory: this.configService.get<string>('ARCHIVE_DIRECTORY', '/app/data/archives'),
      organizationStrategy: this.configService.get<'date' | 'batch' | 'source'>('ARCHIVE_ORGANIZATION', 'batch'),
      keepOriginal: this.configService.get<boolean>('ARCHIVE_KEEP_ORIGINAL', false),
      compressFiles: this.configService.get<boolean>('ARCHIVE_COMPRESS', false),
      retentionDays: this.configService.get<number>('ARCHIVE_RETENTION_DAYS', 90),
      maxArchiveSize: this.configService.get<number>('ARCHIVE_MAX_SIZE', 10 * 1024 * 1024 * 1024) // 10GB
    };

    this.logger.log(`File archiver configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Get archiver configuration
   */
  getConfiguration(): ArchiveConfig {
    return { ...this.config };
  }

  /**
   * Update archiver configuration
   */
  updateConfiguration(config: Partial<ArchiveConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('File archiver configuration updated');
  }
}