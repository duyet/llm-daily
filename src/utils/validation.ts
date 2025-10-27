/**
 * Input validation utilities for task configuration and runtime values
 * Prevents invalid inputs from causing runtime errors
 */

import {
  MEMORY_LIMITS,
  PROVIDER_LIMITS,
  TASK_LIMITS,
  TIMEOUTS,
  TOKEN_ESTIMATION,
} from '../constants.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Re-export constants for backward compatibility
 * @deprecated Import from '../constants.js' instead
 */
export { MEMORY_LIMITS, PROVIDER_LIMITS, TASK_LIMITS };

/**
 * Validate memory content length
 */
export function validateMemoryContent(content: string): ValidationResult {
  if (content.length > MEMORY_LIMITS.MAX_BODY_LENGTH) {
    return {
      valid: false,
      error: `Memory content exceeds maximum length of ${MEMORY_LIMITS.MAX_BODY_LENGTH} characters (got ${content.length})`,
    };
  }

  return { valid: true };
}

/**
 * Validate memory metadata
 */
export function validateMemoryMetadata(metadata: Record<string, unknown>): ValidationResult {
  const keys = Object.keys(metadata);

  if (keys.length > MEMORY_LIMITS.MAX_METADATA_KEYS) {
    return {
      valid: false,
      error: `Memory metadata exceeds maximum of ${MEMORY_LIMITS.MAX_METADATA_KEYS} keys (got ${keys.length})`,
    };
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && value.length > MEMORY_LIMITS.MAX_METADATA_VALUE_LENGTH) {
      return {
        valid: false,
        error: `Memory metadata value for "${key}" exceeds maximum length of ${MEMORY_LIMITS.MAX_METADATA_VALUE_LENGTH} characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate similarity threshold
 */
export function validateSimilarityThreshold(threshold: number): ValidationResult {
  if (
    threshold < MEMORY_LIMITS.MIN_SIMILARITY_THRESHOLD ||
    threshold > MEMORY_LIMITS.MAX_SIMILARITY_THRESHOLD
  ) {
    return {
      valid: false,
      error: `Similarity threshold must be between ${MEMORY_LIMITS.MIN_SIMILARITY_THRESHOLD} and ${MEMORY_LIMITS.MAX_SIMILARITY_THRESHOLD} (got ${threshold})`,
    };
  }

  return { valid: true };
}

/**
 * Validate temperature value
 */
export function validateTemperature(temperature: number): ValidationResult {
  if (
    temperature < PROVIDER_LIMITS.MIN_TEMPERATURE ||
    temperature > PROVIDER_LIMITS.MAX_TEMPERATURE
  ) {
    return {
      valid: false,
      error: `Temperature must be between ${PROVIDER_LIMITS.MIN_TEMPERATURE} and ${PROVIDER_LIMITS.MAX_TEMPERATURE} (got ${temperature})`,
    };
  }

  return { valid: true };
}

/**
 * Validate max tokens value
 */
export function validateMaxTokens(maxTokens: number): ValidationResult {
  if (maxTokens < PROVIDER_LIMITS.MIN_MAX_TOKENS || maxTokens > PROVIDER_LIMITS.MAX_MAX_TOKENS) {
    return {
      valid: false,
      error: `Max tokens must be between ${PROVIDER_LIMITS.MIN_MAX_TOKENS} and ${PROVIDER_LIMITS.MAX_MAX_TOKENS} (got ${maxTokens})`,
    };
  }

  return { valid: true };
}

/**
 * Validate timeout value
 */
export function validateTimeout(timeout: number): ValidationResult {
  if (timeout < TIMEOUTS.MIN || timeout > TIMEOUTS.MAX) {
    return {
      valid: false,
      error: `Timeout must be between ${TIMEOUTS.MIN}ms and ${TIMEOUTS.MAX}ms (got ${timeout}ms)`,
    };
  }

  return { valid: true };
}

/**
 * Validate prompt length
 */
export function validatePromptLength(prompt: string): ValidationResult {
  if (prompt.length > PROVIDER_LIMITS.MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Prompt exceeds maximum length of ${PROVIDER_LIMITS.MAX_PROMPT_LENGTH} characters (got ${prompt.length})`,
    };
  }

  return { valid: true };
}

/**
 * Validate output configuration
 */
export function validateOutputConfig(
  outputs: Array<{ path: string; format: string }>
): ValidationResult {
  const warnings: string[] = [];

  if (outputs.length > TASK_LIMITS.MAX_OUTPUTS) {
    return {
      valid: false,
      error: `Task cannot have more than ${TASK_LIMITS.MAX_OUTPUTS} outputs (got ${outputs.length})`,
    };
  }

  for (const output of outputs) {
    if (output.path.length > TASK_LIMITS.MAX_OUTPUT_PATH_LENGTH) {
      return {
        valid: false,
        error: `Output path "${output.path}" exceeds maximum length of ${TASK_LIMITS.MAX_OUTPUT_PATH_LENGTH} characters`,
      };
    }

    // Warn about absolute paths (should be relative to task directory)
    if (output.path.startsWith('/')) {
      warnings.push(
        `Output path "${output.path}" appears to be absolute; consider using relative paths`
      );
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate provider configuration values
 */
export function validateProviderConfig(config: {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.temperature !== undefined) {
    const tempResult = validateTemperature(config.temperature);
    if (!tempResult.valid) {
      errors.push(tempResult.error!);
    }
  }

  if (config.maxTokens !== undefined) {
    const tokensResult = validateMaxTokens(config.maxTokens);
    if (!tokensResult.valid) {
      errors.push(tokensResult.error!);
    }
  }

  if (config.timeout !== undefined) {
    const timeoutResult = validateTimeout(config.timeout);
    if (!timeoutResult.valid) {
      errors.push(timeoutResult.error!);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
    };
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate model context compatibility
 * Warns if prompt + max_tokens might exceed model's context window
 */
export function validateContextWindow(
  promptLength: number,
  maxTokens: number,
  maxContextTokens: number
): ValidationResult {
  // Rough estimate: 1 token ≈ 4 characters
  const estimatedPromptTokens = Math.ceil(promptLength / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
  const totalEstimatedTokens = estimatedPromptTokens + maxTokens;

  const warnings: string[] = [];

  if (totalEstimatedTokens > maxContextTokens) {
    warnings.push(
      `Estimated token usage (${totalEstimatedTokens}) may exceed model context window (${maxContextTokens}). ` +
        `Prompt: ~${estimatedPromptTokens} tokens, Max completion: ${maxTokens} tokens`
    );
  }

  if (totalEstimatedTokens > maxContextTokens * 0.9) {
    warnings.push(
      `Token usage approaching context window limit (${Math.round((totalEstimatedTokens / maxContextTokens) * 100)}% of ${maxContextTokens})`
    );
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
