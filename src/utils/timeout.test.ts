import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withTimeout,
  fetchWithTimeout,
  getTimeoutFromEnv,
  isTimeoutError,
  TimeoutError,
} from './timeout.js';

describe('Timeout Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('withTimeout', () => {
    it('should resolve when operation completes before timeout', async () => {
      const operation = vi.fn(async () => 'success');

      const promise = withTimeout('test', operation, { timeoutMs: 1000 });

      // Fast-forward time but operation completes immediately
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should throw TimeoutError when operation exceeds timeout', async () => {
      const operation = vi.fn(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000); // Operation takes 2s
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          });
        });
      });

      const promise = withTimeout('slow-operation', operation, { timeoutMs: 1000 });

      // Fast-forward past timeout
      await vi.advanceTimersByTimeAsync(1001);

      await expect(promise).rejects.toThrow(TimeoutError);
      await expect(promise).rejects.toThrow("Operation 'slow-operation' timed out after 1000ms");
    });

    it('should call onTimeout callback when timeout occurs', async () => {
      const onTimeout = vi.fn();
      const operation = vi.fn(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          });
        });
      });

      const promise = withTimeout('test', operation, {
        timeoutMs: 1000,
        onTimeout,
      });

      await vi.advanceTimersByTimeAsync(1001);

      await expect(promise).rejects.toThrow(TimeoutError);
      expect(onTimeout).toHaveBeenCalled();
    });

    it('should execute cleanup function on timeout', async () => {
      const cleanupFn = vi.fn();
      const operation = vi.fn(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          });
        });
      });

      const promise = withTimeout('test', operation, {
        timeoutMs: 1000,
        cleanupFn,
      });

      await vi.advanceTimersByTimeAsync(1001);

      await expect(promise).rejects.toThrow(TimeoutError);
      expect(cleanupFn).toHaveBeenCalled();
    });

    it('should execute cleanup function on operation error', async () => {
      const cleanupFn = vi.fn();
      const operation = vi.fn(async () => {
        throw new Error('Operation failed');
      });

      const promise = withTimeout('test', operation, {
        timeoutMs: 1000,
        cleanupFn,
      });

      await expect(promise).rejects.toThrow('Operation failed');
      expect(cleanupFn).toHaveBeenCalled();
    });

    it('should handle cleanup function errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cleanupFn = vi.fn(async () => {
        throw new Error('Cleanup failed');
      });
      const operation = vi.fn(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          });
        });
      });

      const promise = withTimeout('test', operation, {
        timeoutMs: 1000,
        cleanupFn,
      });

      await vi.advanceTimersByTimeAsync(1001);

      await expect(promise).rejects.toThrow(TimeoutError);
      expect(cleanupFn).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleanup failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should pass AbortSignal to operation function', async () => {
      let receivedSignal: AbortSignal | null = null;
      const operation = vi.fn(async (signal: AbortSignal) => {
        receivedSignal = signal;
        return 'success';
      });

      await withTimeout('test', operation, { timeoutMs: 1000 });

      expect(receivedSignal).not.toBeNull();
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it('should respect parent abort signal', async () => {
      const parentController = new AbortController();
      const operation = vi.fn(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Parent aborted'));
          });
        });
      });

      const promise = withTimeout('test', operation, {
        timeoutMs: 5000,
        signal: parentController.signal,
      });

      // Parent aborts before timeout
      parentController.abort();

      // Must await the promise rejection
      await expect(promise).rejects.toThrow();
    });

    it('should clear timeout when operation completes successfully', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const operation = vi.fn(async () => 'success');

      await withTimeout('test', operation, { timeoutMs: 1000 });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('fetchWithTimeout', () => {
    it('should fetch with default timeout', async () => {
      const mockFetch = vi.fn(async () => new Response('OK'));
      global.fetch = mockFetch;

      const promise = fetchWithTimeout('https://example.com/api');

      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should fetch with custom timeout', async () => {
      const mockFetch = vi.fn(async () => new Response('OK'));
      global.fetch = mockFetch;

      const promise = fetchWithTimeout('https://example.com/api', { timeoutMs: 5000 });

      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should pass fetch options to fetch call', async () => {
      const mockFetch = vi.fn(async () => new Response('OK'));
      global.fetch = mockFetch;

      const promise = fetchWithTimeout('https://example.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 3000,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should throw TimeoutError when fetch exceeds timeout', async () => {
      const mockFetch = vi.fn((url: string, options?: RequestInit) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(new Response('OK')), 2000);
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('Fetch aborted'));
            });
          }
        });
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const promise = fetchWithTimeout('https://example.com/api', { timeoutMs: 1000 });

      // Advance timers and wait for promise to reject
      const advancePromise = vi.advanceTimersByTimeAsync(1001);

      await Promise.all([advancePromise, expect(promise).rejects.toThrow(TimeoutError)]);
    });
  });

  describe('getTimeoutFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default value when env var not set', () => {
      delete process.env.TEST_TIMEOUT;

      const timeout = getTimeoutFromEnv('TEST_TIMEOUT', 5000);

      expect(timeout).toBe(5000);
    });

    it('should parse valid timeout from env var', () => {
      process.env.TEST_TIMEOUT = '10000';

      const timeout = getTimeoutFromEnv('TEST_TIMEOUT', 5000);

      expect(timeout).toBe(10000);
    });

    it('should return default for invalid numeric value', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.TEST_TIMEOUT = 'invalid';

      const timeout = getTimeoutFromEnv('TEST_TIMEOUT', 5000);

      expect(timeout).toBe(5000);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid timeout value in TEST_TIMEOUT')
      );

      consoleSpy.mockRestore();
    });

    it('should return default for zero timeout', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.TEST_TIMEOUT = '0';

      const timeout = getTimeoutFromEnv('TEST_TIMEOUT', 5000);

      expect(timeout).toBe(5000);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return default for negative timeout', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.TEST_TIMEOUT = '-1000';

      const timeout = getTimeoutFromEnv('TEST_TIMEOUT', 5000);

      expect(timeout).toBe(5000);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle empty string as env value', () => {
      process.env.TEST_TIMEOUT = '';

      const timeout = getTimeoutFromEnv('TEST_TIMEOUT', 5000);

      expect(timeout).toBe(5000);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError instance', () => {
      const error = new TimeoutError('test', 1000);

      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isTimeoutError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
      expect(isTimeoutError('error')).toBe(false);
      expect(isTimeoutError({ message: 'error' })).toBe(false);
    });
  });

  describe('TimeoutError', () => {
    it('should create error with correct message', () => {
      const error = new TimeoutError('database query', 5000);

      expect(error.message).toBe("Operation 'database query' timed out after 5000ms");
      expect(error.name).toBe('TimeoutError');
    });

    it('should be instance of Error', () => {
      const error = new TimeoutError('test', 1000);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });
});
