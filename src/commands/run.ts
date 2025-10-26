/**
 * Run command - Execute a task locally
 * Integrates with task runner and displays results
 */

import { promises as fs } from 'fs';
import { createTaskRunner, type TaskRunResult } from '../core/task-runner.js';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/progress.js';
import { config as loadDotenv } from 'dotenv';

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
}

/**
 * Run a task locally
 */
export async function runCommand(taskName: string, options: RunCommandOptions = {}): Promise<void> {
  try {
    // Load environment variables
    await loadEnvironment(options.envFile);

    // Create task runner
    const runner = createTaskRunner();

    // Check if task exists
    const exists = await runner.taskExists(taskName);
    if (!exists) {
      logger.error(`Task "${taskName}" not found in tasks/ directory`);
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
        });
      },
      'Task completed'
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
    logger.error(`Failed to run task: ${error instanceof Error ? error.message : String(error)}`);
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
      await fs.access(envFile);
      loadDotenv({ path: envFile, override: true });
      logger.debug(`Loaded environment from ${envFile}`);
    } catch (error) {
      logger.warn(`Could not load environment file: ${envFile}`);
    }
  }
}

/**
 * Display task execution results
 */
function displayResults(taskName: string, result: TaskRunResult, options: RunCommandOptions): void {
  console.log(''); // Empty line for spacing

  if (result.skipped) {
    logger.info(`Task "${taskName}" was skipped`);
    if (result.skipReason) {
      logger.info(`Reason: ${result.skipReason}`);
    }
    return;
  }

  // Success header
  logger.success(`Task "${taskName}" completed successfully`);
  console.log(''); // Empty line

  // Provider and model info
  if (result.response) {
    console.log(`Model: ${result.response.model}`);
  }

  // Metrics
  if (result.tokensUsed !== undefined) {
    console.log(`Tokens: ${result.tokensUsed.toLocaleString()}`);
  }

  if (result.cost !== undefined) {
    console.log(`Cost: $${result.cost.toFixed(4)}`);
  }

  if (result.executionTime !== undefined) {
    const seconds = (result.executionTime / 1000).toFixed(2);
    console.log(`Execution Time: ${seconds}s`);
  }

  console.log(''); // Empty line

  // Outputs
  if (result.outputsCreated && result.outputsCreated.length > 0) {
    logger.info('Outputs created:');
    for (const output of result.outputsCreated) {
      console.log(`  - ${output}`);
    }
    console.log(''); // Empty line
  }

  // Memory update
  if (result.memoryUpdated) {
    logger.info('Memory updated');
  } else if (result.memoryUpdated === false) {
    logger.debug('Memory unchanged (no new insights)');
  }

  // Response content (if verbose)
  if (options.verbose && result.response) {
    console.log(''); // Empty line
    logger.info('Response:');
    console.log('---');
    console.log(result.response.content);
    console.log('---');
  }
}
