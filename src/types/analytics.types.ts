/**
 * Analytics and metrics types
 */

export interface TaskMetrics {
  /** Total number of runs for this task */
  runs: number;

  /** Total tokens used (input + output) */
  tokens: number;

  /** Estimated cost in USD */
  cost: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Last successful run timestamp */
  lastRun: string | null;

  /** Average response time in seconds */
  avgResponseTime: number;

  /** Input tokens */
  inputTokens: number;

  /** Output tokens */
  outputTokens: number;

  /** Task schedule (cron expression) */
  schedule?: string;

  /** Task description */
  description?: string;

  /** Current task status */
  status?: 'success' | 'failed' | 'pending' | 'running';

  /** Next scheduled run timestamp */
  nextRun?: string;

  /** Recent runs (last 10) */
  recentRuns?: TaskRunSummary[];
}

export interface TaskRunSummary {
  /** Run timestamp */
  timestamp: string;

  /** Success or failure */
  status: 'success' | 'failed';

  /** Duration in seconds */
  duration: number;

  /** Tokens used */
  tokens: {
    input: number;
    output: number;
    total: number;
  };

  /** Estimated cost */
  cost: number;

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Error message if failed */
  error?: string;
}

export interface DailyMetrics {
  /** Date in YYYY-MM-DD format */
  date: string;

  /** Number of runs this day */
  runs: number;

  /** Total tokens used */
  tokens: number;

  /** Total cost */
  cost: number;

  /** Success count */
  successes: number;

  /** Failure count */
  failures: number;
}

export interface Analytics {
  /** Total runs across all tasks */
  totalRuns: number;

  /** Total tokens used */
  totalTokens: number;

  /** Total cost in USD */
  totalCost: number;

  /** Overall success rate (0-1) */
  successRate: number;

  /** Last updated timestamp */
  lastUpdated: string;

  /** Per-task metrics */
  tasks: Record<string, TaskMetrics>;

  /** Daily aggregated metrics (last 90 days) */
  daily: DailyMetrics[];

  /** Input tokens total */
  totalInputTokens: number;

  /** Output tokens total */
  totalOutputTokens: number;
}

export interface TaskExecution {
  /** Task name */
  taskName: string;

  /** Execution timestamp */
  timestamp: string;

  /** Success or failure */
  success: boolean;

  /** Tokens used */
  tokens: {
    input: number;
    output: number;
    total: number;
  };

  /** Estimated cost */
  cost: number;

  /** Response time in seconds */
  responseTime: number;

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Error message if failed */
  error?: string;
}

export interface HistoricalData {
  /** Month in YYYY-MM format */
  month: string;

  /** All executions for this month */
  executions: TaskExecution[];

  /** Monthly summary */
  summary: {
    totalRuns: number;
    totalTokens: number;
    totalCost: number;
    successRate: number;
    tasks: Record<string, TaskMetrics>;
  };
}
