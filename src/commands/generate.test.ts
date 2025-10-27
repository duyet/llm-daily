/**
 * Tests for generate command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCommand } from './generate.js';

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

// Mock workflow generator
vi.mock('../workflow-generator.js', () => ({
  generateWorkflows: vi.fn(),
  getGenerationSummary: vi.fn(),
}));

// Import mocked modules
const { logger: mockLogger } = await import('../utils/logger.js');
const { generateWorkflows: mockGenerateWorkflows, getGenerationSummary: mockGetGenerationSummary } =
  await import('../workflow-generator.js');

describe('generateCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should warn when no tasks are found', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 0,
      validTasks: 0,
      invalidTasks: 0,
    });

    await generateCommand();

    expect(mockLogger.warn).toHaveBeenCalledWith('No tasks found to generate workflows for');
    expect(mockLogger.info).toHaveBeenCalledWith('Create a task with: npm run task:new <name>');
  });

  it('should error when no valid tasks are found', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 2,
      validTasks: 0,
      invalidTasks: 2,
    });

    await generateCommand();

    expect(mockLogger.error).toHaveBeenCalledWith('No valid tasks found');
    expect(mockLogger.error).toHaveBeenCalledWith('Found 2 invalid task(s)');
    expect(mockLogger.info).toHaveBeenCalledWith('Run: npm run task:validate to see errors');
  });

  it('should generate workflows for valid tasks', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 2,
      validTasks: 2,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: ['OPENAI_API_KEY'],
        warnings: [],
      },
      {
        taskName: 'task2',
        filePath: '.github/workflows/task-task2.yml',
        secrets: ['OPENAI_API_KEY'],
        warnings: [],
      },
    ]);

    await generateCommand();

    expect(mockLogger.info).toHaveBeenCalledWith('Found 2 valid tasks');
    expect(mockLogger.success).toHaveBeenCalledWith('Generated 2 workflows:');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task-task1.yml'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task-task2.yml'));
  });

  it('should show required secrets', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 1,
      validTasks: 1,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: ['OPENAI_API_KEY', 'WEBHOOK_SECRET'],
        warnings: [],
      },
    ]);

    await generateCommand();

    expect(mockLogger.info).toHaveBeenCalledWith('Required GitHub secrets:');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('OPENAI_API_KEY'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('WEBHOOK_SECRET'));
  });

  it('should handle dry run mode', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 1,
      validTasks: 1,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: ['OPENAI_API_KEY'],
        warnings: [],
      },
    ]);

    await generateCommand({ dryRun: true });

    expect(mockLogger.info).toHaveBeenCalledWith('Dry run mode - showing what would be generated:');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('task-task1.yml'));
    expect(mockLogger.info).toHaveBeenCalledWith('Run without --dry-run to generate workflows');
    expect(mockGenerateWorkflows).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
  });

  it('should handle force mode', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 1,
      validTasks: 1,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: ['OPENAI_API_KEY'],
        warnings: [],
      },
    ]);

    await generateCommand({ force: true });

    expect(mockGenerateWorkflows).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
  });

  it('should handle workflows with warnings', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 2,
      validTasks: 2,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: [],
        warnings: [],
      },
      {
        taskName: 'task2',
        filePath: '.github/workflows/task-task2.yml',
        secrets: [],
        warnings: ['Workflow already exists'],
      },
    ]);

    await generateCommand();

    expect(mockLogger.success).toHaveBeenCalledWith('Generated 1 workflow:');
    expect(mockLogger.warn).toHaveBeenCalledWith('Skipped 1 existing workflow');
    expect(mockLogger.info).toHaveBeenCalledWith('Use --force to overwrite existing workflows');
  });

  it('should display next steps', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 1,
      validTasks: 1,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: [],
        warnings: [],
      },
    ]);

    await generateCommand();

    expect(mockLogger.info).toHaveBeenCalledWith('Next steps:');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Review generated workflows')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Add required secrets'));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Commit and push'));
  });

  it('should warn about some invalid tasks', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 3,
      validTasks: 2,
      invalidTasks: 1,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: [],
        warnings: [],
      },
    ]);

    await generateCommand();

    expect(mockLogger.info).toHaveBeenCalledWith('Found 2 valid tasks');
    expect(mockLogger.warn).toHaveBeenCalledWith('Skipping 1 invalid task');
  });

  it('should handle generation errors', async () => {
    mockGetGenerationSummary.mockRejectedValue(new Error('Failed to scan tasks'));

    await generateCommand();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERR_WORKFLOW_GENERATION]')
    );
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to scan tasks'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should show warnings in dry run mode', async () => {
    mockGetGenerationSummary.mockResolvedValue({
      totalTasks: 1,
      validTasks: 1,
      invalidTasks: 0,
    });

    mockGenerateWorkflows.mockResolvedValue([
      {
        taskName: 'task1',
        filePath: '.github/workflows/task-task1.yml',
        secrets: [],
        warnings: ['Custom warning message'],
      },
    ]);

    await generateCommand({ dryRun: true });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Custom warning message'));
  });
});
