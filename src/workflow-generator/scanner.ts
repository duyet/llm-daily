/**
 * Task scanner for workflow generation
 * Scans tasks/ directory and extracts workflow configurations
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { ScannedTask, WorkflowConfig, WorkflowSecret } from '../types/workflow.types.js';
import { taskConfigSchema } from '../types/config.types.js';
import { logger } from '../utils/logger.js';

/**
 * Scanner options
 */
export interface ScannerOptions {
  /** Root tasks directory (default: 'tasks') */
  tasksDir?: string;

  /** Include patterns (glob-like) */
  include?: string[];

  /** Exclude patterns (glob-like) */
  exclude?: string[];

  /** Whether to skip invalid tasks (default: true) */
  skipInvalid?: boolean;

  /** Whether to show warnings (default: true) */
  showWarnings?: boolean;
}

/**
 * Scan tasks directory for workflow configurations
 *
 * @param options - Scanner options
 * @returns Array of scanned tasks
 */
export async function scanTasks(options: ScannerOptions = {}): Promise<ScannedTask[]> {
  const {
    tasksDir = 'tasks',
    include = [],
    exclude = ['examples', '.*', '_*'], // Exclude examples, hidden dirs, and temp dirs
    skipInvalid = true,
    showWarnings = true,
  } = options;

  const tasks: ScannedTask[] = [];

  try {
    // Read tasks directory
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories
      if (!entry.isDirectory()) {
        continue;
      }

      const taskName = entry.name;
      const taskPath = join(tasksDir, taskName);

      // Apply filters
      if (shouldExclude(taskName, include, exclude)) {
        if (showWarnings) {
          logger.debug(`Skipping excluded task: ${taskName}`);
        }
        continue;
      }

      // Scan task
      const scannedTask = await scanTask(taskName, taskPath, showWarnings);
      tasks.push(scannedTask);

      // Handle invalid tasks
      if (!scannedTask.isValid && showWarnings) {
        logger.warn(`Invalid task: ${taskName}`);
        for (const error of scannedTask.errors) {
          logger.warn(`  - ${error}`);
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to scan tasks directory: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Filter out invalid tasks if requested
  if (skipInvalid) {
    return tasks.filter((task) => task.isValid);
  }

  return tasks;
}

/**
 * Scan a single task directory
 */
async function scanTask(name: string, path: string, _showWarnings: boolean): Promise<ScannedTask> {
  const configPath = join(path, 'config.yaml');
  const errors: string[] = [];

  try {
    // Check if config.yaml exists
    const configContent = await fs.readFile(configPath, 'utf-8');

    // Parse YAML
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const rawConfig: any = parseYaml(configContent);

    // Validate config schema
    const result = taskConfigSchema.safeParse(rawConfig);

    if (!result.success) {
      for (const error of result.error.errors) {
        errors.push(`${error.path.join('.')}: ${error.message}`);
      }
      return {
        name,
        path,
        configPath,
        isValid: false,
        errors,
      };
    }

    // Extract workflow configuration
    const config = result.data;
    const workflowConfig = extractWorkflowConfig(name, config);

    return {
      name,
      path,
      configPath,
      isValid: true,
      errors: [],
      config: workflowConfig,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      name,
      path,
      configPath,
      isValid: false,
      errors,
    };
  }
}

/**
 * Extract workflow configuration from task config
 */
function extractWorkflowConfig(
  taskName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
): WorkflowConfig {
  // Handle both string and object schedule formats
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  let schedule = config.schedule || '0 9 * * *'; // Default to 9 AM UTC
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (typeof schedule === 'object' && schedule.cron) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    schedule = schedule.cron;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const timeout = config.timeout || 30;

  // Extract secrets from provider configurations
  const secrets = extractSecrets(config);

  return {
    taskName,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    schedule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    timeout,
    secrets,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    description: config.description,
  };
}

/**
 * Extract required secrets from provider configurations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSecrets(config: any): WorkflowSecret[] {
  const secrets: WorkflowSecret[] = [];
  const seenSecrets = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (config.providers && Array.isArray(config.providers)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (const provider of config.providers) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (typeof provider.id === 'string') {
        const providerId = provider.id as string;

        // Skip free models - they don't require API keys
        // Free models are identified by ":free" suffix (e.g., "openrouter:minimax/minimax-m2:free")
        if (typeof providerId === 'string' && providerId.includes(':free')) {
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const [providerName] = providerId.split(':');

        // Map provider to required secret
        let secretKey: string | null = null;
        let envName: string | null = null;

        if (providerName === 'openai') {
          secretKey = 'OPENAI_API_KEY';
          envName = 'OPENAI_API_KEY';
        } else if (providerName === 'openrouter') {
          secretKey = 'OPENROUTER_API_KEY';
          envName = 'OPENROUTER_API_KEY';
        }

        if (secretKey && !seenSecrets.has(secretKey)) {
          secrets.push({
            name: envName!,
            secretKey,
            description: `API key for ${providerName}`,
          });
          seenSecrets.add(secretKey);
        }
      }
    }
  }

  return secrets;
}

/**
 * Check if task should be excluded based on patterns
 */
function shouldExclude(name: string, include: string[], exclude: string[]): boolean {
  // If include patterns specified, must match at least one
  if (include.length > 0) {
    const included = include.some((pattern) => matchPattern(name, pattern));
    if (!included) {
      return true;
    }
  }

  // Check exclude patterns
  return exclude.some((pattern) => matchPattern(name, pattern));
}

/**
 * Simple pattern matching (supports * wildcard)
 */
function matchPattern(str: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

/**
 * Get task count summary
 */
export async function getTaskSummary(options: ScannerOptions = {}): Promise<{
  total: number;
  valid: number;
  invalid: number;
  tasks: ScannedTask[];
}> {
  const tasks = await scanTasks({ ...options, skipInvalid: false, showWarnings: false });

  const valid = tasks.filter((t) => t.isValid).length;
  const invalid = tasks.filter((t) => !t.isValid).length;

  return {
    total: tasks.length,
    valid,
    invalid,
    tasks,
  };
}
