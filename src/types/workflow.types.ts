/**
 * Workflow types for GitHub Actions generation
 */

/**
 * Workflow configuration for a task
 */
export interface WorkflowConfig {
  /** Task name */
  taskName: string;

  /** Cron schedule expression */
  schedule: string;

  /** Job timeout in minutes (default: 30) */
  timeout: number;

  /** Environment secrets required by the task */
  secrets: WorkflowSecret[];

  /** Optional description */
  description?: string;
}

/**
 * Workflow secret definition
 */
export interface WorkflowSecret {
  /** Environment variable name */
  name: string;

  /** GitHub secret key */
  secretKey: string;

  /** Optional description */
  description?: string;
}

/**
 * Workflow template data
 */
export interface WorkflowTemplate {
  /** Template content */
  content: string;

  /** Template variables */
  variables: Record<string, unknown>;
}

/**
 * Generated workflow result
 */
export interface GeneratedWorkflow {
  /** Task name */
  taskName: string;

  /** Workflow file path */
  filePath: string;

  /** Generated content */
  content: string;

  /** Required secrets */
  secrets: string[];

  /** Warnings */
  warnings: string[];
}

/**
 * Task scan result
 */
export interface ScannedTask {
  /** Task name */
  name: string;

  /** Task directory path */
  path: string;

  /** Config file path */
  configPath: string;

  /** Whether the task is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Workflow configuration */
  config?: WorkflowConfig;
}
