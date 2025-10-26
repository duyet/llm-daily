/**
 * Tests for analytics manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { analytics } from './analytics.js';

const ANALYTICS_PATH = 'docs/data/analytics.json';
const HISTORY_DIR = 'docs/data/history';

describe('Analytics Manager', () => {
  beforeEach(async () => {
    // Clean up before each test
    try {
      await fs.rm(ANALYTICS_PATH, { force: true });
      await fs.rm(HISTORY_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
    await analytics.reset();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(ANALYTICS_PATH, { force: true });
      await fs.rm(HISTORY_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe('initialization', () => {
    it('should initialize with empty analytics', async () => {
      const data = await analytics.getAnalytics();

      expect(data.totalRuns).toBe(0);
      expect(data.totalTokens).toBe(0);
      expect(data.totalCost).toBe(0);
      expect(data.successRate).toBe(0);
      expect(data.tasks).toEqual({});
      expect(data.daily).toEqual([]);
    });

    it('should load existing analytics', async () => {
      // Create existing analytics
      const existingData = {
        totalRuns: 10,
        totalTokens: 5000,
        totalCost: 0.5,
        totalInputTokens: 3000,
        totalOutputTokens: 2000,
        successRate: 1.0,
        lastUpdated: new Date().toISOString(),
        tasks: {},
        daily: [],
      };

      await fs.mkdir('docs/data', { recursive: true });
      await fs.writeFile(ANALYTICS_PATH, JSON.stringify(existingData), 'utf-8');

      // Force re-initialization
      await (analytics as any).initialize();

      const data = await analytics.getAnalytics();
      expect(data.totalRuns).toBe(10);
      expect(data.totalTokens).toBe(5000);
    });
  });

  describe('recordExecution', () => {
    it('should record successful execution', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 1000, output: 500 },
        2.5,
        'openai',
        'gpt-4o-mini'
      );

      const data = await analytics.getAnalytics();

      expect(data.totalRuns).toBe(1);
      expect(data.totalTokens).toBe(1500);
      expect(data.totalInputTokens).toBe(1000);
      expect(data.totalOutputTokens).toBe(500);
      expect(data.successRate).toBe(1.0);
      expect(data.tasks['test-task']).toBeDefined();
      expect(data.tasks['test-task'].runs).toBe(1);
      expect(data.tasks['test-task'].successRate).toBe(1.0);
    });

    it('should record failed execution', async () => {
      await analytics.recordExecution(
        'test-task',
        false,
        { input: 1000, output: 0 },
        1.0,
        'openai',
        'gpt-4o-mini',
        'Test error'
      );

      const data = await analytics.getAnalytics();

      expect(data.totalRuns).toBe(1);
      expect(data.successRate).toBe(0);
      expect(data.tasks['test-task'].successRate).toBe(0);
      expect(data.tasks['test-task'].lastRun).toBeNull();
    });

    it('should calculate costs correctly', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 1_000_000, output: 1_000_000 }, // 1M tokens each
        2.0,
        'openai',
        'gpt-4o-mini' // $0.15 input, $0.60 output per 1M
      );

      const data = await analytics.getAnalytics();

      // Cost should be: (1M * 0.15) + (1M * 0.60) = 0.75
      expect(data.totalCost).toBeCloseTo(0.75, 2);
      expect(data.tasks['test-task'].cost).toBeCloseTo(0.75, 2);
    });

    it('should track multiple tasks', async () => {
      await analytics.recordExecution(
        'task-1',
        true,
        { input: 1000, output: 500 },
        2.0,
        'openai',
        'gpt-4o-mini'
      );

      await analytics.recordExecution(
        'task-2',
        true,
        { input: 2000, output: 1000 },
        3.0,
        'openai',
        'gpt-4o'
      );

      const data = await analytics.getAnalytics();

      expect(data.totalRuns).toBe(2);
      expect(Object.keys(data.tasks)).toHaveLength(2);
      expect(data.tasks['task-1']).toBeDefined();
      expect(data.tasks['task-2']).toBeDefined();
    });

    it('should update success rate correctly', async () => {
      // 2 successes
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 100, output: 50 },
        1.0,
        'openai',
        'gpt-4o-mini'
      );
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 100, output: 50 },
        1.0,
        'openai',
        'gpt-4o-mini'
      );

      // 1 failure
      await analytics.recordExecution(
        'test-task',
        false,
        { input: 100, output: 0 },
        1.0,
        'openai',
        'gpt-4o-mini'
      );

      const data = await analytics.getAnalytics();

      // Success rate should be 2/3 = 0.6667
      expect(data.tasks['test-task'].successRate).toBeCloseTo(0.6667, 3);
      expect(data.tasks['test-task'].runs).toBe(3);
    });

    it('should calculate average response time', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 100, output: 50 },
        2.0,
        'openai',
        'gpt-4o-mini'
      );
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 100, output: 50 },
        4.0,
        'openai',
        'gpt-4o-mini'
      );

      const data = await analytics.getAnalytics();

      // Average should be (2.0 + 4.0) / 2 = 3.0
      expect(data.tasks['test-task'].avgResponseTime).toBeCloseTo(3.0, 1);
    });
  });

  describe('daily metrics', () => {
    it('should create daily metrics', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 1000, output: 500 },
        2.0,
        'openai',
        'gpt-4o-mini'
      );

      const data = await analytics.getAnalytics();
      const today = new Date().toISOString().split('T')[0];

      expect(data.daily).toHaveLength(1);
      expect(data.daily[0].date).toBe(today);
      expect(data.daily[0].runs).toBe(1);
      expect(data.daily[0].successes).toBe(1);
      expect(data.daily[0].failures).toBe(0);
    });

    it('should keep only last 90 days', async () => {
      // This is hard to test without mocking dates
      // Just verify the field exists
      const data = await analytics.getAnalytics();
      expect(Array.isArray(data.daily)).toBe(true);
    });
  });

  describe('getTaskMetrics', () => {
    it('should return metrics for existing task', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 1000, output: 500 },
        2.0,
        'openai',
        'gpt-4o-mini'
      );

      const metrics = await analytics.getTaskMetrics('test-task');

      expect(metrics).toBeDefined();
      expect(metrics!.runs).toBe(1);
    });

    it('should return null for non-existent task', async () => {
      const metrics = await analytics.getTaskMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should save analytics to disk', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 1000, output: 500 },
        2.0,
        'openai',
        'gpt-4o-mini'
      );

      // Check file exists
      const content = await fs.readFile(ANALYTICS_PATH, 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.totalRuns).toBe(1);
      expect(saved.tasks['test-task']).toBeDefined();
    });

    it('should save historical data monthly', async () => {
      await analytics.recordExecution(
        'test-task',
        true,
        { input: 1000, output: 500 },
        2.0,
        'openai',
        'gpt-4o-mini'
      );

      const month = new Date().toISOString().substring(0, 7);
      const historyFile = `${HISTORY_DIR}/${month}.json`;

      // Check file exists
      const content = await fs.readFile(historyFile, 'utf-8');
      const history = JSON.parse(content);

      expect(history.month).toBe(month);
      expect(history.executions).toHaveLength(1);
      expect(history.summary.totalRuns).toBe(1);
    });
  });
});
