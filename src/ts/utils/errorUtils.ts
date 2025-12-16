/**
 * Blood on the Clocktower Token Generator
 * Error Handling Utilities - Standardized error handling for hooks and components
 */

import { ErrorHandler } from '../errors.js';
import { logger } from './logger.js';

/**
 * Handle errors in React hooks with consistent logging and state updates
 *
 * This utility provides a DRY approach to error handling across custom hooks,
 * ensuring consistent error messages, logging, and state management.
 *
 * @param error - The caught error
 * @param context - Context identifier for logging (e.g., 'Load projects', 'Create token')
 * @param setError - State setter function for error message
 * @param options - Additional options for error handling
 *
 * @example
 * ```typescript
 * const [error, setError] = useState<string | null>(null);
 *
 * try {
 *   await loadProjects();
 * } catch (err) {
 *   handleHookError(err, 'Load projects', setError);
 * }
 * ```
 */
export function handleHookError(
  error: unknown,
  context: string,
  setError: (message: string | null) => void,
  options: ErrorHandlingOptions = {}
): void {
  const { logLevel = 'error', includeStack = false, customMessage, onError } = options;

  // Get user-friendly message
  const userMessage = customMessage ?? ErrorHandler.getUserMessage(error);

  // Update error state
  setError(userMessage);

  // Log error with appropriate level
  const logData =
    includeStack && error instanceof Error && error.stack ? [error.message, error.stack] : [error];

  switch (logLevel) {
    case 'warn':
      logger.warn(context, userMessage, ...logData);
      break;
    case 'error':
      logger.error(context, userMessage, ...logData);
      break;
    case 'debug':
      logger.debug(context, userMessage, ...logData);
      break;
  }

  // Call custom error handler if provided
  if (onError) {
    onError(error, userMessage);
  }
}

/**
 * Options for error handling behavior
 */
export interface ErrorHandlingOptions {
  /** Log level to use (default: 'error') */
  logLevel?: 'error' | 'warn' | 'debug';
  /** Include stack trace in logs (default: false) */
  includeStack?: boolean;
  /** Custom error message override */
  customMessage?: string;
  /** Custom error handler callback */
  onError?: (error: unknown, message: string) => void;
}

/**
 * Clear error state with optional success logging
 *
 * @param context - Context identifier for logging
 * @param setError - State setter function for error message
 * @param successMessage - Optional success message to log
 *
 * @example
 * ```typescript
 * clearHookError('Load projects', setError, 'Projects loaded successfully');
 * ```
 */
export function clearHookError(
  context: string,
  setError: (message: string | null) => void,
  successMessage?: string
): void {
  setError(null);

  if (successMessage) {
    logger.info(context, successMessage);
  }
}

/**
 * Handle async operation with automatic error handling and loading state
 *
 * This utility wraps async operations in try-catch-finally blocks with
 * consistent error handling and loading state management.
 *
 * @param operation - Async operation to execute
 * @param context - Context identifier for logging
 * @param setLoading - Loading state setter
 * @param setError - Error state setter
 * @param options - Additional options
 * @returns Result of the operation or undefined on error
 *
 * @example
 * ```typescript
 * const [isLoading, setIsLoading] = useState(false);
 * const [error, setError] = useState<string | null>(null);
 *
 * const result = await handleAsyncOperation(
 *   () => loadProjects(),
 *   'Load projects',
 *   setIsLoading,
 *   setError,
 *   { successMessage: 'Projects loaded successfully' }
 * );
 * ```
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string,
  setLoading: (loading: boolean) => void,
  setError: (message: string | null) => void,
  options: AsyncOperationOptions = {}
): Promise<T | undefined> {
  const { successMessage, errorOptions, onSuccess, onFinally } = options;

  try {
    setLoading(true);
    clearHookError(context, setError);

    const result = await operation();

    if (successMessage) {
      logger.info(context, successMessage);
    }

    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    handleHookError(error, context, setError, errorOptions);
    return undefined;
  } finally {
    setLoading(false);

    if (onFinally) {
      onFinally();
    }
  }
}

/**
 * Options for async operation handling
 */
export interface AsyncOperationOptions {
  /** Success message to log on completion */
  successMessage?: string;
  /** Error handling options */
  errorOptions?: ErrorHandlingOptions;
  /** Callback on successful completion */
  onSuccess?: (result: unknown) => void;
  /** Callback in finally block */
  onFinally?: () => void;
}

/**
 * Create a retry wrapper for operations that may fail temporarily
 *
 * @param operation - Operation to retry
 * @param context - Context identifier
 * @param options - Retry options
 * @returns Result of successful operation
 *
 * @example
 * ```typescript
 * const data = await retryOperation(
 *   () => fetchDataFromAPI(),
 *   'Fetch API data',
 *   { maxAttempts: 3, delayMs: 1000 }
 * );
 * ```
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = () => true, // By default, retry all errors
    onRetry,
  } = options;

  let lastError: unknown;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(context, `Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      const canRetry = shouldRetry(error);

      if (!canRetry) {
        logger.warn(context, `Error is not retryable, failing immediately`, error);
        throw error;
      }

      if (attempt < maxAttempts) {
        logger.warn(context, `Attempt ${attempt} failed, retrying in ${currentDelay}ms`, error);

        if (onRetry) {
          onRetry(attempt, maxAttempts, error);
        }

        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoffMultiplier;
      }
    }
  }

  // All attempts failed
  logger.error(context, `All ${maxAttempts} attempts failed`, lastError);
  throw lastError;
}

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay between retries in ms (default: 1000) */
  delayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Predicate to determine if error should be retried (default: always retry) */
  shouldRetry?: (error: unknown) => boolean;
  /** Callback on retry */
  onRetry?: (attempt: number, maxAttempts: number, error: unknown) => void;
}

/**
 * Guard against undefined values with proper error handling
 *
 * @param value - Value to check
 * @param context - Context for error message
 * @param fieldName - Name of the field being checked
 * @returns Non-null value
 * @throws Error if value is null or undefined
 *
 * @example
 * ```typescript
 * const project = guardAgainstUndefined(
 *   currentProject,
 *   'Save project',
 *   'currentProject'
 * );
 * ```
 */
export function guardAgainstUndefined<T>(
  value: T | null | undefined,
  context: string,
  fieldName: string
): T {
  if (value === null || value === undefined) {
    const error = new Error(`${fieldName} is required`);
    logger.error(context, `Validation failed: ${fieldName} is missing`);
    throw error;
  }
  return value;
}

/**
 * Validate required fields in an object
 *
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @param context - Context for error message
 * @throws Error if any required field is missing
 *
 * @example
 * ```typescript
 * validateRequiredFields(
 *   projectData,
 *   ['name', 'description'],
 *   'Create project'
 * );
 * ```
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[],
  context: string
): void {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (obj[field] === null || obj[field] === undefined || obj[field] === '') {
      missingFields.push(String(field));
    }
  }

  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
    logger.error(context, `Validation failed`, { missingFields });
    throw error;
  }
}

export default {
  handleHookError,
  clearHookError,
  handleAsyncOperation,
  retryOperation,
  guardAgainstUndefined,
  validateRequiredFields,
};
