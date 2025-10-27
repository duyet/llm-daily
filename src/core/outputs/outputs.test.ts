/**
 * Tests for output integrations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import { CommitOutput } from './commit.js';
import { WebhookOutput } from './webhook.js';
import { FileOutput } from './file.js';
import type { TaskResult } from '../../types/output.types.js';

const mockTaskResult: TaskResult = {
  taskName: 'test-task',
  timestamp: '2025-01-26T10:00:00Z',
  success: true,
  response: 'This is a test response from the LLM.',
  metadata: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    tokens: {
      input: 1000,
      output: 500,
      total: 1500,
    },
    cost: 0.005,
    responseTime: 2.5,
  },
};

describe('CommitOutput', () => {
  const outputPath = 'dashboard/data/tasks/test-task.json';

  beforeEach(async () => {
    try {
      await fs.rm('dashboard/data/tasks', { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('dashboard/data/tasks', { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should write task result to JSON file', async () => {
    const output = new CommitOutput({ path: outputPath });
    await output.execute(mockTaskResult);

    const content = await fs.readFile(outputPath, 'utf-8');
    const saved = JSON.parse(content);

    expect(saved.taskName).toBe('test-task');
    expect(saved.response).toBe('This is a test response from the LLM.');
  });

  it('should support template variables in path', async () => {
    const output = new CommitOutput({ path: 'dashboard/data/tasks/{{taskName}}.json' });
    await output.execute(mockTaskResult);

    const content = await fs.readFile('dashboard/data/tasks/test-task.json', 'utf-8');
    const saved = JSON.parse(content);

    expect(saved.taskName).toBe('test-task');
  });

  it('should use custom commit message', async () => {
    const output = new CommitOutput({
      path: outputPath,
      message: 'Custom: {{taskName}} at {{timestamp}}',
    });

    // Don't test actual git commit, just ensure it doesn't throw
    await expect(output.execute(mockTaskResult)).resolves.not.toThrow();
  });
});

describe('WebhookOutput', () => {
  it('should send webhook with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });

    // @ts-ignore
    global.fetch = mockFetch;

    const output = new WebhookOutput({
      url: 'https://example.com/webhook',
    });

    await output.execute(mockTaskResult);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );

    const callArgs = mockFetch.mock.calls[0][1];
    const payload = JSON.parse(callArgs.body);

    expect(payload.task).toBe('test-task');
    expect(payload.success).toBe(true);
    expect(payload.response).toBe('This is a test response from the LLM.');
  });

  it('should include custom headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    // @ts-ignore
    global.fetch = mockFetch;

    const output = new WebhookOutput({
      url: 'https://example.com/webhook',
      headers: {
        Authorization: 'Bearer test-token',
        'X-Custom': 'value',
      },
    });

    await output.execute(mockTaskResult);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe('Bearer test-token');
    expect(callArgs.headers['X-Custom']).toBe('value');
  });

  it('should retry on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

    // @ts-ignore
    global.fetch = mockFetch;

    const output = new WebhookOutput({
      url: 'https://example.com/webhook',
      retries: 3,
    });

    await output.execute(mockTaskResult);

    expect(mockFetch).toHaveBeenCalledTimes(2); // First fails, second succeeds
  });

  it('should fail after max retries', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // @ts-ignore
    global.fetch = mockFetch;

    const output = new WebhookOutput({
      url: 'https://example.com/webhook',
      retries: 2,
    });

    await expect(output.execute(mockTaskResult)).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('FileOutput', () => {
  const outputDir = 'results';

  beforeEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should write markdown by default', async () => {
    const output = new FileOutput({
      path: `${outputDir}/test.md`,
    });

    await output.execute(mockTaskResult);

    const content = await fs.readFile(`${outputDir}/test.md`, 'utf-8');

    expect(content).toContain('# test-task');
    expect(content).toContain('✅ Success');
    expect(content).toContain('This is a test response from the LLM.');
  });

  it('should write JSON format', async () => {
    const output = new FileOutput({
      path: `${outputDir}/test.json`,
      format: 'json',
    });

    await output.execute(mockTaskResult);

    const content = await fs.readFile(`${outputDir}/test.json`, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.taskName).toBe('test-task');
    expect(parsed.response).toBe('This is a test response from the LLM.');
  });

  it('should write text format', async () => {
    const output = new FileOutput({
      path: `${outputDir}/test.txt`,
      format: 'text',
    });

    await output.execute(mockTaskResult);

    const content = await fs.readFile(`${outputDir}/test.txt`, 'utf-8');

    expect(content.trim()).toBe('This is a test response from the LLM.');
  });

  it('should support template variables in path', async () => {
    const output = new FileOutput({
      path: `${outputDir}/{{taskName}}-{{date}}.md`,
    });

    await output.execute(mockTaskResult);

    const expectedDate = '2025-01-26'; // From mockTaskResult timestamp
    const expectedPath = `${outputDir}/test-task-${expectedDate}.md`;

    const content = await fs.readFile(expectedPath, 'utf-8');
    expect(content).toContain('# test-task');
  });

  it('should support custom template', async () => {
    const output = new FileOutput({
      path: `${outputDir}/test.md`,
      template: 'Task: {{taskName}}\nResponse: {{response}}',
    });

    await output.execute(mockTaskResult);

    const content = await fs.readFile(`${outputDir}/test.md`, 'utf-8');

    expect(content).toContain('Task: test-task');
    expect(content).toContain('Response: This is a test response from the LLM.');
  });

  it('should append to file when mode is append', async () => {
    const output = new FileOutput({
      path: `${outputDir}/test.md`,
      mode: 'append',
    });

    await output.execute(mockTaskResult);
    await output.execute({ ...mockTaskResult, timestamp: '2025-01-27T10:00:00Z' });

    const content = await fs.readFile(`${outputDir}/test.md`, 'utf-8');

    // Should contain both executions
    const occurrences = (content.match(/# test-task/g) || []).length;
    expect(occurrences).toBe(2);
  });

  it('should overwrite file by default', async () => {
    const output = new FileOutput({
      path: `${outputDir}/test.md`,
    });

    await output.execute(mockTaskResult);
    await output.execute({ ...mockTaskResult, response: 'Second response' });

    const content = await fs.readFile(`${outputDir}/test.md`, 'utf-8');

    // Should only contain second execution
    expect(content).toContain('Second response');
    expect(content).not.toContain('This is a test response from the LLM.');
  });
});
