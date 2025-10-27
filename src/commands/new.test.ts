/**
 * Tests for new command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { newCommand } from './new.js';
import type { Stats } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
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

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Import mocked modules
const { promises: fs } = await import('fs');
const { logger: mockLogger } = await import('../utils/logger.js');
const inquirer = await import('inquirer');
const mockPrompt = inquirer.default.prompt as any;

describe('newCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a new task with valid name', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT')); // Task doesn't exist
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await newCommand('my-task', {
      template: 'daily-summary',
      provider: 'openai:gpt-4o-mini',
      schedule: '0 9 * * *',
    });

    expect(fs.mkdir).toHaveBeenCalledWith('tasks/my-task', { recursive: true });
    expect(fs.mkdir).toHaveBeenCalledWith('tasks/my-task/outputs', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(
      'tasks/my-task/config.yaml',
      expect.any(String),
      'utf-8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'tasks/my-task/prompt.md',
      expect.any(String),
      'utf-8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'tasks/my-task/memory.md',
      expect.any(String),
      'utf-8'
    );
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Next steps:'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should reject invalid task name with special characters', async () => {
    await newCommand('invalid@task!', {});

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('lowercase letters'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should reject task name starting with hyphen', async () => {
    await newCommand('-invalid-task', {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('cannot start or end with a hyphen')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should reject task name with consecutive hyphens', async () => {
    await newCommand('invalid--task', {});

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('cannot contain consecutive hyphens')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should reject existing task', async () => {
    const mockStat: Partial<Stats> = {
      isDirectory: () => true,
    };
    vi.mocked(fs.stat).mockResolvedValue(mockStat as Stats);

    await newCommand('existing-task', {});

    expect(mockLogger.error).toHaveBeenCalledWith('Task "existing-task" already exists');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should use daily-summary template', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await newCommand('daily-task', {
      template: 'daily-summary',
      provider: 'openai:gpt-4o-mini',
      schedule: '0 9 * * *',
    });

    // Check that config contains expected settings for daily-summary
    const configCall = vi
      .mocked(fs.writeFile)
      .mock.calls.find((call) => call[0].toString().includes('config.yaml'));
    expect(configCall).toBeDefined();
    const configContent = configCall![1] as string;
    expect(configContent).toContain('temperature: 0.7');
    expect(configContent).toContain('strategy: extract');
  });

  it('should use monitoring template', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await newCommand('monitoring-task', {
      template: 'monitoring',
      provider: 'openai:gpt-4o-mini',
      schedule: '0 * * * *',
    });

    const configCall = vi
      .mocked(fs.writeFile)
      .mock.calls.find((call) => call[0].toString().includes('config.yaml'));
    const configContent = configCall![1] as string;
    expect(configContent).toContain('temperature: 0.3');
    expect(configContent).toContain('strategy: append');
  });

  it('should use interactive mode when no task name provided', async () => {
    mockPrompt.mockResolvedValue({
      name: 'interactive-task',
      template: 'custom',
      provider: 'openai:gpt-4o-mini',
      schedule: '0 0 * * *',
    });

    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await newCommand(undefined, { interactive: true });

    expect(mockPrompt).toHaveBeenCalled();
    expect(fs.mkdir).toHaveBeenCalledWith('tasks/interactive-task', { recursive: true });
  });

  it('should create outputs directory with .gitkeep', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await newCommand('test-task', {
      template: 'custom',
      provider: 'openai:gpt-4o-mini',
      schedule: '0 0 * * *',
    });

    expect(fs.mkdir).toHaveBeenCalledWith('tasks/test-task/outputs', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith('tasks/test-task/outputs/.gitkeep', '', 'utf-8');
  });

  it('should handle file creation errors', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'));

    await newCommand('test-task', {});

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create task'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should display next steps after creation', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    await newCommand('test-task', {});

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Edit tasks/test-task/prompt.md')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('npm run task:run test-task')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('npm run task:generate'));
  });
});
