/**
 * Centralized Logging Service
 * Provides structured logging with different levels and optional file output for Electron
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private isElectron: boolean = false;

  constructor() {
    // Detect if running in Electron
    this.isElectron = typeof window !== 'undefined' && window.electron !== undefined;

    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.minLevel = LogLevel.DEBUG;
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    error?: Error,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      stack: error?.stack,
    };
  }

  private log(entry: LogEntry): void {
    // Only log if level is high enough
    if (entry.level < this.minLevel) return;

    // Add to in-memory log buffer
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output with appropriate styling
    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.timestamp}] [${levelName}]${entry.context ? ` [${entry.context}]` : ''}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.data || '', entry.stack || '');
        break;
    }

    // In Electron, also write to file
    if (this.isElectron && entry.level >= LogLevel.WARN) {
      this.writeToFile(entry);
    }
  }

  private writeToFile(entry: LogEntry): void {
    // This will be implemented when we have Electron IPC set up
    // For now, just store in localStorage as fallback
    try {
      const existingLogs = localStorage.getItem('veo-studio-error-logs') || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(entry);

      // Keep only last 100 error logs in localStorage
      if (logs.length > 100) {
        logs.shift();
      }

      localStorage.setItem('veo-studio-error-logs', JSON.stringify(logs));
    } catch (_e) {
      // Silently fail if localStorage is not available
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, context, data));
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, context, data));
  }

  warn(message: string, contextOrData?: string | unknown, data?: unknown): void {
    let context: string | undefined;
    let logData: unknown;
    if (typeof contextOrData === 'string' || contextOrData === undefined) {
      context = contextOrData;
      logData = data;
    } else {
      context = undefined;
      logData = contextOrData;
    }
    this.log(this.createLogEntry(LogLevel.WARN, message, context, logData));
  }

  error(message: string, contextOrError?: string | unknown, error?: unknown): void {
    // Support both (msg, error) and (msg, context, error) signatures
    let context: string | undefined;
    let errorArg: unknown;
    if (typeof contextOrError === 'string' || contextOrError === undefined) {
      context = contextOrError;
      errorArg = error;
    } else {
      context = undefined;
      errorArg = contextOrError;
    }
    const errorObj = errorArg instanceof Error ? errorArg : undefined;
    const data = errorArg instanceof Error ? undefined : errorArg;
    this.log(this.createLogEntry(LogLevel.ERROR, message, context, data, errorObj));
  }

  fatal(message: string, contextOrError?: string | unknown, error?: unknown): void {
    let context: string | undefined;
    let errorArg: unknown;
    if (typeof contextOrError === 'string' || contextOrError === undefined) {
      context = contextOrError;
      errorArg = error;
    } else {
      context = undefined;
      errorArg = contextOrError;
    }
    const errorObj = errorArg instanceof Error ? errorArg : undefined;
    const data = errorArg instanceof Error ? undefined : errorArg;
    this.log(this.createLogEntry(LogLevel.FATAL, message, context, data, errorObj));
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all in-memory logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: string, data?: unknown) =>
    logger.debug(message, context, data),
  info: (message: string, context?: string, data?: unknown) => logger.info(message, context, data),
  warn: (message: string, contextOrData?: string | unknown, data?: unknown) =>
    logger.warn(message, contextOrData, data),
  error: (message: string, contextOrError?: string | unknown, error?: unknown) =>
    logger.error(message, contextOrError, error),
  fatal: (message: string, contextOrError?: string | unknown, error?: unknown) =>
    logger.fatal(message, contextOrError, error),
};
