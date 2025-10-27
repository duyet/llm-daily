/**
 * Application-wide constants
 * Centralizes magic numbers and configuration defaults
 */

/**
 * Timeout constants (in milliseconds)
 */
export const TIMEOUTS = {
  /** Default timeout for LLM provider API calls (30 seconds) */
  PROVIDER_DEFAULT: 30000,

  /** Default timeout for task execution (2 minutes) */
  TASK_DEFAULT: 120000,

  /** Default timeout for webhook requests (10 seconds) */
  WEBHOOK_DEFAULT: 10000,

  /** Minimum allowed timeout value (1 second) */
  MIN: 1000,

  /** Maximum allowed timeout value (5 minutes) */
  MAX: 300000,
} as const;

/**
 * Retry configuration constants
 */
export const RETRY = {
  /** Default initial delay for retry backoff (1 second) */
  INITIAL_DELAY: 1000,

  /** Maximum number of retry attempts */
  MAX_ATTEMPTS: 3,

  /** Maximum delay between retries (10 seconds) */
  MAX_DELAY: 10000,

  /** Jitter factor for exponential backoff (0-1, adds randomness) */
  JITTER_FACTOR: 0.1,
} as const;

/**
 * Memory limit constants
 */
export const MEMORY_LIMITS = {
  /** Maximum memory body length (1MB) */
  MAX_BODY_LENGTH: 1_000_000,

  /** Maximum number of metadata keys */
  MAX_METADATA_KEYS: 50,

  /** Maximum length of a single metadata value */
  MAX_METADATA_VALUE_LENGTH: 10_000,

  /** Minimum similarity threshold (0.0 = no similarity) */
  MIN_SIMILARITY_THRESHOLD: 0.0,

  /** Maximum similarity threshold (1.0 = identical) */
  MAX_SIMILARITY_THRESHOLD: 1.0,
} as const;

/**
 * Provider limit constants
 */
export const PROVIDER_LIMITS = {
  /** Minimum temperature value */
  MIN_TEMPERATURE: 0.0,

  /** Maximum temperature value */
  MAX_TEMPERATURE: 2.0,

  /** Minimum max_tokens value */
  MIN_MAX_TOKENS: 1,

  /** Maximum max_tokens value */
  MAX_MAX_TOKENS: 200_000,

  /** Maximum prompt length (~500KB) */
  MAX_PROMPT_LENGTH: 500_000,
} as const;

/**
 * Task limit constants
 */
export const TASK_LIMITS = {
  /** Maximum output path length */
  MAX_OUTPUT_PATH_LENGTH: 255,

  /** Maximum number of outputs per task */
  MAX_OUTPUTS: 10,

  /** Maximum task name length */
  MAX_TASK_NAME_LENGTH: 100,
} as const;

/**
 * Token estimation constants
 */
export const TOKEN_ESTIMATION = {
  /** Average characters per token (rough estimate) */
  CHARS_PER_TOKEN: 4,

  /** Divisor for token cost calculations (per 1000 tokens) */
  COST_DIVISOR: 1000,

  /** Divisor for displaying costs in milli-dollars */
  MILLI_DOLLAR_DIVISOR: 1000,
} as const;

/**
 * Time conversion constants
 */
export const TIME = {
  /** Milliseconds per second */
  MS_PER_SECOND: 1000,

  /** Milliseconds per minute */
  MS_PER_MINUTE: 60_000,

  /** Milliseconds per hour */
  MS_PER_HOUR: 3_600_000,

  /** Milliseconds per day */
  MS_PER_DAY: 86_400_000,
} as const;
