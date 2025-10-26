/**
 * Tests for memory system (parser, writer, manager)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { parseMemory, validateMemory, hasFrontmatter, MemoryParseError } from './parser.js';
import { serializeMemory, writeMemory, readMemoryFile, memoryFileExists } from './writer.js';
import { MemoryManager, createMemoryManager } from '../memory.js';
import { MemoryContent, DEFAULT_MEMORY_METADATA } from '../../types/memory.types.js';

// Test fixtures
const testDir = path.join(process.cwd(), 'test-memory-temp');
const testMemoryPath = path.join(testDir, 'test-memory.md');

const validMemoryContent = `---
lastRun: 2025-01-26T08:00:00Z
totalRuns: 5
totalTokens: 1000
totalCost: 0.05
lastTopics:
  - AI regulation
  - Tech earnings
---

# Memory Content

## Key Insights
- Topic X has been trending for 3 days
- Avoid repeating Y (covered on Jan 24)
`;

const validMemoryParsed: MemoryContent = {
  metadata: {
    lastRun: '2025-01-26T08:00:00Z',
    totalRuns: 5,
    totalTokens: 1000,
    totalCost: 0.05,
    lastTopics: ['AI regulation', 'Tech earnings'],
  },
  body: `# Memory Content

## Key Insights
- Topic X has been trending for 3 days
- Avoid repeating Y (covered on Jan 24)`,
};

describe('Memory Parser', () => {
  describe('parseMemory', () => {
    it('should parse valid memory content', () => {
      const result = parseMemory(validMemoryContent);
      expect(result.metadata.lastRun).toBe('2025-01-26T08:00:00Z');
      expect(result.metadata.totalRuns).toBe(5);
      expect(result.metadata.totalTokens).toBe(1000);
      expect(result.metadata.totalCost).toBe(0.05);
      expect(result.metadata.lastTopics).toEqual(['AI regulation', 'Tech earnings']);
      expect(result.body).toContain('Key Insights');
    });

    it('should handle content without frontmatter', () => {
      const content = '# Simple Memory\n\nSome content';
      const result = parseMemory(content);
      expect(result.metadata).toEqual(DEFAULT_MEMORY_METADATA);
      expect(result.body).toBe('# Simple Memory\n\nSome content');
    });

    it('should handle empty content', () => {
      const result = parseMemory('');
      expect(result.metadata).toEqual(DEFAULT_MEMORY_METADATA);
      expect(result.body).toBe('# Memory\n\nNo content yet.\n');
    });

    it('should handle incomplete frontmatter', () => {
      const content = `---
totalRuns: 3
totalTokens: 500
totalCost: 0.02
---

# Content
`;
      const result = parseMemory(content);
      expect(result.metadata.totalRuns).toBe(3);
      expect(result.metadata.lastRun).toBeUndefined();
      expect(result.metadata.lastTopics).toEqual([]);
    });

    it('should throw on invalid YAML', () => {
      const content = `---
invalid: [unclosed array
---
Content`;
      expect(() => parseMemory(content)).toThrow(MemoryParseError);
    });
  });

  describe('validateMemory', () => {
    it('should validate correct memory', () => {
      const result = validateMemory(validMemoryParsed);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative values', () => {
      const invalid: MemoryContent = {
        metadata: { ...validMemoryParsed.metadata, totalRuns: -1 },
        body: 'test',
      };
      const result = validateMemory(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('totalRuns cannot be negative');
    });

    it('should detect invalid date format', () => {
      const invalid: MemoryContent = {
        metadata: { ...validMemoryParsed.metadata, lastRun: 'not-a-date' },
        body: 'test',
      };
      const result = validateMemory(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('valid ISO 8601'))).toBe(true);
    });

    it('should warn on anomalies', () => {
      const anomalous: MemoryContent = {
        metadata: {
          lastRun: undefined,
          totalRuns: 5,
          totalTokens: 0,
          totalCost: 0,
        },
        body: 'test',
      };
      const result = validateMemory(anomalous);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('hasFrontmatter', () => {
    it('should detect frontmatter', () => {
      expect(hasFrontmatter(validMemoryContent)).toBe(true);
    });

    it('should detect missing frontmatter', () => {
      expect(hasFrontmatter('# No frontmatter')).toBe(false);
    });
  });
});

describe('Memory Writer', () => {
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('serializeMemory', () => {
    it('should serialize memory to YAML + markdown', () => {
      const serialized = serializeMemory(validMemoryParsed);
      expect(serialized).toContain('---');
      expect(serialized).toContain('totalRuns: 5');
      expect(serialized).toContain('# Memory Content');
    });

    it('should handle empty body', () => {
      const content: MemoryContent = {
        metadata: DEFAULT_MEMORY_METADATA,
        body: '',
      };
      const serialized = serializeMemory(content);
      expect(serialized).toContain('---');
      expect(serialized).toContain('totalRuns: 0');
    });
  });

  describe('writeMemory / readMemory', () => {
    it('should write and read memory file', async () => {
      await writeMemory(testMemoryPath, validMemoryParsed);
      const content = await readMemoryFile(testMemoryPath);
      expect(content).toContain('totalRuns: 5');
      expect(content).toContain('Key Insights');
    });

    it('should perform atomic writes', async () => {
      // Write initial content
      await writeMemory(testMemoryPath, validMemoryParsed);

      // Write again - should not corrupt
      const updated: MemoryContent = {
        ...validMemoryParsed,
        metadata: { ...validMemoryParsed.metadata, totalRuns: 10 },
      };
      await writeMemory(testMemoryPath, updated);

      const content = await readMemoryFile(testMemoryPath);
      expect(content).toContain('totalRuns: 10');
    });

    it('should handle non-existent file', async () => {
      const content = await readMemoryFile(path.join(testDir, 'nonexistent.md'));
      expect(content).toBe('');
    });
  });

  describe('memoryFileExists', () => {
    it('should detect existing file', async () => {
      await writeMemory(testMemoryPath, validMemoryParsed);
      const exists = await memoryFileExists(testMemoryPath);
      expect(exists).toBe(true);
    });

    it('should detect non-existing file', async () => {
      const exists = await memoryFileExists(path.join(testDir, 'nonexistent.md'));
      expect(exists).toBe(false);
    });
  });
});

describe('MemoryManager', () => {
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should load existing memory file', async () => {
      await writeMemory(testMemoryPath, validMemoryParsed);
      const manager = createMemoryManager(testMemoryPath);
      const content = await manager.load();
      expect(content.metadata.totalRuns).toBe(5);
      expect(manager.isLoaded()).toBe(true);
    });

    it('should initialize with default content if file missing', async () => {
      const manager = createMemoryManager(testMemoryPath);
      const content = await manager.load();
      expect(content.metadata).toEqual(DEFAULT_MEMORY_METADATA);
      expect(manager.isLoaded()).toBe(true);
    });
  });

  describe('save', () => {
    it('should save memory to file', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.load();
      await manager.save(validMemoryParsed);

      const saved = await readMemoryFile(testMemoryPath);
      expect(saved).toContain('totalRuns: 5');
    });
  });

  describe('update', () => {
    it('should update with append strategy', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.load();

      const result = await manager.update({
        strategy: 'append',
        newContent: 'New insight here',
      });

      expect(result.modified).toBe(true);
      expect(result.content.body).toContain('New insight here');
      expect(result.content.body).toContain('## Update');
    });

    it('should update with replace strategy', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.load();

      const result = await manager.update({
        strategy: 'replace',
        newContent: '# Completely New Content',
      });

      expect(result.modified).toBe(true);
      expect(result.content.body).toBe('# Completely New Content\n');
    });

    it('should apply metadata updates', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.load();

      const result = await manager.update({
        strategy: 'replace',
        newContent: 'Test',
        metadataUpdates: {
          totalRuns: 100,
          totalTokens: 5000,
        },
      });

      expect(result.content.metadata.totalRuns).toBe(100);
      expect(result.content.metadata.totalTokens).toBe(5000);
    });
  });

  describe('query', () => {
    it('should query memory content', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.save(validMemoryParsed);
      await manager.load();

      const result = await manager.query();
      expect(result.topics).toEqual(['AI regulation', 'Tech earnings']);
      expect(result.content).toContain('Key Insights');
    });

    it('should filter by search query', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.save(validMemoryParsed);
      await manager.load();

      const result = await manager.query({ searchQuery: 'trending' });
      expect(result.content).toContain('trending');
      expect(result.content).not.toContain('Jan 24');
    });

    it('should limit topics', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.save(validMemoryParsed);
      await manager.load();

      const result = await manager.query({ limit: 1 });
      expect(result.topics).toHaveLength(1);
    });

    it('should include metadata when requested', async () => {
      const manager = createMemoryManager(testMemoryPath);
      await manager.save(validMemoryParsed);
      await manager.load();

      const result = await manager.query({ includeMetadata: true });
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.totalRuns).toBe(5);
    });
  });
});
