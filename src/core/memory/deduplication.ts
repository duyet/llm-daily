/**
 * Deduplication logic to avoid redundant task runs
 * Supports time-based, content-based, and hybrid strategies
 */

import { TIME } from '../../constants.js';
import { MemoryContent, MemoryMetadata } from '../../types/memory.types.js';
import { createProvider } from '../providers/registry.js';
import { BaseProvider } from '../providers/base.js';

/**
 * Deduplication result
 */
export interface DeduplicationResult {
  /** Whether task should run */
  shouldRun: boolean;
  /** Reason for decision */
  reason: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Tokens used for decision (if applicable) */
  tokensUsed?: number;
  /** Cost of decision (if applicable) */
  cost?: number;
}

/**
 * Deduplication strategy type
 */
export type DeduplicationStrategy = 'time' | 'content' | 'hybrid';

/**
 * Options for deduplication check
 */
export interface DeduplicationOptions {
  /** Strategy to use */
  strategy: DeduplicationStrategy;
  /** Current task context */
  taskContext: string;
  /** Memory content */
  memory: MemoryContent;
  /** Provider ID for content-based strategy */
  providerId?: string;
  /** Minimum hours between runs for time-based strategy */
  minHoursBetweenRuns?: number;
  /** Confidence threshold for hybrid strategy (0-1) */
  confidenceThreshold?: number;
}

/**
 * Deduplication error
 */
export class DeduplicationError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'DeduplicationError';
    Object.setPrototypeOf(this, DeduplicationError.prototype);
  }
}

/**
 * Check if task should run based on deduplication strategy
 * @param options Deduplication options
 * @returns Deduplication result
 */
export async function shouldRunTask(options: DeduplicationOptions): Promise<DeduplicationResult> {
  try {
    switch (options.strategy) {
      case 'time':
        return timeBasedDeduplication(options);

      case 'content':
        return await contentBasedDeduplication(options);

      case 'hybrid':
        return await hybridDeduplication(options);

      default: {
        // This case should never be reached due to TypeScript's type checking
        const unknownStrategy: never = options.strategy;
        throw new DeduplicationError(`Unknown strategy: ${String(unknownStrategy)}`);
      }
    }
  } catch (error) {
    if (error instanceof DeduplicationError) {
      throw error;
    }
    throw new DeduplicationError(
      `Deduplication check failed: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Time-based deduplication: Don't run if last run was too recent
 * @param options Deduplication options
 * @returns Result
 */
function timeBasedDeduplication(options: DeduplicationOptions): DeduplicationResult {
  const minHours = options.minHoursBetweenRuns ?? 24;
  const lastRun = options.memory.metadata.lastRun;

  // If never run before, allow
  if (!lastRun) {
    return {
      shouldRun: true,
      reason: 'Task has never been run before',
      confidence: 1.0,
    };
  }

  // Calculate time since last run
  const lastRunTime = new Date(lastRun).getTime();
  const now = Date.now();
  const hoursSinceLastRun = (now - lastRunTime) / TIME.MS_PER_HOUR;

  if (hoursSinceLastRun < minHours) {
    return {
      shouldRun: false,
      reason: `Last run was ${hoursSinceLastRun.toFixed(1)} hours ago (minimum: ${minHours} hours)`,
      confidence: 1.0,
    };
  }

  return {
    shouldRun: true,
    reason: `Last run was ${hoursSinceLastRun.toFixed(1)} hours ago (minimum: ${minHours} hours)`,
    confidence: 1.0,
  };
}

/**
 * Content-based deduplication: Use LLM to decide if content is redundant
 * @param options Deduplication options
 * @returns Result
 */
async function contentBasedDeduplication(
  options: DeduplicationOptions
): Promise<DeduplicationResult> {
  const provider = getProvider(options.providerId);

  // Create deduplication prompt
  const prompt = createDeduplicationPrompt(options.memory, options.taskContext);

  // Call LLM
  const response = await provider.call(prompt);

  // Parse response
  const parsed = parseDeduplicationResponse(response.content);

  return {
    shouldRun: parsed.shouldRun,
    reason: parsed.reason,
    confidence: parsed.confidence,
    tokensUsed: response.usage.totalTokens,
    cost: response.cost,
  };
}

/**
 * Hybrid deduplication: Combine time-based and content-based strategies
 * @param options Deduplication options
 * @returns Result
 */
async function hybridDeduplication(options: DeduplicationOptions): Promise<DeduplicationResult> {
  // First check time-based
  const timeResult = timeBasedDeduplication(options);

  // If time check says don't run, respect that
  if (!timeResult.shouldRun) {
    return timeResult;
  }

  // Time check passed, now check content
  const contentResult = await contentBasedDeduplication(options);

  // Apply confidence threshold
  const threshold = options.confidenceThreshold ?? 0.7;

  if (contentResult.confidence < threshold) {
    // Low confidence from LLM, default to allowing the run
    return {
      shouldRun: true,
      reason: `Content check has low confidence (${contentResult.confidence.toFixed(2)}), allowing run`,
      confidence: contentResult.confidence,
      tokensUsed: contentResult.tokensUsed,
      cost: contentResult.cost,
    };
  }

  // High confidence from LLM, use its decision
  return contentResult;
}

/**
 * Create deduplication prompt for LLM
 * @param memory Memory content
 * @param taskContext Current task context
 * @returns Prompt string
 */
function createDeduplicationPrompt(memory: MemoryContent, taskContext: string): string {
  const metadata = memory.metadata;
  const lastTopics = metadata.lastTopics?.join(', ') || 'none';

  return `You are a deduplication assistant. Analyze whether a task should run based on memory and current context.

MEMORY METADATA:
- Last run: ${metadata.lastRun || 'never'}
- Total runs: ${metadata.totalRuns}
- Recent topics: ${lastTopics}

MEMORY CONTENT:
${memory.body}

CURRENT TASK CONTEXT:
${taskContext}

INSTRUCTIONS:
1. Analyze if the current task would be redundant given the memory
2. Consider:
   - Has this topic been covered recently?
   - Would this task add significant new value?
   - Is the context different enough to warrant a new run?
3. Respond in the following EXACT JSON format:
{
  "shouldRun": true/false,
  "reason": "Brief explanation",
  "confidence": 0.0-1.0
}

Respond with ONLY valid JSON, no additional text.`;
}

/**
 * Parse LLM response for deduplication decision
 * @param response LLM response content
 * @returns Parsed decision
 */
function parseDeduplicationResponse(response: string): {
  shouldRun: boolean;
  reason: string;
  confidence: number;
} {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed: unknown = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('shouldRun' in parsed) ||
      !('reason' in parsed) ||
      !('confidence' in parsed)
    ) {
      throw new Error('Invalid response structure');
    }

    const record = parsed as Record<string, unknown>;

    if (typeof record.shouldRun !== 'boolean') {
      throw new Error('Missing or invalid "shouldRun" field');
    }
    if (typeof record.reason !== 'string') {
      throw new Error('Missing or invalid "reason" field');
    }
    if (typeof record.confidence !== 'number') {
      throw new Error('Missing or invalid "confidence" field');
    }

    // Clamp confidence to 0-1
    const confidence = Math.max(0, Math.min(1, record.confidence));

    return {
      shouldRun: record.shouldRun,
      reason: record.reason,
      confidence,
    };
  } catch (error) {
    throw new DeduplicationError(
      `Failed to parse deduplication response: ${error instanceof Error ? error.message : String(error)}. Response: ${response}`,
      error
    );
  }
}

/**
 * Get provider instance
 * @param providerId Provider ID (optional)
 * @returns Provider instance
 */
function getProvider(providerId?: string): BaseProvider {
  const id = providerId ?? 'openai:gpt-4o-mini';
  return createProvider({ id });
}

/**
 * Extract deduplication metadata from memory
 * @param metadata Memory metadata
 * @returns Summary for deduplication
 */
export function getDeduplicationSummary(metadata: MemoryMetadata): {
  hoursSinceLastRun: number | null;
  totalRuns: number;
  recentTopics: string[];
} {
  let hoursSinceLastRun: number | null = null;

  if (metadata.lastRun) {
    const lastRunTime = new Date(metadata.lastRun).getTime();
    const now = Date.now();
    hoursSinceLastRun = (now - lastRunTime) / TIME.MS_PER_HOUR;
  }

  return {
    hoursSinceLastRun,
    totalRuns: metadata.totalRuns,
    recentTopics: metadata.lastTopics || [],
  };
}

/**
 * Check if minimum time has passed since last run
 * @param lastRun Last run timestamp
 * @param minHours Minimum hours required
 * @returns True if enough time has passed
 */
export function hasMinimumTimePassed(lastRun: string | undefined, minHours: number): boolean {
  if (!lastRun) {
    return true;
  }

  const lastRunTime = new Date(lastRun).getTime();
  const now = Date.now();
  const hoursSinceLastRun = (now - lastRunTime) / TIME.MS_PER_HOUR;

  return hoursSinceLastRun >= minHours;
}
