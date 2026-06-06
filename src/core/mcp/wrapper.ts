/**
 * MCP Wrapper
 * Wraps any provider with MCP tool calling capabilities
 * MCP is provider-independent and works with any LLM provider
 */

import { BaseProvider } from '../providers/base.js';
import { MCPClient } from './client.js';
import { getStrategyForProvider, type ToolCallStrategy } from './strategies/index.js';
import type {
  ProviderConfig,
  ProviderResponse,
  TokenUsage,
  ModelPricing,
  ProviderCapabilities,
  MCPToolResult,
  MCPConfig,
} from '../../types/provider.types.js';

/**
 * MCP Wrapper - wraps any provider with tool calling capabilities
 * This is NOT a provider itself, but a wrapper that adds MCP to any provider
 */
export class MCPWrapper extends BaseProvider {
  private baseProvider: BaseProvider;
  private mcpClient: MCPClient;
  private toolCallStrategy: ToolCallStrategy;
  private toolCallCount = 0;
  private maxToolCalls: number;

  /**
   * Create MCP wrapper around a base provider
   * @param config Provider configuration (passed to BaseProvider)
   * @param baseProvider The provider to wrap (OpenAI, Anthropic, etc.)
   * @param mcpConfig MCP configuration
   */
  constructor(config: ProviderConfig, baseProvider: BaseProvider, mcpConfig: MCPConfig) {
    // Pass config to BaseProvider
    super(config);

    this.baseProvider = baseProvider;

    if (!mcpConfig.enabled) {
      throw new Error('MCP must be enabled to use MCPWrapper');
    }

    this.mcpClient = new MCPClient(mcpConfig);
    this.maxToolCalls = mcpConfig.maxToolCalls || 20;

    // Select tool call strategy based on base provider
    const preferredStrategy = mcpConfig.toolCallStrategy;
    this.toolCallStrategy = getStrategyForProvider(
      baseProvider.getProviderName(),
      preferredStrategy
    );
  }

  /**
   * Get provider name (delegates to base provider)
   */
  protected get providerName(): string {
    return this.baseProvider.getProviderName();
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
          mcpStrategy: this.toolCallStrategy.getName(),
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

  /**
   * Get wrapped provider
   */
  getBaseProvider(): BaseProvider {
    return this.baseProvider;
  }
}
