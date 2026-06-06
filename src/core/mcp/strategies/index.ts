/**
 * Tool call strategies for different LLM formats
 */

export * from './base.js';
export * from './openai.js';
export * from './anthropic.js';
export * from './xml.js';

import { OpenAIToolCallStrategy } from './openai.js';
import { AnthropicToolCallStrategy } from './anthropic.js';
import { XMLToolCallStrategy } from './xml.js';
import type { ToolCallStrategy } from './base.js';

/**
 * Get appropriate strategy for a provider
 * @param providerName Provider name (e.g., "openai", "anthropic")
 * @param preferredStrategy Optional preferred strategy name
 * @returns Tool call strategy instance
 */
export function getStrategyForProvider(
  providerName: string,
  preferredStrategy?: string
): ToolCallStrategy {
  // If preferred strategy specified, use it
  if (preferredStrategy) {
    switch (preferredStrategy.toLowerCase()) {
      case 'openai':
        return new OpenAIToolCallStrategy();
      case 'anthropic':
      case 'claude':
        return new AnthropicToolCallStrategy();
      case 'xml':
        return new XMLToolCallStrategy();
    }
  }

  // Auto-select based on provider
  switch (providerName.toLowerCase()) {
    case 'openai':
      return new OpenAIToolCallStrategy();
    case 'anthropic':
    case 'claude':
      return new AnthropicToolCallStrategy();
    default:
      // Fallback to XML strategy
      return new XMLToolCallStrategy();
  }
}

/**
 * Get all available strategies
 */
export function getAllStrategies(): ToolCallStrategy[] {
  return [
    new OpenAIToolCallStrategy(),
    new AnthropicToolCallStrategy(),
    new XMLToolCallStrategy(),
  ];
}
