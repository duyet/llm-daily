/**
 * Unit tests for OpenRouter provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterProvider } from './openrouter.js';
import { ProviderConfig, ProviderErrorType } from '../../types/provider.types.js';

// Mock global fetch
global.fetch = vi.fn();

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  const originalEnv = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalEnv;
  });

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
      };

      provider = new OpenRouterProvider(config);

      expect(provider.getProviderName()).toBe('openrouter');
      expect(provider.getModel()).toBe('openai/gpt-4-turbo');
    });

    it('should create provider with free model', () => {
      const config: ProviderConfig = {
        id: 'openrouter:minimax/minimax-m2:free',
      };

      provider = new OpenRouterProvider(config);

      expect(provider.getProviderName()).toBe('openrouter');
      expect(provider.getModel()).toBe('minimax/minimax-m2:free');
    });

    it('should create provider with free vision model', () => {
      const config: ProviderConfig = {
        id: 'openrouter:openrouter/andromeda-alpha',
      };

      provider = new OpenRouterProvider(config);

      expect(provider.getProviderName()).toBe('openrouter');
      expect(provider.getModel()).toBe('openrouter/andromeda-alpha');
    });

    it('should use API key from config', () => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
        config: {
          apiKey: 'custom-api-key',
        },
      };

      provider = new OpenRouterProvider(config);
      expect(provider).toBeDefined();
    });

    it('should throw error if API key not found', () => {
      delete process.env.OPENROUTER_API_KEY;

      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
      };

      expect(() => new OpenRouterProvider(config)).toThrow();
    });
  });

  describe('call', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
      };
      provider = new OpenRouterProvider(config);
    });

    it('should successfully call API and return response', async () => {
      const mockResponse = {
        id: 'gen-123',
        model: 'openai/gpt-4-turbo',
        choices: [
          {
            message: { role: 'assistant', content: 'Hello! How can I help you?' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await provider.call('Hello');

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.usage.promptTokens).toBe(10);
      expect(response.usage.completionTokens).toBe(8);
      expect(response.usage.totalTokens).toBe(18);
      expect(response.provider).toBe('openrouter');
      expect(response.cost).toBeGreaterThan(0);
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      });

      await expect(provider.call('Test')).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Rate Limited',
        json: async () => ({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      await expect(provider.call('Test')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(provider.call('Test')).rejects.toThrow();
    });

    it('should use custom temperature and max_tokens', async () => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
        config: {
          temperature: 0.5,
          maxTokens: 100,
        },
      };

      provider = new OpenRouterProvider(config);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'openai/gpt-4-turbo',
          choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      });

      await provider.call('Test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(100);
    });

    it('should include proper headers in request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test',
          model: 'openai/gpt-4-turbo',
          choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      });

      await provider.call('Test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toContain('Bearer');
    });
  });

  describe('estimateCost', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
      };
      provider = new OpenRouterProvider(config);
    });

    it('should calculate cost using default pricing', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = provider.estimateCost(usage);

      // Should use default pricing
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('getModelPricing', () => {
    it('should return default pricing', () => {
      const config: ProviderConfig = { id: 'openrouter:openai/gpt-4-turbo' };
      provider = new OpenRouterProvider(config);

      const pricing = provider.getModelPricing();
      expect(pricing.input).toBeDefined();
      expect(pricing.output).toBeDefined();
      expect(pricing.input).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(0);
    });
  });

  describe('supportsPromptCaching', () => {
    it('should return false (OpenRouter does not support caching)', () => {
      const config: ProviderConfig = { id: 'openrouter:openai/gpt-4-turbo' };
      provider = new OpenRouterProvider(config);

      expect(provider.supportsPromptCaching()).toBe(false);
    });
  });

  describe('getCapabilities', () => {
    it('should return default capabilities', () => {
      const config: ProviderConfig = { id: 'openrouter:openai/gpt-4-turbo' };
      provider = new OpenRouterProvider(config);

      const capabilities = provider.getCapabilities();
      expect(capabilities.promptCaching).toBe(false);
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.functionCalling).toBe(true);
      expect(capabilities.maxContextTokens).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        id: 'openrouter:openai/gpt-4-turbo',
      };
      provider = new OpenRouterProvider(config);
    });

    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      });

      try {
        await provider.call('Test');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ProviderErrorType.AUTH_ERROR);
      }
    });

    it('should handle model not found errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Model not found' } }),
      });

      try {
        await provider.call('Test');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ProviderErrorType.MODEL_UNAVAILABLE);
      }
    });

    it('should handle server errors as retryable', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      });

      try {
        await provider.call('Test');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ProviderErrorType.PROVIDER_ERROR);
        expect(error.retryable).toBe(true);
      }
    });
  });
});
