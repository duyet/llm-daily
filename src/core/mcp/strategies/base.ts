/**
 * Base interface for tool call strategies
 * Enables support for different LLM tool calling formats
 */

import type { MCPTool, MCPToolResult } from '../../../types/provider.types.js';

/**
 * Tool call extracted from LLM response
 */
export interface ToolCall {
  /** Unique ID for this tool call */
  id: string;
  /** Tool name to execute */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/**
 * Strategy for handling tool calls in different LLM formats
 */
export interface ToolCallStrategy {
  /**
   * Get strategy name
   */
  getName(): string;

  /**
   * Create a prompt that instructs the LLM how to use tools
   * @param originalPrompt User's original prompt
   * @param tools Available tools
   * @returns Enhanced prompt with tool instructions
   */
  createToolPrompt(originalPrompt: string, tools: MCPTool[]): string;

  /**
   * Check if LLM response contains tool calls
   * @param content LLM response content
   * @returns True if tool calls detected
   */
  hasToolCalls(content: string): boolean;

  /**
   * Extract tool calls from LLM response
   * @param content LLM response content
   * @returns Array of tool calls
   */
  extractToolCalls(content: string): ToolCall[];

  /**
   * Format tool results for LLM continuation
   * @param toolResults Results from tool execution
   * @param originalPrompt Original prompt
   * @param llmResponse LLM's response with tool calls
   * @returns Formatted prompt for next LLM call
   */
  formatToolResults(
    toolResults: MCPToolResult[],
    originalPrompt: string,
    llmResponse: string
  ): string;

  /**
   * Check if this strategy can handle the given provider
   * @param providerName Provider name (e.g., "openai", "anthropic")
   * @returns True if strategy supports this provider
   */
  supportsProvider(providerName: string): boolean;
}

/**
 * Base abstract class with common functionality
 */
export abstract class BaseToolCallStrategy implements ToolCallStrategy {
  abstract getName(): string;
  abstract createToolPrompt(originalPrompt: string, tools: MCPTool[]): string;
  abstract hasToolCalls(content: string): boolean;
  abstract extractToolCalls(content: string): ToolCall[];
  abstract formatToolResults(
    toolResults: MCPToolResult[],
    originalPrompt: string,
    llmResponse: string
  ): string;
  abstract supportsProvider(providerName: string): boolean;

  /**
   * Generate a unique tool call ID
   */
  protected generateToolCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Safely parse JSON
   */
  protected safeParseJSON(json: string): Record<string, unknown> | null {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Format tools as JSON schema
   */
  protected formatToolsAsSchema(tools: MCPTool[]): string {
    return JSON.stringify(
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      })),
      null,
      2
    );
  }
}
