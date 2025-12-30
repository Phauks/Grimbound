import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearHookError,
  guardAgainstUndefined,
  handleAsyncOperation,
  handleHookError,
  retryOperation,
  validateRequiredFields,
} from '@/ts/utils/errorUtils';

// Mock the logger
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ErrorHandler
vi.mock('@/ts/errors.js', () => ({
  ErrorHandler: {
    getUserMessage: vi.fn((error: unknown) => {
      if (error instanceof Error) {
        return error.message;
      }
      return 'An error occurred';
    }),
  },
}));

describe('errorUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleHookError', () => {
    it('should set error message', () => {
      const setError = vi.fn();
      const error = new Error('Test error');

      handleHookError(error, 'TestContext', setError);

      expect(setError).toHaveBeenCalledWith('Test error');
    });

    it('should use custom message when provided', () => {
      const setError = vi.fn();
      const error = new Error('Original error');

      handleHookError(error, 'TestContext', setError, {
        customMessage: 'Custom error message',
      });

      expect(setError).toHaveBeenCalledWith('Custom error message');
    });

    it('should call onError callback when provided', () => {
      const setError = vi.fn();
      const onError = vi.fn();
      const error = new Error('Test error');

      handleHookError(error, 'TestContext', setError, { onError });

      expect(onError).toHaveBeenCalledWith(error, 'Test error');
    });

    it('should handle non-Error objects', () => {
      const setError = vi.fn();

      handleHookError('string error', 'TestContext', setError);

      expect(setError).toHaveBeenCalledWith('An error occurred');
    });

    it('should accept different log levels', () => {
      const setError = vi.fn();
      const error = new Error('Test');

      handleHookError(error, 'Test', setError, { logLevel: 'warn' });
      handleHookError(error, 'Test', setError, { logLevel: 'debug' });
      handleHookError(error, 'Test', setError, { logLevel: 'error' });

      expect(setError).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearHookError', () => {
    it('should set error to null', () => {
      const setError = vi.fn();

      clearHookError('TestContext', setError);

      expect(setError).toHaveBeenCalledWith(null);
    });

    it('should not log when no success message provided', async () => {
      const setError = vi.fn();
      const { logger } = vi.mocked(await import('@/ts/utils/logger.js'));

      clearHookError('TestContext', setError);

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should log success message when provided', async () => {
      const setError = vi.fn();
      const { logger } = vi.mocked(await import('@/ts/utils/logger.js'));

      clearHookError('TestContext', setError, 'Operation successful');

      expect(logger.info).toHaveBeenCalledWith('TestContext', 'Operation successful');
    });
  });

  describe('handleAsyncOperation', () => {
    it('should set loading to true then false', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const operation = vi.fn().mockResolvedValue('result');

      await handleAsyncOperation(operation, 'TestContext', setLoading, setError);

      expect(setLoading).toHaveBeenNthCalledWith(1, true);
      expect(setLoading).toHaveBeenNthCalledWith(2, false);
    });

    it('should return operation result on success', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const operation = vi.fn().mockResolvedValue('success-result');

      const result = await handleAsyncOperation(operation, 'TestContext', setLoading, setError);

      expect(result).toBe('success-result');
    });

    it('should return undefined on error', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      const result = await handleAsyncOperation(operation, 'TestContext', setLoading, setError);

      expect(result).toBeUndefined();
    });

    it('should set error message on failure', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await handleAsyncOperation(operation, 'TestContext', setLoading, setError);

      expect(setError).toHaveBeenCalledWith('Operation failed');
    });

    it('should call onSuccess callback on success', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const onSuccess = vi.fn();
      const operation = vi.fn().mockResolvedValue('result');

      await handleAsyncOperation(operation, 'TestContext', setLoading, setError, {
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledWith('result');
    });

    it('should call onFinally callback always', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const onFinally = vi.fn();

      // Test on success
      await handleAsyncOperation(() => Promise.resolve('ok'), 'TestContext', setLoading, setError, {
        onFinally,
      });
      expect(onFinally).toHaveBeenCalledTimes(1);

      // Test on failure
      await handleAsyncOperation(
        () => Promise.reject(new Error('fail')),
        'TestContext',
        setLoading,
        setError,
        { onFinally }
      );
      expect(onFinally).toHaveBeenCalledTimes(2);
    });

    it('should clear error before operation', async () => {
      const setLoading = vi.fn();
      const setError = vi.fn();
      const operation = vi.fn().mockResolvedValue('result');

      await handleAsyncOperation(operation, 'TestContext', setLoading, setError);

      // First call should be to clear error
      expect(setError).toHaveBeenNthCalledWith(1, null);
    });
  });

  describe('retryOperation', () => {
    it('should return result on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryOperation(operation, 'TestContext');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');

      const resultPromise = retryOperation(operation, 'TestContext', {
        delayMs: 100,
        maxAttempts: 3,
      });

      // Fast-forward timer to trigger retry
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts exhausted', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        retryOperation(operation, 'TestContext', {
          maxAttempts: 2,
          delayMs: 10, // Short delay for test
        })
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(2);
      vi.useFakeTimers(); // Restore for other tests
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retryOperation(operation, 'TestContext', {
        maxAttempts: 3,
        delayMs: 100,
        backoffMultiplier: 2,
      });

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry after 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      const promise = retryOperation(operation, 'TestContext', {
        maxAttempts: 3,
        delayMs: 100,
        onRetry,
      });

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(onRetry).toHaveBeenCalledWith(1, 3, expect.any(Error));
    });

    it('should not retry when shouldRetry returns false', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable'));

      const promise = retryOperation(operation, 'TestContext', {
        maxAttempts: 3,
        shouldRetry: () => false,
      });

      await expect(promise).rejects.toThrow('Non-retryable');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use default options', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      const result = await retryOperation(operation, 'TestContext');

      expect(result).toBe('result');
    });
  });

  describe('guardAgainstUndefined', () => {
    it('should return value when defined', () => {
      const value = 'test';

      const result = guardAgainstUndefined(value, 'TestContext', 'testField');

      expect(result).toBe('test');
    });

    it('should return object when defined', () => {
      const value = { id: 1, name: 'test' };

      const result = guardAgainstUndefined(value, 'TestContext', 'testField');

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should throw for undefined', () => {
      expect(() => {
        guardAgainstUndefined(undefined, 'TestContext', 'testField');
      }).toThrow('testField is required');
    });

    it('should throw for null', () => {
      expect(() => {
        guardAgainstUndefined(null, 'TestContext', 'testField');
      }).toThrow('testField is required');
    });

    it('should allow zero', () => {
      const result = guardAgainstUndefined(0, 'TestContext', 'count');

      expect(result).toBe(0);
    });

    it('should allow empty string', () => {
      const result = guardAgainstUndefined('', 'TestContext', 'name');

      expect(result).toBe('');
    });

    it('should allow false', () => {
      const result = guardAgainstUndefined(false, 'TestContext', 'enabled');

      expect(result).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass for object with all required fields', () => {
      const obj = { name: 'Test', email: 'test@example.com' };

      expect(() => {
        validateRequiredFields(obj, ['name', 'email'], 'TestContext');
      }).not.toThrow();
    });

    it('should throw for missing field', () => {
      const obj = { name: 'Test' };

      expect(() => {
        validateRequiredFields(obj, ['name', 'email'] as (keyof typeof obj)[], 'TestContext');
      }).toThrow('Missing required fields: email');
    });

    it('should throw for null field', () => {
      const obj = { name: 'Test', email: null };

      expect(() => {
        validateRequiredFields(obj, ['name', 'email'], 'TestContext');
      }).toThrow('Missing required fields: email');
    });

    it('should throw for undefined field', () => {
      const obj = { name: 'Test', email: undefined };

      expect(() => {
        validateRequiredFields(obj, ['name', 'email'], 'TestContext');
      }).toThrow('Missing required fields: email');
    });

    it('should throw for empty string field', () => {
      const obj = { name: 'Test', email: '' };

      expect(() => {
        validateRequiredFields(obj, ['name', 'email'], 'TestContext');
      }).toThrow('Missing required fields: email');
    });

    it('should list multiple missing fields', () => {
      const obj = { id: 1 };

      expect(() => {
        validateRequiredFields(obj, ['id', 'name', 'email'] as (keyof typeof obj)[], 'TestContext');
      }).toThrow('Missing required fields: name, email');
    });

    it('should allow zero as valid value', () => {
      const obj = { name: 'Test', count: 0 };

      expect(() => {
        validateRequiredFields(obj, ['name', 'count'], 'TestContext');
      }).not.toThrow();
    });

    it('should allow false as valid value', () => {
      const obj = { name: 'Test', enabled: false };

      expect(() => {
        validateRequiredFields(obj, ['name', 'enabled'], 'TestContext');
      }).not.toThrow();
    });

    it('should handle empty required fields array', () => {
      const obj = {};

      expect(() => {
        validateRequiredFields(obj, [], 'TestContext');
      }).not.toThrow();
    });
  });
});
