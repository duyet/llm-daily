/**
 * Tests for validate command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCommand } from './validate.js';
import type { Dirent, Stats } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
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

// Mock config validator
vi.mock('../utils/config-validator.js', () => ({
  validateTaskConfig: vi.fn(),
}));

// Import mocked modules
const { promises: fs } = await import('fs');
const { validateTaskConfig } = await import('../utils/config-validator.js');
const { logger: mockLogger } = await import('../utils/logger.js');

describe('validateCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should validate a single task successfully', async () => {
    // Mock task directory structure
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('provider:\n  id: openai:gpt-4o-mini');
    vi.mocked(validateTaskConfig).mockReturnValue({ success: true, errors: [] });

    const mockStat: Partial<Stats> = {
      isDirectory: () => true,
    };
    vi.mocked(fs.stat).mockResolvedValue(mockStat as Stats);

    await validateCommand('test-task');

    expect(mockLogger.success).toHaveBeenCalledWith('test-task: Valid');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should detect missing config.yaml', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    await validateCommand('test-task');

    expect(mockLogger.error).toHaveBeenCalledWith('test-task: Invalid');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('config.yaml not found'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should detect invalid YAML syntax', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('invalid: yaml: syntax:');

    await validateCommand('test-task');

    expect(mockLogger.error).toHaveBeenCalledWith('test-task: Invalid');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Invalid YAML'));
  });

  it('should detect schema validation errors', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('provider:\n  id: invalid');
    vi.mocked(validateTaskConfig).mockReturnValue({
      success: false,
      errors: [
        { path: 'provider.id', message: 'Invalid provider format' },
        { path: 'memory', message: 'Required field missing' },
      ],
    });

    await validateCommand('test-task');

    expect(mockLogger.error).toHaveBeenCalledWith('test-task: Invalid');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('provider.id'));
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Invalid provider format')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should detect missing prompt.md', async () => {
    vi.mocked(validateTaskConfig).mockReturnValue({ success: true, errors: [] });
    vi.mocked(fs.readFile).mockResolvedValue('provider:\n  id: openai:gpt-4o-mini');

    vi.mocked(fs.access).mockImplementation((path: any) => {
      if (path.includes('prompt.md')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve(undefined);
    });

    await validateCommand('test-task');

    expect(mockLogger.error).toHaveBeenCalledWith('test-task: Invalid');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('prompt.md not found'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should warn about missing memory.md', async () => {
    vi.mocked(validateTaskConfig).mockReturnValue({ success: true, errors: [] });
    vi.mocked(fs.readFile).mockResolvedValue('provider:\n  id: openai:gpt-4o-mini');

    vi.mocked(fs.access).mockImplementation((path: any) => {
      if (path.includes('memory.md')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve(undefined);
    });

    const mockStat: Partial<Stats> = {
      isDirectory: () => true,
    };
    vi.mocked(fs.stat).mockResolvedValue(mockStat as Stats);

    await validateCommand('test-task');

    expect(mockLogger.success).toHaveBeenCalledWith('test-task: Valid');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('memory.md not found (will be created on first run)')
    );
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should validate all tasks when no specific task is provided', async () => {
    const mockDirents: Partial<Dirent>[] = [
      { name: 'task1', isDirectory: () => true },
      { name: 'task2', isDirectory: () => true },
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('provider:\n  id: openai:gpt-4o-mini');
    vi.mocked(validateTaskConfig).mockReturnValue({ success: true, errors: [] });

    const mockStat: Partial<Stats> = {
      isDirectory: () => true,
    };
    vi.mocked(fs.stat).mockResolvedValue(mockStat as Stats);

    await validateCommand();

    expect(mockLogger.info).toHaveBeenCalledWith('Validating 2 tasks...');
    expect(mockLogger.success).toHaveBeenCalledWith('task1: Valid');
    expect(mockLogger.success).toHaveBeenCalledWith('task2: Valid');
    expect(mockLogger.info).toHaveBeenCalledWith('Summary: 2/2 tasks valid');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should display summary with mixed valid and invalid tasks', async () => {
    const mockDirents: Partial<Dirent>[] = [
      { name: 'valid-task', isDirectory: () => true },
      { name: 'invalid-task', isDirectory: () => true },
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);
    vi.mocked(fs.readFile).mockResolvedValue('provider:\n  id: openai:gpt-4o-mini');

    vi.mocked(fs.access).mockImplementation((path: any) => {
      // invalid-task is missing prompt.md
      if (path.includes('invalid-task') && path.includes('prompt.md')) {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve(undefined);
    });

    vi.mocked(validateTaskConfig).mockReturnValue({ success: true, errors: [] });

    const mockStat: Partial<Stats> = {
      isDirectory: () => true,
    };
    vi.mocked(fs.stat).mockResolvedValue(mockStat as Stats);

    await validateCommand();

    expect(mockLogger.success).toHaveBeenCalledWith('valid-task: Valid');
    expect(mockLogger.error).toHaveBeenCalledWith('invalid-task: Invalid');
    expect(mockLogger.info).toHaveBeenCalledWith('Summary: 1/2 tasks valid');
    expect(mockLogger.error).toHaveBeenCalledWith('1 task failed validation');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should stop on first error in fail-fast mode', async () => {
    const mockDirents: Partial<Dirent>[] = [
      { name: 'task1', isDirectory: () => true },
      { name: 'task2', isDirectory: () => true },
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    // task1 is invalid
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    await validateCommand(undefined, { failFast: true });

    expect(mockLogger.error).toHaveBeenCalledWith('task1: Invalid');
    // task2 should not be validated
    expect(mockLogger.success).not.toHaveBeenCalledWith(expect.stringContaining('task2'));
  });

  it('should handle readdir errors gracefully', async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

    await validateCommand();

    // getAllTasks catches error and returns empty array, so warns about no tasks
    expect(mockLogger.warn).toHaveBeenCalledWith('No tasks found to validate');
  });

  it('should warn when no tasks are found', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([]);

    await validateCommand();

    expect(mockLogger.warn).toHaveBeenCalledWith('No tasks found to validate');
  });

  it('should provide helpful suggestions for common errors', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    await validateCommand('test-task');

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('npm run task:new'));
  });
});
