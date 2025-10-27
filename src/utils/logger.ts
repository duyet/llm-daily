/**
 * Logger utility with color-coded output and log levels
 * Respects --quiet and --verbose flags
 */

/**
 * Log level type
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to display */
  level: LogLevel;
  /** Whether to use colors */
  colors: boolean;
}

/**
 * ANSI color codes
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
} as const;

/**
 * Log level priorities
 */
const levelPriority: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? 'info',
      colors: config.colors ?? true,
    };
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Log a success message (special case of info)
   */
  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      const colored = this.config.colors
        ? `${colors.green}✓${colors.reset} ${message}`
        : `✓ ${message}`;
      // eslint-disable-next-line no-console
      console.log(colored, ...args);
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable colors
   */
  setColors(enabled: boolean): void {
    this.config.colors = enabled;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const prefix = this.formatPrefix(level);
    const formatted = `${prefix} ${message}`;

    // Use appropriate console method
    switch (level) {
      case 'error':
        // eslint-disable-next-line no-console
        console.error(formatted, ...args);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formatted, ...args);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(formatted, ...args);
    }
  }

  /**
   * Check if message should be logged based on current level
   */
  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] <= levelPriority[this.config.level];
  }

  /**
   * Format log prefix with color
   */
  private formatPrefix(level: LogLevel): string {
    if (!this.config.colors) {
      return `[${level.toUpperCase()}]`;
    }

    switch (level) {
      case 'error':
        return `${colors.red}✗${colors.reset}`;
      case 'warn':
        return `${colors.yellow}⚠${colors.reset}`;
      case 'info':
        return `${colors.blue}ℹ${colors.reset}`;
      case 'debug':
        return `${colors.gray}●${colors.reset}`;
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Configure global logger from CLI options
 */
export function configureLogger(options: { quiet?: boolean; verbose?: boolean }): void {
  if (options.quiet) {
    logger.setLevel('error');
  } else if (options.verbose) {
    logger.setLevel('debug');
  }
}
