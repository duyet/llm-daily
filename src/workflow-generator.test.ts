/**
 * Workflow generator tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateWorkflows,
  generateWorkflowFilename,
  detectSecrets,
  getGenerationSummary,
} from './workflow-generator.js';
import { renderTemplate } from './utils/template-engine.js';

describe('Workflow Generator', () => {
  let testDir: string;
  let tasksDir: string;
  let workflowsDir: string;
  let templatePath: string;

  beforeEach(async () => {
    // Create temp directories
    testDir = join(tmpdir(), `llm-daily-test-${Date.now()}`);
    tasksDir = join(testDir, 'tasks');
    workflowsDir = join(testDir, '.github', 'workflows');
    templatePath = join(testDir, 'template.yml');

    await fs.mkdir(tasksDir, { recursive: true });
    await fs.mkdir(workflowsDir, { recursive: true });

    // Create a simple template
    await fs.writeFile(
      templatePath,
      `name: "{{taskName}}"
on:
  schedule:
    - cron: "{{schedule}}"
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - run: echo "{{taskName}}"
{{#each secrets}}
        env:
          {{name}}: \${{ secrets.{{secretKey}} }}
{{/each}}
`,
      'utf-8'
    );
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('generateWorkflows', () => {
    it('should generate workflows for valid tasks', async () => {
      // Create a valid task
      const taskDir = join(tasksDir, 'test-task');
      await fs.mkdir(taskDir);
      await fs.writeFile(
        join(taskDir, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
`,
        'utf-8'
      );

      // Generate workflows
      const workflows = await generateWorkflows({
        tasksDir,
        workflowsDir,
        templatePath,
        dryRun: false,
      });

      expect(workflows).toHaveLength(1);
      expect(workflows[0].taskName).toBe('test-task');
      expect(workflows[0].filePath).toContain('task-test-task.yml');

      // Check file was created
      const fileExists = await fs
        .access(join(workflowsDir, 'task-test-task.yml'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should not write files in dry run mode', async () => {
      // Create a valid task
      const taskDir = join(tasksDir, 'test-task');
      await fs.mkdir(taskDir);
      await fs.writeFile(
        join(taskDir, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
`,
        'utf-8'
      );

      // Generate workflows in dry run
      await generateWorkflows({
        tasksDir,
        workflowsDir,
        templatePath,
        dryRun: true,
      });

      // Check file was NOT created
      const fileExists = await fs
        .access(join(workflowsDir, 'task-test-task.yml'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should skip invalid tasks', async () => {
      // Create an invalid task (no config.yaml)
      const taskDir = join(tasksDir, 'invalid-task');
      await fs.mkdir(taskDir);

      // Generate workflows
      const workflows = await generateWorkflows({
        tasksDir,
        workflowsDir,
        templatePath,
      });

      expect(workflows).toHaveLength(0);
    });

    it('should detect required secrets', async () => {
      // Create tasks with different providers
      const task1Dir = join(tasksDir, 'openai-task');
      await fs.mkdir(task1Dir);
      await fs.writeFile(
        join(task1Dir, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
`,
        'utf-8'
      );

      const task2Dir = join(tasksDir, 'openrouter-task');
      await fs.mkdir(task2Dir);
      await fs.writeFile(
        join(task2Dir, 'config.yaml'),
        `schedule: "0 10 * * *"
providers:
  - id: openrouter:openai/gpt-4
`,
        'utf-8'
      );

      // Generate workflows
      const workflows = await generateWorkflows({
        tasksDir,
        workflowsDir,
        templatePath,
      });

      expect(workflows).toHaveLength(2);
      expect(workflows[0].secrets).toContain('OPENAI_API_KEY');
      expect(workflows[1].secrets).toContain('OPENROUTER_API_KEY');
    });
  });

  describe('generateWorkflowFilename', () => {
    it('should convert task names to kebab-case', () => {
      expect(generateWorkflowFilename('dailyNews')).toBe('task-daily-news.yml');
      expect(generateWorkflowFilename('stock_summary')).toBe('task-stock-summary.yml');
      expect(generateWorkflowFilename('MyTask')).toBe('task-my-task.yml');
      expect(generateWorkflowFilename('simple')).toBe('task-simple.yml');
    });
  });

  describe('detectSecrets', () => {
    it('should extract secret names from workflow content', () => {
      const content = `
env:
  OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
  OPENROUTER_API_KEY: \${{ secrets.OPENROUTER_API_KEY }}
      `;

      const secrets = detectSecrets(content);
      expect(secrets).toEqual(['OPENAI_API_KEY', 'OPENROUTER_API_KEY']);
    });

    it('should handle no secrets', () => {
      const content = 'No secrets here';
      const secrets = detectSecrets(content);
      expect(secrets).toEqual([]);
    });

    it('should deduplicate secrets', () => {
      const content = `
env:
  KEY1: \${{ secrets.OPENAI_API_KEY }}
  KEY2: \${{ secrets.OPENAI_API_KEY }}
      `;

      const secrets = detectSecrets(content);
      expect(secrets).toEqual(['OPENAI_API_KEY']);
    });
  });

  describe('getGenerationSummary', () => {
    it('should return correct summary', async () => {
      // Create valid and invalid tasks
      const validTask = join(tasksDir, 'valid-task');
      await fs.mkdir(validTask);
      await fs.writeFile(
        join(validTask, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
`,
        'utf-8'
      );

      const invalidTask = join(tasksDir, 'invalid-task');
      await fs.mkdir(invalidTask);
      // No config.yaml

      const summary = await getGenerationSummary({
        tasksDir,
        workflowsDir,
      });

      expect(summary.totalTasks).toBe(2);
      expect(summary.validTasks).toBe(1);
      expect(summary.invalidTasks).toBe(1);
      expect(summary.existingWorkflows).toBe(0);
    });
  });

  describe('Template rendering', () => {
    it('should render template with task data', () => {
      const template = `name: {{taskName}}
schedule: {{schedule}}
`;
      const rendered = renderTemplate(template, {
        taskName: 'test',
        schedule: '0 9 * * *',
      });

      expect(rendered).toContain('name: test');
      expect(rendered).toContain('schedule: 0 9 * * *');
    });

    it('should render each blocks', () => {
      const template = `{{#each secrets}}
- {{name}}: {{secretKey}}
{{/each}}`;

      const rendered = renderTemplate(template, {
        secrets: [
          { name: 'KEY1', secretKey: 'SECRET1' },
          { name: 'KEY2', secretKey: 'SECRET2' },
        ],
      });

      expect(rendered).toContain('KEY1: SECRET1');
      expect(rendered).toContain('KEY2: SECRET2');
    });
  });
});
