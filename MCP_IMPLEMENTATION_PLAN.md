# MCP (Model Context Protocol) Implementation Plan

## Executive Summary

This document outlines the detailed plan for integrating **Model Context Protocol (MCP)** support into llm-daily. MCP is Anthropic's protocol for connecting AI assistants to external tools, data sources, and context providers. This integration will enable llm-daily tasks to access dynamic tools and resources during execution.

**Estimated Effort**: 2-3 days
**Complexity**: Medium-High
**Breaking Changes**: None (backward compatible)

---

## 1. Background: What is MCP?

### Model Context Protocol Overview

MCP is a standardized protocol that enables AI models to:
- **Access external tools** (file operations, API calls, database queries, etc.)
- **Fetch dynamic context** (real-time data, documentation, codebases)
- **Execute multi-step workflows** with tool calls
- **Maintain stateful connections** to resource servers

### MCP Architecture Components

```
┌─────────────┐
│   LLM Task  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  MCP Client     │ ← llm-daily integration point
└────────┬────────┘
         │
         ▼
    ┌────────────────────┐
    │  MCP Servers       │
    ├────────────────────┤
    │ • filesystem       │
    │ • database         │
    │ • web-search       │
    │ • git              │
    │ • custom tools     │
    └────────────────────┘
```

### Key MCP Concepts

1. **MCP Server**: A service that exposes tools/resources via MCP protocol
2. **MCP Client**: Connects to servers and mediates tool calls (llm-daily will be client)
3. **Tools**: Functions that the LLM can invoke (e.g., `read_file`, `search_web`)
4. **Resources**: Context/data sources that can be referenced (e.g., files, docs)
5. **Prompts**: Template prompts provided by servers

---

## 2. Architecture Design

### 2.1 Integration Strategy

We'll implement MCP as a **provider wrapper** that:
- Wraps existing providers (OpenAI, OpenRouter, Anthropic)
- Intercepts LLM calls to inject MCP tool availability
- Handles tool execution when LLM requests tools
- Manages MCP server connections lifecycle

### 2.2 Component Architecture

```typescript
┌─────────────────────────────────────────────────┐
│              TaskRunner                         │
│  - Orchestrates task execution                  │
│  - Loads config, memory, prompt                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          MCPProvider (new)                      │
│  - Extends BaseProvider                         │
│  - Wraps base provider (OpenAI/OpenRouter)      │
│  - Manages MCP client lifecycle                 │
│  - Handles tool calls                           │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴────────┐
         ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Base Provider│  │   MCPClient      │
│ (OpenAI/etc) │  │ - Connects to    │
│              │  │   MCP servers    │
│              │  │ - Lists tools    │
│              │  │ - Executes tools │
└──────────────┘  └──────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  MCP Servers    │
                  │  (external)     │
                  └─────────────────┘
```

### 2.3 Data Flow

```
1. Task starts → Load config with MCP settings
2. Create MCPProvider → Connect to configured MCP servers
3. Load tools → Fetch available tools from servers
4. Execute task:
   a. LLM receives prompt + tool descriptions
   b. LLM responds with tool calls
   c. MCPProvider executes tools via MCP client
   d. Tool results injected back to LLM
   e. LLM generates final response
5. Disconnect MCP servers → Return response
```

---

## 3. Configuration Schema

### 3.1 Task Configuration Extension

Add optional `mcp` section to provider config:

```yaml
# tasks/example-task/config.yaml

provider:
  id: "mcp:openai:gpt-4-turbo"  # New provider prefix
  options:
    temperature: 0.7
    max_tokens: 4000

    # New MCP configuration
    mcp:
      enabled: true
      servers:
        # File system access
        - name: "filesystem"
          command: "npx"
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
          env:
            WORKSPACE_ROOT: "/path/to/workspace"

        # Database access
        - name: "postgres"
          command: "mcp-server-postgres"
          args: ["postgresql://localhost/mydb"]

        # Custom tool server
        - name: "custom-tools"
          transport: "http"
          url: "http://localhost:3000/mcp"
          headers:
            Authorization: "Bearer ${MCP_TOKEN}"

      # Tool filtering
      allowedTools:
        - "read_file"
        - "write_file"
        - "list_directory"
        - "sql_query"

      # Optional: block specific tools
      blockedTools:
        - "delete_file"

      # Timeout for tool execution
      toolTimeout: 30000  # 30 seconds

      # Max tool calls per task
      maxToolCalls: 20

      # Whether to include tool results in memory
      includeToolsInMemory: true

memory:
  enabled: true
  strategy: "extract"

outputs:
  - format: "markdown"
    path: "output/result.md"
```

### 3.2 Schema Changes

**File: `src/types/config.types.ts`**

Add new interfaces:

```typescript
/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  /** Server name/identifier */
  name: string;

  /** Transport type */
  transport?: 'stdio' | 'http' | 'websocket';

  /** For stdio transport: command to execute */
  command?: string;

  /** Command arguments */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** For http/ws transport: server URL */
  url?: string;

  /** HTTP headers */
  headers?: Record<string, string>;
}

/**
 * MCP configuration for provider
 */
export interface MCPConfig {
  /** Enable MCP support */
  enabled: boolean;

  /** MCP servers to connect to */
  servers: MCPServerConfig[];

  /** Allowed tools (whitelist) */
  allowedTools?: string[];

  /** Blocked tools (blacklist) */
  blockedTools?: string[];

  /** Tool execution timeout in ms */
  toolTimeout?: number;

  /** Max tool calls per task */
  maxToolCalls?: number;

  /** Include tool results in memory */
  includeToolsInMemory?: boolean;
}

/**
 * Provider configuration with MCP support
 */
export interface ProviderConfig {
  id: string;
  config?: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    apiKey?: string;

    // New: MCP configuration
    mcp?: MCPConfig;

    [key: string]: unknown;
  };
}
```

---

## 4. Implementation Plan

### Phase 1: Foundation (Day 1)

#### 4.1 Install MCP SDK
```bash
npm install @modelcontextprotocol/sdk
npm install --save-dev @types/node
```

#### 4.2 Create MCP Client Wrapper

**File: `src/core/mcp/client.ts`**

```typescript
/**
 * MCP Client wrapper
 * Manages connections to MCP servers and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerConfig, MCPConfig } from '../../types/config.types.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  toolName: string;
  result: unknown;
  error?: string;
  executionTime: number;
}

export class MCPClient {
  private clients: Map<string, Client>;
  private tools: Map<string, MCPTool>;
  private config: MCPConfig;

  constructor(config: MCPConfig) {
    this.clients = new Map();
    this.tools = new Map();
    this.config = config;
  }

  /**
   * Connect to all configured MCP servers
   */
  async connect(): Promise<void> {
    // Implementation
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    // Implementation
  }

  /**
   * Get all available tools
   */
  getTools(): MCPTool[] {
    // Implementation
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    // Implementation
  }

  /**
   * Check if tool is allowed
   */
  isToolAllowed(toolName: string): boolean {
    // Implementation
  }
}
```

#### 4.3 Create MCP Provider

**File: `src/core/providers/mcp.ts`**

```typescript
/**
 * MCP-enabled provider
 * Wraps base provider with MCP tool support
 */

import { BaseProvider } from './base.js';
import { MCPClient } from '../mcp/client.js';
import { ProviderConfig, ProviderResponse } from '../../types/provider.types.js';

export class MCPProvider extends BaseProvider {
  protected readonly providerName = 'mcp';
  private baseProvider: BaseProvider;
  private mcpClient: MCPClient;
  private toolCallCount = 0;

  constructor(config: ProviderConfig, baseProvider: BaseProvider) {
    super(config);
    this.baseProvider = baseProvider;
    this.mcpClient = new MCPClient(config.config?.mcp);
  }

  async call(prompt: string): Promise<ProviderResponse> {
    // 1. Connect to MCP servers
    await this.mcpClient.connect();

    try {
      // 2. Get available tools
      const tools = this.mcpClient.getTools();

      // 3. Create prompt with tool descriptions
      const enhancedPrompt = this.createToolPrompt(prompt, tools);

      // 4. Multi-turn conversation loop
      let response = await this.baseProvider.call(enhancedPrompt);

      // 5. Handle tool calls if present
      while (this.hasToolCalls(response) && this.canCallMoreTools()) {
        const toolResults = await this.executeToolCalls(response);
        response = await this.continueWithToolResults(response, toolResults);
      }

      return response;
    } finally {
      // 6. Disconnect
      await this.mcpClient.disconnect();
    }
  }

  // Additional methods...
}
```

#### 4.4 Update Provider Registry

**File: `src/core/providers/registry.ts`**

Add MCP provider support:

```typescript
export function createProvider(config: ProviderConfig): BaseProvider {
  const providerId = config.id;

  // Check if MCP prefix
  if (providerId.startsWith('mcp:')) {
    // Extract base provider ID (e.g., "mcp:openai:gpt-4" -> "openai:gpt-4")
    const baseProviderId = providerId.substring(4);
    const baseConfig = { ...config, id: baseProviderId };
    const baseProvider = createProvider(baseConfig);

    // Wrap with MCP provider
    return new MCPProvider(config, baseProvider);
  }

  // Existing provider logic...
}
```

### Phase 2: Tool Execution (Day 2)

#### 4.5 Implement Tool Execution Logic

**Key features:**
- Parse tool calls from LLM responses
- Execute tools via MCP client
- Handle tool errors gracefully
- Track tool execution metadata
- Enforce tool timeouts and limits

#### 4.6 Add Tool Result Formatting

**File: `src/core/mcp/formatter.ts`**

Format tool results for LLM consumption:
- JSON formatting
- Error formatting
- Truncation for large results
- Context preservation

### Phase 3: Integration & Testing (Day 2-3)

#### 4.7 Update Task Runner

**File: `src/core/task-runner.ts`**

- Add MCP metadata to analytics
- Include tool calls in execution logs
- Update memory with tool usage (if configured)

#### 4.8 Add Configuration Validation

**File: `src/utils/config-validator.ts`**

- Validate MCP server configs
- Check tool allow/block lists
- Verify server connectivity

#### 4.9 Update Output System

**File: `src/core/outputs/`**

Add tool execution logs to outputs:

```typescript
interface TaskOutput {
  content: string;
  metadata: {
    // Existing fields...

    // New: MCP metadata
    mcpToolCalls?: Array<{
      tool: string;
      args: Record<string, unknown>;
      result: unknown;
      duration: number;
    }>;
  };
}
```

#### 4.10 Write Tests

**File: `src/core/mcp/client.test.ts`**
**File: `src/core/providers/mcp.test.ts`**

Test coverage:
- MCP client connection
- Tool discovery
- Tool execution
- Error handling
- Timeout enforcement
- Tool filtering

### Phase 4: Documentation & Examples (Day 3)

#### 4.11 Create Example Task

**File: `tasks/mcp-example/config.yaml`**
**File: `tasks/mcp-example/prompt.md`**

#### 4.12 Update Documentation

- Add MCP guide to dashboard
- Document MCP configuration options
- Provide MCP server examples
- Add troubleshooting guide

---

## 5. Tool Call Protocol

### 5.1 Tool Description Format

LLM receives tools in this format:

```json
{
  "tools": [
    {
      "name": "read_file",
      "description": "Read contents of a file",
      "input_schema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "File path to read"
          }
        },
        "required": ["path"]
      }
    }
  ]
}
```

### 5.2 Tool Call Detection

Support multiple LLM tool call formats:

**OpenAI format:**
```json
{
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "read_file",
        "arguments": "{\"path\": \"/data/file.txt\"}"
      }
    }
  ]
}
```

**Anthropic format:**
```json
{
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "read_file",
      "input": {
        "path": "/data/file.txt"
      }
    }
  ]
}
```

---

## 6. Error Handling

### 6.1 MCP Connection Errors

```typescript
class MCPConnectionError extends Error {
  constructor(serverName: string, cause: Error) {
    super(`Failed to connect to MCP server "${serverName}": ${cause.message}`);
  }
}
```

**Handling:**
- Log connection failures
- Continue with available servers
- Warn user about unavailable tools

### 6.2 Tool Execution Errors

```typescript
class MCPToolExecutionError extends Error {
  constructor(toolName: string, error: unknown) {
    super(`Tool "${toolName}" execution failed: ${error}`);
  }
}
```

**Handling:**
- Return error to LLM for recovery
- Log tool failures
- Don't crash entire task

### 6.3 Timeout Errors

```typescript
class MCPToolTimeoutError extends Error {
  constructor(toolName: string, timeout: number) {
    super(`Tool "${toolName}" timed out after ${timeout}ms`);
  }
}
```

**Handling:**
- Enforce configurable timeouts
- Kill long-running tool calls
- Report timeout to LLM

---

## 7. Security Considerations

### 7.1 Tool Allowlisting

**Requirement:** Tasks must explicitly allow tools

```yaml
mcp:
  allowedTools:
    - "read_file"
    - "list_directory"
  # Implicitly blocks all other tools
```

### 7.2 Environment Isolation

- MCP servers run in separate processes
- No direct file system access unless configured
- Environment variables isolated per server

### 7.3 Resource Limits

```yaml
mcp:
  toolTimeout: 30000      # 30 second max per tool
  maxToolCalls: 20        # Max 20 tools per task
  maxToolResultSize: 1MB  # Max result size
```

---

## 8. Analytics & Monitoring

### 8.1 MCP Metrics

Add to `RunAnalytics`:

```typescript
interface RunAnalytics {
  // Existing fields...

  // New: MCP metrics
  mcp?: {
    serversConnected: string[];
    toolsAvailable: number;
    toolCallsExecuted: number;
    toolErrors: number;
    avgToolExecutionTime: number;
    toolsUsed: string[];
  };
}
```

### 8.2 Dashboard Integration

Update dashboard to show:
- MCP-enabled tasks
- Tool usage statistics
- Most used tools
- Tool execution times

---

## 9. Migration Path

### 9.1 Backward Compatibility

✅ **No breaking changes**

- Existing tasks continue to work
- MCP is opt-in via provider ID prefix
- Existing provider IDs unchanged

### 9.2 Gradual Adoption

Users can adopt MCP gradually:

1. **Phase 1:** Test with one task
   ```yaml
   provider:
     id: "mcp:openai:gpt-4-turbo"
     options:
       mcp:
         enabled: true
         servers:
           - name: "filesystem"
             command: "npx"
             args: ["-y", "@modelcontextprotocol/server-filesystem"]
   ```

2. **Phase 2:** Expand to more tasks

3. **Phase 3:** Build custom MCP servers for specific needs

---

## 10. Testing Strategy

### 10.1 Unit Tests

- MCP client connection
- Tool discovery
- Tool execution
- Provider wrapping
- Error handling

### 10.2 Integration Tests

- End-to-end task with MCP
- Multi-tool workflows
- Tool error recovery
- Timeout enforcement

### 10.3 Manual Testing

Create test tasks:
- File system operations
- Web search integration
- Database queries
- Custom tool servers

---

## 11. Example Use Cases

### Use Case 1: Code Analysis Task

```yaml
# tasks/code-review/config.yaml
provider:
  id: "mcp:openai:gpt-4-turbo"
  options:
    mcp:
      enabled: true
      servers:
        - name: "filesystem"
          command: "npx"
          args: ["-y", "@modelcontextprotocol/server-filesystem", "./src"]
      allowedTools:
        - "read_file"
        - "list_directory"
        - "search_files"

memory:
  enabled: true
  strategy: "append"

outputs:
  - format: "markdown"
    path: "output/review.md"
```

**Prompt:**
```markdown
# tasks/code-review/prompt.md

Analyze the codebase in the ./src directory:

1. List all TypeScript files
2. Read key files
3. Identify potential issues
4. Suggest improvements

Use the available tools to explore the codebase.

Previous findings:
{{memory}}
```

### Use Case 2: Research Task with Web Search

```yaml
# tasks/market-research/config.yaml
provider:
  id: "mcp:anthropic:claude-3-5-sonnet-20241022"
  options:
    mcp:
      enabled: true
      servers:
        - name: "web-search"
          transport: "http"
          url: "http://localhost:3000/mcp"
      allowedTools:
        - "search_web"
        - "fetch_url"
```

### Use Case 3: Data Analysis with Database

```yaml
# tasks/analytics/config.yaml
provider:
  id: "mcp:openai:gpt-4-turbo"
  options:
    mcp:
      enabled: true
      servers:
        - name: "postgres"
          command: "mcp-server-postgres"
          args: ["${DATABASE_URL}"]
          env:
            DATABASE_URL: "postgresql://localhost/analytics"
      allowedTools:
        - "execute_query"
        - "describe_table"
```

---

## 12. Open Questions

Before implementation, we should clarify:

1. **Provider Support:**
   - Which base providers should support MCP? (OpenAI, Anthropic, both?)
   - Do we need provider-specific tool call parsing?

2. **Tool Result Size:**
   - What's the max tool result size?
   - How to handle large results (truncate, paginate, error)?

3. **Multi-turn Limits:**
   - Max conversation turns with tools?
   - Max total tokens with tool calls?

4. **Memory Integration:**
   - Should tool calls be stored in memory?
   - How to deduplicate tool-based tasks?

5. **Server Management:**
   - Who manages MCP server lifecycle?
   - Should we support long-running server connections?

6. **Authentication:**
   - How to handle MCP server authentication?
   - Environment variable injection strategy?

---

## 13. Success Criteria

The implementation is successful when:

✅ Tasks can connect to MCP servers
✅ LLMs can discover and call tools
✅ Tool results flow back to LLM
✅ Multi-turn tool conversations work
✅ Errors are handled gracefully
✅ Configuration is backward compatible
✅ Tests pass with >80% coverage
✅ Documentation is complete
✅ Example tasks work end-to-end

---

## 14. Next Steps

1. **Review this plan** with the team
2. **Clarify open questions** (section 12)
3. **Create implementation branch**
4. **Begin Phase 1 implementation**
5. **Iterate based on testing**

---

## Appendix A: MCP Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example MCP Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Server: Filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [MCP Server: PostgreSQL](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)

## Appendix B: Alternative Approaches

### Alternative 1: MCP as Standalone Provider

Instead of wrapping, make MCP a standalone provider type.

**Pros:**
- Cleaner separation
- Easier to maintain

**Cons:**
- Requires re-implementing LLM calls
- Less flexible (can't mix providers)

**Decision:** Use wrapper approach for flexibility

### Alternative 2: MCP at Task Runner Level

Integrate MCP directly into TaskRunner, not providers.

**Pros:**
- Simpler provider code
- Centralized tool handling

**Cons:**
- Breaks provider abstraction
- Harder to test
- Less reusable

**Decision:** Keep MCP in provider layer

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Author:** Claude (AI Assistant)
