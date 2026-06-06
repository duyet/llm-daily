/**
 * Unit tests for MCP Wrapper
 * Tests the provider-independent MCP wrapper functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPWrapper } from './wrapper.js';
import { OpenAIProvider } from '../providers/openai.js';
import { createProviderWithMCP, clearProviderCache } from '../providers/registry.js';
import type { ProviderConfig, MCPConfig } from '../../types/provider.types.js';

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

describe('MCPWrapper', () => {
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
    it('should create MCP wrapper around base provider', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
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

      const mcpConfig: MCPConfig = {
        enabled: true,
        servers: [
          {
            name: 'test',
            transport: 'stdio',
            command: 'test-cmd',
          },
        ],
      };

      const wrapper = new MCPWrapper(config, baseProvider, mcpConfig);

      expect(wrapper).toBeDefined();
      // Wrapper should report the base provider's name, not "mcp"
      expect(wrapper.getProviderName()).toBe('openai');
    });

    it('should throw error if MCP is not enabled', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
      };

      const baseProvider = new OpenAIProvider({
        id: 'openai:gpt-4o-mini',
      });

      const mcpConfig: MCPConfig = {
        enabled: false, // Not enabled
        servers: [],
      };

      expect(() => new MCPWrapper(config, baseProvider, mcpConfig)).toThrow(
        'MCP must be enabled to use MCPWrapper'
      );
    });
  });

  describe('integration with registry', () => {
    it('should create MCP-wrapped provider via createProviderWithMCP', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
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

      const provider = createProviderWithMCP(config);

      expect(provider).toBeInstanceOf(MCPWrapper);
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should create normal provider if MCP not enabled', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
        config: {
          // No MCP config
        },
      };

      const provider = createProviderWithMCP(config);

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider).not.toBeInstanceOf(MCPWrapper);
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should create normal provider if MCP disabled', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
        config: {
          mcp: {
            enabled: false,
            servers: [],
          },
        },
      };

      const provider = createProviderWithMCP(config);

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider).not.toBeInstanceOf(MCPWrapper);
    });
  });

  describe('call', () => {
    it('should connect, call base provider, and disconnect', async () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
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

      const mcpConfig: MCPConfig = {
        enabled: true,
        servers: [
          {
            name: 'test',
            transport: 'stdio',
            command: 'test-cmd',
          },
        ],
      };

      const wrapper = new MCPWrapper(config, baseProvider, mcpConfig);
      const response = await wrapper.call('Test prompt');

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.provider).toBe('openai'); // Should delegate to base provider
    });
  });

  describe('capabilities', () => {
    it('should delegate capabilities to base provider with MCP enhancements', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
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

      const mcpConfig: MCPConfig = {
        enabled: true,
        servers: [
          {
            name: 'test',
            transport: 'stdio',
            command: 'test-cmd',
          },
        ],
      };

      const wrapper = new MCPWrapper(config, baseProvider, mcpConfig);
      const capabilities = wrapper.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.functionCalling).toBe(true); // MCP enables function calling
    });

    it('should delegate pricing to base provider', () => {
      const config: ProviderConfig = {
        id: 'openai:gpt-4o-mini',
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

      const mcpConfig: MCPConfig = {
        enabled: true,
        servers: [
          {
            name: 'test',
            transport: 'stdio',
            command: 'test-cmd',
          },
        ],
      };

      const wrapper = new MCPWrapper(config, baseProvider, mcpConfig);
      const pricing = wrapper.getModelPricing();

      expect(pricing).toBeDefined();
      expect(pricing.input).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(0);
    });
  });
});
