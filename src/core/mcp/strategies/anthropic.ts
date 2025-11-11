/**
 * Anthropic tool calling strategy
 * Supports Claude's native tool use format
 */

import { BaseToolCallStrategy, type ToolCall } from './base.js';
import type { MCPTool, MCPToolResult } from '../../../types/provider.types.js';

/**
 * Strategy for Anthropic Claude's native tool use format
 *
 * Anthropic format uses content blocks with tool_use type:
 * ```json
 * {
 *   "content": [
 *     {
 *       "type": "tool_use",
 *       "id": "toolu_01A09q90qw90lq917835lq9",
 *       "name": "read_file",
 *       "input": {
 *         "path": "/test.txt"
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export class AnthropicToolCallStrategy extends BaseToolCallStrategy {
  getName(): string {
    return 'anthropic';
  }

  supportsProvider(providerName: string): boolean {
    return providerName === 'anthropic' || providerName === 'claude';
  }

  createToolPrompt(originalPrompt: string, tools: MCPTool[]): string {
    // Anthropic uses tool use natively via API
    // For text-based usage, provide instructions
    const toolsDescription = tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  Input schema: ${JSON.stringify(tool.inputSchema)}`
      )
      .join('\n');

    return `${originalPrompt}

You have access to the following tools:

${toolsDescription}

To use a tool, respond with a JSON object containing a "tool_use" block:
{
  "type": "tool_use",
  "name": "tool_name",
  "input": {"arg1": "value1"}
}

You can use multiple tools by including multiple tool_use blocks.`;
  }

  hasToolCalls(content: string): boolean {
    // Check if content contains tool_use blocks
    return content.includes('"type":"tool_use"') || content.includes('"type": "tool_use"');
  }

  extractToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    try {
      // Try to parse as JSON
      const parsed = this.safeParseJSON(content);

      if (parsed) {
        // Check for content array with tool_use blocks
        if (Array.isArray(parsed.content)) {
          for (const block of parsed.content) {
            if (block.type === 'tool_use' && block.name) {
              toolCalls.push({
                id: block.id || this.generateToolCallId(),
                name: block.name,
                arguments: block.input || {},
              });
            }
          }
        }

        // Check for single tool_use block
        if (parsed.type === 'tool_use' && parsed.name) {
          toolCalls.push({
            id: parsed.id || this.generateToolCallId(),
            name: parsed.name,
            arguments: parsed.input || {},
          });
        }
      }

      // Also check for embedded JSON in markdown code blocks
      if (toolCalls.length === 0) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          const embeddedParsed = this.safeParseJSON(jsonMatch[1]);
          if (embeddedParsed?.type === 'tool_use') {
            toolCalls.push({
              id: embeddedParsed.id || this.generateToolCallId(),
              name: embeddedParsed.name,
              arguments: embeddedParsed.input || {},
            });
          }
        }
      }

      // Check for multiple tool_use blocks in text
      const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
      let match;
      while ((match = toolUseRegex.exec(content)) !== null) {
        const blockParsed = this.safeParseJSON(match[1].trim());
        if (blockParsed && blockParsed.name) {
          toolCalls.push({
            id: blockParsed.id || this.generateToolCallId(),
            name: blockParsed.name,
            arguments: blockParsed.input || {},
          });
        }
      }
    } catch (error) {
      console.error('Error extracting Anthropic tool calls:', error);
    }

    return toolCalls;
  }

  formatToolResults(
    toolResults: MCPToolResult[],
    originalPrompt: string,
    llmResponse: string
  ): string {
    // Format results as tool_result blocks
    const resultsText = toolResults
      .map((result) => {
        if (result.success) {
          return `<tool_result>
{
  "tool_name": "${result.toolName}",
  "result": ${JSON.stringify(result.result, null, 2)}
}
</tool_result>`;
        } else {
          return `<tool_result>
{
  "tool_name": "${result.toolName}",
  "error": "${result.error}"
}
</tool_result>`;
        }
      })
      .join('\n\n');

    return `${originalPrompt}

Assistant used tools with these results:

${resultsText}

Please provide your final response based on these tool results.`;
  }
}
