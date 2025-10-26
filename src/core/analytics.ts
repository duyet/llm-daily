/**
 * Analytics manager for tracking task executions and costs
 */

import fs from 'fs/promises';
import path from 'path';
import {
  type Analytics,
  type TaskMetrics,
  type TaskExecution,
  type HistoricalData,
} from '../types/analytics.types.js';
import { calculateCost } from '../utils/cost-calculator.js';

const ANALYTICS_PATH = 'docs/data/analytics.json';
const HISTORY_DIR = 'docs/data/history';

/**
 * Analytics manager singleton
 */
class AnalyticsManager {
  private analytics: Analytics | null = null;

  /**
   * Initialize or load existing analytics
   */
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(ANALYTICS_PATH, 'utf-8');
      this.analytics = JSON.parse(data);
    } catch {
      // Initialize new analytics
      this.analytics = {
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
  }

  /**
   * Record a task execution
   */
  async recordExecution(
    taskName: string,
    success: boolean,
    tokens: { input: number; output: number },
    responseTime: number,
    provider: string,
    model: string,
    error?: string
  ): Promise<void> {
    if (!this.analytics) {
      await this.initialize();
    }

    const totalTokens = tokens.input + tokens.output;
    const cost = calculateCost(model, tokens.input, tokens.output);
    const timestamp = new Date().toISOString();

    // Update totals
    this.analytics!.totalRuns++;
    this.analytics!.totalTokens += totalTokens;
    this.analytics!.totalInputTokens += tokens.input;
    this.analytics!.totalOutputTokens += tokens.output;
    this.analytics!.totalCost += cost;

    // Update task metrics
    if (!this.analytics!.tasks[taskName]) {
      this.analytics!.tasks[taskName] = {
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

    const taskMetrics = this.analytics!.tasks[taskName];
    const prevRuns = taskMetrics.runs;
    const prevSuccesses = Math.round(taskMetrics.runs * taskMetrics.successRate);

    taskMetrics.runs++;
    taskMetrics.tokens += totalTokens;
    taskMetrics.inputTokens += tokens.input;
    taskMetrics.outputTokens += tokens.output;
    taskMetrics.cost += cost;

    if (success) {
      taskMetrics.lastRun = timestamp;
    }

    // Update success rate
    const newSuccesses = success ? prevSuccesses + 1 : prevSuccesses;
    taskMetrics.successRate = newSuccesses / taskMetrics.runs;

    // Update average response time
    taskMetrics.avgResponseTime =
      (taskMetrics.avgResponseTime * prevRuns + responseTime) / taskMetrics.runs;

    // Update overall success rate
    const totalSuccesses = Object.values(this.analytics!.tasks).reduce(
      (sum, m) => sum + Math.round(m.runs * m.successRate),
      0
    );
    this.analytics!.successRate = totalSuccesses / this.analytics!.totalRuns;

    // Update daily metrics
    this.updateDailyMetrics(success, totalTokens, cost);

    // Update timestamp
    this.analytics!.lastUpdated = timestamp;

    // Save analytics
    await this.save();

    // Record to historical data
    await this.recordToHistory({
      taskName,
      timestamp,
      success,
      tokens: {
        input: tokens.input,
        output: tokens.output,
        total: totalTokens,
      },
      cost,
      responseTime,
      provider,
      model,
      error,
    });
  }

  /**
   * Update daily metrics
   */
  private updateDailyMetrics(success: boolean, tokens: number, cost: number): void {
    const today = new Date().toISOString().split('T')[0];

    // Find or create today's metrics
    let dailyMetric = this.analytics!.daily.find((d) => d.date === today);

    if (!dailyMetric) {
      dailyMetric = {
        date: today,
        runs: 0,
        tokens: 0,
        cost: 0,
        successes: 0,
        failures: 0,
      };
      this.analytics!.daily.push(dailyMetric);
    }

    dailyMetric.runs++;
    dailyMetric.tokens += tokens;
    dailyMetric.cost += cost;

    if (success) {
      dailyMetric.successes++;
    } else {
      dailyMetric.failures++;
    }

    // Keep only last 90 days
    this.analytics!.daily = this.analytics!.daily.sort((a, b) =>
      b.date.localeCompare(a.date)
    ).slice(0, 90);
  }

  /**
   * Record execution to monthly historical data
   */
  private async recordToHistory(execution: TaskExecution): Promise<void> {
    const month = execution.timestamp.substring(0, 7); // YYYY-MM
    const historyFile = path.join(HISTORY_DIR, `${month}.json`);

    let historicalData: HistoricalData;

    try {
      const data = await fs.readFile(historyFile, 'utf-8');
      historicalData = JSON.parse(data);
    } catch {
      // Create new month
      historicalData = {
        month,
        executions: [],
        summary: {
          totalRuns: 0,
          totalTokens: 0,
          totalCost: 0,
          successRate: 0,
          tasks: {},
        },
      };
    }

    // Add execution
    historicalData.executions.push(execution);

    // Update summary
    historicalData.summary.totalRuns++;
    historicalData.summary.totalTokens += execution.tokens.total;
    historicalData.summary.totalCost += execution.cost;

    // Update task summary
    if (!historicalData.summary.tasks[execution.taskName]) {
      historicalData.summary.tasks[execution.taskName] = {
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

    const taskSummary = historicalData.summary.tasks[execution.taskName];
    const prevRuns = taskSummary.runs;
    const prevSuccesses = Math.round(taskSummary.runs * taskSummary.successRate);

    taskSummary.runs++;
    taskSummary.tokens += execution.tokens.total;
    taskSummary.inputTokens += execution.tokens.input;
    taskSummary.outputTokens += execution.tokens.output;
    taskSummary.cost += execution.cost;

    if (execution.success) {
      taskSummary.lastRun = execution.timestamp;
    }

    const newSuccesses = execution.success ? prevSuccesses + 1 : prevSuccesses;
    taskSummary.successRate = newSuccesses / taskSummary.runs;
    taskSummary.avgResponseTime =
      (taskSummary.avgResponseTime * prevRuns + execution.responseTime) / taskSummary.runs;

    // Update overall success rate
    const totalSuccesses = historicalData.executions.filter((e) => e.success).length;
    historicalData.summary.successRate = totalSuccesses / historicalData.summary.totalRuns;

    // Save historical data
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    await fs.writeFile(historyFile, JSON.stringify(historicalData, null, 2), 'utf-8');
  }

  /**
   * Get current analytics
   */
  async getAnalytics(): Promise<Analytics> {
    if (!this.analytics) {
      await this.initialize();
    }
    return this.analytics!;
  }

  /**
   * Get analytics for a specific task
   */
  async getTaskMetrics(taskName: string): Promise<TaskMetrics | null> {
    if (!this.analytics) {
      await this.initialize();
    }
    return this.analytics!.tasks[taskName] || null;
  }

  /**
   * Get historical data for a month
   */
  async getHistoricalData(month: string): Promise<HistoricalData | null> {
    try {
      const historyFile = path.join(HISTORY_DIR, `${month}.json`);
      const data = await fs.readFile(historyFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save analytics to disk
   */
  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(ANALYTICS_PATH), { recursive: true });
    await fs.writeFile(ANALYTICS_PATH, JSON.stringify(this.analytics, null, 2), 'utf-8');
  }

  /**
   * Reset analytics (for testing)
   */
  async reset(): Promise<void> {
    this.analytics = {
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
    await this.save();
  }
}

// Export singleton instance
export const analytics = new AnalyticsManager();
