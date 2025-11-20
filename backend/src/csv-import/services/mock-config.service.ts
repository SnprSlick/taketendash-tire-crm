/**
 * Mock Config Service
 *
 * Temporary replacement for @nestjs/config ConfigService until the package is installed.
 * Provides default configuration values for CSV import functionality.
 */

export class MockConfigService {
  private config = {
    // CSV Monitor Configuration
    CSV_MONITOR_ENABLED: 'true',
    CSV_MONITOR_SCHEDULE: '0 0 * * * *', // Every hour
    CSV_WATCH_DIRECTORIES: '/app/data/csv-imports',
    CSV_FILE_PATTERNS: '*.csv',
    CSV_AUTO_IMPORT: 'true',
    CSV_MAX_CONCURRENT_IMPORTS: '3',
    CSV_RETRY_FAILED_AFTER: '60',

    // File Archiving Configuration
    ARCHIVE_ENABLED: 'true',
    ARCHIVE_DIRECTORY: '/app/data/archives',
    ARCHIVE_ORGANIZATION: 'batch',
    ARCHIVE_KEEP_ORIGINAL: 'false',
    ARCHIVE_COMPRESS: 'false',
    ARCHIVE_RETENTION_DAYS: '90',
    ARCHIVE_MAX_SIZE: '10737418240', // 10GB in bytes

    // Frontend Configuration
    FRONTEND_URL: 'http://localhost:3000',
  };

  get<T = string>(key: string, defaultValue?: T): T {
    const value = this.config[key] || process.env[key] || defaultValue;

    if (typeof defaultValue === 'boolean') {
      return (value === 'true' || value === true) as unknown as T;
    }

    if (typeof defaultValue === 'number') {
      return (parseInt(value as string) || defaultValue) as unknown as T;
    }

    return value as T;
  }
}