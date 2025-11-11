/**
 * OpenAI tool calling strategy
 * Supports OpenAI's native function calling format
 */

import { BaseToolCallStrategy, type ToolCall } from './base.js';
import type { MCPTool, MCPToolResult } from '../../../types/provider.types.js';

/**
 * Strategy for OpenAI's native function calling format
 *
 * OpenAI format uses JSON tool_calls in the response:
 * ```json
 * {
 *   "tool_calls": [
 *     {
 *       "id": "call_abc123",
 *       "type": "function",
 *       "function": {
 *         "name": "read_file",
 *         "arguments": "{\"path\": \"/test.txt\"}"
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export class OpenAIToolCallStrategy extends BaseToolCallStrategy {
  getName(): string {
    return 'openai';
  }

  supportsProvider(providerName: string): boolean {
    return providerName === 'openai';
  }

  createToolPrompt(originalPrompt: string, tools: MCPTool[]): string {
    // OpenAI uses function calling natively via API
    // This would typically be handled by the API parameter
    // For text-based models, provide instructions
    const toolsDescription = tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.inputSchema)}`
      )
      .join('\n');

    return `${originalPrompt}

You have access to the following functions:

${toolsDescription}

To call a function, respond with a JSON object in this format:
{
  "function_call": {
    "name": "function_name",
    "arguments": {"arg1": "value1"}
  }
}`;
  }

  hasToolCalls(content: string): boolean {
    // Check if content contains function_call JSON
    return content.includes('"function_call"') || content.includes('"tool_calls"');
  }

  extractToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    try {
      // Try to parse as JSON
      const parsed = this.safeParseJSON(content);

      if (parsed) {
        // Check for single function_call
        if (parsed.function_call && typeof parsed.function_call === 'object') {
          const fc = parsed.function_call as any;
          toolCalls.push({
            id: this.generateToolCallId(),
            name: fc.name,
            arguments:
              typeof fc.arguments === 'string'
                ? this.safeParseJSON(fc.arguments) || {}
                : fc.arguments || {},
          });
        }

        // Check for tool_calls array
        if (Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            if (tc.type === 'function' && tc.function) {
              toolCalls.push({
                id: tc.id || this.generateToolCallId(),
                name: tc.function.name,
                arguments:
                  typeof tc.function.arguments === 'string'
                    ? this.safeParseJSON(tc.function.arguments) || {}
                    : tc.function.arguments || {},
              });
            }
          }
        }
      }

      // Also check for embedded JSON in text
      if (toolCalls.length === 0) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          const embeddedParsed = this.safeParseJSON(jsonMatch[1]);
          if (embeddedParsed?.function_call) {
            const fc = embeddedParsed.function_call as any;
            toolCalls.push({
              id: this.generateToolCallId(),
              name: fc.name,
              arguments:
                typeof fc.arguments === 'string'
                  ? this.safeParseJSON(fc.arguments) || {}
                  : fc.arguments || {},
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting OpenAI tool calls:', error);
    }

    return toolCalls;
  }

  formatToolResults(
    toolResults: MCPToolResult[],
    originalPrompt: string,
    llmResponse: string
  ): string {
    // Format results as tool responses
    const resultsText = toolResults
      .map((result) => {
        if (result.success) {
          return `Function ${result.toolName} returned:
${JSON.stringify(result.result, null, 2)}`;
        } else {
          return `Function ${result.toolName} failed with error:
${result.error}`;
        }
      })
      .join('\n\n');

    return `${originalPrompt}

Assistant called functions with these results:

${resultsText}

Please provide your final response based on these function results.`;
  }
}
