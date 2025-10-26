/**
 * Utility functions for provider management
 */

import { ProviderError, ProviderErrorType } from '../../types/provider.types.js';

/**
 * Parsed provider information
 */
export interface ParsedProviderId {
  /** Provider type (e.g., "openai", "openrouter") */
  provider: string;
  /** Model name (e.g., "gpt-4-turbo", "openai/gpt-4-turbo") */
  model: string;
  /** Full provider ID */
  fullId: string;
}

/**
 * Parse provider ID into components
 * @param id Provider ID (e.g., "openai:gpt-4-turbo")
 * @returns Parsed provider information
 * @throws ProviderError if ID format is invalid
 *
 * @example
 * parseProviderId("openai:gpt-4-turbo")
 * // Returns: { provider: "openai", model: "gpt-4-turbo", fullId: "openai:gpt-4-turbo" }
 *
 * parseProviderId("openrouter:openai/gpt-4-turbo")
 * // Returns: { provider: "openrouter", model: "openai/gpt-4-turbo", fullId: "openrouter:openai/gpt-4-turbo" }
 */
export function parseProviderId(id: string): ParsedProviderId {
  if (!id || typeof id !== 'string') {
    throw new ProviderError(
      ProviderErrorType.INVALID_REQUEST,
      'Provider ID must be a non-empty string'
    );
  }

  const parts = id.split(':');

  if (parts.length < 2) {
    throw new ProviderError(
      ProviderErrorType.INVALID_REQUEST,
      `Invalid provider ID format: "${id}". Expected format: "provider:model" (e.g., "openai:gpt-4-turbo")`
    );
  }

  const provider = parts[0].toLowerCase().trim();
  const model = parts.slice(1).join(':').trim(); // Handle models with colons

  if (!provider) {
    throw new ProviderError(
      ProviderErrorType.INVALID_REQUEST,
      `Provider name cannot be empty in ID: "${id}"`
    );
  }

  if (!model) {
    throw new ProviderError(
      ProviderErrorType.INVALID_REQUEST,
      `Model name cannot be empty in ID: "${id}"`
    );
  }

  return {
    provider,
    model,
    fullId: id,
  };
}

/**
 * Extract model name from various formats
 * Handles both direct model names and provider-prefixed names
 *
 * @param modelId Model identifier
 * @returns Clean model name
 *
 * @example
 * extractModelName("gpt-4-turbo") // "gpt-4-turbo"
 * extractModelName("openai/gpt-4-turbo") // "gpt-4-turbo"
 * extractModelName("anthropic/claude-3-opus") // "claude-3-opus"
 */
export function extractModelName(modelId: string): string {
  if (!modelId) {
    throw new ProviderError(ProviderErrorType.INVALID_REQUEST, 'Model ID cannot be empty');
  }

  // If model has a slash, extract the part after the slash
  const slashIndex = modelId.lastIndexOf('/');
  if (slashIndex !== -1) {
    return modelId.substring(slashIndex + 1);
  }

  return modelId;
}

/**
 * Normalize provider name to lowercase
 * @param provider Provider name
 * @returns Normalized provider name
 */
export function normalizeProviderName(provider: string): string {
  return provider.toLowerCase().trim();
}

/**
 * Check if provider ID matches a specific provider type
 * @param id Provider ID
 * @param providerType Provider type to check
 * @returns True if ID matches provider type
 *
 * @example
 * isProviderType("openai:gpt-4-turbo", "openai") // true
 * isProviderType("openrouter:openai/gpt-4-turbo", "openai") // false
 * isProviderType("openrouter:openai/gpt-4-turbo", "openrouter") // true
 */
export function isProviderType(id: string, providerType: string): boolean {
  try {
    const parsed = parseProviderId(id);
    return parsed.provider === normalizeProviderName(providerType);
  } catch {
    return false;
  }
}

/**
 * Validate provider ID format
 * @param id Provider ID
 * @returns True if valid, false otherwise
 */
export function isValidProviderId(id: string): boolean {
  try {
    parseProviderId(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get provider type from full provider ID
 * @param id Provider ID
 * @returns Provider type
 *
 * @example
 * getProviderType("openai:gpt-4-turbo") // "openai"
 * getProviderType("openrouter:openai/gpt-4-turbo") // "openrouter"
 */
export function getProviderType(id: string): string {
  const parsed = parseProviderId(id);
  return parsed.provider;
}

/**
 * Get model from full provider ID
 * @param id Provider ID
 * @returns Model name
 *
 * @example
 * getModelFromId("openai:gpt-4-turbo") // "gpt-4-turbo"
 * getModelFromId("openrouter:openai/gpt-4-turbo") // "openai/gpt-4-turbo"
 */
export function getModelFromId(id: string): string {
  const parsed = parseProviderId(id);
  return parsed.model;
}

/**
 * Create provider ID from components
 * @param provider Provider type
 * @param model Model name
 * @returns Full provider ID
 *
 * @example
 * createProviderId("openai", "gpt-4-turbo") // "openai:gpt-4-turbo"
 * createProviderId("openrouter", "openai/gpt-4-turbo") // "openrouter:openai/gpt-4-turbo"
 */
export function createProviderId(provider: string, model: string): string {
  if (!provider || !model) {
    throw new ProviderError(
      ProviderErrorType.INVALID_REQUEST,
      'Provider and model names cannot be empty'
    );
  }

  return `${normalizeProviderName(provider)}:${model}`;
}

/**
 * Supported provider types
 */
export const SUPPORTED_PROVIDERS = ['openai', 'openrouter'] as const;

/**
 * Check if a provider type is supported
 * @param provider Provider type
 * @returns True if supported
 */
export function isSupportedProvider(provider: string): boolean {
  return SUPPORTED_PROVIDERS.includes(
    normalizeProviderName(provider) as (typeof SUPPORTED_PROVIDERS)[number]
  );
}

/**
 * Get list of supported providers
 * @returns Array of supported provider names
 */
export function getSupportedProviders(): readonly string[] {
  return SUPPORTED_PROVIDERS;
}
