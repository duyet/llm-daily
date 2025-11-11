# MCP Architecture Redesign

## Problem with Current Design

**Current (WRONG):**
```yaml
provider:
  id: "mcp:openai:gpt-4o-mini"  # ❌ MCP coupled with provider type
```

**Issues:**
1. ❌ MCP is treated as a provider type (it's not)
2. ❌ Creates artificial provider types: `mcp:openai`, `mcp:anthropic`, etc.
3. ❌ MCP can't be easily enabled/disabled
4. ❌ Folder structure suggests MCP is a provider (`src/core/providers/mcp.ts`)
5. ❌ Requires special registry logic for `mcp:` prefix
6. ❌ Not intuitive for users

## Correct Design

**MCP is a capability/feature, not a provider type.**

**Correct Configuration:**
```yaml
provider:
  id: "openai:gpt-4o-mini"  # ✅ Normal provider ID
  options:
    temperature: 0.7
    mcp:                     # ✅ MCP is an option
      enabled: true
      servers:
        - name: "filesystem"
          command: "npx"
          args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
      allowedTools: ["read_file", "list_directory"]
      toolCallStrategy: "openai"  # Optional
```

**Works with ANY provider:**
```yaml
# OpenAI with MCP
provider:
  id: "openai:gpt-4-turbo"
  options:
    mcp: { enabled: true, servers: [...] }

# Anthropic with MCP
provider:
  id: "anthropic:claude-3-5-sonnet"
  options:
    mcp: { enabled: true, servers: [...] }

# OpenRouter with MCP
provider:
  id: "openrouter:anthropic/claude-3-5-sonnet"
  options:
    mcp: { enabled: true, servers: [...] }

# Custom provider with MCP
provider:
  id: "custom:my-model"
  options:
    mcp: { enabled: true, servers: [...] }
```

## Architecture Changes

### 1. Folder Structure

**Current (WRONG):**
```
src/core/
  providers/
    mcp.ts          # ❌ MCP is not a provider
    openai.ts
    anthropic.ts
```

**Correct:**
```
src/core/
  mcp/
    wrapper.ts      # ✅ MCP wraps any provider
    client.ts       # MCP client
    strategies/     # Tool call strategies
  providers/
    openai.ts       # Just providers
    anthropic.ts
    openrouter.ts
```

### 2. Class Naming

**Current:**
- `MCPProvider` (wrong - it's not a provider)

**Correct:**
- `MCPWrapper` (wraps any provider with MCP capabilities)

### 3. Provider Registry

**Current (WRONG):**
```typescript
// Registry handles mcp: prefix
if (config.id.startsWith('mcp:')) {
  return createMCPProvider(config);
}
```

**Correct:**
```typescript
// Registry doesn't know about MCP
// Just creates the requested provider
const provider = createProvider(config);  // e.g., OpenAIProvider

// Task runner wraps it if MCP enabled
if (config.options?.mcp?.enabled) {
  return new MCPWrapper(provider, config.options.mcp);
}
return provider;
```

### 4. Task Runner Integration

**Task runner becomes responsible for MCP wrapping:**

```typescript
// In task runner
const providerConfig = taskConfig.provider;
let provider = createProvider(providerConfig);

// Wrap with MCP if enabled
if (providerConfig.options?.mcp?.enabled) {
  provider = new MCPWrapper(provider, providerConfig.options.mcp);
}

// Use provider (with or without MCP)
const response = await provider.call(prompt);
```

## Benefits

1. ✅ **Provider Independence**: MCP works with ANY provider
2. ✅ **Clean Separation**: MCP is clearly a feature, not a provider type
3. ✅ **Simpler Registry**: No special prefix handling
4. ✅ **Better UX**: Users understand they're using OpenAI + MCP, not "MCP OpenAI"
5. ✅ **Flexible**: Easy to enable/disable MCP per task
6. ✅ **Extensible**: New providers automatically work with MCP
7. ✅ **Intuitive**: Configuration matches mental model

## Migration Path

**Old config (will break):**
```yaml
provider:
  id: "mcp:openai:gpt-4o-mini"
  options:
    mcp: { ... }
```

**New config:**
```yaml
provider:
  id: "openai:gpt-4o-mini"  # Remove mcp: prefix
  options:
    mcp:
      enabled: true  # Explicitly enable
      # ... rest of config
```

## Implementation Steps

1. ✅ Remove `mcp:` prefix handling from registry
2. ✅ Rename `MCPProvider` → `MCPWrapper`
3. ✅ Move `src/core/providers/mcp.ts` → `src/core/mcp/wrapper.ts`
4. ✅ Update task runner to wrap provider when MCP enabled
5. ✅ Update tests
6. ✅ Update documentation
7. ✅ Update example tasks

## Code Example

**New MCPWrapper:**
```typescript
export class MCPWrapper extends BaseProvider {
  constructor(
    private baseProvider: BaseProvider,
    private mcpConfig: MCPConfig
  ) {
    super(baseProvider.config);
  }

  async call(prompt: string): Promise<ProviderResponse> {
    // Use MCP client and strategies
    // Wrap base provider calls with tool support
  }

  // Delegate everything to base provider
  getProviderName() { return this.baseProvider.getProviderName(); }
  estimateCost(usage) { return this.baseProvider.estimateCost(usage); }
  // ...
}
```

**Task Runner:**
```typescript
// Create base provider
const provider = createProvider(config.provider);

// Wrap with MCP if enabled
if (config.provider.options?.mcp?.enabled) {
  return new MCPWrapper(provider, config.provider.options.mcp);
}

return provider;
```

---

**Summary:** MCP is a wrapper/middleware/plugin that enhances ANY provider with tool calling capabilities. It should never be part of the provider ID.
