/**
 * MCP Client wrapper
 * Manages connections to MCP servers and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  MCPServerConfig,
  MCPConfig,
  MCPTool,
  MCPToolResult,
} from '../../types/provider.types.js';

/**
 * MCP Client for managing server connections and tool execution
 */
export class MCPClient {
  private clients: Map<string, Client>;
  private tools: Map<string, MCPTool & { serverName: string }>;
  private config: MCPConfig;
  private connected: boolean = false;

  constructor(config: MCPConfig) {
    this.clients = new Map();
    this.tools = new Map();
    this.config = config;
  }

  /**
   * Connect to all configured MCP servers
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const connectionPromises = this.config.servers.map((serverConfig) =>
      this.connectToServer(serverConfig)
    );

    await Promise.allSettled(connectionPromises);
    this.connected = true;
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(serverConfig: MCPServerConfig): Promise<void> {
    try {
      const client = new Client(
        {
          name: 'llm-daily',
          version: '0.1.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Create transport based on config
      const transport = this.createTransport(serverConfig);

      // Connect to server
      await client.connect(transport);

      // Store client
      this.clients.set(serverConfig.name, client);

      // List and cache available tools
      await this.cacheServerTools(serverConfig.name, client);
    } catch (error) {
      console.error(`Failed to connect to MCP server "${serverConfig.name}":`, error);
      // Don't throw - continue with other servers
    }
  }

  /**
   * Create transport for MCP server based on configuration
   */
  private createTransport(serverConfig: MCPServerConfig) {
    const transport = serverConfig.transport || 'stdio';

    if (transport === 'stdio') {
      if (!serverConfig.command) {
        throw new Error(`Server "${serverConfig.name}": command required for stdio transport`);
      }

      return new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env
          ? ({
              ...process.env,
              ...serverConfig.env,
            } as Record<string, string>)
          : undefined,
      });
    }

    // TODO: Add HTTP and WebSocket transports when needed
    throw new Error(`Unsupported transport type: ${transport}`);
  }

  /**
   * Cache available tools from a server
   */
  private async cacheServerTools(serverName: string, client: Client): Promise<void> {
    try {
      const response = await client.listTools();

      if (response.tools) {
        for (const tool of response.tools) {
          const mcpTool: MCPTool & { serverName: string } = {
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema,
            serverName,
          };

          // Check if tool is allowed
          if (this.isToolAllowed(tool.name)) {
            this.tools.set(tool.name, mcpTool);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to list tools from server "${serverName}":`, error);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.close().catch((error) => {
        console.error('Error disconnecting from MCP server:', error);
      })
    );

    await Promise.allSettled(disconnectPromises);

    this.clients.clear();
    this.tools.clear();
    this.connected = false;
  }

  /**
   * Get all available tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const startTime = Date.now();

    try {
      // Get tool info
      const tool = this.tools.get(toolName);
      if (!tool) {
        return {
          toolName,
          result: null,
          error: `Tool "${toolName}" not found`,
          executionTime: Date.now() - startTime,
          success: false,
        };
      }

      // Get client for this tool
      const client = this.clients.get(tool.serverName);
      if (!client) {
        return {
          toolName,
          result: null,
          error: `Server "${tool.serverName}" not connected`,
          executionTime: Date.now() - startTime,
          success: false,
        };
      }

      // Execute tool with timeout
      const timeout = this.config.toolTimeout || 30000;
      const result = await this.executeWithTimeout(
        client.callTool({ name: toolName, arguments: args }),
        timeout
      );

      return {
        toolName,
        result: result.content,
        executionTime: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        toolName,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        success: false,
      };
    }
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Check if a tool is allowed based on configuration
   */
  isToolAllowed(toolName: string): boolean {
    // Check blocklist first
    if (this.config.blockedTools?.includes(toolName)) {
      return false;
    }

    // If allowlist is empty, all tools are allowed (except blocked ones)
    if (!this.config.allowedTools || this.config.allowedTools.length === 0) {
      return true;
    }

    // Check allowlist
    return this.config.allowedTools.includes(toolName);
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get number of connected servers
   */
  getConnectedServersCount(): number {
    return this.clients.size;
  }

  /**
   * Get list of connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }
}
