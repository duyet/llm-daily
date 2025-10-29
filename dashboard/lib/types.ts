export interface TaskMetadata {
  taskName: string;
  timestamp: string;
  model?: string;
  tokensUsed?: number;
  estimatedCost?: number;
  responseTime?: number;
  status: 'success' | 'failure';
  provider?: string;
}

export interface TaskResult {
  metadata: TaskMetadata;
  content: string;
  htmlContent?: string;
  resultPath: string;
  date: string;
}

export interface AnalyticsData {
  lastUpdated: string;
  tasks: {
    [taskName: string]: {
      name: string;
      description?: string;
      schedule?: string;
      lastRun?: string;
      status: 'success' | 'failure' | 'pending';
      totalExecutions: number;
      successfulExecutions: number;
      failureExecutions: number;
      totalTokens: number;
      totalCost: number;
      averageResponseTime: number;
      provider?: string;
      model?: string;
      latestResult?: string;
    };
  };
  summary: {
    totalTasks: number;
    totalExecutions: number;
    totalCost: number;
    totalTokens: number;
  };
}

export interface TaskConfig {
  name: string;
  description?: string;
  schedule?: string;
  provider: string;
  model: string;
  memory?: {
    enabled: boolean;
    strategy?: string;
  };
  outputs?: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}
