/**
 * Output integration types
 */

export interface TaskResult {
  /** Task name */
  taskName: string;

  /** Execution timestamp */
  timestamp: string;

  /** Success status */
  success: boolean;

  /** LLM response */
  response: string;

  /** Metadata */
  metadata: {
    provider: string;
    model: string;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    responseTime: number;
  };

  /** Error if failed */
  error?: string;
}

export interface OutputIntegration {
  /** Output type identifier */
  type: 'commit' | 'webhook' | 'file';

  /** Execute the output action */
  execute(result: TaskResult): Promise<void>;
}

export interface CommitOutputConfig {
  /** Path to write JSON data (relative to repo root) */
  path: string;

  /** Whether to update memory.md */
  updateMemory?: boolean;

  /** Custom commit message template */
  message?: string;
}

export interface WebhookOutputConfig {
  /** Webhook URL to POST to */
  url: string;

  /** HTTP headers to include */
  headers?: Record<string, string>;

  /** Retry attempts on failure */
  retries?: number;

  /** Timeout in milliseconds */
  timeout?: number;
}

export interface FileOutputConfig {
  /** Output file path (supports template variables) */
  path: string;

  /** Output format */
  format?: 'markdown' | 'json' | 'text';

  /** Template for markdown/text output */
  template?: string;

  /** Whether to append or overwrite */
  mode?: 'append' | 'overwrite';
}

export type OutputConfig = CommitOutputConfig | WebhookOutputConfig | FileOutputConfig;
