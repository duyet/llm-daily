/**
 * MCP-enabled provider
 * Wraps base provider with MCP tool support
 */

import { BaseProvider } from './base.js';
import { MCPClient } from '../mcp/client.js';
import type {
  ProviderConfig,
  ProviderResponse,
  TokenUsage,
  ModelPricing,
  ProviderCapabilities,
  MCPToolResult,
} from '../../types/provider.types.js';

/**
 * Tool call extracted from LLM response
 */
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * MCP Provider that wraps another provider with tool calling capabilities
 */
export class MCPProvider extends BaseProvider {
  protected readonly providerName = 'mcp';
  private baseProvider: BaseProvider;
  private mcpClient: MCPClient;
  private toolCallCount = 0;
  private maxToolCalls: number;

  constructor(config: ProviderConfig, baseProvider: BaseProvider) {
    super(config);
    this.baseProvider = baseProvider;

    if (!config.config?.mcp) {
      throw new Error('MCP configuration is required for MCPProvider');
    }

    this.mcpClient = new MCPClient(config.config.mcp);
    this.maxToolCalls = config.config.mcp.maxToolCalls || 20;
  }

  /**
   * Call provider with MCP tool support
   */
  async call(prompt: string): Promise<ProviderResponse> {
    // Connect to MCP servers
    await this.mcpClient.connect();

    try {
      // Get available tools
      const tools = this.mcpClient.getTools();

      // If no tools available, just use base provider
      if (tools.length === 0) {
        console.warn('No MCP tools available, using base provider without tools');
        return await this.baseProvider.call(prompt);
      }

      // Create enhanced prompt with tool descriptions
      const enhancedPrompt = this.createToolPrompt(prompt, tools);

      // Initial LLM call
      let response = await this.baseProvider.call(enhancedPrompt);
      const toolResults: MCPToolResult[] = [];

      // Multi-turn conversation loop for tool calls
      while (this.hasToolCalls(response.content) && this.canCallMoreTools()) {
        const toolCalls = this.extractToolCalls(response.content);

        // Execute all tool calls in parallel
        const executionResults = await Promise.all(
          toolCalls.map((call) => this.mcpClient.executeTool(call.name, call.arguments))
        );

        toolResults.push(...executionResults);
        this.toolCallCount += toolCalls.length;

        // Continue conversation with tool results
        const toolResultsText = this.formatToolResults(executionResults);
        const continuationPrompt = `${enhancedPrompt}\n\nAssistant: ${response.content}\n\nTool Results:\n${toolResultsText}\n\nPlease continue your response based on the tool results.`;

        response = await this.baseProvider.call(continuationPrompt);
      }

      // Add tool execution metadata to response
      if (toolResults.length > 0) {
        response.metadata = {
          ...response.metadata,
          mcpToolCalls: toolResults.map((tr) => ({
            tool: tr.toolName,
            success: tr.success,
            error: tr.error,
            executionTime: tr.executionTime,
          })),
          mcpServers: this.mcpClient.getConnectedServers(),
        };
      }

      return response;
    } finally {
      // Disconnect from MCP servers
      await this.mcpClient.disconnect();
      this.toolCallCount = 0;
    }
  }

  /**
   * Create enhanced prompt with tool descriptions
   */
  private createToolPrompt(originalPrompt: string, tools: any[]): string {
    const toolsJson = JSON.stringify(tools, null, 2);

    return `You have access to the following tools:

${toolsJson}

To use a tool, respond with the following format:
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

  /**
   * Check if response contains tool calls
   */
  private hasToolCalls(content: string): boolean {
    return content.includes('<tool_call>');
  }

  /**
   * Extract tool calls from LLM response
   */
  private extractToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;

    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        const toolCallJson = match[1].trim();
        const parsed = JSON.parse(toolCallJson);

        toolCalls.push({
          id: `call_${Date.now()}_${toolCalls.length}`,
          name: parsed.name,
          arguments: parsed.arguments || {},
        });
      } catch (error) {
        console.error('Failed to parse tool call:', error);
      }
    }

    return toolCalls;
  }

  /**
   * Format tool results for LLM
   */
  private formatToolResults(results: MCPToolResult[]): string {
    return results
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
  }

  /**
   * Check if more tools can be called
   */
  private canCallMoreTools(): boolean {
    return this.toolCallCount < this.maxToolCalls;
  }

  /**
   * Estimate cost (delegates to base provider)
   */
  estimateCost(usage: TokenUsage): number {
    return this.baseProvider.estimateCost(usage);
  }

  /**
   * Get model pricing (delegates to base provider)
   */
  getModelPricing(): ModelPricing {
    return this.baseProvider.getModelPricing();
  }

  /**
   * Check if supports prompt caching (delegates to base provider)
   */
  supportsPromptCaching(): boolean {
    return this.baseProvider.supportsPromptCaching();
  }

  /**
   * Get provider capabilities (delegates to base provider)
   */
  getCapabilities(): ProviderCapabilities {
    const baseCapabilities = this.baseProvider.getCapabilities();
    return {
      ...baseCapabilities,
      functionCalling: true, // MCP enables function calling
    };
  }

  /**
   * Get base provider name
   */
  getBaseProviderName(): string {
    return this.baseProvider.getProviderName();
  }

  /**
   * Get MCP client for testing/debugging
   */
  getMCPClient(): MCPClient {
    return this.mcpClient;
  }
}
