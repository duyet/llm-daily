#!/usr/bin/env node
/**
 * Dashboard Data Builder
 *
 * Aggregates task configurations, execution history, and analytics
 * into an enhanced analytics.json file for the dashboard.
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import yaml from 'js-yaml';
import { parseExpression } from 'cron-parser';
import type { Analytics, TaskRunSummary, HistoricalData } from '../types/analytics.types.js';
import type { TaskConfig } from '../types/config.types.js';

const ANALYTICS_PATH = 'dashboard/data/analytics.json';
const HISTORY_DIR = 'dashboard/data/history';
const TASKS_DIR = 'tasks';

interface TaskInfo {
  name: string;
  config: TaskConfig;
  schedule?: string;
  description?: string;
}

/**
 * Scan all task directories and load their configurations
 */
async function scanTasks(): Promise<TaskInfo[]> {
  const configFiles = await glob(`${TASKS_DIR}/*/config.yaml`);
  const tasks: TaskInfo[] = [];

  for (const configFile of configFiles) {
    try {
      const taskName = path.basename(path.dirname(configFile));
      const content = await fs.readFile(configFile, 'utf-8');
      // Type assertion with validation
      const loadedConfig: unknown = yaml.load(content);
      if (!loadedConfig || typeof loadedConfig !== 'object') {
        throw new Error('Invalid config format');
      }
      const config = loadedConfig as TaskConfig;

      tasks.push({
        name: taskName,
        config,
        schedule: typeof config.schedule === 'string' ? config.schedule : config.schedule?.cron,
        description: config.description,
      });
    } catch (error) {
      console.warn(`Failed to load config for ${configFile}:`, error);
    }
  }

  return tasks;
}

/**
 * Calculate next run time from cron expression
 */
function calculateNextRun(cronExpression: string): string | null {
  try {
    const interval = parseExpression(cronExpression, {
      tz: 'UTC',
      currentDate: new Date(),
    });
    return interval.next().toISOString();
  } catch (error) {
    console.warn(`Failed to parse cron expression: ${cronExpression}`, error);
    return null;
  }
}

/**
 * Load all historical execution data
 */
async function loadHistoricalData(): Promise<Map<string, TaskRunSummary[]>> {
  const taskRuns = new Map<string, TaskRunSummary[]>();

  try {
    const historyFiles = await glob(`${HISTORY_DIR}/*.json`);

    for (const file of historyFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const data = JSON.parse(content) as HistoricalData;

        // Process each execution
        for (const execution of data.executions) {
          const runs = taskRuns.get(execution.taskName) || [];
          runs.push({
            timestamp: execution.timestamp,
            status: execution.success ? 'success' : 'failed',
            duration: execution.responseTime,
            tokens: execution.tokens,
            cost: execution.cost,
            provider: execution.provider,
            model: execution.model,
            error: execution.error,
          });
          taskRuns.set(execution.taskName, runs);
        }
      } catch (error) {
        console.warn(`Failed to load history file ${file}:`, error);
      }
    }

    // Sort runs by timestamp (newest first) and keep last 10 per task
    for (const [taskName, runs] of taskRuns.entries()) {
      runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      taskRuns.set(taskName, runs.slice(0, 10));
    }
  } catch (error) {
    console.warn('No historical data found:', error);
  }

  return taskRuns;
}

/**
 * Build enhanced analytics data
 */
async function buildDashboardData(): Promise<void> {
  console.log('🔨 Building dashboard data...');

  // Load existing analytics
  let analytics: Analytics;
  try {
    const content = await fs.readFile(ANALYTICS_PATH, 'utf-8');
    analytics = JSON.parse(content) as Analytics;
  } catch {
    console.log('⚠️  No existing analytics found, creating new...');
    analytics = {
      totalRuns: 0,
      totalTokens: 0,
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      successRate: 0,
      lastUpdated: new Date().toISOString(),
      tasks: {},
      daily: [],
    };
  }

  // Scan tasks
  console.log('📋 Scanning task configurations...');
  const tasks = await scanTasks();
  console.log(`✓ Found ${tasks.length} tasks`);

  // Load historical data
  console.log('📊 Loading historical execution data...');
  const taskRuns = await loadHistoricalData();

  // Enhance task metrics
  for (const task of tasks) {
    console.log(`  - Processing ${task.name}...`);

    // Get or create task metrics
    if (!analytics.tasks[task.name]) {
      analytics.tasks[task.name] = {
        runs: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        successRate: 0,
        lastRun: null,
        avgResponseTime: 0,
      };
    }

    const metrics = analytics.tasks[task.name];

    // Add schedule and description
    metrics.schedule = task.schedule;
    metrics.description = task.description;

    // Calculate next run
    if (task.schedule) {
      metrics.nextRun = calculateNextRun(task.schedule) || undefined;
    }

    // Add recent runs
    const recentRuns = taskRuns.get(task.name) || [];
    metrics.recentRuns = recentRuns;

    // Determine status from most recent run
    if (recentRuns.length > 0) {
      metrics.status = recentRuns[0].status;
    } else {
      metrics.status = 'pending';
    }
  }

  // Update last updated timestamp
  analytics.lastUpdated = new Date().toISOString();

  // Write enhanced analytics
  console.log('💾 Writing enhanced analytics...');
  await fs.mkdir(path.dirname(ANALYTICS_PATH), { recursive: true });
  await fs.writeFile(ANALYTICS_PATH, JSON.stringify(analytics, null, 2), 'utf-8');

  console.log('✅ Dashboard data built successfully!');
  console.log(`   Analytics: ${ANALYTICS_PATH}`);
  console.log(`   Tasks: ${Object.keys(analytics.tasks).length}`);
  console.log(`   Total runs: ${analytics.totalRuns}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildDashboardData().catch((error) => {
    console.error('❌ Failed to build dashboard data:', error);
    process.exit(1);
  });
}

export { buildDashboardData };
