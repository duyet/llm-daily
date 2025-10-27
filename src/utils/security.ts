/**
 * Security utilities for input sanitization and validation
 * Provides protection against path traversal, injection attacks, and other security risks
 */

import { resolve, normalize, relative } from 'path';
import { logger } from './logger.js';

/**
 * Sanitize user-provided file paths to prevent path traversal attacks
 * @param userPath User-provided path
 * @param baseDir Base directory to constrain paths within (default: process.cwd())
 * @returns Sanitized absolute path
 * @throws Error if path escapes base directory
 */
export function sanitizePath(userPath: string, baseDir: string = process.cwd()): string {
  // Normalize the paths to resolve . and ..
  const normalizedBase = normalize(resolve(baseDir));
  const normalizedPath = normalize(resolve(baseDir, userPath));

  // Check if the resolved path is within the base directory
  const relativePath = relative(normalizedBase, normalizedPath);

  // If path starts with .. or is absolute outside base, it's trying to escape
  if (relativePath.startsWith('..') || resolve(normalizedPath) !== normalizedPath) {
    throw new Error(
      `Path traversal detected: "${userPath}" attempts to access outside base directory`
    );
  }

  return normalizedPath;
}

/**
 * Mask sensitive values in strings (API keys, secrets, passwords)
 * @param text Text potentially containing sensitive data
 * @param keysToMask Array of keys/patterns to mask
 * @returns Text with sensitive data masked
 */
export function maskSecrets(text: string, keysToMask: string[] = []): string {
  let masked = text;

  // Default patterns for common secrets
  const defaultPatterns = [
    // API keys (alphanumeric, hyphens, underscores, 20+ chars)
    /([A-Za-z0-9_-]{20,})/g,
    // Bearer tokens
    /(Bearer\s+[A-Za-z0-9_-]+)/gi,
    // JWT tokens (3 base64 parts separated by dots)
    /(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,
  ];

  // Apply default patterns
  for (const pattern of defaultPatterns) {
    masked = masked.replace(pattern, (match) => {
      // Keep first 4 and last 4 characters, mask the rest
      if (match.length <= 8) {
        return '*'.repeat(match.length);
      }
      return `${match.substring(0, 4)}${'*'.repeat(match.length - 8)}${match.substring(match.length - 4)}`;
    });
  }

  // Apply custom key-based masking
  for (const key of keysToMask) {
    // Pattern to match key: value or key=value
    const keyPattern = new RegExp(`(${key}[:\\s=]+)([^\\s,}]+)`, 'gi');
    masked = masked.replace(keyPattern, (_match, prefix) => {
      return `${prefix}***MASKED***`;
    });
  }

  return masked;
}

/**
 * Sanitize log messages to remove sensitive data
 * @param message Log message
 * @param sensitiveKeys Keys to mask
 * @returns Sanitized message
 */
export function sanitizeLogMessage(message: string, sensitiveKeys: string[] = []): string {
  const defaultKeys = [
    'apiKey',
    'api_key',
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
    'password',
    'secret',
    'token',
    'authorization',
  ];

  return maskSecrets(message, [...defaultKeys, ...sensitiveKeys]);
}

/**
 * Validate cron expression format and check for injection attempts
 * @param cronExpression Cron expression string
 * @returns Validation result
 */
export function validateCronExpression(cronExpression: string): {
  valid: boolean;
  error?: string;
} {
  // Check for null, undefined, or empty
  if (!cronExpression || typeof cronExpression !== 'string') {
    return { valid: false, error: 'Cron expression must be a non-empty string' };
  }

  // Check for suspicious characters that might indicate injection
  const suspiciousChars = /[;&|`$()<>]/;
  if (suspiciousChars.test(cronExpression)) {
    logger.warn(`Suspicious characters detected in cron expression: ${cronExpression}`);
    return {
      valid: false,
      error: 'Cron expression contains invalid characters',
    };
  }

  // Validate cron format (5 or 6 fields)
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    return {
      valid: false,
      error: `Invalid cron format: expected 5 or 6 fields, got ${parts.length}`,
    };
  }

  // Validate each field
  const fieldValidations = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day of month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12 },
    { name: 'day of week', min: 0, max: 6 },
  ];

  for (let i = 0; i < Math.min(5, parts.length); i++) {
    const part = parts[i];
    const validation = fieldValidations[i];

    // Allow *, */n, ranges (n-m), and lists (n,m,p)
    if (part === '*') {
      continue;
    }

    // Step values (*/n)
    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2), 10);
      if (isNaN(step) || step <= 0) {
        return {
          valid: false,
          error: `Invalid step value in ${validation.name} field: ${part}`,
        };
      }
      continue;
    }

    // Ranges (n-m)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((v) => parseInt(v, 10));
      if (
        isNaN(start) ||
        isNaN(end) ||
        start < validation.min ||
        end > validation.max ||
        start > end
      ) {
        return {
          valid: false,
          error: `Invalid range in ${validation.name} field: ${part}`,
        };
      }
      continue;
    }

    // Lists (n,m,p)
    if (part.includes(',')) {
      const values = part.split(',').map((v) => parseInt(v.trim(), 10));
      const invalidValues = values.filter(
        (v) => isNaN(v) || v < validation.min || v > validation.max
      );
      if (invalidValues.length > 0) {
        return {
          valid: false,
          error: `Invalid values in ${validation.name} field: ${invalidValues.join(', ')}`,
        };
      }
      continue;
    }

    // Single value
    const value = parseInt(part, 10);
    if (isNaN(value) || value < validation.min || value > validation.max) {
      return {
        valid: false,
        error: `Invalid value in ${validation.name} field: ${part} (must be ${validation.min}-${validation.max})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize environment variable values
 * @param envVars Environment variables object
 * @returns Sanitized copy of environment variables
 */
export function sanitizeEnvVars(
  envVars: Record<string, string | undefined>
): Record<string, string | undefined> {
  const sensitiveKeys = [
    'api_key',
    'apikey',
    'password',
    'secret',
    'token',
    'private_key',
    'privatekey',
  ];

  const sanitized: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(envVars)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((pattern) => lowerKey.includes(pattern));

    if (isSensitive && value) {
      sanitized[key] = '***MASKED***';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate that a task name is safe (no special characters, path traversal)
 * @param taskName Task name to validate
 * @returns Validation result
 */
export function validateTaskName(taskName: string): { valid: boolean; error?: string } {
  if (!taskName || typeof taskName !== 'string') {
    return { valid: false, error: 'Task name must be a non-empty string' };
  }

  // Only allow alphanumeric, hyphens, and underscores
  const validPattern = /^[a-z0-9_-]+$/i;
  if (!validPattern.test(taskName)) {
    return {
      valid: false,
      error: 'Task name must contain only letters, numbers, hyphens, and underscores',
    };
  }

  // Check for path traversal attempts
  if (taskName.includes('..') || taskName.includes('/') || taskName.includes('\\')) {
    return {
      valid: false,
      error: 'Task name cannot contain path separators or parent directory references',
    };
  }

  // Check length
  if (taskName.length > 100) {
    return { valid: false, error: 'Task name cannot exceed 100 characters' };
  }

  return { valid: true };
}
