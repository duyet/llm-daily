/**
 * Memory manager for persistent task memory
 * Handles loading, updating, and saving memory with various strategies
 */

import {
  MemoryContent,
  MemoryUpdateOptions,
  MemoryUpdateResult,
  MemoryQueryOptions,
  DEFAULT_MEMORY_CONTENT,
} from '../types/memory.types.js';
import { parseMemory, validateMemory, MemoryParseError } from './memory/parser.js';
import {
  writeMemory,
  readMemoryFile,
  memoryFileExists,
  MemoryWriteError,
} from './memory/writer.js';
import { createProvider } from './providers/registry.js';
import { BaseProvider } from './providers/base.js';

/**
 * Memory manager error
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'MemoryError';
    Object.setPrototypeOf(this, MemoryError.prototype);
  }
}

/**
 * Memory manager class
 */
export class MemoryManager {
  /** File path to memory file */
  private readonly filePath: string;

  /** Current memory content */
  private content: MemoryContent | null = null;

  /** Whether memory has been loaded */
  private loaded: boolean = false;

  /**
   * Constructor
   * @param filePath Path to memory.md file
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Load memory from file
   * @returns Memory content
   * @throws MemoryError if loading fails
   */
  async load(): Promise<MemoryContent> {
    try {
      // Check if file exists
      const exists = await memoryFileExists(this.filePath);

      if (!exists) {
        // Initialize with default content
        this.content = { ...DEFAULT_MEMORY_CONTENT };
        this.loaded = true;
        return this.content;
      }

      // Read and parse file
      const raw = await readMemoryFile(this.filePath);
      this.content = parseMemory(raw);

      // Validate
      const validation = validateMemory(this.content);
      if (!validation.valid) {
        throw new MemoryError(`Memory validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn('Memory validation warnings:', validation.warnings);
      }

      this.loaded = true;
      return this.content;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      if (error instanceof MemoryParseError) {
        throw new MemoryError(`Failed to parse memory: ${error.message}`, error);
      }
      if (error instanceof MemoryWriteError) {
        throw new MemoryError(`Failed to read memory: ${error.message}`, error);
      }
      throw new MemoryError(
        `Failed to load memory: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Save memory to file
   * @param content Memory content to save (optional, uses current if not provided)
   * @throws MemoryError if saving fails
   */
  async save(content?: MemoryContent): Promise<void> {
    try {
      const toSave = content ?? this.content;

      if (!toSave) {
        throw new MemoryError('No memory content to save');
      }

      // Validate before saving
      const validation = validateMemory(toSave);
      if (!validation.valid) {
        throw new MemoryError(`Cannot save invalid memory: ${validation.errors.join(', ')}`);
      }

      await writeMemory(this.filePath, toSave);
      this.content = toSave;
      this.loaded = true;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      if (error instanceof MemoryWriteError) {
        throw new MemoryError(`Failed to write memory: ${error.message}`, error);
      }
      throw new MemoryError(
        `Failed to save memory: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Update memory with new content using specified strategy
   * @param options Update options
   * @returns Update result
   * @throws MemoryError if update fails
   */
  async update(options: MemoryUpdateOptions): Promise<MemoryUpdateResult> {
    try {
      // Ensure memory is loaded
      if (!this.loaded) {
        await this.load();
      }

      if (!this.content) {
        throw new MemoryError('Memory not loaded');
      }

      let updatedContent: MemoryContent;
      let tokensUsed: number | undefined;
      let cost: number | undefined;

      switch (options.strategy) {
        case 'extract':
          // Use LLM to extract insights
          ({
            content: updatedContent,
            tokensUsed,
            cost,
          } = await this.extractStrategy(this.content, options.newContent, options.providerId));
          break;

        case 'append':
          // Append new content to body
          updatedContent = this.appendStrategy(this.content, options.newContent);
          break;

        case 'replace':
          // Replace entire body
          updatedContent = this.replaceStrategy(this.content, options.newContent);
          break;

        default: {
          const _exhaustiveCheck: never = options.strategy;
          throw new MemoryError(`Unknown update strategy: ${String(_exhaustiveCheck)}`);
        }
      }

      // Apply metadata updates
      if (options.metadataUpdates) {
        updatedContent.metadata = {
          ...updatedContent.metadata,
          ...options.metadataUpdates,
        };
      }

      // Check if content was modified
      const modified =
        updatedContent.body !== this.content.body ||
        JSON.stringify(updatedContent.metadata) !== JSON.stringify(this.content.metadata);

      // Update current content
      this.content = updatedContent;

      return {
        content: updatedContent,
        modified,
        tokensUsed,
        cost,
      };
    } catch (error) {
      if (error instanceof MemoryError) {
        throw error;
      }
      throw new MemoryError(
        `Failed to update memory: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Extract strategy: Use LLM to extract insights from new content
   * @param current Current memory content
   * @param newContent New content to process
   * @param providerId Provider ID to use (optional)
   * @returns Updated content with token usage
   */
  private async extractStrategy(
    current: MemoryContent,
    newContent: string,
    providerId?: string
  ): Promise<{ content: MemoryContent; tokensUsed: number; cost: number }> {
    // Get provider
    const provider = this.getProvider(providerId);

    // Create extraction prompt
    const prompt = this.createExtractionPrompt(current.body, newContent);

    // Call LLM
    const response = await provider.call(prompt);

    // Create updated content
    const updatedContent: MemoryContent = {
      metadata: current.metadata,
      body: response.content.trim(),
    };

    return {
      content: updatedContent,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }

  /**
   * Append strategy: Add new content to existing body
   * @param current Current memory content
   * @param newContent New content to append
   * @returns Updated content
   */
  private appendStrategy(current: MemoryContent, newContent: string): MemoryContent {
    const separator = '\n\n---\n\n';
    const timestamp = new Date().toISOString();

    const appendedBody = `${current.body.trim()}${separator}## Update ${timestamp}\n\n${newContent.trim()}\n`;

    return {
      metadata: current.metadata,
      body: appendedBody,
    };
  }

  /**
   * Replace strategy: Replace entire body with new content
   * @param current Current memory content
   * @param newContent New content to use
   * @returns Updated content
   */
  private replaceStrategy(current: MemoryContent, newContent: string): MemoryContent {
    return {
      metadata: current.metadata,
      body: newContent.trim() + '\n',
    };
  }

  /**
   * Create extraction prompt for LLM
   * @param currentMemory Current memory body
   * @param newContent New content to extract from
   * @returns Prompt string
   */
  private createExtractionPrompt(currentMemory: string, newContent: string): string {
    return `You are a memory extraction assistant. Your task is to update the existing memory with new insights from recent content.

CURRENT MEMORY:
${currentMemory}

NEW CONTENT:
${newContent}

Instructions:
1. Analyze the new content and extract key insights, topics, and important information
2. Merge these insights with the existing memory
3. Remove redundant or outdated information
4. Keep the memory concise and well-organized
5. Maintain the markdown format with clear sections

Respond with ONLY the updated memory content in markdown format.`;
  }

  /**
   * Get provider instance
   * @param providerId Provider ID (optional, uses default if not provided)
   * @returns Provider instance
   */
  private getProvider(providerId?: string): BaseProvider {
    const id = providerId ?? 'openai:gpt-4o-mini';
    return createProvider({ id });
  }

  /**
   * Query memory content
   * @param options Query options
   * @returns Query results
   */
  async query(options: MemoryQueryOptions = {}): Promise<{
    topics: string[];
    content: string;
    metadata?: Record<string, unknown>;
  }> {
    // Ensure memory is loaded
    if (!this.loaded) {
      await this.load();
    }

    if (!this.content) {
      throw new MemoryError('Memory not loaded');
    }

    let topics: string[] = this.content.metadata.lastTopics ?? [];
    let content = this.content.body;

    // Apply search filter
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      const lines = content.split('\n');
      const matchingLines = lines.filter((line) => line.toLowerCase().includes(query));
      content = matchingLines.join('\n');

      // Extract topics from matching content
      topics = this.extractTopicsFromContent(content);
    }

    // Apply limit
    if (options.limit !== undefined && topics.length > options.limit) {
      topics = topics.slice(0, options.limit);
    }

    const result: {
      topics: string[];
      content: string;
      metadata?: Record<string, unknown>;
    } = {
      topics,
      content,
    };

    // Include metadata if requested
    if (options.includeMetadata) {
      result.metadata = this.content.metadata;
    }

    return result;
  }

  /**
   * Extract topics from content
   * @param content Content to extract from
   * @returns Array of topics
   */
  private extractTopicsFromContent(content: string): string[] {
    const topics: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Extract markdown headers as topics
      const headerMatch = line.match(/^#{2,}\s+(.+)$/);
      if (headerMatch) {
        topics.push(headerMatch[1].trim());
      }
    }

    return topics;
  }

  /**
   * Get current memory content
   * @returns Current memory content or null if not loaded
   */
  getContent(): MemoryContent | null {
    return this.content;
  }

  /**
   * Get memory file path
   * @returns File path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Check if memory is loaded
   * @returns True if loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

/**
 * Create a memory manager instance
 * @param filePath Path to memory.md file
 * @returns Memory manager instance
 */
export function createMemoryManager(filePath: string): MemoryManager {
  return new MemoryManager(filePath);
}
