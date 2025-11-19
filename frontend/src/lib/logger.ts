type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private log(level: LogLevel, module: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console
    const consoleMethod = level === 'debug' ? 'debug' :
                         level === 'info' ? 'info' :
                         level === 'warn' ? 'warn' : 'error';

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]`;

    if (data) {
      console[consoleMethod](prefix, message, data);
    } else {
      console[consoleMethod](prefix, message);
    }
  }

  debug(module: string, message: string, data?: any): void {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: any): void {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, data?: any): void {
    this.log('error', module, message, data);
  }

  getLogs(module?: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log => {
      if (module && log.module !== module) return false;
      if (level && log.level !== level) return false;
      return true;
    });
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create and export a singleton logger instance
export const logger = new Logger();

// Export logger functions for specific modules
export const createModuleLogger = (moduleName: string) => ({
  debug: (message: string, data?: any) => logger.debug(moduleName, message, data),
  info: (message: string, data?: any) => logger.info(moduleName, message, data),
  warn: (message: string, data?: any) => logger.warn(moduleName, message, data),
  error: (message: string, data?: any) => logger.error(moduleName, message, data),
});

export const reminderLogger = createModuleLogger('ServiceReminders');
export const notificationLogger = createModuleLogger('Notifications');
export const apiLogger = createModuleLogger('API');

export { Logger };
export type { LogLevel, LogEntry };