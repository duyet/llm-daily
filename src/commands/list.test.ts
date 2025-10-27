/**
 * Tests for list command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listCommand } from './list.js';
import type { Dirent } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
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

// Import mocked modules
const { promises: fs } = await import('fs');
const { logger: mockLogger } = await import('../utils/logger.js');

describe('listCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.exit mock
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should warn when tasks directory does not exist', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    await listCommand();

    expect(mockLogger.warn).toHaveBeenCalledWith('No tasks directory found');
    expect(mockLogger.info).toHaveBeenCalledWith('Create a task with: npm run task:new <name>');
  });

  it('should display message when no tasks exist', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as Dirent[]);

    await listCommand();

    expect(mockLogger.info).toHaveBeenCalledWith('No tasks found');
    expect(mockLogger.info).toHaveBeenCalledWith('Create a task with: npm run task:new <name>');
  });

  it('should list tasks with basic information', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    // Mock readdir to return task directories
    const mockDirents: Partial<Dirent>[] = [
      { name: 'task1', isDirectory: () => true },
      { name: 'task2', isDirectory: () => true },
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    // Mock config file reads
    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.includes('config.yaml')) {
        return Promise.resolve(`
schedule:
  cron: "0 9 * * *"
provider:
  id: "openai:gpt-4o-mini"
`);
      }
      // last-run.json doesn't exist
      return Promise.reject(new Error('ENOENT'));
    });

    await listCommand();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Name'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Schedule'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task1'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task2'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Total: 2 tasks'));
  });

  it('should filter out examples directory', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const mockDirents: Partial<Dirent>[] = [
      { name: 'task1', isDirectory: () => true },
      { name: 'examples', isDirectory: () => true }, // Should be filtered
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.includes('config.yaml')) {
        return Promise.resolve(
          'schedule:\n  cron: "0 9 * * *"\nprovider:\n  id: "openai:gpt-4o-mini"'
        );
      }
      return Promise.reject(new Error('ENOENT'));
    });

    await listCommand();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Total: 1 task'));
  });

  it('should display last run status when available', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const mockDirents: Partial<Dirent>[] = [{ name: 'task1', isDirectory: () => true }];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.includes('config.yaml')) {
        return Promise.resolve(
          'schedule:\n  cron: "0 9 * * *"\nprovider:\n  id: "openai:gpt-4o-mini"'
        );
      }
      if (path.includes('last-run.json')) {
        return Promise.resolve(
          JSON.stringify({
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            success: true,
            cost: 0.0042,
          })
        );
      }
      return Promise.reject(new Error('ENOENT'));
    });

    await listCommand();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('1 hour'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('OK'));
  });

  it('should show error status when last run failed', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const mockDirents: Partial<Dirent>[] = [{ name: 'failed-task', isDirectory: () => true }];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.includes('config.yaml')) {
        return Promise.resolve(
          'schedule:\n  cron: "0 9 * * *"\nprovider:\n  id: "openai:gpt-4o-mini"'
        );
      }
      if (path.includes('last-run.json')) {
        return Promise.resolve(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            success: false,
          })
        );
      }
      return Promise.reject(new Error('ENOENT'));
    });

    await listCommand();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
  });

  it('should display cost in detailed mode', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const mockDirents: Partial<Dirent>[] = [{ name: 'task1', isDirectory: () => true }];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.includes('config.yaml')) {
        return Promise.resolve(
          'schedule:\n  cron: "0 9 * * *"\nprovider:\n  id: "openai:gpt-4o-mini"'
        );
      }
      if (path.includes('last-run.json')) {
        return Promise.resolve(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            success: true,
            cost: 0.0123,
          })
        );
      }
      return Promise.reject(new Error('ENOENT'));
    });

    await listCommand({ detailed: true });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Cost: $0.0123'));
  });

  it('should handle readdir errors', async () => {
    // access succeeds, but readdir fails
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

    await listCommand();

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to list tasks'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle tasks with missing config gracefully', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const mockDirents: Partial<Dirent>[] = [
      { name: 'task1', isDirectory: () => true },
      { name: 'task2', isDirectory: () => true },
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockDirents as Dirent[]);

    // task1 has config, task2 doesn't
    vi.mocked(fs.readFile).mockImplementation((path: any) => {
      if (path.includes('task1') && path.includes('config.yaml')) {
        return Promise.resolve(
          'schedule:\n  cron: "0 9 * * *"\nprovider:\n  id: "openai:gpt-4o-mini"'
        );
      }
      return Promise.reject(new Error('ENOENT'));
    });

    await listCommand();

    // Should still display both tasks with "not set" for task2
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task1'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task2'));
  });
});
