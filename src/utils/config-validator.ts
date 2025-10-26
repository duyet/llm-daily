/**
 * Configuration validation using Zod schemas
 * Provides type-safe validation with helpful error messages
 */

import { z } from 'zod';

/**
 * Provider options schema
 */
const providerOptionsSchema = z
  .object({
    apiKey: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
  })
  .catchall(z.unknown());

/**
 * Provider config schema
 */
const providerConfigSchema = z.object({
  id: z
    .string()
    .min(1, 'Provider ID cannot be empty')
    .regex(
      /^[a-z0-9_-]+:[a-z0-9_/-]+$/i,
      'Provider ID must be in format "provider:model" (e.g., "openai:gpt-4-turbo")'
    ),
  config: providerOptionsSchema.optional(),
});

/**
 * Prompt config schema
 */
const promptConfigSchema = z.object({
  text: z.string().min(1, 'Prompt text cannot be empty'),
  label: z.string().optional(),
  vars: z.record(z.string()).optional(),
});

/**
 * Schedule config schema
 */
const scheduleConfigSchema = z.object({
  cron: z
    .string()
    .regex(
      /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
      'Invalid cron expression'
    )
    .optional(),
  timezone: z.string().optional(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
});

/**
 * Caching config schema
 */
const cachingConfigSchema = z.object({
  enabled: z.boolean(),
  ttl: z.number().positive().optional(),
  strategy: z.enum(['memory', 'disk', 'hybrid']).optional(),
  maxSize: z.number().positive().optional(),
});

/**
 * Memory config schema
 */
const memoryConfigSchema = z.object({
  enabled: z.boolean(),
  type: z.enum(['file', 'git', 'both']).optional(),
  path: z.string().optional(),
  maxEntries: z.number().positive().optional(),
  retentionDays: z.number().positive().optional(),
});

/**
 * Git output config schema
 */
const gitOutputConfigSchema = z.object({
  autoCommit: z.boolean(),
  commitMessage: z.string().optional(),
  branch: z.string().optional(),
  createPR: z.boolean().optional(),
});

/**
 * Output config schema
 */
const outputConfigSchema = z.object({
  format: z.enum(['text', 'json', 'markdown', 'yaml']).optional(),
  destination: z.enum(['console', 'file', 'git', 'both']).optional(),
  path: z.string().optional(),
  git: gitOutputConfigSchema.optional(),
  includeMetadata: z.boolean().optional(),
});

/**
 * Retry config schema
 */
const retryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).max(10),
  initialDelay: z.number().positive(),
  maxDelay: z.number().positive(),
  backoffMultiplier: z.number().min(1),
  retryOnRateLimit: z.boolean(),
});

/**
 * Default config schema
 */
const defaultConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  timeout: z.number().positive().optional(),
  retry: retryConfigSchema.optional(),
});

/**
 * Main task config schema
 */
const taskConfigSchema = z.object({
  description: z.string().optional(),
  providers: z.array(providerConfigSchema).min(1, 'At least one provider is required'),
  prompts: z.union([z.array(z.string()), z.array(promptConfigSchema)]).optional(),
  schedule: scheduleConfigSchema.optional(),
  caching: cachingConfigSchema.optional(),
  memory: memoryConfigSchema.optional(),
  output: outputConfigSchema.optional(),
  defaultConfig: defaultConfigSchema.optional(),
});

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/**
 * Validation error type
 */
export interface ValidationError {
  path: string;
  message: string;
  code?: string;
}

/**
 * Validate task configuration
 */
export function validateTaskConfig(
  config: unknown
): ValidationResult<z.infer<typeof taskConfigSchema>> {
  try {
    const result = taskConfigSchema.safeParse(config);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: '',
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(
  config: unknown
): ValidationResult<z.infer<typeof providerConfigSchema>> {
  try {
    const result = providerConfigSchema.safeParse(config);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: '',
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * Validate schedule configuration
 */
export function validateScheduleConfig(
  config: unknown
): ValidationResult<z.infer<typeof scheduleConfigSchema>> {
  try {
    const result = scheduleConfigSchema.safeParse(config);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: '',
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((err) => {
      const pathStr = err.path ? `${err.path}: ` : '';
      return `  - ${pathStr}${err.message}`;
    })
    .join('\n');
}

/**
 * Export schemas for advanced usage
 */
export const schemas = {
  taskConfig: taskConfigSchema,
  providerConfig: providerConfigSchema,
  scheduleConfig: scheduleConfigSchema,
  cachingConfig: cachingConfigSchema,
  memoryConfig: memoryConfigSchema,
  outputConfig: outputConfigSchema,
  retryConfig: retryConfigSchema,
  defaultConfig: defaultConfigSchema,
};
