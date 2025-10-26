/**
 * Tests for deduplication system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  shouldRunTask,
  getDeduplicationSummary,
  hasMinimumTimePassed,
  DeduplicationError,
} from './deduplication.js';
import { MemoryContent } from '../../types/memory.types.js';
import { createProvider } from '../providers/registry.js';

// Mock provider with dynamic response - recreate for each test
let mockCall: ReturnType<typeof vi.fn>;

vi.mock('../providers/registry.js', () => ({
  createProvider: vi.fn((config) => ({
    call: (...args: any[]) => mockCall(...args),
  })),
}));

const createTestMemory = (
  lastRun?: string,
  totalRuns = 5,
  lastTopics: string[] = []
): MemoryContent => ({
  metadata: {
    lastRun,
    totalRuns,
    totalTokens: 1000,
    totalCost: 0.05,
    lastTopics,
  },
  body: '# Test Memory\n\nSome content',
});

describe('Deduplication System', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Recreate mockCall for each test
    mockCall = vi.fn(async (prompt: string) => {
      // Parse prompt to determine response
      if (prompt.includes('redundant')) {
        return {
          content: JSON.stringify({
            shouldRun: false,
            reason: 'Topic already covered recently',
            confidence: 0.9,
          }),
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          cost: 0.001,
        };
      } else {
        return {
          content: JSON.stringify({
            shouldRun: true,
            reason: 'New topic, different context',
            confidence: 0.85,
          }),
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          cost: 0.001,
        };
      }
    });
  });

  describe('Time-based deduplication', () => {
    it('should allow run if never run before', async () => {
      const memory = createTestMemory(undefined);
      const result = await shouldRunTask({
        strategy: 'time',
        taskContext: 'Test task',
        memory,
      });

      expect(result.shouldRun).toBe(true);
      expect(result.reason).toContain('never been run');
      expect(result.confidence).toBe(1.0);
    });

    it('should block run if too recent', async () => {
      // 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const memory = createTestMemory(oneHourAgo);

      const result = await shouldRunTask({
        strategy: 'time',
        taskContext: 'Test task',
        memory,
        minHoursBetweenRuns: 24,
      });

      expect(result.shouldRun).toBe(false);
      expect(result.reason).toContain('hours ago');
    });

    it('should allow run if enough time passed', async () => {
      // 25 hours ago
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const memory = createTestMemory(oneDayAgo);

      const result = await shouldRunTask({
        strategy: 'time',
        taskContext: 'Test task',
        memory,
        minHoursBetweenRuns: 24,
      });

      expect(result.shouldRun).toBe(true);
      expect(result.reason).toContain('hours ago');
    });

    it('should respect custom minimum hours', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const memory = createTestMemory(twoHoursAgo);

      const result = await shouldRunTask({
        strategy: 'time',
        taskContext: 'Test task',
        memory,
        minHoursBetweenRuns: 1,
      });

      expect(result.shouldRun).toBe(true);
    });
  });

  describe('Content-based deduplication', () => {
    it('should detect redundant content', async () => {
      const memory = createTestMemory(undefined, 5, ['AI regulation']);

      const result = await shouldRunTask({
        strategy: 'content',
        taskContext: 'Write about redundant AI topic',
        memory,
      });

      expect(createProvider).toHaveBeenCalled();
      expect(result.shouldRun).toBe(false); // Should be redundant
      expect(result.reason).toContain('already covered');
      expect(result.tokensUsed).toBeDefined();
      expect(result.cost).toBeDefined();
    });

    it('should return valid decision structure', async () => {
      const memory = createTestMemory();

      const result = await shouldRunTask({
        strategy: 'content',
        taskContext: 'Fresh new blockchain analysis',
        memory,
      });

      // Just verify structure, not specific decision
      expect(typeof result.shouldRun).toBe('boolean');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.tokensUsed).toBeDefined();
      expect(result.cost).toBeDefined();
    });
  });

  describe('Hybrid deduplication', () => {
    it('should respect time check first', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const memory = createTestMemory(oneHourAgo);

      const result = await shouldRunTask({
        strategy: 'hybrid',
        taskContext: 'Test task',
        memory,
        minHoursBetweenRuns: 24,
      });

      expect(result.shouldRun).toBe(false);
      expect(result.reason).toContain('hours ago');
      // Should not have called LLM
      expect(result.tokensUsed).toBeUndefined();
    });

    it('should check content if time passes', async () => {
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const memory = createTestMemory(oneDayAgo);

      const result = await shouldRunTask({
        strategy: 'hybrid',
        taskContext: 'Test task',
        memory,
        minHoursBetweenRuns: 24,
      });

      expect(result.tokensUsed).toBeDefined();
      expect(result.cost).toBeDefined();
    });

    it('should handle low confidence gracefully', async () => {
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const memory = createTestMemory(oneDayAgo);

      // Mock low confidence response
      vi.mocked(createProvider).mockReturnValueOnce({
        call: vi.fn(async () => ({
          content: JSON.stringify({
            shouldRun: false,
            reason: 'Maybe redundant',
            confidence: 0.3,
          }),
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          cost: 0.001,
        })),
      } as any);

      const result = await shouldRunTask({
        strategy: 'hybrid',
        taskContext: 'Test task',
        memory,
        minHoursBetweenRuns: 24,
        confidenceThreshold: 0.7,
      });

      expect(result.shouldRun).toBe(true);
      expect(result.reason).toContain('low confidence');
    });
  });

  describe('Helper functions', () => {
    it('should get deduplication summary', () => {
      const memory = createTestMemory(
        new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        10,
        ['AI', 'Tech']
      );

      const summary = getDeduplicationSummary(memory.metadata);
      expect(summary.totalRuns).toBe(10);
      expect(summary.recentTopics).toEqual(['AI', 'Tech']);
      expect(summary.hoursSinceLastRun).toBeCloseTo(12, 0);
    });

    it('should handle missing lastRun', () => {
      const memory = createTestMemory(undefined);
      const summary = getDeduplicationSummary(memory.metadata);
      expect(summary.hoursSinceLastRun).toBeNull();
    });

    it('should check if minimum time passed', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(hasMinimumTimePassed(oneHourAgo, 0.5)).toBe(true);
      expect(hasMinimumTimePassed(oneHourAgo, 2)).toBe(false);
      expect(hasMinimumTimePassed(undefined, 24)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw on invalid strategy', async () => {
      const memory = createTestMemory();

      await expect(
        shouldRunTask({
          strategy: 'invalid' as any,
          taskContext: 'Test',
          memory,
        })
      ).rejects.toThrow(DeduplicationError);
    });

    it('should handle LLM errors gracefully', async () => {
      const memory = createTestMemory();

      vi.mocked(createProvider).mockReturnValueOnce({
        call: vi.fn(async () => {
          throw new Error('LLM failed');
        }),
      } as any);

      await expect(
        shouldRunTask({
          strategy: 'content',
          taskContext: 'Test',
          memory,
        })
      ).rejects.toThrow(DeduplicationError);
    });

    it('should handle invalid JSON response', async () => {
      const memory = createTestMemory();

      vi.mocked(createProvider).mockReturnValueOnce({
        call: vi.fn(async () => ({
          content: 'Not valid JSON',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          cost: 0.001,
        })),
      } as any);

      await expect(
        shouldRunTask({
          strategy: 'content',
          taskContext: 'Test',
          memory,
        })
      ).rejects.toThrow(DeduplicationError);
    });
  });
});
