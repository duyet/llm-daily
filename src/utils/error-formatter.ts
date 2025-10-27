/**
 * Error formatting utility for standardized error messages with context and suggestions
 */

export interface ErrorContext {
  operation: string;
  file?: string;
  line?: number;
  taskName?: string;
  additionalInfo?: Record<string, unknown>;
}

export interface FormattedError {
  code: string;
  message: string;
  context: ErrorContext;
  suggestion: string;
  timestamp: Date;
}

/**
 * Standard error codes for the application
 */
export const ErrorCodes = {
  // File Operations
  FILE_NOT_FOUND: 'ERR_FILE_NOT_FOUND',
  FILE_READ_ERROR: 'ERR_FILE_READ',
  FILE_WRITE_ERROR: 'ERR_FILE_WRITE',
  FILE_PERMISSION: 'ERR_FILE_PERMISSION',

  // Configuration
  CONFIG_INVALID: 'ERR_CONFIG_INVALID',
  CONFIG_MISSING: 'ERR_CONFIG_MISSING',
  CONFIG_PARSE_ERROR: 'ERR_CONFIG_PARSE',

  // Task Operations
  TASK_NOT_FOUND: 'ERR_TASK_NOT_FOUND',
  TASK_EXECUTION_FAILED: 'ERR_TASK_EXECUTION',
  TASK_VALIDATION_FAILED: 'ERR_TASK_VALIDATION',

  // Provider Operations
  PROVIDER_ERROR: 'ERR_PROVIDER',
  PROVIDER_TIMEOUT: 'ERR_PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMIT: 'ERR_PROVIDER_RATE_LIMIT',
  PROVIDER_AUTH: 'ERR_PROVIDER_AUTH',

  // Memory Operations
  MEMORY_ERROR: 'ERR_MEMORY',
  MEMORY_WRITE_FAILED: 'ERR_MEMORY_WRITE',
  MEMORY_READ_FAILED: 'ERR_MEMORY_READ',

  // Workflow Operations
  WORKFLOW_GENERATION_FAILED: 'ERR_WORKFLOW_GENERATION',
  WORKFLOW_INVALID: 'ERR_WORKFLOW_INVALID',

  // Output Operations
  OUTPUT_FAILED: 'ERR_OUTPUT_FAILED',
  WEBHOOK_FAILED: 'ERR_WEBHOOK_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Format an error with code, context, and actionable suggestion
 */
export function formatError(
  code: ErrorCode,
  message: string,
  context: ErrorContext,
  originalError?: Error
): FormattedError {
  const suggestion = getSuggestionForError(code, context, originalError);

  return {
    code,
    message,
    context,
    suggestion,
    timestamp: new Date(),
  };
}

/**
 * Get actionable suggestion based on error code and context
 */
export function getSuggestionForError(
  code: ErrorCode,
  context: ErrorContext,
  originalError?: Error
): string {
  const { taskName, file, additionalInfo } = context;

  switch (code) {
    // File Operations
    case ErrorCodes.FILE_NOT_FOUND:
      if (file) {
        return `Check if the file exists at '${file}'. Verify the path is correct.`;
      }
      return 'Verify the file path is correct and the file exists.';

    case ErrorCodes.FILE_READ_ERROR:
      return file
        ? `Ensure '${file}' has read permissions and is not corrupted.`
        : 'Check file permissions and ensure the file is not corrupted.';

    case ErrorCodes.FILE_WRITE_ERROR:
      return file
        ? `Ensure '${file}' directory exists and you have write permissions.`
        : 'Check directory exists and you have write permissions.';

    case ErrorCodes.FILE_PERMISSION:
      return 'Check file/directory permissions. You may need to adjust ownership or permissions.';

    // Configuration
    case ErrorCodes.CONFIG_INVALID:
      if (taskName) {
        return `Run 'npm run task:validate ${taskName}' to see detailed validation errors.`;
      }
      return 'Run validation command to see detailed configuration errors.';

    case ErrorCodes.CONFIG_MISSING:
      if (file) {
        return `Create a valid config file at '${file}'. Use 'npm run task:new' to generate a template.`;
      }
      return "Create a config file using 'npm run task:new <name>' command.";

    case ErrorCodes.CONFIG_PARSE_ERROR:
      return 'Fix YAML syntax errors. Ensure proper indentation and valid YAML format.';

    // Task Operations
    case ErrorCodes.TASK_NOT_FOUND:
      if (taskName) {
        return `Task '${taskName}' not found. Run 'npm run task:list' to see available tasks.`;
      }
      return "Run 'npm run task:list' to see available tasks.";

    case ErrorCodes.TASK_EXECUTION_FAILED:
      if (originalError?.message.includes('API key')) {
        return 'Set required API keys in environment variables (OPENAI_API_KEY, OPENROUTER_API_KEY).';
      }
      return 'Check task configuration and ensure all required environment variables are set.';

    case ErrorCodes.TASK_VALIDATION_FAILED:
      if (taskName) {
        return `Fix validation errors in task '${taskName}'. Check config.yaml for required fields.`;
      }
      return 'Fix validation errors. Ensure all required fields are present in config.yaml.';

    // Provider Operations
    case ErrorCodes.PROVIDER_ERROR:
      return 'Check provider configuration and network connectivity. Verify API endpoint is accessible.';

    case ErrorCodes.PROVIDER_TIMEOUT:
      return 'Provider request timed out. Check network connectivity or increase timeout in configuration.';

    case ErrorCodes.PROVIDER_RATE_LIMIT:
      return 'Rate limit exceeded. Wait a few moments and try again, or upgrade your API plan.';

    case ErrorCodes.PROVIDER_AUTH: {
      const provider = additionalInfo?.provider as string;
      if (provider === 'openai') {
        return 'Set OPENAI_API_KEY environment variable with your valid OpenAI API key.';
      }
      if (provider === 'openrouter') {
        return 'Set OPENROUTER_API_KEY environment variable with your valid OpenRouter API key.';
      }
      return 'Verify your API key is set correctly in environment variables.';
    }

    // Memory Operations
    case ErrorCodes.MEMORY_ERROR:
      return 'Check memory file exists and has valid format. Memory should have YAML frontmatter.';

    case ErrorCodes.MEMORY_WRITE_FAILED:
      return 'Ensure memory directory exists and you have write permissions.';

    case ErrorCodes.MEMORY_READ_FAILED:
      return 'Check memory file exists and has read permissions. Verify file is not corrupted.';

    // Workflow Operations
    case ErrorCodes.WORKFLOW_GENERATION_FAILED:
      return 'Check task configurations are valid. Run validation on all tasks before generating workflows.';

    case ErrorCodes.WORKFLOW_INVALID:
      return 'Verify workflow file syntax. Check indentation and required fields.';

    // Output Operations
    case ErrorCodes.OUTPUT_FAILED:
      return 'Check output configuration in config.yaml. Ensure target paths/URLs are valid.';

    case ErrorCodes.WEBHOOK_FAILED:
      return 'Verify webhook URL is accessible and accepting POST requests. Check network connectivity.';

    default:
      return 'Check the error details above and verify your configuration.';
  }
}

/**
 * Print formatted error message in standardized format
 */
export function printFormattedError(error: FormattedError): string {
  const contextInfo = error.context.file ? ` in ${error.context.file}` : '';
  const taskInfo = error.context.taskName ? ` (task: ${error.context.taskName})` : '';

  return `[${error.code}] ${error.context.operation}${contextInfo}${taskInfo} failed: ${error.message}. Suggestion: ${error.suggestion}`;
}

/**
 * Create a formatted error from a standard Error object
 */
export function fromError(error: Error, code: ErrorCode, context: ErrorContext): FormattedError {
  return formatError(code, error.message, context, error);
}

/**
 * Helper to check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as FormattedError).code === code;
  }
  return false;
}
