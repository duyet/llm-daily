/**
 * Task Runner - Core orchestration engine
 * Integrates providers, memory, templates, and deduplication
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import * as YAML from 'yaml';
import { createProvider } from './providers/registry.js';
import { createMemoryManager } from './memory.js';
import { replaceTemplateVariables } from '../utils/template.js';
import { shouldRunTask } from './memory/deduplication.js';
import { validateTaskConfig } from '../utils/config-validator.js';
import type { ProviderResponse } from '../types/provider.types.js';

/**
 * Simplified task configuration (actual config on disk)
 */
export interface SimpleTaskConfig {
  provider: {
    id: string;
    options?: Record<string, unknown>;
  };
  memory: {
    enabled: boolean;
    strategy: 'extract' | 'append' | 'replace';
    contentThreshold?: number;
  };
  outputs: Array<{
    format: 'text' | 'json' | 'markdown' | 'yaml';
    path: string;
  }>;
  schedule?: {
    cron: string;
    enabled?: boolean;
  };
}

/**
 * Task runner options
 */
export interface TaskRunOptions {
  /** Task name (directory name) */
  taskName: string;
  /** Base directory for tasks */
  tasksDir?: string;
  /** Environment overrides */
  env?: Record<string, string>;
  /** Dry run mode */
  dryRun?: boolean;
}

/**
 * Task execution result
 */
export interface TaskRunResult {
  /** Whether execution was skipped */
  skipped: boolean;
  /** Skip reason if skipped */
  skipReason?: string;
  /** Whether execution was successful */
  success?: boolean;
  /** Provider response if executed */
  response?: ProviderResponse;
  /** Tokens used */
  tokensUsed?: number;
  /** Cost in USD */
  cost?: number;
  /** Execution time in ms */
  executionTime?: number;
  /** Output files created */
  outputsCreated?: string[];
  /** Memory was updated */
  memoryUpdated?: boolean;
}

/**
 * Analytics data saved after each run
 */
export interface RunAnalytics {
  timestamp: string;
  success: boolean;
  tokensUsed?: number;
  cost?: number;
  provider: string;
  executionTime?: number;
  error?: string;
}

/**
 * Task runner error
 */
export class TaskRunnerError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'TaskRunnerError';
    Object.setPrototypeOf(this, TaskRunnerError.prototype);
  }
}

/**
 * Task Runner class
 */
export class TaskRunner {
  private readonly tasksDir: string;

  constructor(tasksDir: string = 'tasks') {
    this.tasksDir = tasksDir;
  }

  /**
   * Run a task
   */
  async run(options: TaskRunOptions): Promise<TaskRunResult> {
    const startTime = Date.now();
    const taskDir = join(this.tasksDir, options.taskName);

    try {
      // 1. Load and validate config
      const config = await this.loadConfig(taskDir);

      // 2. Load memory
      const memoryPath = join(taskDir, 'memory.md');
      const memoryManager = createMemoryManager(memoryPath);
      const memory = await memoryManager.load();

      // 3. Check deduplication
      if (config.memory.enabled) {
        const dedupResult = await shouldRunTask({
          strategy: 'content',
          taskContext: options.taskName,
          memory,
          confidenceThreshold: config.memory.contentThreshold ?? 0.7,
        });

        if (!dedupResult.shouldRun) {
          return {
            skipped: true,
            skipReason: dedupResult.reason,
          };
        }
      }

      // 4. Prepare prompt
      const promptPath = join(taskDir, 'prompt.md');
      const promptTemplate = await fs.readFile(promptPath, 'utf-8');
      const templateResult = replaceTemplateVariables(promptTemplate, {
        memory: memory.body,
        lastTopics: (memory.metadata.lastTopics ?? []).join(', '),
        date: new Date().toISOString(),
      });
      const prompt = templateResult.content;

      // If dry run, return here
      if (options.dryRun) {
        return {
          skipped: true,
          skipReason: 'Dry run mode',
        };
      }

      // 5. Call provider
      const provider = createProvider({
        id: config.provider.id,
        config: config.provider.options,
      });

      const response = await provider.call(prompt);

      // 6. Update memory
      let memoryUpdated = false;
      if (config.memory.enabled) {
        const updateResult = await memoryManager.update({
          strategy: config.memory.strategy,
          newContent: response.content,
          providerId: config.provider.id,
        });

        memoryUpdated = updateResult.modified;
        await memoryManager.save();
      }

      // 7. Save outputs
      const outputsCreated = await this.saveOutputs(taskDir, response, config.outputs);

      // 8. Track analytics
      const executionTime = Date.now() - startTime;
      await this.saveAnalytics(taskDir, {
        timestamp: new Date().toISOString(),
        success: true,
        tokensUsed: response.usage.totalTokens,
        cost: response.cost,
        provider: config.provider.id,
        executionTime,
      });

      return {
        skipped: false,
        success: true,
        response,
        tokensUsed: response.usage.totalTokens,
        cost: response.cost,
        executionTime,
        outputsCreated,
        memoryUpdated,
      };
    } catch (error) {
      // Track failure
      const executionTime = Date.now() - startTime;
      await this.saveAnalytics(taskDir, {
        timestamp: new Date().toISOString(),
        success: false,
        provider: options.taskName,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      }).catch(() => {
        // Ignore analytics save errors
      });

      throw new TaskRunnerError(
        `Failed to run task "${options.taskName}": ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Load and validate task configuration
   */
  private async loadConfig(taskDir: string): Promise<SimpleTaskConfig> {
    try {
      const configPath = join(taskDir, 'config.yaml');
      const configText = await fs.readFile(configPath, 'utf-8');
      const config = YAML.parse(configText) as SimpleTaskConfig;

      // Validate
      const validation = validateTaskConfig(config);
      if (!validation.success) {
        const errorMsg = validation.errors.map((e) => `${e.path}: ${e.message}`).join(', ');
        throw new TaskRunnerError(`Invalid config: ${errorMsg}`);
      }

      // Apply defaults
      return {
        ...config,
        memory: {
          enabled: config.memory?.enabled ?? false,
          strategy: config.memory?.strategy ?? 'extract',
          contentThreshold: config.memory?.contentThreshold ?? 0.7,
        },
        outputs: config.outputs ?? [],
      };
    } catch (error) {
      if (error instanceof TaskRunnerError) {
        throw error;
      }
      throw new TaskRunnerError(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Save outputs based on configuration
   */
  private async saveOutputs(
    taskDir: string,
    response: ProviderResponse,
    outputs: SimpleTaskConfig['outputs']
  ): Promise<string[]> {
    const created: string[] = [];

    for (const output of outputs) {
      try {
        const outputPath = join(taskDir, output.path);
        let content: string;

        switch (output.format) {
          case 'json':
            content = JSON.stringify(
              {
                content: response.content,
                usage: response.usage,
                cost: response.cost,
                model: response.model,
              },
              null,
              2
            );
            break;
          case 'yaml':
            content = YAML.stringify({
              content: response.content,
              usage: response.usage,
              cost: response.cost,
              model: response.model,
            });
            break;
          case 'markdown':
            content = `# Task Output\n\n${response.content}\n\n---\n\n**Model**: ${response.model}  \n**Tokens**: ${response.usage.totalTokens}  \n**Cost**: $${response.cost.toFixed(4)}\n`;
            break;
          case 'text':
          default:
            content = response.content;
        }

        await fs.writeFile(outputPath, content, 'utf-8');
        created.push(outputPath);
      } catch (error) {
        throw new TaskRunnerError(
          `Failed to save output to ${output.path}: ${error instanceof Error ? error.message : String(error)}`,
          error
        );
      }
    }

    return created;
  }

  /**
   * Save analytics data
   */
  private async saveAnalytics(taskDir: string, analytics: RunAnalytics): Promise<void> {
    try {
      const analyticsPath = join(taskDir, 'last-run.json');
      await fs.writeFile(analyticsPath, JSON.stringify(analytics, null, 2), 'utf-8');
    } catch (error) {
      // Don't fail the whole task if analytics fails
      console.error('Failed to save analytics:', error);
    }
  }

  /**
   * Check if task directory exists
   */
  async taskExists(taskName: string): Promise<boolean> {
    try {
      const taskDir = join(this.tasksDir, taskName);
      const stat = await fs.stat(taskDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * List all tasks
   */
  async listTasks(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.tasksDir, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }
}

/**
 * Create a task runner instance
 */
export function createTaskRunner(tasksDir?: string): TaskRunner {
  return new TaskRunner(tasksDir);
}
