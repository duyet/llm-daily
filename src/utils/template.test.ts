/**
 * Tests for template replacement system
 */

import { describe, it, expect } from 'vitest';
import {
  replaceTemplateVariables,
  extractTemplateVariables,
  hasTemplateVariables,
  validateTemplateContext,
  createTemplateContext,
  getDefaultTemplateContext,
  TemplateError,
} from './template.js';
import { TemplateContext } from '../types/template.types.js';

describe('Template System', () => {
  describe('replaceTemplateVariables', () => {
    it('should replace built-in variables', () => {
      const content = 'Memory: {{memory}}, Date: {{date}}, Task: {{taskName}}';
      const context: TemplateContext = {
        memory: 'Test memory content',
        date: '2025-01-26',
        taskName: 'Daily News',
      };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe(
        'Memory: Test memory content, Date: 2025-01-26, Task: Daily News'
      );
      expect(result.replaced).toEqual(['memory', 'date', 'taskName']);
      expect(result.missing).toHaveLength(0);
      expect(result.modified).toBe(true);
    });

    it('should replace custom variables', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const context: TemplateContext = {
        name: 'Alice',
        place: 'Wonderland',
      };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe('Hello Alice, welcome to Wonderland!');
      expect(result.replaced).toEqual(['name', 'place']);
    });

    it('should handle multiple occurrences', () => {
      const content = '{{name}} said {{name}} again';
      const context: TemplateContext = { name: 'Bob' };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe('Bob said Bob again');
      expect(result.replaced).toEqual(['name']);
    });

    it('should handle whitespace in placeholders', () => {
      const content = '{{ memory }} and {{  date  }}';
      const context: TemplateContext = {
        memory: 'content',
        date: '2025-01-26',
      };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe('content and 2025-01-26');
    });

    it('should use default value for missing variables', () => {
      const content = 'Hello {{name}}!';
      const context: TemplateContext = {};

      const result = replaceTemplateVariables(content, context, {
        strict: false,
        defaultValue: '[MISSING]',
      });

      expect(result.content).toBe('Hello [MISSING]!');
      expect(result.missing).toEqual(['name']);
    });

    it('should throw in strict mode for missing variables', () => {
      const content = 'Hello {{name}}!';
      const context: TemplateContext = {};

      expect(() => replaceTemplateVariables(content, context, { strict: true })).toThrow(
        TemplateError
      );
    });

    it('should auto-populate date if missing', () => {
      const content = 'Date: {{date}}';
      const context: TemplateContext = {};

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
    });

    it('should handle no variables', () => {
      const content = 'No variables here';
      const context: TemplateContext = {};

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe('No variables here');
      expect(result.modified).toBe(false);
      expect(result.replaced).toHaveLength(0);
    });

    it('should handle custom delimiters', () => {
      const content = 'Hello <<name>>!';
      const context: TemplateContext = { name: 'Alice' };

      const result = replaceTemplateVariables(content, context, {
        delimiter: { open: '<<', close: '>>' },
      });

      expect(result.content).toBe('Hello Alice!');
    });
  });

  describe('extractTemplateVariables', () => {
    it('should extract all variables', () => {
      const content = 'Memory: {{memory}}, Date: {{date}}, Custom: {{custom}}';
      const vars = extractTemplateVariables(content);
      expect(vars).toEqual(['memory', 'date', 'custom']);
    });

    it('should deduplicate variables', () => {
      const content = '{{name}} said {{name}} again';
      const vars = extractTemplateVariables(content);
      expect(vars).toEqual(['name']);
    });

    it('should return empty for no variables', () => {
      const content = 'No variables here';
      const vars = extractTemplateVariables(content);
      expect(vars).toHaveLength(0);
    });

    it('should handle custom delimiters', () => {
      const content = 'Hello <<name>>!';
      const vars = extractTemplateVariables(content, { open: '<<', close: '>>' });
      expect(vars).toEqual(['name']);
    });
  });

  describe('hasTemplateVariables', () => {
    it('should detect variables', () => {
      expect(hasTemplateVariables('Hello {{name}}')).toBe(true);
      expect(hasTemplateVariables('No variables')).toBe(false);
      expect(hasTemplateVariables('{{memory}} and {{date}}')).toBe(true);
    });

    it('should handle custom delimiters', () => {
      expect(hasTemplateVariables('Hello <<name>>', { open: '<<', close: '>>' })).toBe(true);
      expect(hasTemplateVariables('Hello {{name}}', { open: '<<', close: '>>' })).toBe(false);
    });
  });

  describe('validateTemplateContext', () => {
    it('should validate complete context', () => {
      const content = 'Memory: {{memory}}, Date: {{date}}';
      const context: TemplateContext = {
        memory: 'content',
        date: '2025-01-26',
      };

      const result = validateTemplateContext(content, context);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const content = 'Memory: {{memory}}, Date: {{date}}, Name: {{name}}';
      const context: TemplateContext = {
        memory: 'content',
      };

      const result = validateTemplateContext(content, context);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('name');
      // date is auto-populated
    });

    it('should allow auto-populated date', () => {
      const content = 'Date: {{date}}';
      const context: TemplateContext = {};

      const result = validateTemplateContext(content, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('createTemplateContext', () => {
    it('should create context from values', () => {
      const context = createTemplateContext({
        memory: 'test memory',
        date: '2025-01-26',
        taskName: 'Daily',
        custom: 'value',
      });

      expect(context.memory).toBe('test memory');
      expect(context.date).toBe('2025-01-26');
      expect(context.taskName).toBe('Daily');
      expect(context.custom).toBe('value');
    });

    it('should handle partial values', () => {
      const context = createTemplateContext({
        taskName: 'Test',
      });

      expect(context.taskName).toBe('Test');
      expect(context.memory).toBeUndefined();
    });
  });

  describe('getDefaultTemplateContext', () => {
    it('should provide default context with date', () => {
      const context = getDefaultTemplateContext();
      expect(context.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(context.memory).toBeUndefined();
      expect(context.taskName).toBeUndefined();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed built-in and custom variables', () => {
      const content = `
# Daily Report - {{date}}

Task: {{taskName}}
Memory: {{memory}}
Author: {{author}}
Version: {{version}}
`;

      const context: TemplateContext = {
        date: '2025-01-26',
        taskName: 'News Summary',
        memory: 'Previous insights...',
        author: 'AI Assistant',
        version: '1.0',
      };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toContain('2025-01-26');
      expect(result.content).toContain('News Summary');
      expect(result.content).toContain('AI Assistant');
      expect(result.replaced).toHaveLength(5);
    });

    it('should handle empty memory gracefully', () => {
      const content = 'Memory: {{memory}}';
      const context: TemplateContext = { memory: '' };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe('Memory: ');
      expect(result.modified).toBe(true);
    });

    it('should preserve non-matching braces', () => {
      const content = 'Code: function() { {{name}} }';
      const context: TemplateContext = { name: 'test' };

      const result = replaceTemplateVariables(content, context);
      expect(result.content).toBe('Code: function() { test }');
    });
  });
});
