/**
 * List command - Display all tasks with their status
 * Shows table with task info, schedule, and last run status
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import * as YAML from 'yaml';
import { logger } from '../utils/logger.js';

/**
 * Task information for listing
 */
interface TaskInfo {
  name: string;
  schedule: string;
  provider: string;
  lastRun: string;
  status: 'success' | 'error' | 'never';
  cost?: number;
}

/**
 * List command options
 */
export interface ListCommandOptions {
  /** Show detailed information */
  detailed?: boolean;
}

/**
 * List all tasks
 */
export async function listCommand(options: ListCommandOptions = {}): Promise<void> {
  try {
    const tasksDir = 'tasks';

    // Check if tasks directory exists
    try {
      await fs.access(tasksDir);
    } catch {
      logger.warn('No tasks directory found');
      logger.info('Create a task with: npm run task:new <name>');
      return;
    }

    // Get all task directories
    const entries = await fs.readdir(tasksDir, { withFileTypes: true });
    const taskDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'examples')
      .map((entry) => entry.name);

    if (taskDirs.length === 0) {
      logger.info('No tasks found');
      logger.info('Create a task with: npm run task:new <name>');
      return;
    }

    // Load task information
    const tasks: TaskInfo[] = [];
    for (const taskName of taskDirs) {
      const taskInfo = await loadTaskInfo(join(tasksDir, taskName));
      if (taskInfo) {
        tasks.push(taskInfo);
      }
    }

    // Sort by name
    tasks.sort((a, b) => a.name.localeCompare(b.name));

    // Display tasks
    displayTasks(tasks, options);
  } catch (error) {
    logger.error(`Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Load task information
 */
async function loadTaskInfo(taskDir: string): Promise<TaskInfo | null> {
  try {
    const taskName = taskDir.split('/').pop() ?? 'unknown';

    // Load config
    const configPath = join(taskDir, 'config.yaml');
    let schedule = 'not set';
    let provider = 'not set';

    try {
      const configText = await fs.readFile(configPath, 'utf-8');
      const config = YAML.parse(configText) as {
        schedule?: { cron?: string };
        provider?: { id?: string };
      };

      schedule = config.schedule?.cron ?? 'not set';
      provider = config.provider?.id ?? 'not set';
    } catch {
      // Config file doesn't exist or is invalid
    }

    // Load last run info
    const lastRunPath = join(taskDir, 'last-run.json');
    let lastRun = 'never';
    let status: 'success' | 'error' | 'never' = 'never';
    let cost: number | undefined;

    try {
      const lastRunText = await fs.readFile(lastRunPath, 'utf-8');
      const lastRunData = JSON.parse(lastRunText) as {
        timestamp?: string;
        success?: boolean;
        cost?: number;
      };

      if (lastRunData.timestamp) {
        const date = new Date(lastRunData.timestamp);
        lastRun = formatRelativeTime(date);
      }

      status = lastRunData.success ? 'success' : 'error';
      cost = lastRunData.cost;
    } catch {
      // Last run file doesn't exist
    }

    return {
      name: taskName,
      schedule,
      provider,
      lastRun,
      status,
      cost,
    };
  } catch {
    return null;
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Display tasks as a formatted table
 */
function displayTasks(tasks: TaskInfo[], options: ListCommandOptions): void {
  console.log(''); // Empty line

  // Calculate column widths
  const nameWidth = Math.max(4, ...tasks.map((t) => t.name.length));
  const scheduleWidth = Math.max(8, ...tasks.map((t) => t.schedule.length));
  const providerWidth = Math.max(8, ...tasks.map((t) => t.provider.length));
  const lastRunWidth = Math.max(8, ...tasks.map((t) => t.lastRun.length));
  const statusWidth = 7;

  // Header
  const header = [
    'Name'.padEnd(nameWidth),
    'Schedule'.padEnd(scheduleWidth),
    'Provider'.padEnd(providerWidth),
    'Last Run'.padEnd(lastRunWidth),
    'Status'.padEnd(statusWidth),
  ].join(' │ ');

  console.log(header);
  console.log('─'.repeat(header.length));

  // Rows
  for (const task of tasks) {
    const statusColor = getStatusColor(task.status);
    const statusText = getStatusText(task.status);

    const row = [
      task.name.padEnd(nameWidth),
      task.schedule.padEnd(scheduleWidth),
      task.provider.padEnd(providerWidth),
      task.lastRun.padEnd(lastRunWidth),
      statusColor + statusText.padEnd(statusWidth) + '\x1b[0m',
    ].join(' │ ');

    console.log(row);

    // Show cost if detailed and available
    if (options.detailed && task.cost !== undefined) {
      console.log(`  Cost: $${task.cost.toFixed(4)}`);
    }
  }

  console.log(''); // Empty line
  console.log(`Total: ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`);
  console.log(''); // Empty line
}

/**
 * Get color code for status
 */
function getStatusColor(status: 'success' | 'error' | 'never'): string {
  switch (status) {
    case 'success':
      return '\x1b[32m'; // Green
    case 'error':
      return '\x1b[31m'; // Red
    case 'never':
      return '\x1b[90m'; // Gray
  }
}

/**
 * Get text for status
 */
function getStatusText(status: 'success' | 'error' | 'never'): string {
  switch (status) {
    case 'success':
      return '✓ OK';
    case 'error':
      return '✗ ERROR';
    case 'never':
      return '○ NEVER';
  }
}
