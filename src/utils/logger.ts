/**
 * Logger utility met kleuren en timestamps
 * Simpel maar effectief voor development en production
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const colors = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m',
};

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const color = colors[level];
    const reset = colors.RESET;
    
    let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;
    
    if (data !== undefined) {
      logMessage += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    return logMessage;
  }

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, data));
    }
  }

  info(message: string, data?: unknown): void {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  error(message: string, error?: Error | unknown): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
  }
}

export const logger = new Logger();
export default logger;
