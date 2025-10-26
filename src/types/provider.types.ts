/**
 * Provider type definitions for LLM providers
 * Supports OpenAI and OpenRouter with extensible architecture
 */

/**
 * Base configuration for any LLM provider
 */
export interface ProviderConfig {
  /** Provider ID in format "provider:model" (e.g., "openai:gpt-4-turbo") */
  id: string;
  /** Provider-specific configuration */
  config?: ProviderOptions;
}

/**
 * Provider-specific options
 */
export interface ProviderOptions {
  /** API key for authentication (optional if set via environment) */
  apiKey?: string;
  /** Temperature for response randomness (0.0-2.0) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Additional provider-specific options */
  [key: string]: unknown;
}

/**
 * Response from an LLM provider
 */
export interface ProviderResponse {
  /** Generated text content */
  content: string;
  /** Token usage information */
  usage: TokenUsage;
  /** Model used for generation */
  model: string;
  /** Estimated cost in USD */
  cost: number;
  /** Provider name (e.g., "openai", "openrouter") */
  provider: string;
  /** Whether prompt caching was used */
  cached?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  /** Input tokens (prompt) */
  promptTokens: number;
  /** Output tokens (completion) */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
  /** Cached tokens (if applicable) */
  cachedTokens?: number;
}

/**
 * Error types for provider operations
 */
export enum ProviderErrorType {
  /** Authentication failed */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Rate limit exceeded */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Invalid request parameters */
  INVALID_REQUEST = 'INVALID_REQUEST',
  /** Model not available */
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  /** Network/connection error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Provider internal error */
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Provider error with additional context
 */
export class ProviderError extends Error {
  constructor(
    public type: ProviderErrorType,
    message: string,
    public originalError?: unknown,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
    Object.setPrototypeOf(this, ProviderError.prototype);
  }

  /**
   * Create error from unknown error object
   */
  static fromError(error: unknown, provider: string): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for common error patterns
      const message = error.message.toLowerCase();

      if (message.includes('api key') || message.includes('unauthorized')) {
        return new ProviderError(
          ProviderErrorType.AUTH_ERROR,
          `${provider}: Authentication failed - ${error.message}`,
          error,
          false
        );
      }

      if (message.includes('rate limit')) {
        return new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          `${provider}: Rate limit exceeded - ${error.message}`,
          error,
          true
        );
      }

      if (message.includes('not found') || message.includes('model')) {
        return new ProviderError(
          ProviderErrorType.MODEL_UNAVAILABLE,
          `${provider}: Model not available - ${error.message}`,
          error,
          false
        );
      }

      if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnrefused')
      ) {
        return new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          `${provider}: Network error - ${error.message}`,
          error,
          true
        );
      }

      return new ProviderError(
        ProviderErrorType.PROVIDER_ERROR,
        `${provider}: ${error.message}`,
        error,
        false
      );
    }

    return new ProviderError(
      ProviderErrorType.UNKNOWN_ERROR,
      `${provider}: Unknown error occurred`,
      error,
      false
    );
  }
}

/**
 * Model pricing information
 */
export interface ModelPricing {
  /** Cost per 1K input tokens in USD */
  input: number;
  /** Cost per 1K output tokens in USD */
  output: number;
  /** Cost per 1K cached input tokens (if applicable) */
  cachedInput?: number;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  /** Supports prompt caching */
  promptCaching: boolean;
  /** Supports streaming responses */
  streaming: boolean;
  /** Supports function calling */
  functionCalling: boolean;
  /** Supports vision/image inputs */
  vision: boolean;
  /** Maximum context window size */
  maxContextTokens: number;
}
