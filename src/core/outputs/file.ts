/**
 * File output integration - writes results to files
 */

import fs from 'fs/promises';
import path from 'path';
import type { OutputIntegration, TaskResult, FileOutputConfig } from '../../types/output.types.js';
import { replaceTemplateVariables } from '../../utils/template.js';

export class FileOutput implements OutputIntegration {
  readonly type = 'file';

  constructor(private config: FileOutputConfig) {}

  async execute(result: TaskResult): Promise<void> {
    try {
      // Resolve output path with template variables
      const outputPath = this.resolvePath(result);

      // Ensure directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Format content
      const content = this.formatContent(result);

      // Write or append
      if (this.config.mode === 'append') {
        await fs.appendFile(outputPath, content, 'utf-8');
      } else {
        await fs.writeFile(outputPath, content, 'utf-8');
      }

      console.log(`✅ Wrote result to ${outputPath}`);
    } catch (error) {
      console.error(`❌ Failed to write file output for ${result.taskName}:`, error);
      throw error;
    }
  }

  /**
   * Resolve output path with template variables
   */
  private resolvePath(result: TaskResult): string {
    const date = new Date(result.timestamp);
    const variables = {
      taskName: result.taskName,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      day: date.getDate().toString().padStart(2, '0'),
      timestamp: result.timestamp,
    };

    let resolvedPath = this.config.path;
    for (const [key, value] of Object.entries(variables)) {
      resolvedPath = resolvedPath.replace(`{{${key}}}`, value);
    }

    return resolvedPath;
  }

  /**
   * Format content based on format and template
   */
  private formatContent(result: TaskResult): string {
    const format = this.config.format || 'markdown';

    if (format === 'json') {
      return JSON.stringify(result, null, 2) + '\n';
    }

    if (format === 'text') {
      return result.response + '\n';
    }

    // Markdown format
    if (this.config.template) {
      // Use custom template
      const replaced = replaceTemplateVariables(this.config.template, {
        taskName: result.taskName,
        timestamp: result.timestamp,
        success: result.success.toString(),
        response: result.response,
        provider: result.metadata.provider,
        model: result.metadata.model,
        tokens: result.metadata.tokens.total.toString(),
        cost: result.metadata.cost.toFixed(4),
        responseTime: result.metadata.responseTime.toFixed(2),
        error: result.error || '',
      });
      return replaced.content + '\n';
    }

    // Default markdown template
    return this.defaultMarkdownTemplate(result);
  }

  /**
   * Default markdown template
   */
  private defaultMarkdownTemplate(result: TaskResult): string {
    const date = new Date(result.timestamp).toLocaleString();
    const status = result.success ? '✅ Success' : '❌ Failed';

    let content = `# ${result.taskName}\n\n`;
    content += `**Date**: ${date}\n`;
    content += `**Status**: ${status}\n`;
    content += `**Model**: ${result.metadata.model}\n`;
    content += `**Tokens**: ${result.metadata.tokens.total.toLocaleString()}\n`;
    content += `**Cost**: $${result.metadata.cost.toFixed(4)}\n`;
    content += `**Response Time**: ${result.metadata.responseTime.toFixed(2)}s\n\n`;

    if (result.error) {
      content += `## Error\n\n${result.error}\n\n`;
    } else {
      content += `## Response\n\n${result.response}\n\n`;
    }

    content += '---\n\n';

    return content;
  }
}
