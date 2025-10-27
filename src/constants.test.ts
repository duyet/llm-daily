/**
 * Tests for application constants
 */

import { describe, it, expect } from 'vitest';
import {
  TIMEOUTS,
  RETRY,
  MEMORY_LIMITS,
  PROVIDER_LIMITS,
  TASK_LIMITS,
  TOKEN_ESTIMATION,
  TIME,
} from './constants.js';

describe('Constants', () => {
  describe('TIMEOUTS', () => {
    it('should have consistent timeout values', () => {
      expect(TIMEOUTS.MIN).toBe(1000);
      expect(TIMEOUTS.PROVIDER_DEFAULT).toBe(30000);
      expect(TIMEOUTS.WEBHOOK_DEFAULT).toBe(10000);
      expect(TIMEOUTS.MAX).toBe(300000);
    });

    it('should have valid timeout ranges', () => {
      expect(TIMEOUTS.MIN).toBeLessThan(TIMEOUTS.PROVIDER_DEFAULT);
      expect(TIMEOUTS.PROVIDER_DEFAULT).toBeLessThan(TIMEOUTS.MAX);
      expect(TIMEOUTS.WEBHOOK_DEFAULT).toBeLessThan(TIMEOUTS.MAX);
    });

    it('should be immutable at TypeScript level', () => {
      // TypeScript prevents modification at compile time
      // Runtime immutability would require Object.freeze() which isn't needed for constants
      expect(TIMEOUTS).toBeDefined();
      expect(Object.isFrozen(TIMEOUTS)).toBe(false); // Not frozen, but TypeScript prevents modification
    });
  });

  describe('RETRY', () => {
    it('should have valid retry configuration', () => {
      expect(RETRY.INITIAL_DELAY).toBe(1000);
      expect(RETRY.MAX_ATTEMPTS).toBe(3);
      expect(RETRY.MAX_DELAY).toBe(10000);
      expect(RETRY.JITTER_FACTOR).toBe(0.1);
    });

    it('should have positive values', () => {
      expect(RETRY.INITIAL_DELAY).toBeGreaterThan(0);
      expect(RETRY.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(RETRY.MAX_DELAY).toBeGreaterThan(0);
      expect(RETRY.JITTER_FACTOR).toBeGreaterThanOrEqual(0);
    });

    it('should have max delay greater than initial delay', () => {
      expect(RETRY.MAX_DELAY).toBeGreaterThan(RETRY.INITIAL_DELAY);
    });
  });

  describe('MEMORY_LIMITS', () => {
    it('should have memory limit values', () => {
      expect(MEMORY_LIMITS.MAX_BODY_LENGTH).toBe(1_000_000);
      expect(MEMORY_LIMITS.MAX_METADATA_KEYS).toBe(50);
      expect(MEMORY_LIMITS.MAX_METADATA_VALUE_LENGTH).toBe(10_000);
      expect(MEMORY_LIMITS.MIN_SIMILARITY_THRESHOLD).toBe(0.0);
      expect(MEMORY_LIMITS.MAX_SIMILARITY_THRESHOLD).toBe(1.0);
    });

    it('should have valid similarity threshold range', () => {
      expect(MEMORY_LIMITS.MIN_SIMILARITY_THRESHOLD).toBeLessThan(
        MEMORY_LIMITS.MAX_SIMILARITY_THRESHOLD
      );
      expect(MEMORY_LIMITS.MIN_SIMILARITY_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(MEMORY_LIMITS.MAX_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });

  describe('PROVIDER_LIMITS', () => {
    it('should have provider limit values', () => {
      expect(PROVIDER_LIMITS.MIN_TEMPERATURE).toBe(0.0);
      expect(PROVIDER_LIMITS.MAX_TEMPERATURE).toBe(2.0);
      expect(PROVIDER_LIMITS.MIN_MAX_TOKENS).toBe(1);
      expect(PROVIDER_LIMITS.MAX_MAX_TOKENS).toBe(200_000);
      expect(PROVIDER_LIMITS.MAX_PROMPT_LENGTH).toBe(500_000);
    });

    it('should have valid temperature range', () => {
      expect(PROVIDER_LIMITS.MIN_TEMPERATURE).toBeLessThan(PROVIDER_LIMITS.MAX_TEMPERATURE);
    });

    it('should have valid token range', () => {
      expect(PROVIDER_LIMITS.MIN_MAX_TOKENS).toBeLessThan(PROVIDER_LIMITS.MAX_MAX_TOKENS);
    });
  });

  describe('TASK_LIMITS', () => {
    it('should have task limit values', () => {
      expect(TASK_LIMITS.MAX_OUTPUT_PATH_LENGTH).toBe(255);
      expect(TASK_LIMITS.MAX_OUTPUTS).toBe(10);
      expect(TASK_LIMITS.MAX_TASK_NAME_LENGTH).toBe(100);
    });

    it('should have positive values', () => {
      expect(TASK_LIMITS.MAX_OUTPUT_PATH_LENGTH).toBeGreaterThan(0);
      expect(TASK_LIMITS.MAX_OUTPUTS).toBeGreaterThan(0);
      expect(TASK_LIMITS.MAX_TASK_NAME_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('TOKEN_ESTIMATION', () => {
    it('should have token estimation values', () => {
      expect(TOKEN_ESTIMATION.CHARS_PER_TOKEN).toBe(4);
      expect(TOKEN_ESTIMATION.COST_DIVISOR).toBe(1000);
      expect(TOKEN_ESTIMATION.MILLI_DOLLAR_DIVISOR).toBe(1000);
    });

    it('should have positive values', () => {
      expect(TOKEN_ESTIMATION.CHARS_PER_TOKEN).toBeGreaterThan(0);
      expect(TOKEN_ESTIMATION.COST_DIVISOR).toBeGreaterThan(0);
      expect(TOKEN_ESTIMATION.MILLI_DOLLAR_DIVISOR).toBeGreaterThan(0);
    });
  });

  describe('TIME', () => {
    it('should have time conversion values', () => {
      expect(TIME.MS_PER_SECOND).toBe(1000);
      expect(TIME.MS_PER_MINUTE).toBe(60_000);
      expect(TIME.MS_PER_HOUR).toBe(3_600_000);
      expect(TIME.MS_PER_DAY).toBe(86_400_000);
    });

    it('should have consistent time conversions', () => {
      expect(TIME.MS_PER_MINUTE).toBe(TIME.MS_PER_SECOND * 60);
      expect(TIME.MS_PER_HOUR).toBe(TIME.MS_PER_MINUTE * 60);
      expect(TIME.MS_PER_DAY).toBe(TIME.MS_PER_HOUR * 24);
    });
  });
});
