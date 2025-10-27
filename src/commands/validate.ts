/**
 * Validate command - Validate task configurations
 * Provides detailed error reporting and suggestions
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import * as YAML from 'yaml';
import { validateTaskConfig } from '../utils/config-validator.js';
import { logger } from '../utils/logger.js';
import {
  formatError,
  ErrorCodes,
  printFormattedError,
  type ErrorContext,
} from '../utils/error-formatter.js';

/**
 * Validate command options
 */
export interface ValidateCommandOptions {
  /** Check provider connectivity */
  checkProviders?: boolean;
  /** Fail fast on first error */
  failFast?: boolean;
}

/**
 * Validation result for a single task
 */
interface TaskValidation {
  taskName: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate task configuration(s)
 */
export async function validateCommand(
  taskName?: string,
  options: ValidateCommandOptions = {}
): Promise<void> {
  try {
    const tasksDir = 'tasks';

    // Get tasks to validate
    const tasksToValidate = taskName ? [taskName] : await getAllTasks(tasksDir);

    if (tasksToValidate.length === 0) {
      logger.warn('No tasks found to validate');
      return;
    }

    logger.info(
      `Validating ${tasksToValidate.length} task${tasksToValidate.length > 1 ? 's' : ''}...`
    );
    logger.info('');

    // Validate each task
    const results: TaskValidation[] = [];
    for (const task of tasksToValidate) {
      const result = await validateTask(join(tasksDir, task));
      results.push(result);

      // Display result immediately
      displayTaskValidation(result);

      // Fail fast if requested
      if (options.failFast && !result.valid) {
        break;
      }
    }

    // Display summary
    logger.info('');
    displaySummary(results);

    // Exit with appropriate code
    const allValid = results.every((r) => r.valid);
    process.exit(allValid ? 0 : 1);
  } catch (error) {
    const context: ErrorContext = {
      operation: 'validation',
      taskName,
    };
    const formattedError = formatError(
      ErrorCodes.TASK_VALIDATION_FAILED,
      error instanceof Error ? error.message : String(error),
      context,
      error instanceof Error ? error : undefined
    );
    logger.error(printFormattedError(formattedError));
    process.exit(1);
  }
}

/**
 * Get all task directories
 */
async function getAllTasks(tasksDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'examples')
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Validate a single task
 */
async function validateTask(taskDir: string): Promise<TaskValidation> {
  const taskName = taskDir.split('/').pop() ?? 'unknown';
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check config.yaml exists
  const configPath = join(taskDir, 'config.yaml');
  try {
    await fs.access(configPath);
  } catch {
    errors.push('config.yaml not found');
    return { taskName, valid: false, errors, warnings };
  }

  // Load and parse config
  let config: unknown;
  try {
    const configText = await fs.readFile(configPath, 'utf-8');
    config = YAML.parse(configText);
  } catch (error) {
    errors.push(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
    return { taskName, valid: false, errors, warnings };
  }

  // Validate schema
  const validation = validateTaskConfig(config);
  if (!validation.success) {
    errors.push(...validation.errors.map((e) => `${e.path}: ${e.message}`));
  }

  // Check prompt.md exists
  const promptPath = join(taskDir, 'prompt.md');
  try {
    await fs.access(promptPath);
  } catch {
    errors.push('prompt.md not found');
  }

  // Check memory.md (warning if missing)
  const memoryPath = join(taskDir, 'memory.md');
  try {
    await fs.access(memoryPath);
  } catch {
    warnings.push('memory.md not found (will be created on first run)');
  }

  // Check outputs directory
  const outputsDir = join(taskDir, 'outputs');
  try {
    const stat = await fs.stat(outputsDir);
    if (!stat.isDirectory()) {
      warnings.push('outputs/ should be a directory');
    }
  } catch {
    warnings.push('outputs/ directory not found (recommended)');
  }

  return {
    taskName,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Display validation result for a task
 */
function displayTaskValidation(result: TaskValidation): void {
  if (result.valid) {
    logger.success(`${result.taskName}: Valid`);
  } else {
    logger.error(`${result.taskName}: Invalid`);
  }

  // Show errors
  for (const error of result.errors) {
    logger.info(`  ✗ ${error}`);
    const suggestion = getSuggestion(error);
    if (suggestion) {
      logger.info(`    💡 ${suggestion}`);
    }
  }

  // Show warnings
  for (const warning of result.warnings) {
    logger.info(`  ⚠ ${warning}`);
  }

  if (result.errors.length > 0 || result.warnings.length > 0) {
    logger.info('');
  }
}

/**
 * Get helpful suggestion for an error
 */
function getSuggestion(error: string): string | null {
  if (error.includes('config.yaml not found')) {
    return 'Create config.yaml with: npm run task:new <name>';
  }

  if (error.includes('prompt.md not found')) {
    return 'Create prompt.md with your task instructions';
  }

  if (error.includes('Provider ID')) {
    return 'Use format "provider:model" (e.g., "openai:gpt-4o-mini")';
  }

  if (error.includes('cron')) {
    return 'Cron needs 5 fields. Example: "0 9 * * *" (daily at 9 AM)';
  }

  if (error.includes('Invalid YAML')) {
    return 'Check YAML syntax at https://yaml-online-parser.appspot.com/';
  }

  return null;
}

/**
 * Display summary of all validations
 */
function displaySummary(results: TaskValidation[]): void {
  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.length - validCount;

  logger.info('─'.repeat(50));
  logger.info(`Summary: ${validCount}/${results.length} tasks valid`);

  if (invalidCount > 0) {
    logger.info('');
    logger.error(`${invalidCount} task${invalidCount > 1 ? 's' : ''} failed validation`);
  }
}
