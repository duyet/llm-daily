/**
 * Tests for run command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCommand } from './run.js';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
  },
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock progress
vi.mock('../utils/progress.js', () => ({
  withSpinner: vi.fn(async (_message: string, fn: () => Promise<any>) => await fn()),
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock task runner
const mockTaskRunner = {
  taskExists: vi.fn(),
  listTasks: vi.fn(),
  run: vi.fn(),
};

vi.mock('../core/task-runner.js', () => ({
  createTaskRunner: vi.fn(() => mockTaskRunner),
}));

// Mock security utils
vi.mock('../utils/security.js', () => ({
  validateTaskName: vi.fn((name: string) => ({
    valid: /^[a-z0-9-]+$/.test(name),
    error: /^[a-z0-9-]+$/.test(name) ? undefined : 'Invalid task name',
  })),
  sanitizePath: vi.fn((path: string) => path),
}));

// Import mocked modules
const { promises: fs } = await import('fs');
const { logger: mockLogger } = await import('../utils/logger.js');

describe('runCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run a task successfully', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'Generated content',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        cost: 0.0042,
      },
      tokensUsed: 150,
      cost: 0.0042,
      executionTime: 2500,
      outputsCreated: ['tasks/test-task/outputs/result.txt'],
      memoryUpdated: true,
    });

    await runCommand('test-task');

    expect(mockLogger.info).toHaveBeenCalledWith('Running task: test-task');
    expect(mockLogger.success).toHaveBeenCalledWith('Task "test-task" completed successfully');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Model: gpt-4o-mini'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Tokens: 150'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Cost: $0.0042'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should reject invalid task name', async () => {
    await runCommand('invalid@task');

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid task name'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should error when task does not exist', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(false);
    mockTaskRunner.listTasks.mockResolvedValue(['other-task-1', 'other-task-2']);

    await runCommand('nonexistent-task');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Task "nonexistent-task" not found in tasks/ directory'
    );
    expect(mockLogger.info).toHaveBeenCalledWith('Available tasks:');
    expect(mockLogger.info).toHaveBeenCalledWith('  - other-task-1');
    expect(mockLogger.info).toHaveBeenCalledWith('  - other-task-2');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle no available tasks', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(false);
    mockTaskRunner.listTasks.mockResolvedValue([]);

    await runCommand('nonexistent-task');

    expect(mockLogger.info).toHaveBeenCalledWith('  (no tasks found)');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should load environment from .env.local', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'test',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: 0.001,
      },
      tokensUsed: 15,
      cost: 0.001,
      executionTime: 1000,
    });

    const { config: dotenvConfig } = await import('dotenv');

    await runCommand('test-task');

    expect(dotenvConfig).toHaveBeenCalled();
  });

  it('should handle dry run mode', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: true,
      skipReason: 'Dry run mode',
    });

    await runCommand('test-task', { dryRun: true });

    expect(mockLogger.info).toHaveBeenCalledWith('Task "test-task" was skipped');
    expect(mockLogger.info).toHaveBeenCalledWith('Reason: Dry run mode');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should display verbose output', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'Detailed response content',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        cost: 0.0042,
      },
      tokensUsed: 150,
      cost: 0.0042,
      executionTime: 2500,
    });

    await runCommand('test-task', { verbose: true });

    expect(mockLogger.info).toHaveBeenCalledWith('Response:');
    expect(mockLogger.info).toHaveBeenCalledWith('Detailed response content');
  });

  it('should display execution time', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'test',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: 0.001,
      },
      tokensUsed: 15,
      cost: 0.001,
      executionTime: 3456,
    });

    await runCommand('test-task');

    expect(mockLogger.info).toHaveBeenCalledWith('Execution Time: 3.46s');
  });

  it('should handle task execution errors', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockRejectedValue(new Error('Provider API error'));

    await runCommand('test-task');

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to run task'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should display outputs created', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'test',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: 0.001,
      },
      tokensUsed: 15,
      cost: 0.001,
      executionTime: 1000,
      outputsCreated: ['tasks/test-task/outputs/result.txt', 'tasks/test-task/outputs/result.json'],
    });

    await runCommand('test-task');

    expect(mockLogger.info).toHaveBeenCalledWith('Outputs created:');
    expect(mockLogger.info).toHaveBeenCalledWith('  - tasks/test-task/outputs/result.txt');
    expect(mockLogger.info).toHaveBeenCalledWith('  - tasks/test-task/outputs/result.json');
  });

  it('should display memory update status', async () => {
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'test',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: 0.001,
      },
      tokensUsed: 15,
      cost: 0.001,
      executionTime: 1000,
      memoryUpdated: true,
    });

    await runCommand('test-task');

    expect(mockLogger.info).toHaveBeenCalledWith('Memory updated');
  });

  it('should handle custom env file', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockResolvedValue({
      skipped: false,
      success: true,
      response: {
        content: 'test',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: 0.001,
      },
      tokensUsed: 15,
      cost: 0.001,
      executionTime: 1000,
    });

    await runCommand('test-task', { envFile: '.env.custom' });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Loaded environment from')
    );
  });

  it('should show verbose error stack on error', async () => {
    const testError = new Error('Test error');
    testError.stack = 'Error: Test error\n  at test.js:1:1';

    mockTaskRunner.taskExists.mockResolvedValue(true);
    mockTaskRunner.run.mockRejectedValue(testError);

    await runCommand('test-task', { verbose: true });

    expect(mockLogger.debug).toHaveBeenCalledWith(testError.stack);
  });
});
