/**
 * Cost calculator for LLM providers
 */

interface ModelPricing {
  /** Cost per 1M input tokens in USD */
  input: number;

  /** Cost per 1M output tokens in USD */
  output: number;
}

/**
 * Pricing database (as of January 2025)
 * Prices are in USD per 1 million tokens
 */
const PRICING_DB: Record<string, ModelPricing> = {
  // OpenAI GPT-4 models
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },

  // OpenAI O1 models
  o1: { input: 15.0, output: 60.0 },
  'o1-mini': { input: 3.0, output: 12.0 },

  // OpenAI GPT-3.5 models
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Claude models (via OpenRouter)
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
  'anthropic/claude-3-sonnet': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },

  // Other popular models
  'google/gemini-pro': { input: 0.5, output: 1.5 },
  'meta-llama/llama-3.1-70b-instruct': { input: 0.5, output: 0.75 },
  'mistralai/mistral-large': { input: 2.0, output: 6.0 },
};

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Normalize model name
  const normalizedModel = normalizeModelName(model);

  // Get pricing
  const pricing = PRICING_DB[normalizedModel];

  if (!pricing) {
    // Unknown model - use conservative estimate
    console.warn(`Unknown model pricing: ${model}, using default estimate`);
    return ((inputTokens + outputTokens) / 1_000_000) * 5.0; // $5/1M tokens average
  }

  // Calculate cost
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Normalize model name to match pricing database
 */
function normalizeModelName(model: string): string {
  // Remove version suffixes like -1106, -0125, -2024-05-13, etc.
  const cleaned = model.replace(/-\d{4}(-\d{2}-\d{2})?(-preview)?$/, '');

  // Handle OpenAI shortcuts
  if (cleaned === 'gpt-4-32k') return 'gpt-4';
  if (cleaned === 'gpt-3.5-turbo-16k') return 'gpt-3.5-turbo';

  return cleaned;
}

/**
 * Get pricing information for a model
 */
export function getModelPricing(model: string): ModelPricing | null {
  const normalizedModel = normalizeModelName(model);
  return PRICING_DB[normalizedModel] || null;
}

/**
 * List all available model pricing
 */
export function listAvailableModels(): Array<{ model: string; pricing: ModelPricing }> {
  return Object.entries(PRICING_DB).map(([model, pricing]) => ({
    model,
    pricing,
  }));
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}m`; // Show in milli-dollars
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Estimate cost for a prompt
 * Rough estimate: 1 token ≈ 4 characters
 */
export function estimatePromptCost(
  model: string,
  promptText: string,
  expectedOutputTokens: number = 500
): number {
  const estimatedInputTokens = Math.ceil(promptText.length / 4);
  return calculateCost(model, estimatedInputTokens, expectedOutputTokens);
}
