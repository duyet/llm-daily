/**
 * Tests for input validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateMemoryContent,
  validateMemoryMetadata,
  validateSimilarityThreshold,
  validateTemperature,
  validateMaxTokens,
  validateTimeout,
  validatePromptLength,
  validateOutputConfig,
  validateProviderConfig,
  validateContextWindow,
  MEMORY_LIMITS,
  PROVIDER_LIMITS,
  TASK_LIMITS,
} from './validation.js';

describe('Validation Utilities', () => {
  describe('validateMemoryContent', () => {
    it('should accept valid content length', () => {
      const result = validateMemoryContent('Hello world');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject content exceeding max length', () => {
      const longContent = 'x'.repeat(MEMORY_LIMITS.MAX_BODY_LENGTH + 1);
      const result = validateMemoryContent(longContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
      expect(result.error).toContain(MEMORY_LIMITS.MAX_BODY_LENGTH.toString());
    });

    it('should accept content at exact max length', () => {
      const content = 'x'.repeat(MEMORY_LIMITS.MAX_BODY_LENGTH);
      const result = validateMemoryContent(content);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMemoryMetadata', () => {
    it('should accept valid metadata', () => {
      const metadata = { key1: 'value1', key2: 'value2' };
      const result = validateMemoryMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    it('should reject metadata exceeding max keys', () => {
      const metadata: Record<string, string> = {};
      for (let i = 0; i < MEMORY_LIMITS.MAX_METADATA_KEYS + 1; i++) {
        metadata[`key${i}`] = 'value';
      }
      const result = validateMemoryMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject metadata value exceeding max length', () => {
      const longValue = 'x'.repeat(MEMORY_LIMITS.MAX_METADATA_VALUE_LENGTH + 1);
      const metadata = { key: longValue };
      const result = validateMemoryMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should accept non-string metadata values', () => {
      const metadata = {
        string: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
      };
      const result = validateMemoryMetadata(metadata);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSimilarityThreshold', () => {
    it('should accept valid thresholds', () => {
      expect(validateSimilarityThreshold(0.0).valid).toBe(true);
      expect(validateSimilarityThreshold(0.5).valid).toBe(true);
      expect(validateSimilarityThreshold(1.0).valid).toBe(true);
    });

    it('should reject threshold below minimum', () => {
      const result = validateSimilarityThreshold(-0.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be between');
    });

    it('should reject threshold above maximum', () => {
      const result = validateSimilarityThreshold(1.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be between');
    });
  });

  describe('validateTemperature', () => {
    it('should accept valid temperatures', () => {
      expect(validateTemperature(0.0).valid).toBe(true);
      expect(validateTemperature(0.7).valid).toBe(true);
      expect(validateTemperature(2.0).valid).toBe(true);
    });

    it('should reject temperature below minimum', () => {
      const result = validateTemperature(-0.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Temperature must be between');
    });

    it('should reject temperature above maximum', () => {
      const result = validateTemperature(2.1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Temperature must be between');
    });
  });

  describe('validateMaxTokens', () => {
    it('should accept valid token counts', () => {
      expect(validateMaxTokens(1).valid).toBe(true);
      expect(validateMaxTokens(4000).valid).toBe(true);
      expect(validateMaxTokens(200_000).valid).toBe(true);
    });

    it('should reject tokens below minimum', () => {
      const result = validateMaxTokens(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Max tokens must be between');
    });

    it('should reject tokens above maximum', () => {
      const result = validateMaxTokens(200_001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Max tokens must be between');
    });
  });

  describe('validateTimeout', () => {
    it('should accept valid timeouts', () => {
      expect(validateTimeout(1000).valid).toBe(true);
      expect(validateTimeout(30000).valid).toBe(true);
      expect(validateTimeout(300_000).valid).toBe(true);
    });

    it('should reject timeout below minimum', () => {
      const result = validateTimeout(999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timeout must be between');
    });

    it('should reject timeout above maximum', () => {
      const result = validateTimeout(300_001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timeout must be between');
    });
  });

  describe('validatePromptLength', () => {
    it('should accept valid prompt lengths', () => {
      const result = validatePromptLength('Hello world');
      expect(result.valid).toBe(true);
    });

    it('should reject prompt exceeding max length', () => {
      const longPrompt = 'x'.repeat(PROVIDER_LIMITS.MAX_PROMPT_LENGTH + 1);
      const result = validatePromptLength(longPrompt);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should accept prompt at exact max length', () => {
      const prompt = 'x'.repeat(PROVIDER_LIMITS.MAX_PROMPT_LENGTH);
      const result = validatePromptLength(prompt);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateOutputConfig', () => {
    it('should accept valid output configuration', () => {
      const outputs = [
        { path: 'output.txt', format: 'text' },
        { path: 'output.json', format: 'json' },
      ];
      const result = validateOutputConfig(outputs);
      expect(result.valid).toBe(true);
    });

    it('should reject too many outputs', () => {
      const outputs = Array.from({ length: TASK_LIMITS.MAX_OUTPUTS + 1 }, (_, i) => ({
        path: `output${i}.txt`,
        format: 'text',
      }));
      const result = validateOutputConfig(outputs);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot have more than');
    });

    it('should reject output path exceeding max length', () => {
      const longPath = 'x'.repeat(TASK_LIMITS.MAX_OUTPUT_PATH_LENGTH + 1);
      const outputs = [{ path: longPath, format: 'text' }];
      const result = validateOutputConfig(outputs);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should warn about absolute paths', () => {
      const outputs = [{ path: '/absolute/path/output.txt', format: 'text' }];
      const result = validateOutputConfig(outputs);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('appears to be absolute');
    });

    it('should accept relative paths without warnings', () => {
      const outputs = [{ path: 'relative/path/output.txt', format: 'text' }];
      const result = validateOutputConfig(outputs);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('validateProviderConfig', () => {
    it('should accept valid provider configuration', () => {
      const config = {
        temperature: 0.7,
        maxTokens: 4000,
        timeout: 30000,
      };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid temperature', () => {
      const config = { temperature: 3.0 };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Temperature');
    });

    it('should reject invalid max tokens', () => {
      const config = { maxTokens: 300_000 };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Max tokens');
    });

    it('should reject invalid timeout', () => {
      const config = { timeout: 500 };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('should report multiple errors', () => {
      const config = {
        temperature: 3.0,
        maxTokens: 0,
        timeout: 500,
      };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Temperature');
      expect(result.error).toContain('Max tokens');
      expect(result.error).toContain('Timeout');
    });

    it('should accept partial configuration', () => {
      const config = { temperature: 0.5 };
      const result = validateProviderConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should accept empty configuration', () => {
      const result = validateProviderConfig({});
      expect(result.valid).toBe(true);
    });
  });

  describe('validateContextWindow', () => {
    it('should accept prompt + tokens within context window', () => {
      const result = validateContextWindow(4000, 2000, 8192); // ~1000 + 2000 = 3000 < 8192
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeUndefined();
    });

    it('should warn when approaching context window (>90%)', () => {
      const result = validateContextWindow(28000, 2000, 8192); // ~7000 + 2000 = 9000 > 8192
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('may exceed');
    });

    it('should warn when exceeding context window', () => {
      const result = validateContextWindow(40000, 4000, 8192); // ~10000 + 4000 = 14000 > 8192
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle large context windows', () => {
      const result = validateContextWindow(100000, 50000, 200000); // ~25000 + 50000 = 75000 < 200000
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('Constants', () => {
    it('should export memory limits', () => {
      expect(MEMORY_LIMITS.MAX_BODY_LENGTH).toBeDefined();
      expect(MEMORY_LIMITS.MAX_METADATA_KEYS).toBeDefined();
      expect(MEMORY_LIMITS.MAX_METADATA_VALUE_LENGTH).toBeDefined();
    });

    it('should export provider limits', () => {
      expect(PROVIDER_LIMITS.MIN_TEMPERATURE).toBeDefined();
      expect(PROVIDER_LIMITS.MAX_TEMPERATURE).toBeDefined();
      expect(PROVIDER_LIMITS.MIN_MAX_TOKENS).toBeDefined();
      expect(PROVIDER_LIMITS.MAX_MAX_TOKENS).toBeDefined();
    });

    it('should export task limits', () => {
      expect(TASK_LIMITS.MAX_OUTPUT_PATH_LENGTH).toBeDefined();
      expect(TASK_LIMITS.MAX_OUTPUTS).toBeDefined();
    });
  });
});
