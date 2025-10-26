/**
 * Tests for cost calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCost,
  getModelPricing,
  listAvailableModels,
  formatCost,
  estimatePromptCost,
} from './cost-calculator.js';

describe('Cost Calculator', () => {
  describe('calculateCost', () => {
    it('should calculate cost for gpt-4o-mini correctly', () => {
      // 1M input tokens at $0.15, 1M output tokens at $0.60
      const cost = calculateCost('gpt-4o-mini', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(0.75, 2);
    });

    it('should calculate cost for gpt-4o correctly', () => {
      // 1M input tokens at $2.50, 1M output tokens at $10.00
      const cost = calculateCost('gpt-4o', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(12.5, 2);
    });

    it('should calculate cost for o1 correctly', () => {
      // 1M input tokens at $15.00, 1M output tokens at $60.00
      const cost = calculateCost('o1', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(75.0, 2);
    });

    it('should calculate cost for small token counts', () => {
      // 1000 input, 500 output for gpt-4o-mini
      const cost = calculateCost('gpt-4o-mini', 1000, 500);
      // (1000/1M * 0.15) + (500/1M * 0.60) = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBeCloseTo(0.00045, 5);
    });

    it('should handle unknown models with default estimate', () => {
      const cost = calculateCost('unknown-model', 1_000_000, 1_000_000);
      // Should use $5/1M tokens default
      expect(cost).toBeCloseTo(10.0, 2);
    });

    it('should normalize model names', () => {
      // Model names with version suffixes should work
      const cost1 = calculateCost('gpt-4o-2024-05-13', 1_000_000, 1_000_000);
      const cost2 = calculateCost('gpt-4o', 1_000_000, 1_000_000);
      expect(cost1).toBeCloseTo(cost2, 2);
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing for known models', () => {
      const pricing = getModelPricing('gpt-4o-mini');
      expect(pricing).toEqual({ input: 0.15, output: 0.6 });
    });

    it('should return null for unknown models', () => {
      const pricing = getModelPricing('unknown-model');
      expect(pricing).toBeNull();
    });

    it('should normalize model names', () => {
      const pricing = getModelPricing('gpt-4o-2024-05-13');
      expect(pricing).not.toBeNull();
      expect(pricing?.input).toBe(2.5);
    });
  });

  describe('listAvailableModels', () => {
    it('should list all available models', () => {
      const models = listAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('model');
      expect(models[0]).toHaveProperty('pricing');
    });

    it('should include OpenAI models', () => {
      const models = listAvailableModels();
      const hasGPT4 = models.some((m) => m.model === 'gpt-4o');
      expect(hasGPT4).toBe(true);
    });

    it('should include Claude models', () => {
      const models = listAvailableModels();
      const hasClaude = models.some((m) => m.model.includes('claude'));
      expect(hasClaude).toBe(true);
    });
  });

  describe('formatCost', () => {
    it('should format large costs in dollars', () => {
      expect(formatCost(1.5)).toBe('$1.50');
      expect(formatCost(0.05)).toBe('$0.05');
      expect(formatCost(10.0)).toBe('$10.00');
    });

    it('should format small costs in milli-dollars', () => {
      expect(formatCost(0.001)).toBe('$1.00m');
      expect(formatCost(0.005)).toBe('$5.00m');
    });

    it('should handle zero cost', () => {
      expect(formatCost(0)).toBe('$0.00m');
    });
  });

  describe('estimatePromptCost', () => {
    it('should estimate cost from prompt text', () => {
      const prompt = 'This is a test prompt that is about 20 characters long';
      const cost = estimatePromptCost('gpt-4o-mini', prompt, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('should scale with prompt length', () => {
      const shortPrompt = 'Short';
      const longPrompt = 'This is a much longer prompt that should cost more tokens'.repeat(10);

      const shortCost = estimatePromptCost('gpt-4o-mini', shortPrompt);
      const longCost = estimatePromptCost('gpt-4o-mini', longPrompt);

      expect(longCost).toBeGreaterThan(shortCost);
    });

    it('should use default output tokens if not specified', () => {
      const prompt = 'Test prompt';
      const cost = estimatePromptCost('gpt-4o-mini', prompt);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('pricing accuracy', () => {
    it('should have correct pricing for gpt-3.5-turbo', () => {
      const pricing = getModelPricing('gpt-3.5-turbo');
      expect(pricing?.input).toBe(0.5);
      expect(pricing?.output).toBe(1.5);
    });

    it('should have correct pricing for claude-3.5-sonnet', () => {
      const pricing = getModelPricing('anthropic/claude-3.5-sonnet');
      expect(pricing?.input).toBe(3.0);
      expect(pricing?.output).toBe(15.0);
    });

    it('should calculate realistic costs', () => {
      // Typical task: 2K input, 1K output with gpt-4o-mini
      const cost = calculateCost('gpt-4o-mini', 2000, 1000);
      // (2000/1M * 0.15) + (1000/1M * 0.60) = 0.0003 + 0.0006 = 0.0009
      expect(cost).toBeCloseTo(0.0009, 4);
      expect(formatCost(cost)).toBe('$0.90m'); // Less than a penny
    });
  });
});
