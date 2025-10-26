/**
 * OpenAI provider implementation
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5, and other OpenAI models
 */

import OpenAI from 'openai';
import { BaseProvider } from './base.js';
import {
  ProviderResponse,
  TokenUsage,
  ModelPricing,
  ProviderCapabilities,
  ProviderError,
  ProviderErrorType,
} from '../../types/provider.types.js';

/**
 * OpenAI model pricing (as of 2024)
 * Prices are per 1K tokens in USD
 */
const OPENAI_PRICING: Record<string, ModelPricing> = {
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
    cachedInput: 0.005, // 50% discount for cached prompts
  },
  'gpt-4-turbo-preview': {
    input: 0.01,
    output: 0.03,
    cachedInput: 0.005,
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
  },
  'gpt-4-32k': {
    input: 0.06,
    output: 0.12,
  },
  'gpt-4o': {
    input: 0.005,
    output: 0.015,
    cachedInput: 0.0025,
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
    cachedInput: 0.000075,
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
  'gpt-3.5-turbo-16k': {
    input: 0.003,
    output: 0.004,
  },
};

/**
 * OpenAI model capabilities
 */
const OPENAI_CAPABILITIES: Record<string, ProviderCapabilities> = {
  'gpt-4-turbo': {
    promptCaching: true,
    streaming: true,
    functionCalling: true,
    vision: true,
    maxContextTokens: 128000,
  },
  'gpt-4-turbo-preview': {
    promptCaching: true,
    streaming: true,
    functionCalling: true,
    vision: true,
    maxContextTokens: 128000,
  },
  'gpt-4': {
    promptCaching: false,
    streaming: true,
    functionCalling: true,
    vision: false,
    maxContextTokens: 8192,
  },
  'gpt-4-32k': {
    promptCaching: false,
    streaming: true,
    functionCalling: true,
    vision: false,
    maxContextTokens: 32768,
  },
  'gpt-4o': {
    promptCaching: true,
    streaming: true,
    functionCalling: true,
    vision: true,
    maxContextTokens: 128000,
  },
  'gpt-4o-mini': {
    promptCaching: true,
    streaming: true,
    functionCalling: true,
    vision: true,
    maxContextTokens: 128000,
  },
  'gpt-3.5-turbo': {
    promptCaching: false,
    streaming: true,
    functionCalling: true,
    vision: false,
    maxContextTokens: 16384,
  },
  'gpt-3.5-turbo-16k': {
    promptCaching: false,
    streaming: true,
    functionCalling: true,
    vision: false,
    maxContextTokens: 16384,
  },
};

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  protected readonly providerName = 'openai';
  private client: OpenAI;

  constructor(config: any) {
    super(config);

    const apiKey = this.getApiKey('OPENAI_API_KEY');

    this.client = new OpenAI({
      apiKey,
      timeout: this.timeout,
    });
  }

  /**
   * Call OpenAI API with a prompt
   */
  async call(prompt: string): Promise<ProviderResponse> {
    try {
      const response = await this.retry(async () => {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.getTemperature(),
          max_tokens: this.getMaxTokens(),
        });

        return completion;
      });

      // Extract response data
      const content = response.choices[0]?.message?.content ?? '';
      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      };

      // Check if caching was used (OpenAI returns this in usage metadata)
      const cached = this.detectCaching(response);
      if (cached && response.usage?.prompt_tokens_details) {
        usage.cachedTokens = (response.usage.prompt_tokens_details as any).cached_tokens ?? 0;
      }

      return this.createResponse(content, usage, cached, {
        finishReason: response.choices[0]?.finish_reason,
        model: response.model,
        id: response.id,
      });
    } catch (error) {
      throw this.handleError(error);
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
   */
  getModelPricing(): ModelPricing {
    const pricing = OPENAI_PRICING[this.model];

    if (!pricing) {
      // Default pricing for unknown models (use GPT-4 Turbo as baseline)
      return {
        input: 0.01,
        output: 0.03,
        cachedInput: 0.005,
      };
    }

    return pricing;
  }

  /**
   * Check if model supports prompt caching
   */
  supportsPromptCaching(): boolean {
    const capabilities = this.getCapabilities();
    return capabilities.promptCaching;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    const capabilities = OPENAI_CAPABILITIES[this.model];

    if (!capabilities) {
      // Default capabilities for unknown models
      return {
        promptCaching: false,
        streaming: true,
        functionCalling: true,
        vision: false,
        maxContextTokens: 8192,
      };
    }

    return capabilities;
  }

  /**
   * Detect if caching was used in the response
   * OpenAI includes caching information in the usage metadata
   */
  private detectCaching(response: OpenAI.Chat.Completions.ChatCompletion): boolean {
    if (!response.usage) {
      return false;
    }

    // Check for cached tokens in prompt_tokens_details
    const promptDetails = response.usage.prompt_tokens_details as any;
    return (promptDetails?.cached_tokens ?? 0) > 0;
  }

  /**
   * Override error handling for OpenAI-specific errors
   */
  protected handleError(error: unknown): ProviderError {
    if (error instanceof OpenAI.APIError) {
      // Map OpenAI error types to our error types
      if (error.status === 401) {
        return new ProviderError(
          ProviderErrorType.AUTH_ERROR,
          `OpenAI: Invalid API key - ${error.message}`,
          error,
          false
        );
      }

      if (error.status === 429) {
        return new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          `OpenAI: Rate limit exceeded - ${error.message}`,
          error,
          true
        );
      }

      if (error.status === 404) {
        return new ProviderError(
          ProviderErrorType.MODEL_UNAVAILABLE,
          `OpenAI: Model not found - ${error.message}`,
          error,
          false
        );
      }

      if (error.status >= 500) {
        return new ProviderError(
          ProviderErrorType.PROVIDER_ERROR,
          `OpenAI: Server error - ${error.message}`,
          error,
          true
        );
      }

      return new ProviderError(
        ProviderErrorType.INVALID_REQUEST,
        `OpenAI: ${error.message}`,
        error,
        false
      );
    }

    return super.handleError(error);
  }
}
