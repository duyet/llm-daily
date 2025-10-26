/**
 * Task scanner tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanTasks, getTaskSummary } from './scanner.js';

describe('Task Scanner', () => {
  let testDir: string;
  let tasksDir: string;

  beforeEach(async () => {
    // Create temp directory
    testDir = join(tmpdir(), `llm-daily-scanner-test-${Date.now()}`);
    tasksDir = join(testDir, 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('scanTasks', () => {
    it('should find valid tasks', async () => {
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

      const tasks = await scanTasks({ tasksDir });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe('test-task');
      expect(tasks[0].isValid).toBe(true);
      expect(tasks[0].config).toBeDefined();
      expect(tasks[0].config?.schedule).toBe('0 9 * * *');
    });

    it('should skip invalid tasks by default', async () => {
      // Create an invalid task (no config.yaml)
      const invalidTask = join(tasksDir, 'invalid-task');
      await fs.mkdir(invalidTask);

      const tasks = await scanTasks({ tasksDir, skipInvalid: true });

      expect(tasks).toHaveLength(0);
    });

    it('should include invalid tasks when requested', async () => {
      // Create an invalid task
      const invalidTask = join(tasksDir, 'invalid-task');
      await fs.mkdir(invalidTask);

      const tasks = await scanTasks({ tasksDir, skipInvalid: false, showWarnings: false });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].isValid).toBe(false);
      expect(tasks[0].errors.length).toBeGreaterThan(0);
    });

    it('should exclude tasks by pattern', async () => {
      // Create tasks
      await fs.mkdir(join(tasksDir, 'examples'));
      await fs.mkdir(join(tasksDir, 'test-task'));

      const tasks = await scanTasks({
        tasksDir,
        exclude: ['examples'],
        showWarnings: false,
      });

      expect(tasks.length).toBe(0); // Both are invalid (no config.yaml)
    });

    it('should extract secrets from provider config', async () => {
      // Create task with OpenAI provider
      const taskDir = join(tasksDir, 'openai-task');
      await fs.mkdir(taskDir);
      await fs.writeFile(
        join(taskDir, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
`,
        'utf-8'
      );

      const tasks = await scanTasks({ tasksDir });

      expect(tasks[0].config?.secrets).toHaveLength(1);
      expect(tasks[0].config?.secrets[0].secretKey).toBe('OPENAI_API_KEY');
    });

    it('should extract multiple different secrets', async () => {
      // Create task with multiple providers
      const taskDir = join(tasksDir, 'multi-provider-task');
      await fs.mkdir(taskDir);
      await fs.writeFile(
        join(taskDir, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
  - id: openrouter:anthropic/claude-3
`,
        'utf-8'
      );

      const tasks = await scanTasks({ tasksDir });

      expect(tasks[0].config?.secrets).toHaveLength(2);
      const secretKeys = tasks[0].config?.secrets.map((s) => s.secretKey);
      expect(secretKeys).toContain('OPENAI_API_KEY');
      expect(secretKeys).toContain('OPENROUTER_API_KEY');
    });

    it('should handle malformed YAML', async () => {
      // Create task with invalid YAML
      const taskDir = join(tasksDir, 'bad-yaml');
      await fs.mkdir(taskDir);
      await fs.writeFile(
        join(taskDir, 'config.yaml'),
        `schedule: "0 9 * * *"
providers:
  - id: openai:gpt-4
    this is invalid yaml: {{{ }}}
`,
        'utf-8'
      );

      const tasks = await scanTasks({ tasksDir, skipInvalid: false, showWarnings: false });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].isValid).toBe(false);
    });
  });

  describe('getTaskSummary', () => {
    it('should provide accurate summary', async () => {
      // Create valid task
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

      // Create invalid task
      const invalidTask = join(tasksDir, 'invalid-task');
      await fs.mkdir(invalidTask);

      const summary = await getTaskSummary({ tasksDir });

      expect(summary.total).toBe(2);
      expect(summary.valid).toBe(1);
      expect(summary.invalid).toBe(1);
    });
  });
});
