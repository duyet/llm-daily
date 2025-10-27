/**
 * Timeout utility for wrapping async operations with configurable timeouts and cleanup
 */

import { TIMEOUTS } from '../constants.js';

export interface TimeoutOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  onTimeout?: () => void;
  cleanupFn?: () => Promise<void> | void;
}

/**
 * Custom error for timeout operations
 */
export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrap an async operation with timeout and optional cleanup
 *
 * @param operation - Name of the operation for error messages
 * @param fn - Async function to execute (receives AbortSignal)
 * @param options - Timeout configuration
 * @returns Promise resolving to the result of fn
 * @throws TimeoutError if operation exceeds timeout
 */
export async function withTimeout<T>(
  operation: string,
  fn: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const controller = new AbortController();
  const { timeoutMs, signal: parentSignal, onTimeout, cleanupFn } = options;

  // Inherit cancellation from parent signal
  if (parentSignal) {
    parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  // Set timeout to abort the operation
  const timeoutId = setTimeout(() => {
    if (onTimeout) {
      onTimeout();
    }
    controller.abort();
  }, timeoutMs);

  try {
    // Execute the operation with the abort signal
    const result = await fn(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    // Run cleanup function if provided
    if (cleanupFn) {
      try {
        await cleanupFn();
      } catch (cleanupError) {
        console.error(`Cleanup failed for ${operation}:`, cleanupError);
      }
    }

    // Convert abort to TimeoutError
    if (controller.signal.aborted && !parentSignal?.aborted) {
      throw new TimeoutError(operation, timeoutMs);
    }

    // Rethrow original error
    throw error;
  }
}

/**
 * Fetch with timeout support
 *
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeoutMs
 * @returns Promise resolving to Response
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = TIMEOUTS.WEBHOOK_DEFAULT, ...fetchOptions } = options;

  return withTimeout(
    'fetch',
    async (signal) => {
      return fetch(url, {
        ...fetchOptions,
        signal,
      });
    },
    { timeoutMs }
  );
}

/**
 * Get timeout value from environment or use default
 *
 * @param envVar - Environment variable name
 * @param defaultValue - Default timeout in milliseconds
 * @returns Timeout in milliseconds
 */
export function getTimeoutFromEnv(envVar: string, defaultValue: number): number {
  const envValue = process.env[envVar];
  if (!envValue) {
    return defaultValue;
  }

  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(
      `Invalid timeout value in ${envVar}: ${envValue}. Using default: ${defaultValue}ms`
    );
    return defaultValue;
  }

  return parsed;
}

/**
 * Check if an error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
