/**
 * Base provider class for LLM providers
 * All providers must extend this abstract class
 */

import {
  ProviderConfig,
  ProviderResponse,
  ProviderError,
  ProviderErrorType,
  TokenUsage,
  ModelPricing,
  ProviderCapabilities,
} from '../../types/provider.types.js';
import { validateProviderConfig } from '../../utils/validation.js';
import { TIMEOUTS, RETRY, TOKEN_ESTIMATION } from '../../constants.js';

/**
 * Abstract base class for all LLM providers
 */
export abstract class BaseProvider {
  /** Provider name (e.g., "openai", "openrouter") */
  protected abstract readonly providerName: string;

  /** Model name */
  protected readonly model: string;

  /** Provider configuration */
  protected readonly config: ProviderConfig;

  /** Default timeout in milliseconds */
  protected readonly timeout: number = TIMEOUTS.PROVIDER_DEFAULT;

  /**
   * Constructor
   * @param config Provider configuration
   */
  constructor(config: ProviderConfig) {
    this.config = config;
    this.model = this.parseModelFromId(config.id);

    // Validate provider configuration
    const configValidation = validateProviderConfig({
      temperature: config.config?.temperature as number | undefined,
      maxTokens: config.config?.max_tokens as number | undefined,
      timeout: config.config?.timeout as number | undefined,
    });
    if (!configValidation.valid) {
      throw new ProviderError(
        ProviderErrorType.INVALID_REQUEST,
        `Invalid provider configuration: ${configValidation.error}`,
        undefined,
        false
      );
    }
    if (configValidation.warnings) {
      console.warn('Provider configuration warnings:', configValidation.warnings.join('; '));
    }
  }

  /**
   * Call the LLM provider with a prompt
   * @param prompt Input prompt text
   * @returns Provider response with content and metadata
   */
  abstract call(prompt: string): Promise<ProviderResponse>;

  /**
   * Estimate cost for a given number of tokens
   * @param usage Token usage information
   * @returns Estimated cost in USD
   */
  abstract estimateCost(usage: TokenUsage): number;

  /**
   * Get model pricing information
   * @returns Pricing for input and output tokens
   */
  abstract getModelPricing(): ModelPricing;

  /**
   * Check if provider supports prompt caching
   * @returns True if caching is supported
   */
  abstract supportsPromptCaching(): boolean;

  /**
   * Get provider capabilities
   * @returns Provider capabilities object
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Parse model name from provider ID
   * @param id Provider ID (e.g., "openai:gpt-4-turbo")
   * @returns Model name (e.g., "gpt-4-turbo")
   */
  protected parseModelFromId(id: string): string {
    const parts = id.split(':');
    if (parts.length < 2) {
      throw new ProviderError(
        ProviderErrorType.INVALID_REQUEST,
        `Invalid provider ID format: ${id}. Expected format: "provider:model"`
      );
    }
    return parts.slice(1).join(':'); // Handle models with colons in name
  }

  /**
   * Handle errors and convert to ProviderError
   * @param error Original error
   * @returns ProviderError with context
   */
  protected handleError(error: unknown): ProviderError {
    return ProviderError.fromError(error, this.providerName);
  }

  /**
   * Calculate cost from token usage and pricing
   * @param usage Token usage
   * @param pricing Model pricing
   * @returns Total cost in USD
   */
  protected calculateCost(usage: TokenUsage, pricing: ModelPricing): number {
    const inputCost = (usage.promptTokens / TOKEN_ESTIMATION.COST_DIVISOR) * pricing.input;
    const outputCost = (usage.completionTokens / TOKEN_ESTIMATION.COST_DIVISOR) * pricing.output;

    let cachedCost = 0;
    if (usage.cachedTokens && pricing.cachedInput) {
      cachedCost = (usage.cachedTokens / TOKEN_ESTIMATION.COST_DIVISOR) * pricing.cachedInput;
    }

    return inputCost + outputCost + cachedCost;
  }

  /**
   * Create a provider response object
   * @param content Generated text
   * @param usage Token usage
   * @param cached Whether caching was used
   * @param metadata Additional metadata
   * @returns Provider response
   */
  protected createResponse(
    content: string,
    usage: TokenUsage,
    cached: boolean = false,
    metadata?: Record<string, unknown>
  ): ProviderResponse {
    return {
      content,
      usage,
      model: this.model,
      cost: this.estimateCost(usage),
      provider: this.providerName,
      cached,
      metadata,
    };
  }

  /**
   * Get API key from config or environment
   * @param envVarName Environment variable name
   * @returns API key
   * @throws ProviderError if API key not found
   */
  protected getApiKey(envVarName: string): string {
    const apiKey = this.config.config?.apiKey ?? process.env[envVarName];

    if (!apiKey) {
      throw new ProviderError(
        ProviderErrorType.AUTH_ERROR,
        `${this.providerName}: API key not found. Set ${envVarName} environment variable or provide in config.`
      );
    }

    return apiKey;
  }

  /**
   * Get temperature setting
   * @param defaultValue Default temperature if not set
   * @returns Temperature value
   */
  protected getTemperature(defaultValue: number = 0.7): number {
    const temp = this.config.config?.temperature;
    return temp !== undefined ? temp : defaultValue;
  }

  /**
   * Get max tokens setting
   * @param defaultValue Default max tokens if not set
   * @returns Max tokens value
   */
  protected getMaxTokens(defaultValue?: number): number | undefined {
    return this.config.config?.maxTokens ?? defaultValue;
  }

  /**
   * Retry logic with exponential backoff and jitter
   * Prevents thundering herd problem by adding randomness to retry delays
   * @param fn Function to retry
   * @param maxAttempts Maximum retry attempts
   * @param initialDelay Initial delay in ms
   * @returns Result of function
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = RETRY.MAX_ATTEMPTS,
    initialDelay: number = RETRY.INITIAL_DELAY
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const providerError = this.handleError(error);

        // Don't retry on non-retryable errors
        if (!providerError.retryable) {
          throw providerError;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw providerError;
        }

        // Calculate delay with exponential backoff and jitter
        // Jitter prevents thundering herd when many clients retry simultaneously
        const baseDelay = initialDelay * Math.pow(2, attempt);
        const jitter = baseDelay * RETRY.JITTER_FACTOR * (Math.random() - 0.5) * 2;
        const delay = Math.min(baseDelay + jitter, RETRY.MAX_DELAY);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Get provider name
   * @returns Provider name
   */
  public getProviderName(): string {
    return this.providerName;
  }

  /**
   * Get model name
   * @returns Model name
   */
  public getModel(): string {
    return this.model;
  }

  /**
   * Get provider ID
   * @returns Full provider ID
   */
  public getProviderId(): string {
    return this.config.id;
  }
}
