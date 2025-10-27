/**
 * Simple Mustache-like template engine
 * Supports variable replacement and simple loops
 */

export interface TemplateData {
  [key: string]: string | number | boolean | TemplateData[] | TemplateData;
}

/**
 * Render a template with the provided data
 *
 * Supports:
 * - {{variable}} - simple variable replacement
 * - {{#each array}}...{{/each}} - array iteration
 * - {{#if condition}}...{{/if}} - conditionals (simple truthy check)
 *
 * @param template - Template string
 * @param data - Data object
 * @returns Rendered string
 */
export function renderTemplate(template: string, data: TemplateData): string {
  let result = template;

  // Process {{#each array}}...{{/each}} blocks
  result = processEachBlocks(result, data);

  // Process {{#if condition}}...{{/if}} blocks
  result = processIfBlocks(result, data);

  // Replace simple variables {{variable}}
  result = replaceVariables(result, data);

  return result;
}

/**
 * Process {{#each array}}...{{/each}} blocks
 */
function processEachBlocks(template: string, data: TemplateData): string {
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(
    eachRegex,
    (_match: string, arrayName: string, blockContent: string): string => {
      const array = data[arrayName as keyof TemplateData];

      if (!Array.isArray(array) || array.length === 0) {
        return '';
      }

      return array
        .map((item: TemplateData | string | number | boolean) => {
          if (typeof item === 'object' && item !== null) {
            return replaceVariables(blockContent, item);
          }
          return blockContent.replace(/\{\{(\w+)\}\}/g, String(item));
        })
        .join('\n');
    }
  );
}

/**
 * Process {{#if condition}}...{{/if}} blocks
 */
function processIfBlocks(template: string, data: TemplateData): string {
  const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  return template.replace(
    ifRegex,
    (_match: string, conditionName: string, blockContent: string): string => {
      const condition = data[conditionName as keyof TemplateData];

      // Treat empty arrays as falsy for template rendering
      if (Array.isArray(condition) && condition.length === 0) {
        return '';
      }

      // Simple truthy check
      if (condition) {
        return blockContent;
      }

      return '';
    }
  );
}

/**
 * Replace simple variables {{variable}}
 */
function replaceVariables(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string): string => {
    const value = data[varName as keyof TemplateData];

    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Validate template syntax
 * Checks for unclosed blocks and invalid syntax
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for unclosed {{#each}} blocks
  const eachOpens = (template.match(/\{\{#each\s+\w+\}\}/g) || []).length;
  const eachCloses = (template.match(/\{\{\/each\}\}/g) || []).length;
  if (eachOpens !== eachCloses) {
    errors.push(`Mismatched {{#each}} blocks: ${eachOpens} opens, ${eachCloses} closes`);
  }

  // Check for unclosed {{#if}} blocks
  const ifOpens = (template.match(/\{\{#if\s+\w+\}\}/g) || []).length;
  const ifCloses = (template.match(/\{\{\/if\}\}/g) || []).length;
  if (ifOpens !== ifCloses) {
    errors.push(`Mismatched {{#if}} blocks: ${ifOpens} opens, ${ifCloses} closes`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract all variable names from a template
 * Useful for validation and documentation
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>();

  // Extract from simple variables
  const simpleMatches = template.matchAll(/\{\{(\w+)\}\}/g);
  for (const match of simpleMatches) {
    // Skip block helpers
    if (!match[1].startsWith('#') && match[1] !== 'each' && match[1] !== 'if') {
      variables.add(match[1]);
    }
  }

  // Extract from #each blocks
  const eachMatches = template.matchAll(/\{\{#each\s+(\w+)\}\}/g);
  for (const match of eachMatches) {
    variables.add(match[1]);
  }

  // Extract from #if blocks
  const ifMatches = template.matchAll(/\{\{#if\s+(\w+)\}\}/g);
  for (const match of ifMatches) {
    variables.add(match[1]);
  }

  return Array.from(variables).sort();
}
