import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * File System Scanner Service
 *
 * Scans directories for CSV files matching specified patterns.
 * Handles file filtering, metadata collection, and change detection.
 */

export interface FileInfo {
  fileName: string;
  fullPath: string;
  directory: string;
  size: number;
  modifiedAt: Date;
  createdAt: Date;
  extension: string;
  isProcessable: boolean;
  metadata?: {
    lines?: number;
    encoding?: string;
    lastModified?: Date;
  };
}

export interface ScanResult {
  totalFiles: number;
  processableFiles: number;
  skippedFiles: number;
  directories: string[];
  files: FileInfo[];
  errors: Array<{
    directory: string;
    error: string;
  }>;
  scanTimeMs: number;
}

export interface ScanOptions {
  recursive?: boolean;
  includeMetadata?: boolean;
  maxFileAge?: number; // days
  minFileSize?: number; // bytes
  maxFileSize?: number; // bytes
  excludePatterns?: string[];
}

@Injectable()
export class FileSystemScannerService {
  private readonly logger = new Logger(FileSystemScannerService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Scan multiple directories for CSV files
   */
  async scanDirectories(
    directories: string[],
    filePatterns: string[] = ['*.csv'],
    options: ScanOptions = {}
  ): Promise<FileInfo[]> {
    const startTime = Date.now();
    const allFiles: FileInfo[] = [];
    const errors: Array<{ directory: string; error: string }> = [];

    this.logger.log(`Scanning ${directories.length} directories for CSV files...`);

    for (const directory of directories) {
      try {
        // Check if directory exists
        const dirStats = await fs.stat(directory);
        if (!dirStats.isDirectory()) {
          errors.push({
            directory,
            error: 'Path is not a directory'
          });
          continue;
        }

        const files = await this.scanDirectory(directory, filePatterns, options);
        allFiles.push(...files);

        this.logger.debug(`Found ${files.length} files in ${directory}`);

      } catch (error) {
        const errorMessage = error.code === 'ENOENT' ? 'Directory does not exist' : error.message;
        errors.push({ directory, error: errorMessage });
        this.logger.warn(`Failed to scan directory ${directory}: ${errorMessage}`);
      }
    }

    const scanTimeMs = Date.now() - startTime;
    const processableFiles = allFiles.filter(f => f.isProcessable).length;

    const result: ScanResult = {
      totalFiles: allFiles.length,
      processableFiles,
      skippedFiles: allFiles.length - processableFiles,
      directories,
      files: allFiles.filter(f => f.isProcessable), // Return only processable files
      errors,
      scanTimeMs
    };

    this.logger.log(
      `Scan completed in ${scanTimeMs}ms: ${processableFiles}/${allFiles.length} processable files found`
    );

    // Emit scan completed event
    this.eventEmitter.emit('filesystem.scan.completed', result);

    return result.files;
  }

  /**
   * Scan a single directory
   */
  async scanDirectory(
    directory: string,
    filePatterns: string[] = ['*.csv'],
    options: ScanOptions = {}
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const {
      recursive = true,
      includeMetadata = true,
      maxFileAge,
      minFileSize = 1,
      maxFileSize = 100 * 1024 * 1024, // 100MB default max
      excludePatterns = []
    } = options;

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory() && recursive) {
          // Recursively scan subdirectories
          try {
            const subFiles = await this.scanDirectory(fullPath, filePatterns, options);
            files.push(...subFiles);
          } catch (error) {
            this.logger.warn(`Failed to scan subdirectory ${fullPath}: ${error.message}`);
          }
        } else if (entry.isFile()) {
          // Process file
          try {
            const fileInfo = await this.analyzeFile(fullPath, filePatterns, {
              includeMetadata,
              maxFileAge,
              minFileSize,
              maxFileSize,
              excludePatterns
            });

            if (fileInfo) {
              files.push(fileInfo);
            }
          } catch (error) {
            this.logger.warn(`Failed to analyze file ${fullPath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error reading directory ${directory}: ${error.message}`);
      throw error;
    }

    return files;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(
    filePath: string,
    filePatterns: string[],
    options: {
      includeMetadata?: boolean;
      maxFileAge?: number;
      minFileSize?: number;
      maxFileSize?: number;
      excludePatterns?: string[];
    }
  ): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = basename(filePath);
      const extension = extname(fileName).toLowerCase();

      // Check if file matches include patterns
      const matchesPattern = filePatterns.some(pattern =>
        this.matchesPattern(fileName, pattern)
      );

      if (!matchesPattern) {
        return null;
      }

      // Check exclude patterns
      if (options.excludePatterns?.some(pattern => this.matchesPattern(fileName, pattern))) {
        return null;
      }

      // Check file age
      if (options.maxFileAge) {
        const maxAge = Date.now() - (options.maxFileAge * 24 * 60 * 60 * 1000);
        if (stats.mtime.getTime() < maxAge) {
          return null;
        }
      }

      // Check file size limits
      if (stats.size < (options.minFileSize || 1)) {
        return null;
      }

      if (stats.size > (options.maxFileSize || 100 * 1024 * 1024)) {
        return null;
      }

      const fileInfo: FileInfo = {
        fileName,
        fullPath: filePath,
        directory: filePath.replace(fileName, ''),
        size: stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
        extension,
        isProcessable: this.isFileProcessable(filePath, stats)
      };

      // Add metadata if requested
      if (options.includeMetadata && fileInfo.isProcessable) {
        fileInfo.metadata = await this.getFileMetadata(filePath);
      }

      return fileInfo;

    } catch (error) {
      this.logger.warn(`Error analyzing file ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get detailed file metadata
   */
  private async getFileMetadata(filePath: string): Promise<{
    lines?: number;
    encoding?: string;
    lastModified?: Date;
  }> {
    try {
      // Count lines for CSV files
      let lines: number | undefined;
      if (extname(filePath).toLowerCase() === '.csv') {
        lines = await this.countFileLines(filePath);
      }

      // Detect encoding (simplified detection)
      const encoding = await this.detectFileEncoding(filePath);

      const stats = await fs.stat(filePath);

      return {
        lines,
        encoding,
        lastModified: stats.mtime
      };
    } catch (error) {
      this.logger.warn(`Error getting metadata for ${filePath}: ${error.message}`);
      return {};
    }
  }

  /**
   * Count lines in file efficiently
   */
  private async countFileLines(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.split('\n').length;
    } catch (error) {
      this.logger.warn(`Error counting lines in ${filePath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Detect file encoding (simplified)
   */
  private async detectFileEncoding(filePath: string): Promise<string> {
    try {
      // Read first 1KB to detect encoding
      const buffer = await fs.readFile(filePath, { encoding: null });
      const first1KB = buffer.slice(0, 1024);

      // Check for BOM
      if (first1KB[0] === 0xEF && first1KB[1] === 0xBB && first1KB[2] === 0xBF) {
        return 'utf8-bom';
      }

      if (first1KB[0] === 0xFF && first1KB[1] === 0xFE) {
        return 'utf16le';
      }

      if (first1KB[0] === 0xFE && first1KB[1] === 0xFF) {
        return 'utf16be';
      }

      // Simple ASCII/UTF-8 detection
      let isAscii = true;
      for (let i = 0; i < first1KB.length; i++) {
        if (first1KB[i] > 127) {
          isAscii = false;
          break;
        }
      }

      return isAscii ? 'ascii' : 'utf8';

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Check if file is processable
   */
  private isFileProcessable(filePath: string, stats: any): boolean {
    const fileName = basename(filePath);
    const extension = extname(fileName).toLowerCase();

    // Must be CSV file
    if (extension !== '.csv') {
      return false;
    }

    // Must not be empty
    if (stats.size === 0) {
      return false;
    }

    // Must not be a temporary file
    if (fileName.startsWith('.') || fileName.startsWith('~') || fileName.endsWith('.tmp')) {
      return false;
    }

    // Must not be a backup file
    if (fileName.includes('.bak') || fileName.includes('.backup')) {
      return false;
    }

    return true;
  }

  /**
   * Match filename against pattern (supports basic wildcards)
   */
  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(fileName);
  }

  /**
   * Watch directory for changes (simplified implementation)
   */
  async watchDirectory(
    directory: string,
    callback: (event: 'add' | 'change' | 'remove', filePath: string) => void
  ): Promise<() => void> {
    // This is a simplified implementation
    // In a production system, you might use chokidar or similar for robust file watching

    this.logger.log(`Starting to watch directory: ${directory}`);

    let watcher: any = null;

    try {
      watcher = fs.watch(directory, { recursive: true });
      watcher.on('change', (eventType: string, filename: string) => {
        if (filename && filename.endsWith('.csv')) {
          const fullPath = join(directory, filename);

          if (eventType === 'rename') {
            // Could be add or remove, check if file exists
            fs.access(fullPath)
              .then(() => callback('add', fullPath))
              .catch(() => callback('remove', fullPath));
          } else if (eventType === 'change') {
            callback('change', fullPath);
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to watch directory ${directory}: ${error.message}`);
    }

    // Return cleanup function
    return () => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
      this.logger.log(`Stopped watching directory: ${directory}`);
    };
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(directory: string): Promise<{
    exists: boolean;
    totalFiles: number;
    csvFiles: number;
    totalSize: number;
    lastModified: Date;
    error?: string;
  }> {
    try {
      const stats = await fs.stat(directory);

      if (!stats.isDirectory()) {
        return {
          exists: false,
          totalFiles: 0,
          csvFiles: 0,
          totalSize: 0,
          lastModified: new Date(),
          error: 'Path is not a directory'
        };
      }

      const files = await this.scanDirectory(directory, ['*'], { recursive: false, includeMetadata: false });
      const csvFiles = files.filter(f => f.extension.toLowerCase() === '.csv');

      return {
        exists: true,
        totalFiles: files.length,
        csvFiles: csvFiles.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        lastModified: stats.mtime
      };

    } catch (error) {
      return {
        exists: false,
        totalFiles: 0,
        csvFiles: 0,
        totalSize: 0,
        lastModified: new Date(),
        error: error.message
      };
    }
  }
}