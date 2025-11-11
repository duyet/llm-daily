/**
 * Provider registry for creating and managing LLM providers
 * Implements factory pattern with caching for efficiency
 */

import { BaseProvider } from './base.js';
import { OpenAIProvider } from './openai.js';
import { OpenRouterProvider } from './openrouter.js';
import { ProviderConfig, ProviderError, ProviderErrorType } from '../../types/provider.types.js';
import { parseProviderId } from './utils.js';
import { MCPWrapper } from '../mcp/wrapper.js';

/**
 * Provider factory function type
 */
type ProviderFactory = (config: ProviderConfig) => BaseProvider;

/**
 * Provider registry class
 */
class ProviderRegistry {
  /** Registered provider factories */
  private factories: Map<string, ProviderFactory> = new Map();

  /** Cache of provider instances */
  private providerCache: Map<string, BaseProvider> = new Map();

  /** Whether caching is enabled */
  private cachingEnabled: boolean = true;

  constructor() {
    this.registerDefaultProviders();
  }

  /**
   * Register default providers
   */
  private registerDefaultProviders(): void {
    this.register('openai', (config) => new OpenAIProvider(config));
    this.register('openrouter', (config) => new OpenRouterProvider(config));
  }

  /**
   * Register a new provider type
   * @param providerType Provider type name (e.g., "openai")
   * @param factory Factory function to create provider instance
   */
  register(providerType: string, factory: ProviderFactory): void {
    this.factories.set(providerType.toLowerCase(), factory);
  }

  /**
   * Check if a provider type is registered
   * @param providerType Provider type name
   * @returns True if registered
   */
  isRegistered(providerType: string): boolean {
    return this.factories.has(providerType.toLowerCase());
  }

  /**
   * Create a provider instance
   * @param config Provider configuration
   * @returns Provider instance
   * @throws ProviderError if provider type is not supported
   */
  create(config: ProviderConfig): BaseProvider {
    // Parse provider ID
    const parsed = parseProviderId(config.id);

    // Check if provider type is supported
    if (!this.isRegistered(parsed.provider)) {
      throw new ProviderError(
        ProviderErrorType.INVALID_REQUEST,
        `Unsupported provider type: "${parsed.provider}". Supported providers: ${Array.from(this.factories.keys()).join(', ')}`
      );
    }

    // Check cache first
    if (this.cachingEnabled) {
      const cached = this.providerCache.get(config.id);
      if (cached) {
        return cached;
      }
    }

    // Create new provider instance
    const factory = this.factories.get(parsed.provider)!;
    const provider = factory(config);

    // Cache the provider
    if (this.cachingEnabled) {
      this.providerCache.set(config.id, provider);
    }

    return provider;
  }

  /**
   * Create a provider and optionally wrap with MCP
   * @param config Provider configuration
   * @returns Provider instance (wrapped with MCP if enabled)
   */
  createWithMCP(config: ProviderConfig): BaseProvider {
    // Create base provider
    const provider = this.create(config);

    // Wrap with MCP if enabled in config
    if (config.config?.mcp?.enabled) {
      return new MCPWrapper(config, provider, config.config.mcp);
    }

    return provider;
  }

  /**
   * Create multiple providers from configs
   * @param configs Array of provider configurations
   * @returns Array of provider instances
   */
  createMultiple(configs: ProviderConfig[]): BaseProvider[] {
    return configs.map((config) => this.create(config));
  }

  /**
   * Get a cached provider instance
   * @param providerId Provider ID
   * @returns Cached provider or undefined
   */
  getCached(providerId: string): BaseProvider | undefined {
    return this.providerCache.get(providerId);
  }

  /**
   * Clear provider cache
   */
  clearCache(): void {
    this.providerCache.clear();
  }

  /**
   * Remove specific provider from cache
   * @param providerId Provider ID to remove
   */
  removeFromCache(providerId: string): void {
    this.providerCache.delete(providerId);
  }

  /**
   * Enable or disable caching
   * @param enabled Whether caching should be enabled
   */
  setCachingEnabled(enabled: boolean): void {
    this.cachingEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Get list of registered provider types
   * @returns Array of provider type names
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; providers: string[] } {
    return {
      size: this.providerCache.size,
      providers: Array.from(this.providerCache.keys()),
    };
  }
}

/**
 * Global provider registry instance
 */
const registry = new ProviderRegistry();

/**
 * Create a provider from configuration
 * @param config Provider configuration
 * @returns Provider instance
 *
 * @example
 * const provider = createProvider({ id: 'openai:gpt-4-turbo' });
 * const response = await provider.call('Hello, world!');
 */
export function createProvider(config: ProviderConfig): BaseProvider {
  return registry.create(config);
}

/**
 * Create multiple providers from configurations
 * @param configs Array of provider configurations
 * @returns Array of provider instances
 *
 * @example
 * const providers = createProviders([
 *   { id: 'openai:gpt-4-turbo' },
 *   { id: 'openrouter:anthropic/claude-3-opus' }
 * ]);
 */
export function createProviders(configs: ProviderConfig[]): BaseProvider[] {
  return registry.createMultiple(configs);
}

/**
 * Create a provider and optionally wrap with MCP if enabled
 * @param config Provider configuration
 * @returns Provider instance (wrapped with MCP if enabled)
 *
 * @example
 * const provider = createProviderWithMCP({
 *   id: 'openai:gpt-4o-mini',
 *   config: {
 *     mcp: {
 *       enabled: true,
 *       servers: [...]
 *     }
 *   }
 * });
 */
export function createProviderWithMCP(config: ProviderConfig): BaseProvider {
  return registry.createWithMCP(config);
}

/**
 * Register a custom provider type
 * @param providerType Provider type name
 * @param factory Factory function
 *
 * @example
 * registerProvider('custom', (config) => new CustomProvider(config));
 */
export function registerProvider(providerType: string, factory: ProviderFactory): void {
  registry.register(providerType, factory);
}

/**
 * Check if a provider type is registered
 * @param providerType Provider type name
 * @returns True if registered
 */
export function isProviderRegistered(providerType: string): boolean {
  return registry.isRegistered(providerType);
}

/**
 * Get list of registered providers
 * @returns Array of provider type names
 */
export function getRegisteredProviders(): string[] {
  return registry.getRegisteredProviders();
}

/**
 * Clear provider cache
 */
export function clearProviderCache(): void {
  registry.clearCache();
}

/**
 * Get cached provider instance
 * @param providerId Provider ID
 * @returns Cached provider or undefined
 */
export function getCachedProvider(providerId: string): BaseProvider | undefined {
  return registry.getCached(providerId);
}

/**
 * Enable or disable provider caching
 * @param enabled Whether caching should be enabled
 */
export function setProviderCaching(enabled: boolean): void {
  registry.setCachingEnabled(enabled);
}

/**
 * Get provider cache statistics
 * @returns Cache statistics
 */
export function getProviderCacheStats(): { size: number; providers: string[] } {
  return registry.getCacheStats();
}

/**
 * Export registry for advanced usage
 */
export { registry as providerRegistry };
