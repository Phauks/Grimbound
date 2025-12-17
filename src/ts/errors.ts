/**
 * Blood on the Clocktower Token Generator
 * Custom Error Classes - Standardized error handling
 */

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
    // Use specific error types with proper type guards
    const handlers: Array<{ check: (e: unknown) => e is Error; handle: (e: Error) => string }> = [
      {
        check: (e): e is ValidationError => e instanceof ValidationError,
        handle: (e: ValidationError) => {
          const details = e.validationErrors.length > 0 ? `: ${e.validationErrors.join(', ')}` : '';
          return `${e.message}${details}`;
        },
      },
      {
        check: (e): e is TokenCreationError => e instanceof TokenCreationError,
        handle: (e: TokenCreationError) => {
          const tokenInfo = e.tokenName ? ` (${e.tokenName})` : '';
          return `${e.message}${tokenInfo}`;
        },
      },
      {
        check: (e): e is ResourceNotFoundError => e instanceof ResourceNotFoundError,
        handle: (e: ResourceNotFoundError) =>
          `${e.message}. Please ensure ${e.resourceName} is available.`,
      },
      {
        check: (e): e is GitHubAPIError => e instanceof GitHubAPIError,
        handle: (e: GitHubAPIError) =>
          e.rateLimited
            ? `${e.message}. GitHub API rate limit exceeded. Please try again later.`
            : e.message,
      },
      {
        check: (e): e is StorageError => e instanceof StorageError,
        handle: (e: StorageError) =>
          e.storageType === 'quota'
            ? `${e.message}. Storage quota exceeded. Please clear some space.`
            : e.message,
      },
      {
        check: (e): e is PackageValidationError => e instanceof PackageValidationError,
        handle: (e: PackageValidationError) => `${e.message}. The data package may be corrupted.`,
      },
      {
        check: (e): e is DataSyncError => e instanceof DataSyncError,
        handle: (e: DataSyncError) => {
          const operation = e.syncOperation ? ` (${e.syncOperation})` : '';
          return `${e.message}${operation}`;
        },
      },
      {
        check: (e): e is TokenGeneratorError => e instanceof TokenGeneratorError,
        handle: (e) => e.message,
      },
      {
        check: (e): e is Error => e instanceof Error,
        handle: (e) => e.message,
      },
    ];

    for (const { check, handle } of handlers) {
      if (check(error)) {
        return handle(error);
      }
    }
    return 'An unknown error occurred';
  },

  /**
   * Log error with appropriate level
   */
  log(error: unknown, context: string = ''): void {
    const prefix = context ? `[${context}]` : '';

    if (error instanceof ValidationError) {
      console.warn(prefix, error.message, error.validationErrors, error.cause);
    } else if (error instanceof DataLoadError) {
      console.warn(prefix, error.message, error.cause);
    } else if (error instanceof TokenGeneratorError) {
      console.error(prefix, error.message, error.cause);
    } else {
      console.error(prefix, error);
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
