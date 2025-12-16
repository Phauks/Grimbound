/**
 * Blood on the Clocktower Token Generator
 * Logger Utility - Environment-aware structured logging
 *
 * Provides consistent logging across the application with automatic
 * production environment filtering and structured output.
 */

/**
 * Log levels ordered by severity
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
    /** Minimum level to log (default: DEBUG in dev, WARN in prod) */
    level?: LogLevel;
    /** Enable timestamps in log output */
    timestamps?: boolean;
    /** Custom prefix for all logs */
    prefix?: string;
}

/**
 * Structured logger with environment awareness
 *
 * Automatically adjusts logging level based on environment:
 * - Development: DEBUG and above
 * - Production: WARN and above (errors and warnings only)
 *
 * @example
 * ```typescript
 * import { logger } from './utils/logger';
 *
 * logger.debug('TokenGenerator', 'Starting generation', { count: 5 });
 * logger.info('DataSync', 'Sync completed successfully');
 * logger.warn('ImageCache', 'Cache nearly full', { usage: '95%' });
 * logger.error('API', 'Request failed', error);
 * ```
 */
export class Logger {
    private level: LogLevel;
    private timestamps: boolean;
    private prefix: string;

    constructor(config: LoggerConfig = {}) {
        // Default to DEBUG in development, WARN in production
        // Use import.meta.env for Vite environments (browser-compatible)
        const isDevelopment = import.meta.env?.DEV ?? true;
        this.level = config.level ?? (isDevelopment ? LogLevel.DEBUG : LogLevel.WARN);
        this.timestamps = config.timestamps ?? false;
        this.prefix = config.prefix ?? '';
    }

    /**
     * Set the minimum log level
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Get current log level
     */
    getLevel(): LogLevel {
        return this.level;
    }

    /**
     * Enable or disable timestamps
     */
    setTimestamps(enabled: boolean): void {
        this.timestamps = enabled;
    }

    /**
     * Format context string with optional timestamp
     */
    private formatContext(context: string): string {
        const timestamp = this.timestamps ? `[${new Date().toISOString()}] ` : '';
        const prefix = this.prefix ? `${this.prefix}:` : '';
        return `${timestamp}${prefix}[${context}]`;
    }

    /**
     * Log debug message (verbose information for development)
     * Only logged in development environment by default
     *
     * @param context - Context identifier (e.g., component or module name)
     * @param message - Log message
     * @param data - Optional additional data to log
     */
    debug(context: string, message: string, ...data: unknown[]): void {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.formatContext(context), message, ...data);
        }
    }

    /**
     * Log informational message
     *
     * @param context - Context identifier
     * @param message - Log message
     * @param data - Optional additional data to log
     */
    info(context: string, message: string, ...data: unknown[]): void {
        if (this.level <= LogLevel.INFO) {
            console.log(this.formatContext(context), message, ...data);
        }
    }

    /**
     * Log warning message
     * Warnings indicate potential issues that don't prevent operation
     *
     * @param context - Context identifier
     * @param message - Warning message
     * @param data - Optional additional data to log
     */
    warn(context: string, message: string, ...data: unknown[]): void {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.formatContext(context), message, ...data);
        }
    }

    /**
     * Log error message
     * Errors indicate failures that affect functionality
     *
     * @param context - Context identifier
     * @param message - Error message
     * @param error - Error object or additional data
     */
    error(context: string, message: string, ...error: unknown[]): void {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatContext(context), message, ...error);
        }
    }

    /**
     * Create a child logger with a specific context prefix
     * Useful for module-specific loggers
     *
     * @param context - Context name for the child logger
     * @returns New logger instance with context prefix
     *
     * @example
     * ```typescript
     * const syncLogger = logger.child('DataSync');
     * syncLogger.info('Update check', 'Checking for updates');
     * // Output: [DataSync] Update check Checking for updates
     * ```
     */
    child(context: string): ContextLogger {
        return new ContextLogger(this, context);
    }

    /**
     * Measure and log execution time of a function
     *
     * @param context - Context identifier
     * @param label - Operation label
     * @param fn - Function to measure
     * @returns Result of the function
     *
     * @example
     * ```typescript
     * const tokens = await logger.time('TokenGenerator', 'Generate all tokens', async () => {
     *   return await generateAllTokens(characters);
     * });
     * // Output: [TokenGenerator] Generate all tokens: 1234ms
     * ```
     */
    async time<T>(context: string, label: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = Math.round(performance.now() - start);
            this.debug(context, `${label}: ${duration}ms`);
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - start);
            this.error(context, `${label} failed after ${duration}ms`, error);
            throw error;
        }
    }

    /**
     * Group related logs together (collapsed by default in browser console)
     *
     * @param context - Context identifier
     * @param label - Group label
     * @param fn - Function containing grouped logs
     */
    group(context: string, label: string, fn: () => void): void {
        if (this.level <= LogLevel.DEBUG) {
            console.groupCollapsed(this.formatContext(context), label);
            try {
                fn();
            } finally {
                console.groupEnd();
            }
        }
    }
}

/**
 * Context-specific logger that automatically prefixes all logs with a context name
 */
export class ContextLogger {
    constructor(
        private logger: Logger,
        private context: string
    ) {}

    debug(message: string, ...data: unknown[]): void {
        this.logger.debug(this.context, message, ...data);
    }

    info(message: string, ...data: unknown[]): void {
        this.logger.info(this.context, message, ...data);
    }

    warn(message: string, ...data: unknown[]): void {
        this.logger.warn(this.context, message, ...data);
    }

    error(message: string, ...error: unknown[]): void {
        this.logger.error(this.context, message, ...error);
    }

    async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
        return this.logger.time(this.context, label, fn);
    }

    group(label: string, fn: () => void): void {
        this.logger.group(this.context, label, fn);
    }
}

/**
 * Global logger instance
 * Use this throughout the application for consistent logging
 */
export const logger = new Logger();

/**
 * Convenience method to enable debug logging at runtime
 * Useful for troubleshooting in production
 *
 * @example
 * ```typescript
 * // In browser console or code:
 * enableDebugLogging();
 * ```
 */
export function enableDebugLogging(): void {
    logger.setLevel(LogLevel.DEBUG);
    logger.info('Logger', 'Debug logging enabled');
}

/**
 * Convenience method to enable timestamps
 */
export function enableTimestamps(): void {
    logger.setTimestamps(true);
    logger.info('Logger', 'Timestamps enabled');
}

export default logger;
