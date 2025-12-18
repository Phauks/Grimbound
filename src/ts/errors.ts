/**
 * Blood on the Clocktower Token Generator
 * Custom Error Classes - Standardized error handling
 */

import { logger } from './utils/logger.js';

/**
 * Base error class for all token generator errors
 */
// V8-specific interface for captureStackTrace
interface ErrorConstructorWithStackTrace extends ErrorConstructor {
  captureStackTrace?(
    targetObject: object,
    constructorOpt?: new (...args: unknown[]) => unknown
  ): void;
}

export class TokenGeneratorError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'TokenGeneratorError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    const ErrorWithStackTrace = Error as ErrorConstructorWithStackTrace;
    if (ErrorWithStackTrace.captureStackTrace) {
      ErrorWithStackTrace.captureStackTrace(
        this,
        this.constructor as new (
          ...args: unknown[]
        ) => unknown
      );
    }
  }
}

/**
 * Error thrown when data loading fails
 * Used for: JSON file loading, API fetching, example script loading
 */
export class DataLoadError extends TokenGeneratorError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DataLoadError';
  }
}

/**
 * Error thrown when data validation fails
 * Used for: JSON validation, character validation
 */
export class ValidationError extends TokenGeneratorError {
  constructor(
    message: string,
    public validationErrors: string[] = [],
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown during token generation
 * Used for: Canvas operations, image loading, token creation
 */
export class TokenCreationError extends TokenGeneratorError {
  constructor(
    message: string,
    public tokenName?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'TokenCreationError';
  }
}

/**
 * Error thrown during PDF generation
 * Used for: PDF layout, PDF export
 */
export class PDFGenerationError extends TokenGeneratorError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'PDFGenerationError';
  }
}

/**
 * Error thrown during ZIP creation
 * Used for: ZIP file creation, blob conversion
 */
export class ZipCreationError extends TokenGeneratorError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ZipCreationError';
  }
}

/**
 * Error thrown when required resources are missing
 * Used for: Missing libraries (jsPDF, JSZip, QRCode), missing fonts, missing images
 */
export class ResourceNotFoundError extends TokenGeneratorError {
  constructor(
    message: string,
    public resourceType: 'library' | 'font' | 'image' | 'element',
    public resourceName: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Error thrown when UI initialization fails
 * Used for: Missing DOM elements, invalid state
 */
export class UIInitializationError extends TokenGeneratorError {
  constructor(
    message: string,
    public missingElements: string[] = [],
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'UIInitializationError';
  }
}

/**
 * Error thrown during data synchronization
 * Used for: Sync initialization, update checks, data fetching
 */
export class DataSyncError extends TokenGeneratorError {
  constructor(
    message: string,
    public syncOperation?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'DataSyncError';
  }
}

/**
 * Error thrown during storage operations
 * Used for: IndexedDB operations, Cache API operations, quota exceeded
 */
export class StorageError extends TokenGeneratorError {
  constructor(
    message: string,
    public storageType: 'indexeddb' | 'cache-api' | 'quota',
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'StorageError';
  }
}

/**
 * Error thrown during GitHub API interactions
 * Used for: API failures, rate limiting, network errors
 */
export class GitHubAPIError extends TokenGeneratorError {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimited?: boolean,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'GitHubAPIError';
  }
}

/**
 * Error thrown during package validation
 * Used for: Invalid ZIP structure, hash mismatch, schema validation
 */
export class PackageValidationError extends TokenGeneratorError {
  constructor(
    message: string,
    public validationType: 'structure' | 'hash' | 'schema',
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'PackageValidationError';
  }
}

/**
 * Error handler utility to extract user-friendly messages
 */
export const ErrorHandler = {
  /**
   * Get a user-friendly error message from any error
   */
  getUserMessage(error: unknown): string {
    // Check specific error types in order of specificity
    if (error instanceof ValidationError) {
      const details = error.validationErrors.length > 0 ? `: ${error.validationErrors.join(', ')}` : '';
      return `${error.message}${details}`;
    }

    if (error instanceof TokenCreationError) {
      const tokenInfo = error.tokenName ? ` (${error.tokenName})` : '';
      return `${error.message}${tokenInfo}`;
    }

    if (error instanceof ResourceNotFoundError) {
      return `${error.message}. Please ensure ${error.resourceName} is available.`;
    }

    if (error instanceof GitHubAPIError) {
      return error.rateLimited
        ? `${error.message}. GitHub API rate limit exceeded. Please try again later.`
        : error.message;
    }

    if (error instanceof StorageError) {
      return error.storageType === 'quota'
        ? `${error.message}. Storage quota exceeded. Please clear some space.`
        : error.message;
    }

    if (error instanceof PackageValidationError) {
      return `${error.message}. The data package may be corrupted.`;
    }

    if (error instanceof DataSyncError) {
      const operation = error.syncOperation ? ` (${error.syncOperation})` : '';
      return `${error.message}${operation}`;
    }

    if (error instanceof TokenGeneratorError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unknown error occurred';
  },

  /**
   * Log error with appropriate level using the structured logger
   */
  log(error: unknown, context: string = 'Error'): void {
    if (error instanceof ValidationError) {
      logger.warn(context, error.message, error.validationErrors, error.cause);
    } else if (error instanceof DataLoadError) {
      logger.warn(context, error.message, error.cause);
    } else if (error instanceof TokenGeneratorError) {
      logger.error(context, error.message, error.cause);
    } else {
      logger.error(context, 'Unknown error', error);
    }
  },

  /**
   * Check if error should be shown to user
   */
  shouldShowToUser(error: unknown): boolean {
    // All our custom errors should be shown to users
    // System errors or unknown errors should show generic message
    return error instanceof TokenGeneratorError;
  },
};

export default {
  TokenGeneratorError,
  DataLoadError,
  ValidationError,
  TokenCreationError,
  PDFGenerationError,
  ZipCreationError,
  ResourceNotFoundError,
  UIInitializationError,
  DataSyncError,
  StorageError,
  GitHubAPIError,
  PackageValidationError,
  ErrorHandler,
};
