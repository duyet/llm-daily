/**
 * Unit tests for MCP provider
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPProvider } from './mcp.js';
import { OpenAIProvider } from './openai.js';
import { createProvider, clearProviderCache } from './registry.js';
import type { ProviderConfig } from '../../types/provider.types.js';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          id: 'test',
          model: 'gpt-4o-mini',
          choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      },
    };
  },
}));

// Mock MCP SDK
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
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };
    }
    async callTool(args: any) {
      return {
        content: [{ type: 'text', text: 'Tool result' }],
      };
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class MockStdioTransport {
    constructor(public config: any) {}
  },
}));

describe('MCPProvider', () => {
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    clearProviderCache();
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    clearProviderCache();
  });

  describe('constructor', () => {
    it('should create MCP provider with base provider', () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {
          mcp: {
            enabled: true,
            servers: [
              {
                name: 'test',
                transport: 'stdio',
                command: 'test-cmd',
              },
            ],
          },
        },
      };

      const baseProvider = new OpenAIProvider({
        id: 'openai:gpt-4o-mini',
      });

      const mcpProvider = new MCPProvider(config, baseProvider);

      expect(mcpProvider).toBeDefined();
      expect(mcpProvider.getProviderName()).toBe('mcp');
      expect(mcpProvider.getBaseProviderName()).toBe('openai');
    });

    it('should throw error if MCP config is missing', () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {}, // No MCP config
      };

      const baseProvider = new OpenAIProvider({
        id: 'openai:gpt-4o-mini',
      });

      expect(() => new MCPProvider(config, baseProvider)).toThrow(
        'MCP configuration is required'
      );
    });
  });

  describe('integration with registry', () => {
    it('should create MCP provider via registry with mcp: prefix', () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {
          mcp: {
            enabled: true,
            servers: [
              {
                name: 'test',
                transport: 'stdio',
                command: 'test-cmd',
              },
            ],
          },
        },
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(MCPProvider);
      expect(provider.getProviderName()).toBe('mcp');
    });

    it('should throw error if mcp: prefix used without MCP config', () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {}, // No MCP config
      };

      expect(() => createProvider(config)).toThrow('MCP configuration is required');
    });

    it('should throw error if mcp: prefix has invalid format', () => {
      const config: ProviderConfig = {
        id: 'mcp:', // No base provider
        config: {
          mcp: {
            enabled: true,
            servers: [],
          },
        },
      };

      expect(() => createProvider(config)).toThrow('Invalid MCP provider ID');
    });
  });

  describe('call', () => {
    it('should connect, call base provider, and disconnect', async () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {
          mcp: {
            enabled: true,
            servers: [
              {
                name: 'test',
                transport: 'stdio',
                command: 'test-cmd',
              },
            ],
          },
        },
      };

      const baseProvider = new OpenAIProvider({
        id: 'openai:gpt-4o-mini',
      });

      const mcpProvider = new MCPProvider(config, baseProvider);
      const response = await mcpProvider.call('Test prompt');

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.provider).toBe('openai');
    });
  });

  describe('capabilities', () => {
    it('should delegate capabilities to base provider', () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {
          mcp: {
            enabled: true,
            servers: [
              {
                name: 'test',
                transport: 'stdio',
                command: 'test-cmd',
              },
            ],
          },
        },
      };

      const baseProvider = new OpenAIProvider({
        id: 'openai:gpt-4o-mini',
      });

      const mcpProvider = new MCPProvider(config, baseProvider);
      const capabilities = mcpProvider.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.functionCalling).toBe(true); // MCP enables function calling
    });

    it('should delegate pricing to base provider', () => {
      const config: ProviderConfig = {
        id: 'mcp:openai:gpt-4o-mini',
        config: {
          mcp: {
            enabled: true,
            servers: [
              {
                name: 'test',
                transport: 'stdio',
                command: 'test-cmd',
              },
            ],
          },
        },
      };

      const baseProvider = new OpenAIProvider({
        id: 'openai:gpt-4o-mini',
      });

      const mcpProvider = new MCPProvider(config, baseProvider);
      const pricing = mcpProvider.getModelPricing();

      expect(pricing).toBeDefined();
      expect(pricing.input).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(0);
    });
  });
});
