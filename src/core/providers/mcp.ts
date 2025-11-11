/**
 * MCP-enabled provider
 * Wraps base provider with MCP tool support
 */

import { BaseProvider } from './base.js';
import { MCPClient } from '../mcp/client.js';
import { getStrategyForProvider, type ToolCallStrategy } from '../mcp/strategies/index.js';
import type {
  ProviderConfig,
  ProviderResponse,
  TokenUsage,
  ModelPricing,
  ProviderCapabilities,
  MCPToolResult,
} from '../../types/provider.types.js';

/**
 * MCP Provider that wraps another provider with tool calling capabilities
 */
export class MCPProvider extends BaseProvider {
  protected readonly providerName = 'mcp';
  private baseProvider: BaseProvider;
  private mcpClient: MCPClient;
  private toolCallStrategy: ToolCallStrategy;
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

    // Select tool call strategy based on base provider and config
    const preferredStrategy = config.config.mcp.toolCallStrategy as string | undefined;
    this.toolCallStrategy = getStrategyForProvider(
      baseProvider.getProviderName(),
      preferredStrategy
    );
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

      // Create enhanced prompt with tool descriptions using strategy
      const enhancedPrompt = this.toolCallStrategy.createToolPrompt(prompt, tools);

      // Initial LLM call
      let response = await this.baseProvider.call(enhancedPrompt);
      const toolResults: MCPToolResult[] = [];

      // Multi-turn conversation loop for tool calls
      while (this.toolCallStrategy.hasToolCalls(response.content) && this.canCallMoreTools()) {
        const toolCalls = this.toolCallStrategy.extractToolCalls(response.content);

        // Execute all tool calls in parallel
        const executionResults = await Promise.all(
          toolCalls.map((call) => this.mcpClient.executeTool(call.name, call.arguments))
        );

        toolResults.push(...executionResults);
        this.toolCallCount += toolCalls.length;

        // Continue conversation with tool results using strategy
        const continuationPrompt = this.toolCallStrategy.formatToolResults(
          executionResults,
          enhancedPrompt,
          response.content
        );

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
