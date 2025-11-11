/**
 * Run command - Execute a task locally
 * Integrates with task runner and displays results
 */

import { promises as fs } from 'fs';
import { createTaskRunner, type TaskRunResult } from '../core/task-runner.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/progress.js';
import { config as loadDotenv } from 'dotenv';
import { validateTaskName, sanitizePath } from '../utils/security.js';
import {
  formatError,
  ErrorCodes,
  printFormattedError,
  type ErrorContext,
} from '../utils/error-formatter.js';

/**
 * Run command options
 */
export interface RunCommandOptions {
  /** Custom .env file to load */
  envFile?: string;
  /** Dry run mode */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Quiet mode */
  quiet?: boolean;
  /** Force run, skipping deduplication checks */
  force?: boolean;
}

/**
 * Run a task locally
 */
export async function runCommand(taskName: string, options: RunCommandOptions = {}): Promise<void> {
  try {
    // Validate task name for security
    const taskNameValidation = validateTaskName(taskName);
    if (!taskNameValidation.valid) {
      const context: ErrorContext = {
        operation: 'task validation',
        taskName,
      };
      const error = formatError(
        ErrorCodes.TASK_VALIDATION_FAILED,
        taskNameValidation.error || 'Invalid task name',
        context
      );
      logger.error(printFormattedError(error));
      process.exit(1);
    }

    // Load environment variables
    await loadEnvironment(options.envFile);

    // Create task runner
    const runner = createTaskRunner();

    // Check if task exists
    const exists = await runner.taskExists(taskName);
    if (!exists) {
      const context: ErrorContext = {
        operation: 'task lookup',
        taskName,
      };
      const error = formatError(
        ErrorCodes.TASK_NOT_FOUND,
        `Task "${taskName}" not found in tasks/ directory`,
        context
      );
      logger.error(printFormattedError(error));
      logger.info('Available tasks:');
      const tasks = await runner.listTasks();
      if (tasks.length > 0) {
        tasks.forEach((task) => logger.info(`  - ${task}`));
      } else {
        logger.info('  (no tasks found)');
      }
      process.exit(1);
    }

    // Run the task
    logger.info(`Running task: ${taskName}`);

    const result = await withSpinner(
      `Executing ${taskName}...`,
      async () => {
        return runner.run({
          taskName,
          dryRun: options.dryRun,
          skipDeduplication: options.force,
        });
      },
      'Task completed',
      { quiet: options.quiet }
    );

    // Display results
    displayResults(taskName, result, options);

    // Exit with appropriate code
    if (result.skipped) {
      process.exit(0);
    } else if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    const context: ErrorContext = {
      operation: 'task execution',
      taskName,
    };
    const formattedError = formatError(
      ErrorCodes.TASK_EXECUTION_FAILED,
      error instanceof Error ? error.message : String(error),
      context,
      error instanceof Error ? error : undefined
    );
    logger.error(printFormattedError(formattedError));
    if (options.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Load environment variables from file
 */
async function loadEnvironment(envFile?: string): Promise<void> {
  // Try .env.local first
  const localEnvPath = '.env.local';
  try {
    await fs.access(localEnvPath);
    loadDotenv({ path: localEnvPath });
    logger.debug('Loaded environment from .env.local');
  } catch {
    // .env.local doesn't exist, that's fine
  }

  // Load custom env file if specified
  if (envFile) {
    try {
      // Sanitize path to prevent path traversal
      const safePath = sanitizePath(envFile);
      await fs.access(safePath);
      loadDotenv({ path: safePath, override: true });
      logger.debug(`Loaded environment from ${envFile}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Path traversal')) {
        const context: ErrorContext = {
          operation: 'environment file loading',
          file: envFile,
        };
        const formattedError = formatError(
          ErrorCodes.FILE_PERMISSION,
          error.message,
          context,
          error
        );
        logger.error(printFormattedError(formattedError));
      } else {
        const context: ErrorContext = {
          operation: 'environment file loading',
          file: envFile,
        };
        const formattedError = formatError(
          ErrorCodes.FILE_NOT_FOUND,
          `Could not load environment file: ${envFile}`,
          context,
          error instanceof Error ? error : undefined
        );
        logger.warn(printFormattedError(formattedError));
      }
    }
  }
}

/**
 * Display task execution results
 * Always shows output regardless of quiet mode - this is the final result
 */
function displayResults(taskName: string, result: TaskRunResult, options: RunCommandOptions): void {
  // Use console.log directly to bypass logger filtering in quiet mode
  // eslint-disable-next-line no-console
  console.log(''); // Empty line for spacing

  if (result.skipped) {
    // eslint-disable-next-line no-console
    console.log(`Task "${taskName}" was skipped`);
    if (result.skipReason) {
      // eslint-disable-next-line no-console
      console.log(`Reason: ${result.skipReason}`);
    }
    return;
  }

  // Success header
  // eslint-disable-next-line no-console
  console.log(`\x1b[32m✓\x1b[0m Task "${taskName}" completed successfully`);
  // eslint-disable-next-line no-console
  console.log(''); // Empty line

  // Provider and model info
  if (result.response) {
    // eslint-disable-next-line no-console
    console.log(`Model: ${result.response.model}`);
  }

  // Metrics
  if (result.tokensUsed !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`Tokens: ${result.tokensUsed.toLocaleString()}`);
  }

  if (result.cost !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`Cost: $${result.cost.toFixed(4)}`);
  }

  if (result.executionTime !== undefined) {
    const seconds = (result.executionTime / 1000).toFixed(2);
    // eslint-disable-next-line no-console
    console.log(`Execution Time: ${seconds}s`);
  }

  // eslint-disable-next-line no-console
  console.log(''); // Empty line

  // Outputs
  if (result.outputsCreated && result.outputsCreated.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Outputs created:');
    for (const output of result.outputsCreated) {
      // eslint-disable-next-line no-console
      console.log(`  - ${output}`);
    }
    // eslint-disable-next-line no-console
    console.log(''); // Empty line
  }

  // Memory update
  if (result.memoryUpdated) {
    // eslint-disable-next-line no-console
    console.log('Memory updated');
  } else if (result.memoryUpdated === false && !options.quiet) {
    // Only show debug info if not in quiet mode
    logger.debug('Memory unchanged (no new insights)');
  }

  // Response content (if verbose)
  if (options.verbose && result.response) {
    // eslint-disable-next-line no-console
    console.log(''); // Empty line
    // eslint-disable-next-line no-console
    console.log('Response:');
    // eslint-disable-next-line no-console
    console.log('---');
    // eslint-disable-next-line no-console
    console.log(result.response.content);
    // eslint-disable-next-line no-console
    console.log('---');
  }
}
