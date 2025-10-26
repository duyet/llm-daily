/**
 * Unit tests for provider utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseProviderId,
  extractModelName,
  normalizeProviderName,
  isProviderType,
  isValidProviderId,
  getProviderType,
  getModelFromId,
  createProviderId,
  isSupportedProvider,
  getSupportedProviders,
} from './utils.js';
import { ProviderErrorType } from '../../types/provider.types.js';

describe('Provider Utils', () => {
  describe('parseProviderId', () => {
    it('should parse valid provider ID', () => {
      const result = parseProviderId('openai:gpt-4-turbo');
      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4-turbo',
        fullId: 'openai:gpt-4-turbo',
      });
    });

    it('should handle model with slashes', () => {
      const result = parseProviderId('openrouter:openai/gpt-4-turbo');
      expect(result).toEqual({
        provider: 'openrouter',
        model: 'openai/gpt-4-turbo',
        fullId: 'openrouter:openai/gpt-4-turbo',
      });
    });

    it('should handle model with multiple colons', () => {
      const result = parseProviderId('provider:model:version:variant');
      expect(result).toEqual({
        provider: 'provider',
        model: 'model:version:variant',
        fullId: 'provider:model:version:variant',
      });
    });

    it('should normalize provider name to lowercase', () => {
      const result = parseProviderId('OpenAI:gpt-4-turbo');
      expect(result.provider).toBe('openai');
    });

    it('should throw error for invalid format', () => {
      expect(() => parseProviderId('invalid')).toThrow('Invalid provider ID format');
    });

    it('should throw error for empty string', () => {
      expect(() => parseProviderId('')).toThrow();
    });

    it('should throw error for non-string input', () => {
      expect(() => parseProviderId(null as any)).toThrow();
      expect(() => parseProviderId(undefined as any)).toThrow();
    });

    it('should throw error for empty provider name', () => {
      expect(() => parseProviderId(':model')).toThrow();
    });

    it('should throw error for empty model name', () => {
      expect(() => parseProviderId('provider:')).toThrow();
    });
  });

  describe('extractModelName', () => {
    it('should return model name without prefix', () => {
      expect(extractModelName('gpt-4-turbo')).toBe('gpt-4-turbo');
    });

    it('should extract model from provider-prefixed format', () => {
      expect(extractModelName('openai/gpt-4-turbo')).toBe('gpt-4-turbo');
      expect(extractModelName('anthropic/claude-3-opus')).toBe('claude-3-opus');
    });

    it('should handle multiple slashes', () => {
      expect(extractModelName('org/provider/model')).toBe('model');
    });

    it('should throw error for empty model ID', () => {
      expect(() => extractModelName('')).toThrow();
    });
  });

  describe('normalizeProviderName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeProviderName('OpenAI')).toBe('openai');
      expect(normalizeProviderName('OPENROUTER')).toBe('openrouter');
    });

    it('should trim whitespace', () => {
      expect(normalizeProviderName('  openai  ')).toBe('openai');
    });
  });

  describe('isProviderType', () => {
    it('should return true for matching provider type', () => {
      expect(isProviderType('openai:gpt-4-turbo', 'openai')).toBe(true);
      expect(isProviderType('openrouter:model', 'openrouter')).toBe(true);
    });

    it('should return false for non-matching provider type', () => {
      expect(isProviderType('openai:gpt-4-turbo', 'openrouter')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isProviderType('OpenAI:gpt-4-turbo', 'openai')).toBe(true);
      expect(isProviderType('openai:gpt-4-turbo', 'OpenAI')).toBe(true);
    });

    it('should return false for invalid ID', () => {
      expect(isProviderType('invalid', 'openai')).toBe(false);
    });
  });

  describe('isValidProviderId', () => {
    it('should return true for valid IDs', () => {
      expect(isValidProviderId('openai:gpt-4-turbo')).toBe(true);
      expect(isValidProviderId('openrouter:openai/gpt-4-turbo')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidProviderId('invalid')).toBe(false);
      expect(isValidProviderId('')).toBe(false);
      expect(isValidProviderId(':model')).toBe(false);
      expect(isValidProviderId('provider:')).toBe(false);
    });
  });

  describe('getProviderType', () => {
    it('should extract provider type', () => {
      expect(getProviderType('openai:gpt-4-turbo')).toBe('openai');
      expect(getProviderType('openrouter:model')).toBe('openrouter');
    });

    it('should throw error for invalid ID', () => {
      expect(() => getProviderType('invalid')).toThrow();
    });
  });

  describe('getModelFromId', () => {
    it('should extract model from ID', () => {
      expect(getModelFromId('openai:gpt-4-turbo')).toBe('gpt-4-turbo');
      expect(getModelFromId('openrouter:openai/gpt-4-turbo')).toBe('openai/gpt-4-turbo');
    });

    it('should throw error for invalid ID', () => {
      expect(() => getModelFromId('invalid')).toThrow();
    });
  });

  describe('createProviderId', () => {
    it('should create valid provider ID', () => {
      expect(createProviderId('openai', 'gpt-4-turbo')).toBe('openai:gpt-4-turbo');
      expect(createProviderId('openrouter', 'openai/gpt-4-turbo')).toBe(
        'openrouter:openai/gpt-4-turbo'
      );
    });

    it('should normalize provider name', () => {
      expect(createProviderId('OpenAI', 'gpt-4-turbo')).toBe('openai:gpt-4-turbo');
    });

    it('should throw error for empty provider', () => {
      expect(() => createProviderId('', 'model')).toThrow();
    });

    it('should throw error for empty model', () => {
      expect(() => createProviderId('provider', '')).toThrow();
    });
  });

  describe('isSupportedProvider', () => {
    it('should return true for supported providers', () => {
      expect(isSupportedProvider('openai')).toBe(true);
      expect(isSupportedProvider('openrouter')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isSupportedProvider('OpenAI')).toBe(true);
      expect(isSupportedProvider('OPENROUTER')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(isSupportedProvider('unsupported')).toBe(false);
      expect(isSupportedProvider('anthropic')).toBe(false);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return array of supported providers', () => {
      const providers = getSupportedProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('openrouter');
      expect(providers.length).toBe(2);
    });
  });
});
