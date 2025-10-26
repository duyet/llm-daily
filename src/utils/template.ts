/**
 * Template replacement utility for variable substitution in prompts
 * Supports {{memory}}, {{date}}, {{taskName}} and custom variables
 */

import {
  TemplateContext,
  TemplateReplaceOptions,
  TemplateReplaceResult,
  DEFAULT_REPLACE_OPTIONS,
  BUILTIN_VARIABLES,
} from '../types/template.types.js';

/**
 * Template error
 */
export class TemplateError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'TemplateError';
    Object.setPrototypeOf(this, TemplateError.prototype);
  }
}

/**
 * Replace template variables in content
 * @param content Content with template variables
 * @param context Variable values
 * @param options Replace options
 * @returns Replace result
 */
export function replaceTemplateVariables(
  content: string,
  context: TemplateContext,
  options: TemplateReplaceOptions = DEFAULT_REPLACE_OPTIONS
): TemplateReplaceResult {
  const opts = { ...DEFAULT_REPLACE_OPTIONS, ...options };
  const delimiter = opts.delimiter ?? DEFAULT_REPLACE_OPTIONS.delimiter!;

  const replaced: string[] = [];
  const missing: string[] = [];
  let result = content;

  // Find all template variables
  const regex = new RegExp(
    `${escapeRegex(delimiter.open)}\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*${escapeRegex(delimiter.close)}`,
    'g'
  );

  const matches = [...content.matchAll(regex)];

  for (const match of matches) {
    const placeholder = match[0]; // Full match: {{varName}}
    const varName = match[1]; // Variable name: varName

    // Get variable value
    const value = getVariableValue(varName, context);

    if (value !== undefined) {
      // Replace all occurrences of this variable
      result = result.split(placeholder).join(value);
      if (!replaced.includes(varName)) {
        replaced.push(varName);
      }
    } else {
      // Variable not found
      if (!missing.includes(varName)) {
        missing.push(varName);
      }

      if (opts.strict) {
        throw new TemplateError(`Missing required template variable: ${varName}`);
      }

      // Use default value
      const defaultVal = opts.defaultValue ?? '';
      result = result.split(placeholder).join(defaultVal);
    }
  }

  return {
    content: result,
    replaced,
    missing,
    modified: replaced.length > 0,
  };
}

/**
 * Get variable value from context
 * @param varName Variable name
 * @param context Template context
 * @returns Variable value or undefined
 */
function getVariableValue(varName: string, context: TemplateContext): string | undefined {
  // Check built-in variables
  switch (varName) {
    case BUILTIN_VARIABLES.MEMORY:
      return context.memory;
    case BUILTIN_VARIABLES.DATE:
      return context.date ?? new Date().toISOString().split('T')[0];
    case BUILTIN_VARIABLES.TASK_NAME:
      return context.taskName;
  }

  // Check custom variables
  return context[varName];
}

/**
 * Escape special regex characters
 * @param str String to escape
 * @returns Escaped string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract template variables from content
 * @param content Content with template variables
 * @param delimiter Custom delimiter (optional)
 * @returns Array of variable names found
 */
export function extractTemplateVariables(
  content: string,
  delimiter = DEFAULT_REPLACE_OPTIONS.delimiter!
): string[] {
  const regex = new RegExp(
    `${escapeRegex(delimiter.open)}\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*${escapeRegex(delimiter.close)}`,
    'g'
  );

  const matches = [...content.matchAll(regex)];
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Check if content has template variables
 * @param content Content to check
 * @param delimiter Custom delimiter (optional)
 * @returns True if variables found
 */
export function hasTemplateVariables(
  content: string,
  delimiter = DEFAULT_REPLACE_OPTIONS.delimiter!
): boolean {
  const regex = new RegExp(
    `${escapeRegex(delimiter.open)}\\s*[a-zA-Z_][a-zA-Z0-9_]*\\s*${escapeRegex(delimiter.close)}`
  );
  return regex.test(content);
}

/**
 * Validate template context has all required variables
 * @param content Content with template variables
 * @param context Template context
 * @param delimiter Custom delimiter (optional)
 * @returns Validation result with missing variables
 */
export function validateTemplateContext(
  content: string,
  context: TemplateContext,
  delimiter = DEFAULT_REPLACE_OPTIONS.delimiter!
): { valid: boolean; missing: string[] } {
  const variables = extractTemplateVariables(content, delimiter);
  const missing: string[] = [];

  for (const varName of variables) {
    const value = getVariableValue(varName, context);
    if (value === undefined) {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create template context from values
 * @param values Variable values
 * @returns Template context
 */
export function createTemplateContext(values: {
  memory?: string;
  date?: string;
  taskName?: string;
  [key: string]: string | undefined;
}): TemplateContext {
  return {
    memory: values.memory,
    date: values.date,
    taskName: values.taskName,
    ...values,
  };
}

/**
 * Replace template variables in multiple strings
 * @param contents Array of content strings
 * @param context Template context
 * @param options Replace options
 * @returns Array of replace results
 */
export function replaceTemplateVariablesBatch(
  contents: string[],
  context: TemplateContext,
  options?: TemplateReplaceOptions
): TemplateReplaceResult[] {
  return contents.map((content) => replaceTemplateVariables(content, context, options));
}

/**
 * Get default template context with current date
 * @returns Default context
 */
export function getDefaultTemplateContext(): TemplateContext {
  return {
    date: new Date().toISOString().split('T')[0],
  };
}
