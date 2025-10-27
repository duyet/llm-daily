/**
 * Configuration type definitions for LLM Daily
 * Promptfoo-compatible configuration structure
 */

import { z } from 'zod';
import { ProviderConfig } from './provider.types.js';

/**
 * Main task configuration (promptfoo-compatible)
 */
export interface TaskConfig {
  /** Task description and metadata */
  description?: string;
  /** List of LLM providers to use */
  providers: ProviderConfig[];
  /** Task prompts/templates */
  prompts?: string[] | PromptConfig[];
  /** Schedule configuration (cron string or object) */
  schedule?: string | ScheduleConfig;
  /** Job timeout in minutes (default: 30) */
  timeout?: number;
  /** Caching configuration */
  caching?: CachingConfig;
  /** Memory/context configuration */
  memory?: MemoryConfig;
  /** Output configuration */
  output?: OutputConfig;
  /** Default configuration for all providers */
  defaultConfig?: DefaultConfig;
}

/**
 * Prompt configuration
 */
export interface PromptConfig {
  /** Prompt text or template */
  text: string;
  /** Prompt label/name */
  label?: string;
  /** Variables for template interpolation */
  vars?: Record<string, string>;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  /** Cron expression (e.g., "0 9 * * *" for 9 AM daily) */
  cron?: string;
  /** Timezone (e.g., "America/Los_Angeles") */
  timezone?: string;
  /** Whether schedule is enabled */
  enabled?: boolean;
  /** Manual schedule description */
  description?: string;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  /** Whether to enable response caching */
  enabled: boolean;
  /** Cache TTL in seconds */
  ttl?: number;
  /** Cache strategy */
  strategy?: 'memory' | 'disk' | 'hybrid';
  /** Maximum cache size in MB */
  maxSize?: number;
}

/**
 * Memory/context configuration
 */
export interface MemoryConfig {
  /** Whether to enable memory across runs */
  enabled: boolean;
  /** Memory storage type */
  type?: 'file' | 'git' | 'both';
  /** Path to memory storage */
  path?: string;
  /** Maximum memory entries to retain */
  maxEntries?: number;
  /** Memory retention days */
  retentionDays?: number;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Output format */
  format?: 'text' | 'json' | 'markdown' | 'yaml';
  /** Output destination */
  destination?: 'console' | 'file' | 'git' | 'both';
  /** Output file path (if destination includes 'file') */
  path?: string;
  /** Git commit configuration */
  git?: GitOutputConfig;
  /** Whether to include metadata in output */
  includeMetadata?: boolean;
}

/**
 * Git output configuration
 */
export interface GitOutputConfig {
  /** Whether to auto-commit results */
  autoCommit: boolean;
  /** Commit message template */
  commitMessage?: string;
  /** Branch to commit to */
  branch?: string;
  /** Whether to create pull request */
  createPR?: boolean;
}

/**
 * Default configuration applied to all providers
 */
export interface DefaultConfig {
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Default timeout in ms */
  timeout?: number;
  /** Default retry configuration */
  retry?: RetryConfig;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  initialDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Whether to retry on rate limit */
  retryOnRateLimit: boolean;
}

/**
 * Default values for configurations
 */
export const DEFAULT_CONFIG = {
  caching: {
    enabled: false,
    ttl: 3600, // 1 hour
    strategy: 'memory' as const,
    maxSize: 100, // 100 MB
  },
  memory: {
    enabled: false,
    type: 'file' as const,
    path: './memory',
    maxEntries: 100,
    retentionDays: 30,
  },
  output: {
    format: 'text' as const,
    destination: 'console' as const,
    includeMetadata: false,
  },
  schedule: {
    enabled: false,
    timezone: 'UTC',
  },
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryOnRateLimit: true,
  },
} as const;

/**
 * Zod schema for task configuration validation
 */
export const taskConfigSchema = z.object({
  description: z.string().optional(),
  schedule: z
    .union([
      z.string(),
      z.object({
        cron: z.string().optional(),
        timezone: z.string().optional(),
        enabled: z.boolean().optional(),
        description: z.string().optional(),
      }),
    ])
    .optional(),
  timeout: z.number().optional(),
  providers: z.array(
    z.object({
      id: z.string(),
      config: z.record(z.unknown()).optional(),
    })
  ),
  prompts: z
    .union([
      z.array(z.string()),
      z.array(
        z.object({
          text: z.string(),
          label: z.string().optional(),
          vars: z.record(z.string()).optional(),
        })
      ),
    ])
    .optional(),
  caching: z
    .object({
      enabled: z.boolean(),
      ttl: z.number().optional(),
      strategy: z.enum(['memory', 'disk', 'hybrid']).optional(),
      maxSize: z.number().optional(),
    })
    .optional(),
  memory: z
    .object({
      enabled: z.boolean(),
      type: z.enum(['file', 'git', 'both']).optional(),
      path: z.string().optional(),
      maxEntries: z.number().optional(),
      retentionDays: z.number().optional(),
    })
    .optional(),
  output: z
    .object({
      format: z.enum(['text', 'json', 'markdown', 'yaml']).optional(),
      destination: z.enum(['console', 'file', 'git', 'both']).optional(),
      path: z.string().optional(),
      git: z
        .object({
          autoCommit: z.boolean(),
          commitMessage: z.string().optional(),
          branch: z.string().optional(),
          createPR: z.boolean().optional(),
        })
        .optional(),
      includeMetadata: z.boolean().optional(),
    })
    .optional(),
  defaultConfig: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      timeout: z.number().optional(),
      retry: z
        .object({
          maxAttempts: z.number(),
          initialDelay: z.number(),
          maxDelay: z.number(),
          backoffMultiplier: z.number(),
          retryOnRateLimit: z.boolean(),
        })
        .optional(),
    })
    .optional(),
});
