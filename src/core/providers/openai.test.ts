/**
 * Unit tests for OpenAI provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from './openai.js';
import { ProviderConfig, ProviderErrorType } from '../../types/provider.types.js';

// Create mock function at module level
const mockCreate = vi.fn();

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  // Set test API key
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Reset mock
    mockCreate.mockReset();
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalEnv;
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };

      provider = new OpenAIProvider(config);

      expect(provider.getProviderName()).toBe('openai');
      expect(provider.getModel()).toBe('gpt-4-turbo');
    });

    it('should use API key from config', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
        config: {
          apiKey: 'custom-api-key',
        },
      };

      provider = new OpenAIProvider(config);
      expect(provider).toBeDefined();
    });

    it('should throw error if API key not found', () => {
      delete process.env.OPENAI_API_KEY;

      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };

      expect(() => new OpenAIProvider(config)).toThrow();
    });
  });

  describe('call', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };
      provider = new OpenAIProvider(config);
    });

    it('should successfully call API and return response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo',
        choices: [
          {
            message: { content: 'Hello! How can I help you?' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const response = await provider.call('Hello');

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.usage.promptTokens).toBe(10);
      expect(response.usage.completionTokens).toBe(8);
      expect(response.usage.totalTokens).toBe(18);
      expect(response.provider).toBe('openai');
      expect(response.model).toBe('gpt-4-turbo');
      expect(response.cost).toBeGreaterThan(0);
    });

    it('should handle caching information', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4-turbo',
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          prompt_tokens_details: {
            cached_tokens: 80,
          },
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const response = await provider.call('Test prompt');

      expect(response.cached).toBe(true);
      expect(response.usage.cachedTokens).toBe(80);
    });

    it('should handle API errors', async () => {
      const apiError = new Error('API Error');
      (apiError as any).status = 401;
      apiError.name = 'APIError';

      mockCreate.mockRejectedValue(apiError);

      await expect(provider.call('Test')).rejects.toThrow();
    });

    it('should use custom temperature and max_tokens', async () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
        config: {
          temperature: 0.5,
          maxTokens: 100,
        },
      };

      provider = new OpenAIProvider(config);

      mockCreate.mockResolvedValue({
        id: 'test',
        model: 'gpt-4-turbo',
        choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      });

      await provider.call('Test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 100,
        })
      );
    });
  });

  describe('estimateCost', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4-turbo',
      };
      provider = new OpenAIProvider(config);
    });

    it('should calculate cost correctly', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = provider.estimateCost(usage);

      // GPT-4 Turbo: $0.01/1K input, $0.03/1K output
      // Expected: (1000/1000 * 0.01) + (500/1000 * 0.03) = 0.01 + 0.015 = 0.025
      expect(cost).toBeCloseTo(0.025, 4);
    });

    it('should include cached token costs', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        cachedTokens: 500,
      };

      const cost = provider.estimateCost(usage);

      // Should include cached token cost (50% of input cost)
      expect(cost).toBeGreaterThan(0.025);
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing for known models', () => {
      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      provider = new OpenAIProvider(config);

      const pricing = provider.getModelPricing();
      expect(pricing.input).toBe(0.01);
      expect(pricing.output).toBe(0.03);
      expect(pricing.cachedInput).toBe(0.005);
    });

    it('should return default pricing for unknown models', () => {
      const config: ProviderConfig = { id: 'openai:unknown-model' };
      provider = new OpenAIProvider(config);

      const pricing = provider.getModelPricing();
      expect(pricing.input).toBeDefined();
      expect(pricing.output).toBeDefined();
    });
  });

  describe('supportsPromptCaching', () => {
    it('should return true for models with caching support', () => {
      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      provider = new OpenAIProvider(config);

      expect(provider.supportsPromptCaching()).toBe(true);
    });

    it('should return false for models without caching support', () => {
      const config: ProviderConfig = { id: 'openai:gpt-3.5-turbo' };
      provider = new OpenAIProvider(config);

      expect(provider.supportsPromptCaching()).toBe(false);
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities for known models', () => {
      const config: ProviderConfig = { id: 'openai:gpt-4-turbo' };
      provider = new OpenAIProvider(config);

      const capabilities = provider.getCapabilities();
      expect(capabilities.promptCaching).toBe(true);
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.functionCalling).toBe(true);
      expect(capabilities.vision).toBe(true);
      expect(capabilities.maxContextTokens).toBe(128000);
    });

    it('should return default capabilities for unknown models', () => {
      const config: ProviderConfig = { id: 'openai:unknown-model' };
      provider = new OpenAIProvider(config);

      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.maxContextTokens).toBeGreaterThan(0);
    });
  });
});
