/**
 * Simple logging utility for the Besu SDK
 * 
 * Provides a lightweight logging interface using console methods with
 * consistent prefixes. This approach avoids external dependencies while
 * maintaining clear log levels and optional debug output.
 */

/**
 * Debug mode flag - controls whether debug messages are displayed
 * Can be set via NODE_ENV or BESU_SDK_DEBUG environment variables
 */
const DEBUG = process.env.NODE_ENV === 'development' || 
               process.env.BESU_SDK_DEBUG === 'true';

/**
 * ANSI color codes for terminal output
 * Enhances log readability by color-coding different log levels
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Format timestamp for log entries
 * Returns ISO-like format for consistency and sortability
 */
function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, -1);
}

/**
 * Logger interface providing structured logging with levels
 * 
 * Each method prefixes output with timestamp and level indicator,
 * making logs easy to parse and filter in production environments.
 */
export const logger = {
  /**
   * Log informational messages
   * Used for normal operational events and status updates
   */
  info: (message: string, ...args: any[]) => {
    console.log(
      `${colors.blue}[INFO]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`,
      ...args
    );
  },

  /**
   * Log success messages
   * Used to highlight successful completion of operations
   */
  success: (message: string, ...args: any[]) => {
    console.log(
      `${colors.green}[SUCCESS]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`,
      ...args
    );
  },

  /**
   * Log warning messages
   * Used for recoverable issues or important notices
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(
      `${colors.yellow}[WARN]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`,
      ...args
    );
  },

  /**
   * Log error messages
   * Used for failures and exceptional conditions
   */
  error: (message: string, error?: Error | any, ...args: any[]) => {
    console.error(
      `${colors.red}[ERROR]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`,
      ...args
    );
    
    // If an error object is provided, log its details
    if (error) {
      if (error instanceof Error) {
        console.error(`${colors.red}[ERROR]${colors.reset} Stack trace:`, error.stack);
      } else {
        console.error(`${colors.red}[ERROR]${colors.reset} Error details:`, error);
      }
    }
  },

  /**
   * Log debug messages (only in development/debug mode)
   * Used for detailed diagnostic information during development
   */
  debug: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.log(
        `${colors.cyan}[DEBUG]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`,
        ...args
      );
    }
  },

  /**
   * Log a section divider for better visual organization
   * Useful for separating major operations in logs
   */
  divider: (title?: string) => {
    const line = '─'.repeat(60);
    if (title) {
      console.log(`\n${colors.bright}━━━ ${title} ━━━${colors.reset}`);
    } else {
      console.log(`${colors.dim}${line}${colors.reset}`);
    }
  },

  /**
   * Create a child logger with a prefix
   * Useful for component-specific logging contexts
   */
  child: (prefix: string) => ({
    info: (message: string, ...args: any[]) => 
      logger.info(`[${prefix}] ${message}`, ...args),
    success: (message: string, ...args: any[]) => 
      logger.success(`[${prefix}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => 
      logger.warn(`[${prefix}] ${message}`, ...args),
    error: (message: string, error?: Error | any, ...args: any[]) => 
      logger.error(`[${prefix}] ${message}`, error, ...args),
    debug: (message: string, ...args: any[]) => 
      logger.debug(`[${prefix}] ${message}`, ...args),
    divider: (title?: string) => 
      logger.divider(title ? `[${prefix}] ${title}` : undefined),
  }),

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled: () => DEBUG
};

/**
 * Export a type for the logger to enable proper typing in consumers
 */
export type Logger = typeof logger;

/**
 * Export a type for child loggers
 */
export type ChildLogger = ReturnType<typeof logger.child>;