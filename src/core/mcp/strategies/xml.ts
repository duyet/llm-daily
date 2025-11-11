/**
 * Generic XML tool calling strategy
 * Provider-agnostic format using XML tags
 */

import { BaseToolCallStrategy, type ToolCall } from './base.js';
import type { MCPTool, MCPToolResult } from '../../../types/provider.types.js';

/**
 * Strategy using generic XML format for tool calls
 *
 * This is a fallback strategy that works with any LLM.
 * Uses simple XML tags for tool calls:
 *
 * ```xml
 * <tool_call>
 * {
 *   "name": "read_file",
 *   "arguments": {
 *     "path": "/test.txt"
 *   }
 * }
 * </tool_call>
 * ```
 */
export class XMLToolCallStrategy extends BaseToolCallStrategy {
  getName(): string {
    return 'xml';
  }

  supportsProvider(_providerName: string): boolean {
    // Works with any provider as fallback
    return true;
  }

  createToolPrompt(originalPrompt: string, tools: MCPTool[]): string {
    const toolsJson = this.formatToolsAsSchema(tools);

    return `You have access to the following tools:

${toolsJson}

To use a tool, respond with the following XML format:
<tool_call>
{
  "name": "tool_name",
  "arguments": {
    "arg1": "value1"
  }
}
</tool_call>

You can call multiple tools by including multiple <tool_call> blocks.

Original task:
${originalPrompt}`;
  }

  hasToolCalls(content: string): boolean {
    return content.includes('<tool_call>');
  }

  extractToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;

    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        const toolCallJson = match[1].trim();
        const parsed = this.safeParseJSON(toolCallJson);

        if (parsed && typeof parsed.name === 'string') {
          toolCalls.push({
            id: this.generateToolCallId(),
            name: parsed.name,
            arguments:
              typeof parsed.arguments === 'object' && parsed.arguments !== null
                ? (parsed.arguments as Record<string, unknown>)
                : {},
          });
        }
      } catch (error) {
        console.error('Failed to parse tool call:', error);
      }
    }

    return toolCalls;
  }

  formatToolResults(
    toolResults: MCPToolResult[],
    originalPrompt: string,
    _llmResponse: string
  ): string {
    const toolResultsText = toolResults
      .map((result) => {
        if (result.success) {
          return `Tool: ${result.toolName}
Status: Success
Result: ${JSON.stringify(result.result, null, 2)}
Execution time: ${result.executionTime}ms`;
        } else {
          return `Tool: ${result.toolName}
Status: Failed
Error: ${result.error}
Execution time: ${result.executionTime}ms`;
        }
      })
      .join('\n\n---\n\n');

    return `${originalPrompt}

Assistant called tools with results:

${toolResultsText}

Please provide your final response based on these tool results.`;
  }
}
