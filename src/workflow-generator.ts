/**
 * Workflow generator for GitHub Actions
 * Generates workflow files from task configurations
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { GeneratedWorkflow, ScannedTask } from './types/workflow.types.js';
import { renderTemplate, validateTemplate } from './utils/template-engine.js';
import { scanTasks } from './workflow-generator/scanner.js';
import { logger } from './utils/logger.js';

/**
 * Workflow generator options
 */
export interface GeneratorOptions {
  /** Tasks directory (default: 'tasks') */
  tasksDir?: string;

  /** Workflows output directory (default: '.github/workflows') */
  workflowsDir?: string;

  /** Template file path (default: 'src/templates/workflow.yml.template') */
  templatePath?: string;

  /** Dry run mode (don't write files) */
  dryRun?: boolean;

  /** Force mode (overwrite existing files) */
  force?: boolean;

  /** Validate generated workflows */
  validate?: boolean;
}

/**
 * Generate workflows for all tasks
 *
 * @param options - Generator options
 * @returns Array of generated workflows
 */
export async function generateWorkflows(
  options: GeneratorOptions = {}
): Promise<GeneratedWorkflow[]> {
  const {
    tasksDir = 'tasks',
    workflowsDir = '.github/workflows',
    templatePath = 'src/templates/workflow.yml.template',
    dryRun = false,
    force = false,
    validate = true,
  } = options;

  // Load template
  const template = await loadTemplate(templatePath);

  // Validate template syntax
  if (validate) {
    const validation = validateTemplate(template);
    if (!validation.valid) {
      throw new Error(`Invalid template syntax:\n${validation.errors.join('\n')}`);
    }
  }

  // Scan tasks
  const tasks = await scanTasks({ tasksDir, skipInvalid: true, showWarnings: true });

  if (tasks.length === 0) {
    logger.warn('No valid tasks found to generate workflows for');
    return [];
  }

  // Generate workflows
  const generated: GeneratedWorkflow[] = [];

  for (const task of tasks) {
    try {
      const workflow = await generateWorkflow(task, template, {
        workflowsDir,
        dryRun,
        force,
        validate,
      });

      generated.push(workflow);
    } catch (error) {
      logger.error(
        `Failed to generate workflow for ${task.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return generated;
}

/**
 * Generate a single workflow file
 */
async function generateWorkflow(
  task: ScannedTask,
  template: string,
  options: {
    workflowsDir: string;
    dryRun: boolean;
    force: boolean;
    validate: boolean;
  }
): Promise<GeneratedWorkflow> {
  const { workflowsDir, dryRun, force, validate } = options;

  if (!task.config) {
    throw new Error(`Task ${task.name} has no workflow configuration`);
  }

  const warnings: string[] = [];

  // Generate workflow filename
  const filename = generateWorkflowFilename(task.name);
  const filePath = join(workflowsDir, filename);

  // Check if file exists
  if (!force && !dryRun) {
    try {
      await fs.access(filePath);
      warnings.push(`Workflow already exists: ${filePath} (use --force to overwrite)`);
    } catch {
      // File doesn't exist, OK to create
    }
  }

  // Render template
  const content = renderTemplate(template, {
    taskName: task.config.taskName,
    schedule: task.config.schedule,
    timeout: task.config.timeout.toString(),
    secrets: JSON.stringify(task.config.secrets || []),
    description: task.config.description || '',
  });

  // Validate generated YAML
  if (validate) {
    validateWorkflowYaml(content, task.name);
  }

  // Write file (unless dry run)
  if (!dryRun) {
    await fs.mkdir(workflowsDir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  // Extract secret names for documentation
  const secretNames = task.config.secrets.map((s) => s.secretKey);

  return {
    taskName: task.name,
    filePath,
    content,
    secrets: secretNames,
    warnings,
  };
}

/**
 * Load workflow template file
 */
async function loadTemplate(templatePath: string): Promise<string> {
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to load template ${templatePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate workflow filename from task name
 * Converts task name to kebab-case and adds prefix
 */
export function generateWorkflowFilename(taskName: string): string {
  // Convert to kebab-case
  const kebabCase = taskName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

  return `task-${kebabCase}.yml`;
}

/**
 * Validate generated workflow YAML
 * Basic validation for GitHub Actions syntax
 */
function validateWorkflowYaml(content: string, taskName: string): void {
  const errors: string[] = [];

  // Check for required fields
  if (!content.includes('name:')) {
    errors.push('Missing required field: name');
  }

  if (!content.includes('on:')) {
    errors.push('Missing required field: on');
  }

  if (!content.includes('jobs:')) {
    errors.push('Missing required field: jobs');
  }

  // Check for valid cron syntax
  const cronMatch = content.match(/cron:\s*["']([^"']+)["']/);
  if (cronMatch) {
    const cron = cronMatch[1];
    if (!isValidCron(cron)) {
      errors.push(`Invalid cron syntax: ${cron}`);
    }
  }

  // Check for secrets format
  const secretMatches = content.matchAll(/\$\{\{\s*secrets\.(\w+)\s*\}\}/g);
  for (const match of secretMatches) {
    const secretName = match[1];
    if (!secretName || secretName.length === 0) {
      errors.push('Empty secret name found');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid workflow for ${taskName}:\n${errors.join('\n')}`);
  }
}

/**
 * Validate cron expression (basic validation)
 * Format: "min hour day month weekday"
 */
function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);

  // Must have exactly 5 parts
  if (parts.length !== 5) {
    return false;
  }

  // Validate each part
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Allow special characters: * , - /
    if (part === '*') continue;
    if (/^[0-9,\-/]+$/.test(part)) continue;

    // Invalid character found
    return false;
  }

  return true;
}

/**
 * Detect secrets required by a workflow
 * Useful for documentation and setup
 */
export function detectSecrets(content: string): string[] {
  const secrets = new Set<string>();
  const matches = content.matchAll(/\$\{\{\s*secrets\.(\w+)\s*\}\}/g);

  for (const match of matches) {
    secrets.add(match[1]);
  }

  return Array.from(secrets).sort();
}

/**
 * Get workflow generation summary
 */
export async function getGenerationSummary(options: GeneratorOptions = {}): Promise<{
  totalTasks: number;
  validTasks: number;
  invalidTasks: number;
  existingWorkflows: number;
  newWorkflows: number;
}> {
  const { tasksDir = 'tasks', workflowsDir = '.github/workflows' } = options;

  // Scan tasks
  const tasks = await scanTasks({ tasksDir, skipInvalid: false, showWarnings: false });

  const validTasks = tasks.filter((t) => t.isValid).length;
  const invalidTasks = tasks.filter((t) => !t.isValid).length;

  // Check existing workflows
  let existingWorkflows = 0;
  try {
    const files = await fs.readdir(workflowsDir);
    existingWorkflows = files.filter((f) => f.startsWith('task-') && f.endsWith('.yml')).length;
  } catch {
    // Directory doesn't exist yet
    existingWorkflows = 0;
  }

  const newWorkflows = Math.max(0, validTasks - existingWorkflows);

  return {
    totalTasks: tasks.length,
    validTasks,
    invalidTasks,
    existingWorkflows,
    newWorkflows,
  };
}
