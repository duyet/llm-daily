/**
 * New command - Create new task with scaffolding
 * Supports templates and interactive mode
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import * as YAML from 'yaml';
import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/progress.js';

/**
 * Task template type
 */
export type TaskTemplate = 'daily-summary' | 'monitoring' | 'custom';

/**
 * New command options
 */
export interface NewCommandOptions {
  /** Interactive mode */
  interactive?: boolean;
  /** Template to use */
  template?: TaskTemplate;
  /** Provider ID */
  provider?: string;
  /** Schedule (cron expression) */
  schedule?: string;
}

/**
 * Task template configuration
 */
interface TemplateConfig {
  name: string;
  description: string;
  config: Record<string, unknown>;
  prompt: string;
  memory: string;
}

/**
 * Create a new task
 */
export async function newCommand(
  taskName?: string,
  options: NewCommandOptions = {}
): Promise<void> {
  try {
    // Get task details (interactive or from args)
    const taskDetails = await getTaskDetails(taskName, options);

    // Validate task name
    validateTaskName(taskDetails.name);

    // Check if task already exists
    const taskDir = join('tasks', taskDetails.name);
    const exists = await taskExists(taskDir);
    if (exists) {
      logger.error(`Task "${taskDetails.name}" already exists`);
      process.exit(1);
    }

    // Create task directory and files
    await withSpinner(
      `Creating task "${taskDetails.name}"...`,
      async () => {
        await createTask(taskDir, taskDetails);
      },
      `Task "${taskDetails.name}" created successfully`
    );

    // Show next steps
    showNextSteps(taskDetails.name);

    process.exit(0);
  } catch (error) {
    logger.error(
      `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Get task details from interactive prompts or options
 */
async function getTaskDetails(
  taskName?: string,
  options: NewCommandOptions = {}
): Promise<{
  name: string;
  template: TaskTemplate;
  provider: string;
  schedule: string;
}> {
  if (options.interactive || !taskName) {
    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Task name:',
        default: taskName,
        validate: (input: string) => {
          if (!input) return 'Task name is required';
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Task name must contain only lowercase letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        choices: [
          { name: 'Daily Summary - Daily report generation', value: 'daily-summary' },
          { name: 'Monitoring - Periodic status checks', value: 'monitoring' },
          { name: 'Custom - Start from scratch', value: 'custom' },
        ],
        default: options.template ?? 'daily-summary',
      },
      {
        type: 'input',
        name: 'provider',
        message: 'Provider ID (e.g., openai:gpt-4o-mini):',
        default: options.provider ?? 'openai:gpt-4o-mini',
        validate: (input: string) => {
          if (!/^[a-z0-9_-]+:[a-z0-9_/-]+$/i.test(input)) {
            return 'Invalid provider format. Use "provider:model" (e.g., "openai:gpt-4o-mini")';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'schedule',
        message: 'Schedule (cron expression):',
        default: options.schedule ?? '0 9 * * *',
        validate: (input: string) => {
          // Basic cron validation (5 fields)
          if (input.split(' ').length !== 5) {
            return 'Cron expression must have 5 fields. Example: "0 9 * * *" (daily at 9 AM)';
          }
          return true;
        },
      },
    ]);

    return answers as {
      name: string;
      template: TaskTemplate;
      provider: string;
      schedule: string;
    };
  } else {
    // Non-interactive mode
    if (!taskName) {
      throw new Error('Task name is required');
    }

    return {
      name: taskName,
      template: options.template ?? 'daily-summary',
      provider: options.provider ?? 'openai:gpt-4o-mini',
      schedule: options.schedule ?? '0 9 * * *',
    };
  }
}

/**
 * Validate task name format
 */
function validateTaskName(name: string): void {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Task name must contain only lowercase letters, numbers, and hyphens');
  }

  if (name.startsWith('-') || name.endsWith('-')) {
    throw new Error('Task name cannot start or end with a hyphen');
  }

  if (name.includes('--')) {
    throw new Error('Task name cannot contain consecutive hyphens');
  }
}

/**
 * Check if task directory exists
 */
async function taskExists(taskDir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(taskDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create task directory and files
 */
async function createTask(
  taskDir: string,
  details: {
    name: string;
    template: TaskTemplate;
    provider: string;
    schedule: string;
  }
): Promise<void> {
  // Create task directory
  await fs.mkdir(taskDir, { recursive: true });

  // Get template
  const template = getTemplate(details.template, details);

  // Create config.yaml
  const configPath = join(taskDir, 'config.yaml');
  const configYaml = YAML.stringify(template.config);
  await fs.writeFile(configPath, configYaml, 'utf-8');

  // Create prompt.md
  const promptPath = join(taskDir, 'prompt.md');
  await fs.writeFile(promptPath, template.prompt, 'utf-8');

  // Create memory.md
  const memoryPath = join(taskDir, 'memory.md');
  await fs.writeFile(memoryPath, template.memory, 'utf-8');

  // Create .gitkeep for outputs directory
  const outputsDir = join(taskDir, 'outputs');
  await fs.mkdir(outputsDir, { recursive: true });
  await fs.writeFile(join(outputsDir, '.gitkeep'), '', 'utf-8');
}

/**
 * Get template configuration
 */
function getTemplate(
  templateType: TaskTemplate,
  details: { provider: string; schedule: string }
): TemplateConfig {
  switch (templateType) {
    case 'daily-summary':
      return {
        name: 'Daily Summary',
        description: 'Generate a daily summary report',
        config: {
          provider: {
            id: details.provider,
            options: {
              temperature: 0.7,
              maxTokens: 1000,
            },
          },
          memory: {
            enabled: true,
            strategy: 'extract',
            contentThreshold: 0.7,
          },
          outputs: [
            {
              format: 'markdown',
              path: 'outputs/summary.md',
            },
          ],
          schedule: {
            cron: details.schedule,
            enabled: true,
          },
        },
        prompt: `# Daily Summary

Please generate a summary report for today.

## Previous Context
{{memory}}

## Previous Topics
{{#if lastTopics}}
Topics covered previously:
{{#each lastTopics}}
- {{this}}
{{/each}}
{{/if}}

## Task
Generate a concise daily summary focusing on key updates and insights.

## Date
{{date}}
`,
        memory: `---
lastRun: null
lastTopics: []
---

# Task Memory

This file stores persistent memory across task runs.
`,
      };

    case 'monitoring':
      return {
        name: 'Monitoring',
        description: 'Periodic monitoring and status checks',
        config: {
          provider: {
            id: details.provider,
            options: {
              temperature: 0.3,
              maxTokens: 500,
            },
          },
          memory: {
            enabled: true,
            strategy: 'append',
            contentThreshold: 0.5,
          },
          outputs: [
            {
              format: 'json',
              path: 'outputs/status.json',
            },
          ],
          schedule: {
            cron: details.schedule,
            enabled: true,
          },
        },
        prompt: `# Monitoring Check

Perform a status check and report any issues.

## Previous Checks
{{memory}}

## Task
Check system status and report:
1. Any errors or warnings
2. Performance metrics
3. Recommended actions

## Timestamp
{{date}}
`,
        memory: `---
lastRun: null
lastTopics: []
---

# Monitoring History

This file stores monitoring check history.
`,
      };

    case 'custom':
    default:
      return {
        name: 'Custom',
        description: 'Custom task starting template',
        config: {
          provider: {
            id: details.provider,
            options: {
              temperature: 0.7,
              maxTokens: 1000,
            },
          },
          memory: {
            enabled: true,
            strategy: 'extract',
            contentThreshold: 0.7,
          },
          outputs: [
            {
              format: 'text',
              path: 'outputs/result.txt',
            },
          ],
          schedule: {
            cron: details.schedule,
            enabled: true,
          },
        },
        prompt: `# Task Prompt

Write your task instructions here.

## Context
{{memory}}

## Instructions
Define what the LLM should do.

## Date
{{date}}
`,
        memory: `---
lastRun: null
lastTopics: []
---

# Task Memory

Add persistent context here.
`,
      };
  }
}

/**
 * Show next steps to the user
 */
function showNextSteps(taskName: string): void {
  console.log('');
  logger.info('Next steps:');
  console.log(`  1. Edit tasks/${taskName}/prompt.md to customize the prompt`);
  console.log(`  2. Edit tasks/${taskName}/config.yaml to adjust settings`);
  console.log(`  3. Run the task: npm run task:run ${taskName}`);
  console.log(`  4. Generate workflow: npm run task:generate`);
  console.log('');
}
