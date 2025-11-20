/**
 * Import Progress Events
 *
 * Defines event payloads and handlers for CSV import progress tracking.
 * Used with NestJS EventEmitter for real-time progress updates.
 */

// Event Payloads

export interface ImportBatchCreatedEvent {
  batchId: string;
  fileName: string;
  totalRecords: number;
  userId?: string;
  timestamp: Date;
}

export interface ImportBatchStartedEvent {
  batchId: string;
  fileName: string;
  totalRecords: number;
  startedAt: Date;
}

export interface ImportProgressEvent {
  batchId: string;
  step: 'parsing' | 'validation' | 'transformation' | 'persistence' | 'archiving';
  progress: {
    currentStep: string;
    processedRows?: number;
    totalRows?: number;
    foundInvoices?: number;
    processedInvoices?: number;
    currentInvoice?: string;
    errors?: number;
    percentage?: number;
    estimatedTimeRemaining?: number;
  };
  timestamp: Date;
}

export interface ImportCompletedEvent {
  batchId: string;
  fileName: string;
  result: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    processingTimeMs: number;
    successRate: number;
    duplicateInvoices: string[];
  };
  timestamp: Date;
}

export interface ImportFailedEvent {
  batchId?: string;
  fileName: string;
  error: string;
  processingTimeMs: number;
  timestamp: Date;
}

export interface ImportErrorRecordedEvent {
  batchId: string;
  rowNumber: number;
  errorType: string;
  errorMessage: string;
  timestamp: Date;
}

export interface ImportErrorsBatchRecordedEvent {
  batchId: string;
  errorCount: number;
  errors: Array<{
    rowNumber: number;
    errorType: string;
    errorMessage: string;
  }>;
  timestamp: Date;
}

export interface ImportBatchRolledBackEvent {
  batchId: string;
  operationsRolledBack: number;
  errors: number;
  reason?: string;
  timestamp: Date;
}

// File Monitor Events

export interface FileScanStartedEvent {
  scanType: 'manual' | 'scheduled';
  directories: string[];
  startTime: Date;
}

export interface FileScanCompletedEvent {
  scanType: 'manual' | 'scheduled';
  filesFound: number;
  filesProcessed: number;
  errors: number;
  results: Array<{
    file: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  timestamp: Date;
}

export interface FileScanFailedEvent {
  scanType: 'manual' | 'scheduled';
  error: string;
  duration: number;
  timestamp: Date;
}

export interface FileMonitorStartedEvent {
  scheduleExpression: string;
  nextRunTime: Date;
  watchDirectories: string[];
  timestamp: Date;
}

export interface FileMonitorStoppedEvent {
  stoppedAt: Date;
}

export interface FileMonitorConfigUpdatedEvent {
  newConfig: any;
  restarted: boolean;
  timestamp: Date;
}

// Archiving Events

export interface FileArchivedEvent {
  operation: {
    sourceFile: string;
    archivedFile: string;
    archiveDate: Date;
    batchId?: string;
    originalSize: number;
    compressedSize?: number;
  };
  metadata?: any;
  timestamp: Date;
}

export interface FileArchiveFailedEvent {
  sourceFile: string;
  batchId?: string;
  error: string;
  timestamp: Date;
}

export interface BatchArchivedEvent {
  batchId: string;
  successfulFiles: number;
  failedFiles: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
  timestamp: Date;
}

export interface ArchiveCleanupCompletedEvent {
  deletedFiles: number;
  freedSpace: number;
  errors: number;
  retentionDays: number;
  timestamp: Date;
}

// System Events

export interface SystemStatusEvent {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface PerformanceMetricEvent {
  metric: string;
  value: number;
  unit: string;
  context?: string;
  timestamp: Date;
}

// Event Names (Constants)
export const ImportEventNames = {
  // Batch Lifecycle
  BATCH_CREATED: 'import.batch.created',
  BATCH_STARTED: 'import.batch.started',
  BATCH_PROGRESS: 'import.batch.progress',
  BATCH_COMPLETED: 'import.batch.completed',
  BATCH_FAILED: 'import.batch.failed',
  BATCH_DELETED: 'import.batch.deleted',
  BATCH_RETRIED: 'import.batch.retried',
  BATCH_ROLLEDBACK: 'import.batch.rolledback',

  // Progress Tracking
  PROGRESS_UPDATED: 'import.progress.updated',

  // Error Management
  ERROR_RECORDED: 'import.error.recorded',
  ERRORS_RECORDED: 'import.errors.recorded',

  // CSV Processing
  CSV_PARSING_STARTED: 'csv.parsing.started',
  CSV_PARSING_PROGRESS: 'csv.parsing.progress',
  CSV_PARSING_COMPLETED: 'csv.parsing.completed',
  CSV_PARSING_ERROR: 'csv.parsing.error',

  CSV_PROCESSING_STARTED: 'csv.processing.started',
  CSV_PROCESSING_PROGRESS: 'csv.processing.progress',
  CSV_PROCESSING_COMPLETED: 'csv.processing.completed',

  CSV_IMPORT_STARTED: 'csv.import.started',
  CSV_IMPORT_PROGRESS: 'csv.import.progress',
  CSV_IMPORT_COMPLETED: 'csv.import.completed',
  CSV_IMPORT_FAILED: 'csv.import.failed',

  // TireMaster Specific
  TIREMASTER_PARSING_PROGRESS: 'tiremaster.parsing.progress',
  TIREMASTER_PARSING_COMPLETED: 'tiremaster.parsing.completed',
  TIREMASTER_PARSING_ERROR: 'tiremaster.parsing.error',

  // File System Monitoring
  FILE_MONITOR_STARTED: 'file.monitor.started',
  FILE_MONITOR_STOPPED: 'file.monitor.stopped',
  FILE_MONITOR_CONFIG_UPDATED: 'file.monitor.config.updated',

  FILE_SCAN_STARTED: 'file.monitor.scan.started',
  FILE_SCAN_COMPLETED: 'file.monitor.scan.completed',
  FILE_SCAN_FAILED: 'file.monitor.scan.failed',

  // File System Events
  FILESYSTEM_SCAN_COMPLETED: 'filesystem.scan.completed',

  // Archiving
  FILE_ARCHIVED: 'file.archived',
  FILE_ARCHIVE_FAILED: 'file.archive.failed',
  BATCH_ARCHIVED: 'batch.archived',
  ARCHIVE_CLEANUP_COMPLETED: 'archive.cleanup.completed',

  // System Health
  SYSTEM_STATUS: 'import.system.status',
  PERFORMANCE_METRIC: 'import.performance.metric',

  // Rollback Events
  ROLLBACK_STARTED: 'import.rollback.started',
  ROLLBACK_COMPLETED: 'import.rollback.completed',
  ROLLBACK_FAILED: 'import.rollback.failed',
} as const;

// Type-safe event name type
export type ImportEventName = typeof ImportEventNames[keyof typeof ImportEventNames];

// Event payload mapping for type safety
export interface ImportEventMap {
  [ImportEventNames.BATCH_CREATED]: ImportBatchCreatedEvent;
  [ImportEventNames.BATCH_STARTED]: ImportBatchStartedEvent;
  [ImportEventNames.BATCH_PROGRESS]: ImportProgressEvent;
  [ImportEventNames.BATCH_COMPLETED]: ImportCompletedEvent;
  [ImportEventNames.BATCH_FAILED]: ImportFailedEvent;
  [ImportEventNames.BATCH_ROLLEDBACK]: ImportBatchRolledBackEvent;

  [ImportEventNames.PROGRESS_UPDATED]: ImportProgressEvent;

  [ImportEventNames.ERROR_RECORDED]: ImportErrorRecordedEvent;
  [ImportEventNames.ERRORS_RECORDED]: ImportErrorsBatchRecordedEvent;

  [ImportEventNames.CSV_IMPORT_PROGRESS]: ImportProgressEvent;
  [ImportEventNames.CSV_IMPORT_COMPLETED]: ImportCompletedEvent;
  [ImportEventNames.CSV_IMPORT_FAILED]: ImportFailedEvent;

  [ImportEventNames.FILE_SCAN_STARTED]: FileScanStartedEvent;
  [ImportEventNames.FILE_SCAN_COMPLETED]: FileScanCompletedEvent;
  [ImportEventNames.FILE_SCAN_FAILED]: FileScanFailedEvent;

  [ImportEventNames.FILE_MONITOR_STARTED]: FileMonitorStartedEvent;
  [ImportEventNames.FILE_MONITOR_STOPPED]: FileMonitorStoppedEvent;
  [ImportEventNames.FILE_MONITOR_CONFIG_UPDATED]: FileMonitorConfigUpdatedEvent;

  [ImportEventNames.FILE_ARCHIVED]: FileArchivedEvent;
  [ImportEventNames.BATCH_ARCHIVED]: BatchArchivedEvent;

  [ImportEventNames.SYSTEM_STATUS]: SystemStatusEvent;
}

// Helper functions for event emission

export class ImportEventFactory {
  /**
   * Create a batch created event
   */
  static createBatchCreated(
    batchId: string,
    fileName: string,
    totalRecords: number,
    userId?: string
  ): ImportBatchCreatedEvent {
    return {
      batchId,
      fileName,
      totalRecords,
      userId,
      timestamp: new Date()
    };
  }

  /**
   * Create a progress update event
   */
  static createProgressUpdate(
    batchId: string,
    step: ImportProgressEvent['step'],
    progress: ImportProgressEvent['progress']
  ): ImportProgressEvent {
    return {
      batchId,
      step,
      progress,
      timestamp: new Date()
    };
  }

  /**
   * Create a completion event
   */
  static createImportCompleted(
    batchId: string,
    fileName: string,
    result: ImportCompletedEvent['result']
  ): ImportCompletedEvent {
    return {
      batchId,
      fileName,
      result,
      timestamp: new Date()
    };
  }

  /**
   * Create a failure event
   */
  static createImportFailed(
    fileName: string,
    error: string,
    processingTimeMs: number,
    batchId?: string
  ): ImportFailedEvent {
    return {
      batchId,
      fileName,
      error,
      processingTimeMs,
      timestamp: new Date()
    };
  }

  /**
   * Create a file scan started event
   */
  static createFileScanStarted(
    scanType: 'manual' | 'scheduled',
    directories: string[]
  ): FileScanStartedEvent {
    return {
      scanType,
      directories,
      startTime: new Date()
    };
  }

  /**
   * Create a system status event
   */
  static createSystemStatus(
    status: 'healthy' | 'warning' | 'error',
    message: string,
    details?: any
  ): SystemStatusEvent {
    return {
      status,
      message,
      details,
      timestamp: new Date()
    };
  }
}