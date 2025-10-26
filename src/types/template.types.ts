/**
 * Template type definitions for variable replacement in prompts
 * Supports {{memory}}, {{date}}, {{taskName}} and custom variables
 */

/**
 * Template variable definition
 */
export interface TemplateVariable {
  /** Variable name (without braces) */
  name: string;
  /** Variable value */
  value: string;
  /** Whether variable is required */
  required?: boolean;
}

/**
 * Context for template replacement
 */
export interface TemplateContext {
  /** Memory content to inject (for {{memory}} variable) */
  memory?: string;
  /** Current date string (for {{date}} variable) */
  date?: string;
  /** Task name (for {{taskName}} variable) */
  taskName?: string;
  /** Custom variables */
  [key: string]: string | undefined;
}

/**
 * Options for template replacement
 */
export interface TemplateReplaceOptions {
  /** Whether to throw error on missing required variables */
  strict?: boolean;
  /** Default value for missing variables */
  defaultValue?: string;
  /** Custom variable delimiter (default: {{}}) */
  delimiter?: TemplateDelimiter;
}

/**
 * Template delimiter configuration
 */
export interface TemplateDelimiter {
  /** Opening delimiter (default: "{{") */
  open: string;
  /** Closing delimiter (default: "}}") */
  close: string;
}

/**
 * Result of template replacement operation
 */
export interface TemplateReplaceResult {
  /** Replaced content */
  content: string;
  /** Variables that were replaced */
  replaced: string[];
  /** Variables that were missing */
  missing: string[];
  /** Whether any replacements were made */
  modified: boolean;
}

/**
 * Built-in template variables
 */
export const BUILTIN_VARIABLES = {
  /** Memory content variable */
  MEMORY: 'memory',
  /** Current date variable */
  DATE: 'date',
  /** Task name variable */
  TASK_NAME: 'taskName',
} as const;

/**
 * Default template delimiter
 */
export const DEFAULT_DELIMITER: TemplateDelimiter = {
  open: '{{',
  close: '}}',
};

/**
 * Default template replace options
 */
export const DEFAULT_REPLACE_OPTIONS: TemplateReplaceOptions = {
  strict: false,
  defaultValue: '',
  delimiter: DEFAULT_DELIMITER,
};
