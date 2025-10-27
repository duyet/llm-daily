/**
 * OpenRouter provider implementation
 * Supports routing to various LLM providers through OpenRouter API
 */

import { BaseProvider } from './base.js';
import {
  ProviderConfig,
  ProviderResponse,
  TokenUsage,
  ModelPricing,
  ProviderCapabilities,
  ProviderError,
  ProviderErrorType,
} from '../../types/provider.types.js';

/**
 * OpenRouter API base URL
 */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * OpenRouter API response
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter error response
 */
interface OpenRouterErrorResponse {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * Default pricing fallback for unknown models
 * Uses average pricing across providers
 */
const DEFAULT_PRICING: ModelPricing = {
  input: 0.01,
  output: 0.03,
};

/**
 * OpenRouter provider implementation
 */
export class OpenRouterProvider extends BaseProvider {
  protected readonly providerName = 'openrouter';
  private readonly apiKey: string;
  private pricingCache: Map<string, ModelPricing> = new Map();

  constructor(config: ProviderConfig) {
    super(config);
    this.apiKey = this.getApiKey('OPENROUTER_API_KEY');
  }

  /**
   * Call OpenRouter API with a prompt
   */
  async call(prompt: string): Promise<ProviderResponse> {
    try {
      const response = await this.retry(async () => {
        return await this.makeRequest(prompt);
      });

      // Extract response data
      const content = response.choices[0]?.message?.content ?? '';
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      };

      return this.createResponse(content, usage, false, {
        finishReason: response.choices[0]?.finish_reason,
        model: response.model,
        id: response.id,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make HTTP request to OpenRouter API
   */
  private async makeRequest(prompt: string): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/yourusername/llm-daily',
          'X-Title': 'LLM Daily',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.getTemperature(),
          max_tokens: this.getMaxTokens(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({
          error: { message: response.statusText },
        }))) as OpenRouterErrorResponse;

        throw new Error(
          `OpenRouter API error (${response.status}): ${errorData.error?.message ?? response.statusText}`
        );
      }

      return (await response.json()) as OpenRouterResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Estimate cost based on token usage
   */
  estimateCost(usage: TokenUsage): number {
    const pricing = this.getModelPricing();
    return this.calculateCost(usage, pricing);
  }

  /**
   * Get model pricing information
   * Fetches from OpenRouter API and caches result
   */
  getModelPricing(): ModelPricing {
    // Check cache first
    if (this.pricingCache.has(this.model)) {
      return this.pricingCache.get(this.model)!;
    }

    // For now, use default pricing
    // In a real implementation, you would fetch from OpenRouter's pricing API
    // https://openrouter.ai/api/v1/models
    const pricing = DEFAULT_PRICING;

    // Cache the pricing
    this.pricingCache.set(this.model, pricing);

    return pricing;
  }

  // TODO: Implement dynamic pricing fetching from OpenRouter API
  // Fetch from https://openrouter.ai/api/v1/models and cache pricing data
  // This would improve cost estimation accuracy for various models

  /**
   * Check if model supports prompt caching
   * OpenRouter does not currently support prompt caching
   */
  supportsPromptCaching(): boolean {
    return false;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    // Default capabilities for OpenRouter
    // In a real implementation, this would be fetched from the API
    return {
      promptCaching: false,
      streaming: true,
      functionCalling: true,
      vision: false,
      maxContextTokens: 8192, // Varies by model
    };
  }

  /**
   * Override error handling for OpenRouter-specific errors
   */
  protected handleError(error: unknown): ProviderError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Handle authentication errors
      if (
        message.includes('unauthorized') ||
        message.includes('invalid api key') ||
        message.includes('401')
      ) {
        return new ProviderError(
          ProviderErrorType.AUTH_ERROR,
          `OpenRouter: Invalid API key - ${error.message}`,
          error,
          false
        );
      }

      // Handle rate limiting
      if (message.includes('rate limit') || message.includes('429')) {
        return new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          `OpenRouter: Rate limit exceeded - ${error.message}`,
          error,
          true
        );
      }

      // Handle model not available
      if (message.includes('model not found') || message.includes('404')) {
        return new ProviderError(
          ProviderErrorType.MODEL_UNAVAILABLE,
          `OpenRouter: Model not available - ${error.message}`,
          error,
          false
        );
      }

      // Handle timeout/network errors
      if (message.includes('timeout') || message.includes('aborted') || message.includes('fetch')) {
        return new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          `OpenRouter: Network error - ${error.message}`,
          error,
          true
        );
      }

      // Handle server errors (5xx)
      if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return new ProviderError(
          ProviderErrorType.PROVIDER_ERROR,
          `OpenRouter: Server error - ${error.message}`,
          error,
          true
        );
      }

      // Handle invalid request (4xx)
      if (message.includes('400') || message.includes('invalid')) {
        return new ProviderError(
          ProviderErrorType.INVALID_REQUEST,
          `OpenRouter: Invalid request - ${error.message}`,
          error,
          false
        );
      }
    }

    return super.handleError(error);
  }
}
