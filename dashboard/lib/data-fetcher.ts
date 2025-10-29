import fs from 'fs';
import path from 'path';
import { AnalyticsData, TaskResult } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_DIR = path.join(process.cwd(), '..', 'tasks');

export async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const analyticsPath = path.join(DATA_DIR, 'analytics.json');
    const data = fs.readFileSync(analyticsPath, 'utf-8');
    const rawData = JSON.parse(data);

    // Transform the raw data to match our types
    const tasks: AnalyticsData['tasks'] = {};

    Object.entries(rawData.tasks || {}).forEach(([name, taskData]: [string, any]) => {
      tasks[name] = {
        name,
        description: taskData.description || `Automated task: ${name}`,
        schedule: taskData.schedule,
        lastRun: taskData.lastRun,
        status: taskData.status || 'pending',
        totalExecutions: taskData.runs || 0,
        successfulExecutions: Math.floor((taskData.runs || 0) * (taskData.successRate / 100 || 0)),
        failureExecutions: taskData.runs ? taskData.runs - Math.floor((taskData.runs || 0) * (taskData.successRate / 100 || 0)) : 0,
        totalTokens: taskData.tokens || 0,
        totalCost: taskData.cost || 0,
        averageResponseTime: taskData.avgResponseTime || 0,
        provider: taskData.provider,
        model: taskData.model,
        latestResult: taskData.recentRuns?.[0]?.resultFile,
      };
    });

    return {
      lastUpdated: rawData.lastUpdated || new Date().toISOString(),
      tasks,
      summary: {
        totalTasks: Object.keys(rawData.tasks || {}).length,
        totalExecutions: rawData.totalRuns || 0,
        totalCost: rawData.totalCost || 0,
        totalTokens: rawData.totalTokens || 0,
      },
    };
  } catch (error) {
    console.error('Error reading analytics data:', error);
    return {
      lastUpdated: new Date().toISOString(),
      tasks: {},
      summary: {
        totalTasks: 0,
        totalExecutions: 0,
        totalCost: 0,
        totalTokens: 0,
      },
    };
  }
}

export async function getTaskResults(taskName: string): Promise<TaskResult[]> {
  try {
    const resultsDir = path.join(TASKS_DIR, taskName, 'results');

    if (!fs.existsSync(resultsDir)) {
      return [];
    }

    const files = fs.readdirSync(resultsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const results: TaskResult[] = mdFiles.map(file => {
      const date = file.replace('.md', '');
      const resultPath = `data/tasks/${taskName}/${file}`;

      return {
        metadata: {
          taskName,
          timestamp: date,
          status: 'success',
        },
        content: '',
        resultPath,
        date,
      };
    });

    return results.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error(`Error reading task results for ${taskName}:`, error);
    return [];
  }
}

export async function getAllTaskNames(): Promise<string[]> {
  try {
    if (!fs.existsSync(TASKS_DIR)) {
      return [];
    }

    const entries = fs.readdirSync(TASKS_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    console.error('Error reading tasks directory:', error);
    return [];
  }
}
