/**
 * Security utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizePath,
  maskSecrets,
  sanitizeLogMessage,
  validateCronExpression,
  sanitizeEnvVars,
  validateTaskName,
} from './security.js';

describe('Security Utilities', () => {
  describe('sanitizePath', () => {
    it('should allow safe paths within base directory', () => {
      const baseDir = '/Users/test/project';
      const safePath = sanitizePath('tasks/my-task', baseDir);
      expect(safePath).toContain('tasks/my-task');
    });

    it('should prevent path traversal with ..', () => {
      const baseDir = '/Users/test/project';
      expect(() => sanitizePath('../../../etc/passwd', baseDir)).toThrow(/Path traversal detected/);
    });

    it('should prevent absolute paths outside base directory', () => {
      const baseDir = '/Users/test/project';
      expect(() => sanitizePath('/etc/passwd', baseDir)).toThrow(/Path traversal detected/);
    });

    it('should normalize paths with ./', () => {
      const baseDir = '/Users/test/project';
      const safePath = sanitizePath('./tasks/my-task', baseDir);
      expect(safePath).toContain('tasks/my-task');
    });

    it('should handle nested safe paths', () => {
      const baseDir = '/Users/test/project';
      const safePath = sanitizePath('tasks/category/my-task', baseDir);
      expect(safePath).toContain('tasks/category/my-task');
    });
  });

  describe('maskSecrets', () => {
    it('should mask API keys', () => {
      const text = 'My API key is sk-1234567890abcdefghijklmnop';
      const masked = maskSecrets(text);
      expect(masked).toContain('****');
      expect(masked).not.toContain('1234567890abcdefghijklmnop');
    });

    it('should mask Bearer tokens', () => {
      const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const masked = maskSecrets(text);
      expect(masked).toContain('****');
      expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should mask JWT tokens', () => {
      const text =
        'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const masked = maskSecrets(text);
      expect(masked).toContain('****');
    });

    it('should mask custom keys', () => {
      const text = 'apiKey: secret-value-123';
      const masked = maskSecrets(text, ['apiKey']);
      expect(masked).toContain('***MASKED***');
      expect(masked).not.toContain('secret-value-123');
    });

    it('should preserve non-sensitive data', () => {
      const text = 'Hello world, my name is John';
      const masked = maskSecrets(text);
      expect(masked).toBe(text);
    });

    it('should keep first and last 4 characters of long secrets', () => {
      const text = 'Key: 1234567890abcdefghij';
      const masked = maskSecrets(text);
      expect(masked).toMatch(/1234.*ghij/);
    });

    it('should fully mask short matching secrets', () => {
      const text = 'Key: short123456789012345'; // 21 chars - matches 20+ pattern
      const masked = maskSecrets(text);
      // For 21-char string, should mask middle: shor*************2345
      expect(masked).toMatch(/shor\*+2345/);
    });
  });

  describe('sanitizeLogMessage', () => {
    it('should mask API keys in log messages', () => {
      const message = 'Using API key: sk-1234567890abcdefghijklmnop';
      const sanitized = sanitizeLogMessage(message);
      expect(sanitized).not.toContain('1234567890abcdefghijklmnop');
    });

    it('should mask common sensitive keys', () => {
      const message = 'Config: { apiKey: "secret123", password: "pass456" }';
      const sanitized = sanitizeLogMessage(message);
      expect(sanitized).toContain('***MASKED***');
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('pass456');
    });

    it('should preserve safe log content', () => {
      const message = 'Task completed successfully in 1.5s';
      const sanitized = sanitizeLogMessage(message);
      expect(sanitized).toBe(message);
    });
  });

  describe('validateCronExpression', () => {
    it('should validate correct 5-field cron expressions', () => {
      expect(validateCronExpression('0 9 * * *').valid).toBe(true);
      expect(validateCronExpression('*/15 * * * *').valid).toBe(true);
      expect(validateCronExpression('0 0-5 * * 1-5').valid).toBe(true);
      expect(validateCronExpression('0 0,12 * * *').valid).toBe(true);
    });

    it('should validate correct 6-field cron expressions', () => {
      expect(validateCronExpression('0 0 9 * * *').valid).toBe(true);
    });

    it('should reject cron expressions with injection characters', () => {
      expect(validateCronExpression('0 9 * * * ; rm -rf /').valid).toBe(false);
      expect(validateCronExpression('0 9 * * * | echo hack').valid).toBe(false);
      expect(validateCronExpression('0 9 * * * && malicious').valid).toBe(false);
      expect(validateCronExpression('0 9 * * * $(danger)').valid).toBe(false);
    });

    it('should reject invalid field counts', () => {
      const result = validateCronExpression('0 9 *');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expected 5 or 6 fields');
    });

    it('should reject invalid field values', () => {
      const result = validateCronExpression('60 9 * * *');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minute');
    });

    it('should reject invalid step values', () => {
      const result = validateCronExpression('*/0 * * * *');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid step value');
    });

    it('should reject invalid ranges', () => {
      const result = validateCronExpression('0 25-30 * * *');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hour');
    });

    it('should reject empty or null expressions', () => {
      expect(validateCronExpression('').valid).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(validateCronExpression(null).valid).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(validateCronExpression(undefined).valid).toBe(false);
    });
  });

  describe('sanitizeEnvVars', () => {
    it('should mask sensitive environment variables', () => {
      const envVars = {
        OPENAI_API_KEY: 'sk-1234567890abcdef',
        NODE_ENV: 'production',
        PASSWORD: 'secret123',
        DATABASE_URL: 'postgres://localhost:5432/db',
      };

      const sanitized = sanitizeEnvVars(envVars);

      expect(sanitized.OPENAI_API_KEY).toBe('***MASKED***');
      expect(sanitized.PASSWORD).toBe('***MASKED***');
      expect(sanitized.NODE_ENV).toBe('production');
      expect(sanitized.DATABASE_URL).toBe('postgres://localhost:5432/db');
    });

    it('should handle undefined values', () => {
      const envVars = {
        OPENAI_API_KEY: undefined,
        NODE_ENV: 'test',
      };

      const sanitized = sanitizeEnvVars(envVars);

      expect(sanitized.OPENAI_API_KEY).toBeUndefined();
      expect(sanitized.NODE_ENV).toBe('test');
    });

    it('should mask keys with common sensitive patterns', () => {
      const envVars = {
        MY_SECRET_KEY: 'secret',
        MY_TOKEN: 'token123',
        PRIVATE_KEY: 'private',
        PUBLIC_URL: 'https://example.com',
      };

      const sanitized = sanitizeEnvVars(envVars);

      expect(sanitized.MY_SECRET_KEY).toBe('***MASKED***');
      expect(sanitized.MY_TOKEN).toBe('***MASKED***');
      expect(sanitized.PRIVATE_KEY).toBe('***MASKED***');
      expect(sanitized.PUBLIC_URL).toBe('https://example.com');
    });
  });

  describe('validateTaskName', () => {
    it('should validate safe task names', () => {
      expect(validateTaskName('my-task').valid).toBe(true);
      expect(validateTaskName('task_123').valid).toBe(true);
      expect(validateTaskName('DailyTask').valid).toBe(true);
      expect(validateTaskName('tech-news-daily').valid).toBe(true);
    });

    it('should reject task names with special characters', () => {
      expect(validateTaskName('task@123').valid).toBe(false);
      expect(validateTaskName('my task').valid).toBe(false);
      expect(validateTaskName('task!').valid).toBe(false);
    });

    it('should reject task names with path separators', () => {
      expect(validateTaskName('tasks/my-task').valid).toBe(false);
      expect(validateTaskName('..\\evil').valid).toBe(false);
      expect(validateTaskName('../../../etc').valid).toBe(false);
    });

    it('should reject empty or invalid task names', () => {
      expect(validateTaskName('').valid).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(validateTaskName(null).valid).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(validateTaskName(undefined).valid).toBe(false);
    });

    it('should reject task names exceeding length limit', () => {
      const longName = 'a'.repeat(101);
      const result = validateTaskName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 100 characters');
    });

    it('should provide helpful error messages', () => {
      const result = validateTaskName('my task!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('letters, numbers, hyphens, and underscores');
    });
  });
});
