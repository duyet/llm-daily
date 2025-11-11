/**
 * Unit tests for MCP client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPClient } from './client.js';
import type { MCPConfig } from '../../types/provider.types.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class MockClient {
    async connect() {
      return Promise.resolve();
    }
    async close() {
      return Promise.resolve();
    }
    async listTools() {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
              },
            },
          },
          {
            name: 'list_directory',
            description: 'List directory contents',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string' },
              },
            },
          },
        ],
      };
    }
    async callTool(args: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Result for ${args.name}`,
          },
        ],
      };
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class MockStdioTransport {
    constructor(public config: any) {}
  },
}));

describe('MCPClient', () => {
  let config: MCPConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      servers: [
        {
          name: 'test-server',
          transport: 'stdio',
          command: 'test-command',
          args: ['arg1', 'arg2'],
        },
      ],
      allowedTools: ['read_file', 'list_directory'],
      toolTimeout: 5000,
      maxToolCalls: 10,
    };
  });

  describe('constructor', () => {
    it('should create MCP client', () => {
      const client = new MCPClient(config);
      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should connect to servers and cache tools', async () => {
      const client = new MCPClient(config);
      await client.connect();

      expect(client.isConnected()).toBe(true);
      expect(client.getConnectedServersCount()).toBe(1);
      expect(client.getConnectedServers()).toContain('test-server');

      const tools = client.getTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('read_file');
      expect(tools[1].name).toBe('list_directory');
    });

    it('should not reconnect if already connected', async () => {
      const client = new MCPClient(config);
      await client.connect();
      const serversCount = client.getConnectedServersCount();

      await client.connect(); // Call again
      expect(client.getConnectedServersCount()).toBe(serversCount);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from all servers', async () => {
      const client = new MCPClient(config);
      await client.connect();
      expect(client.isConnected()).toBe(true);

      await client.disconnect();
      expect(client.isConnected()).toBe(false);
      expect(client.getConnectedServersCount()).toBe(0);
      expect(client.getTools()).toHaveLength(0);
    });
  });

  describe('isToolAllowed', () => {
    it('should allow tools in allowlist', () => {
      const client = new MCPClient(config);
      expect(client.isToolAllowed('read_file')).toBe(true);
      expect(client.isToolAllowed('list_directory')).toBe(true);
    });

    it('should block tools not in allowlist', () => {
      const client = new MCPClient(config);
      expect(client.isToolAllowed('delete_file')).toBe(false);
    });

    it('should allow all tools if allowlist is empty', () => {
      const configWithoutAllowlist: MCPConfig = {
        ...config,
        allowedTools: undefined,
      };
      const client = new MCPClient(configWithoutAllowlist);
      expect(client.isToolAllowed('any_tool')).toBe(true);
    });

    it('should block tools in blocklist', () => {
      const configWithBlocklist: MCPConfig = {
        ...config,
        allowedTools: undefined,
        blockedTools: ['delete_file'],
      };
      const client = new MCPClient(configWithBlocklist);
      expect(client.isToolAllowed('delete_file')).toBe(false);
      expect(client.isToolAllowed('read_file')).toBe(true);
    });
  });

  describe('executeTool', () => {
    it('should execute tool and return result', async () => {
      const client = new MCPClient(config);
      await client.connect();

      const result = await client.executeTool('read_file', { path: '/test.txt' });

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('read_file');
      expect(result.result).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return error for non-existent tool', async () => {
      const client = new MCPClient(config);
      await client.connect();

      const result = await client.executeTool('nonexistent_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getTools', () => {
    it('should return empty array before connection', () => {
      const client = new MCPClient(config);
      const tools = client.getTools();
      expect(tools).toHaveLength(0);
    });

    it('should return tools after connection', async () => {
      const client = new MCPClient(config);
      await client.connect();

      const tools = client.getTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('name');
      expect(tools[0]).toHaveProperty('description');
      expect(tools[0]).toHaveProperty('inputSchema');
    });
  });
});
