/**
 * Unit tests for provider registry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createProvider,
  createProviders,
  registerProvider,
  isProviderRegistered,
  getRegisteredProviders,
  clearProviderCache,
  getCachedProvider,
  setProviderCaching,
  getProviderCacheStats,
} from './registry.js';
import { BaseProvider } from './base.js';
import { ProviderConfig, ProviderErrorType } from '../../types/provider.types.js';

// Mock implementations
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          id: 'test',
          model: 'gpt-4-turbo',
          choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      },
    };
  },
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    id: 'test',
    model: 'test-model',
    choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  }),
});

describe('Provider Registry', () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    clearProviderCache();
    setProviderCaching(true);
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    clearProviderCache();
  });

  describe('createProvider', () => {
    it('should create OpenAI provider', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };

      const provider = createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('openai');
      expect(provider.getModel()).toBe('gpt-4-turbo');
    });

    it('should create OpenRouter provider', () => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
      };

      const provider = createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('openrouter');
      expect(provider.getModel()).toBe('openai/gpt-4-turbo');
    });

    it('should throw error for unsupported provider', () => {
      const config: ProviderConfig = {
        id: 'unsupported:model',
      };

      expect(() => createProvider(config)).toThrow();
    });

    it('should cache provider instances', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };

      const provider1 = createProvider(config);
      const provider2 = createProvider(config);

      expect(provider1).toBe(provider2);
    });

    it('should respect caching setting', () => {
      setProviderCaching(false);

      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };

      const provider1 = createProvider(config);
      const provider2 = createProvider(config);

      expect(provider1).not.toBe(provider2);
    });
  });

  describe('createProviders', () => {
    it('should create multiple providers', () => {
      const configs: ProviderConfig[] = [
        { id: 'openai:gpt-4-turbo' },
        { id: 'openrouter:openai/gpt-4-turbo' },
      ];

      const providers = createProviders(configs);

      expect(providers).toHaveLength(2);
      expect(providers[0].getProviderName()).toBe('openai');
      expect(providers[1].getProviderName()).toBe('openrouter');
    });

    it('should handle empty array', () => {
      const providers = createProviders([]);
      expect(providers).toHaveLength(0);
    });
  });

  describe('registerProvider', () => {
    class CustomProvider extends BaseProvider {
      protected readonly providerName = 'custom';

      async call(prompt: string) {
        return this.createResponse('test', {
          promptTokens: 10,
          completionTokens: 10,
          totalTokens: 20,
        });
      }

      estimateCost() {
        return 0.01;
      }

      getModelPricing() {
        return { input: 0.01, output: 0.01 };
      }

      supportsPromptCaching() {
        return false;
      }

      getCapabilities() {
        return {
          promptCaching: false,
          streaming: false,
          functionCalling: false,
          vision: false,
          maxContextTokens: 4096,
        };
      }
    }

    it('should register custom provider', () => {
      registerProvider('custom', (config) => new CustomProvider(config));

      expect(isProviderRegistered('custom')).toBe(true);
    });

    it('should create custom provider', () => {
      registerProvider('custom', (config) => new CustomProvider(config));

      const config: ProviderConfig = { id: 'custom:test-model' };
      const provider = createProvider(config);

      expect(provider.getProviderName()).toBe('custom');
    });
  });

  describe('isProviderRegistered', () => {
    it('should return true for registered providers', () => {
      expect(isProviderRegistered('openai')).toBe(true);
      expect(isProviderRegistered('openrouter')).toBe(true);
    });

    it('should return false for unregistered providers', () => {
      expect(isProviderRegistered('unregistered')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isProviderRegistered('OpenAI')).toBe(true);
      expect(isProviderRegistered('OPENROUTER')).toBe(true);
    });
  });

  describe('getRegisteredProviders', () => {
    it('should return list of registered providers', () => {
      const providers = getRegisteredProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('openrouter');
      expect(providers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('provider caching', () => {
    it('should cache providers by ID', () => {
      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      const provider = createProvider(config);

      const cached = getCachedProvider(config.id);
      expect(cached).toBe(provider);
    });

    it('should clear cache', () => {
      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      createProvider(config);

      clearProviderCache();

      const cached = getCachedProvider(config.id);
      expect(cached).toBeUndefined();
    });

    it('should get cache stats', () => {
      createProvider({ id: 'openai:gpt-4-turbo' });
      createProvider({ id: 'openrouter:openai/gpt-4-turbo' });

      const stats = getProviderCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.providers).toContain('openai:gpt-4-turbo');
      expect(stats.providers).toContain('openrouter:openai/gpt-4-turbo');
    });

    it('should disable caching', () => {
      setProviderCaching(false);

      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      createProvider(config);

      const cached = getCachedProvider(config.id);
      expect(cached).toBeUndefined();
    });

    it('should clear cache when disabling caching', () => {
      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      createProvider(config);

      setProviderCaching(false);

      const stats = getProviderCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
