/**
 * Simple colorized logger
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: string, message: string, meta?: any): string {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp()}] ${level} ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(`${colors.cyan}${format('INFO', message, meta)}${colors.reset}`);
  },
  
  warn(message: string, meta?: any) {
    console.warn(`${colors.yellow}${format('WARN', message, meta)}${colors.reset}`);
  },
  
  error(message: string, error?: any) {
    const errorMeta = error?.message ? { error: error.message, stack: error.stack } : error;
    console.error(`${colors.red}${format('ERROR', message, errorMeta)}${colors.reset}`);
  },
  
  debug(message: string, meta?: any) {
    if (process.env.DEBUG === 'true') {
      console.log(`${colors.gray}${format('DEBUG', message, meta)}${colors.reset}`);
    }
  },
  
  success(message: string, meta?: any) {
    console.log(`${colors.green}${format('SUCCESS', message, meta)}${colors.reset}`);
  }
};
