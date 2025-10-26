/**
 * Memory type definitions for persistent task memory
 * Supports YAML frontmatter + markdown content format
 */

/**
 * Memory metadata stored in YAML frontmatter
 */
export interface MemoryMetadata {
  /** Timestamp of last run (ISO 8601) */
  lastRun?: string;
  /** Total number of runs */
  totalRuns: number;
  /** Total tokens consumed across all runs */
  totalTokens: number;
  /** Total cost in USD across all runs */
  totalCost: number;
  /** Recent topics/themes covered */
  lastTopics?: string[];
  /** Custom metadata fields */
  [key: string]: unknown;
}

/**
 * Full memory content including metadata and body
 */
export interface MemoryContent {
  /** Parsed metadata from frontmatter */
  metadata: MemoryMetadata;
  /** Markdown body content */
  body: string;
}

/**
 * Strategy for updating memory content
 */
export type MemoryUpdateStrategy = 'extract' | 'append' | 'replace';

/**
 * Result of memory update operation
 */
export interface MemoryUpdateResult {
  /** Updated memory content */
  content: MemoryContent;
  /** Whether content was modified */
  modified: boolean;
  /** Tokens used for update operation (if applicable) */
  tokensUsed?: number;
  /** Cost of update operation (if applicable) */
  cost?: number;
}

/**
 * Options for memory update operations
 */
export interface MemoryUpdateOptions {
  /** Update strategy to use */
  strategy: MemoryUpdateStrategy;
  /** New content to add/replace */
  newContent: string;
  /** Provider to use for 'extract' strategy */
  providerId?: string;
  /** Custom metadata updates */
  metadataUpdates?: Partial<MemoryMetadata>;
}

/**
 * Query options for memory content
 */
export interface MemoryQueryOptions {
  /** Maximum number of topics to return */
  limit?: number;
  /** Search query for filtering content */
  searchQuery?: string;
  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * Validation result for memory content
 */
export interface MemoryValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if any) */
  errors: string[];
  /** Validation warnings (if any) */
  warnings: string[];
}

/**
 * Default memory metadata values
 */
export const DEFAULT_MEMORY_METADATA: MemoryMetadata = {
  totalRuns: 0,
  totalTokens: 0,
  totalCost: 0,
  lastTopics: [],
};

/**
 * Default memory content for new memory files
 */
export const DEFAULT_MEMORY_CONTENT: MemoryContent = {
  metadata: DEFAULT_MEMORY_METADATA,
  body: '# Memory\n\nNo content yet.\n',
};
