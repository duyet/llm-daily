/**
 * Memory file parser for YAML frontmatter + markdown format
 * Parses memory.md files into structured MemoryContent objects
 */

import yaml from 'yaml';
import {
  MemoryContent,
  MemoryMetadata,
  MemoryValidationResult,
  DEFAULT_MEMORY_METADATA,
} from '../../types/memory.types.js';

/**
 * Parse error with context
 */
export class MemoryParseError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'MemoryParseError';
    Object.setPrototypeOf(this, MemoryParseError.prototype);
  }
}

/**
 * Extract YAML frontmatter from markdown content
 * @param content Full file content
 * @returns Tuple of [frontmatter, body] or [null, content] if no frontmatter
 */
function extractFrontmatter(content: string): [string | null, string] {
  const trimmed = content.trim();

  // Check for YAML frontmatter delimiters
  if (!trimmed.startsWith('---')) {
    return [null, content];
  }

  // Find closing delimiter
  const lines = trimmed.split('\n');
  let endIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    // No closing delimiter found
    return [null, content];
  }

  // Extract frontmatter and body
  const frontmatter = lines.slice(1, endIndex).join('\n');
  const body = lines
    .slice(endIndex + 1)
    .join('\n')
    .trim();

  return [frontmatter, body];
}

/**
 * Parse YAML frontmatter into MemoryMetadata
 * @param frontmatter YAML string
 * @returns Parsed metadata object
 */
function parseFrontmatter(frontmatter: string): MemoryMetadata {
  try {
    const parsed: unknown = yaml.parse(frontmatter);

    // Validate required fields
    if (parsed === null || typeof parsed !== 'object') {
      return { ...DEFAULT_MEMORY_METADATA };
    }

    // Type guard to check if parsed is a record
    const record = parsed as Record<string, unknown>;

    // Extract and validate metadata fields
    const metadata: MemoryMetadata = {
      lastRun: typeof record.lastRun === 'string' ? record.lastRun : undefined,
      totalRuns: typeof record.totalRuns === 'number' ? record.totalRuns : 0,
      totalTokens: typeof record.totalTokens === 'number' ? record.totalTokens : 0,
      totalCost: typeof record.totalCost === 'number' ? record.totalCost : 0,
      lastTopics: Array.isArray(record.lastTopics) ? record.lastTopics : [],
    };

    // Include any custom fields
    for (const [key, value] of Object.entries(record)) {
      if (!['lastRun', 'totalRuns', 'totalTokens', 'totalCost', 'lastTopics'].includes(key)) {
        metadata[key] = value;
      }
    }

    return metadata;
  } catch (error) {
    throw new MemoryParseError(
      `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Parse memory file content into MemoryContent object
 * @param content Raw file content (YAML frontmatter + markdown)
 * @returns Parsed memory content
 * @throws MemoryParseError if parsing fails
 */
export function parseMemory(content: string): MemoryContent {
  try {
    const [frontmatter, body] = extractFrontmatter(content);

    // Parse frontmatter if present
    const metadata = frontmatter ? parseFrontmatter(frontmatter) : { ...DEFAULT_MEMORY_METADATA };

    return {
      metadata,
      body: body || '# Memory\n\nNo content yet.\n',
    };
  } catch (error) {
    if (error instanceof MemoryParseError) {
      throw error;
    }
    throw new MemoryParseError(
      `Failed to parse memory file: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Check if content has YAML frontmatter
 * @param content File content
 * @returns True if frontmatter is present
 */
export function hasFrontmatter(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('---') && trimmed.includes('\n---\n');
}

/**
 * Validate memory content structure
 * @param content Parsed memory content
 * @returns True if valid
 */
export function isValidMemoryContent(content: unknown): content is MemoryContent {
  if (!content || typeof content !== 'object') {
    return false;
  }

  const mem = content as Partial<MemoryContent>;

  // Check metadata
  if (!mem.metadata || typeof mem.metadata !== 'object') {
    return false;
  }

  const meta = mem.metadata;

  // Check required metadata fields
  if (typeof meta.totalRuns !== 'number') {return false;}
  if (typeof meta.totalTokens !== 'number') {return false;}
  if (typeof meta.totalCost !== 'number') {return false;}

  // Check optional metadata fields
  if (meta.lastRun !== undefined && typeof meta.lastRun !== 'string') {
    return false;
  }
  if (meta.lastTopics !== undefined && !Array.isArray(meta.lastTopics)) {
    return false;
  }

  // Check body
  if (typeof mem.body !== 'string') {
    return false;
  }

  return true;
}

/**
 * Validate memory content with detailed error/warning reporting
 * @param content Memory content to validate
 * @returns Validation result with errors and warnings
 */
export function validateMemory(content: MemoryContent): MemoryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate metadata
  if (!content.metadata) {
    errors.push('Missing metadata');
    return { valid: false, errors, warnings };
  }

  const meta = content.metadata;

  // Check required numeric fields
  if (typeof meta.totalRuns !== 'number') {
    errors.push('totalRuns must be a number');
  } else if (meta.totalRuns < 0) {
    errors.push('totalRuns cannot be negative');
  }

  if (typeof meta.totalTokens !== 'number') {
    errors.push('totalTokens must be a number');
  } else if (meta.totalTokens < 0) {
    errors.push('totalTokens cannot be negative');
  }

  if (typeof meta.totalCost !== 'number') {
    errors.push('totalCost must be a number');
  } else if (meta.totalCost < 0) {
    errors.push('totalCost cannot be negative');
  }

  // Check optional fields
  if (meta.lastRun !== undefined) {
    if (typeof meta.lastRun !== 'string') {
      errors.push('lastRun must be a string (ISO 8601 timestamp)');
    } else {
      // Validate ISO 8601 format
      const date = new Date(meta.lastRun);
      if (isNaN(date.getTime())) {
        errors.push('lastRun must be a valid ISO 8601 timestamp');
      }
    }
  }

  if (meta.lastTopics !== undefined) {
    if (!Array.isArray(meta.lastTopics)) {
      errors.push('lastTopics must be an array');
    } else {
      // Check if all topics are strings
      const nonStringTopics = meta.lastTopics.filter((t) => typeof t !== 'string');
      if (nonStringTopics.length > 0) {
        warnings.push(`lastTopics contains ${nonStringTopics.length} non-string values`);
      }
    }
  }

  // Validate body
  if (typeof content.body !== 'string') {
    errors.push('body must be a string');
  } else if (content.body.trim().length === 0) {
    warnings.push('body is empty');
  }

  // Check for anomalies
  if (meta.totalRuns > 0 && !meta.lastRun) {
    warnings.push('totalRuns > 0 but lastRun is not set');
  }

  if (meta.totalTokens > 0 && meta.totalRuns === 0) {
    warnings.push('totalTokens > 0 but totalRuns is 0');
  }

  if (meta.totalCost > 0 && meta.totalTokens === 0) {
    warnings.push('totalCost > 0 but totalTokens is 0');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
