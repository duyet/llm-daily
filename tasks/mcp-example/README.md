# MCP Example Task

This example demonstrates how to use **MCP (Model Context Protocol)** support in llm-daily.

## What is MCP?

MCP (Model Context Protocol) is Anthropic's protocol for connecting AI assistants to external tools and data sources. With MCP, your tasks can:

- Access filesystem operations (read files, list directories)
- Query databases
- Make web requests
- Call custom tools

## How This Example Works

This task uses MCP to analyze the llm-daily codebase:

1. **Provider Configuration**: Uses `mcp:openai:gpt-4o-mini` provider ID
2. **MCP Server**: Connects to the `@modelcontextprotocol/server-filesystem` server
3. **Tools**: Has access to `read_file`, `list_directory`, and `search_files` tools
4. **Task**: Analyzes the project structure using these tools

## Running the Example

### Prerequisites

1. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your-api-key"
   ```

2. Build the project:
   ```bash
   npm run build
   ```

### Run the Task

```bash
npm run task:run mcp-example
```

The task will:
1. Connect to the filesystem MCP server
2. Use tools to explore the codebase
3. Generate an analysis in `output/analysis.md`

## Configuration Explained

### Provider ID Format

```yaml
provider:
  id: "mcp:openai:gpt-4o-mini"
```

- `mcp:` prefix enables MCP support
- `openai` is the base provider
- `gpt-4o-mini` is the model

### MCP Configuration

```yaml
mcp:
  enabled: true
  servers:
    - name: "filesystem"
      transport: "stdio"
      command: "npx"
      args:
        - "-y"
        - "@modelcontextprotocol/server-filesystem"
        - "."
```

- **servers**: List of MCP servers to connect to
- **transport**: Communication method (`stdio`, `http`, `websocket`)
- **command**: Command to launch the MCP server
- **args**: Arguments for the command

### Tool Security

```yaml
allowedTools:
  - "read_file"
  - "list_directory"
  - "search_files"
```

Only explicitly allowed tools can be used (whitelist approach).

### Tool Limits

```yaml
toolTimeout: 30000      # 30 seconds max per tool
maxToolCalls: 10        # Maximum 10 tool calls per run
```

Prevents runaway tool usage.

## Customizing for Your Use Case

### Different MCP Server

To use a different MCP server (e.g., database):

```yaml
servers:
  - name: "postgres"
    transport: "stdio"
    command: "mcp-server-postgres"
    args:
      - "postgresql://localhost/mydb"
```

### Different Base Provider

Use Anthropic Claude instead of OpenAI:

```yaml
provider:
  id: "mcp:openrouter:anthropic/claude-3-5-sonnet"
```

### HTTP MCP Server

Connect to an HTTP-based MCP server:

```yaml
servers:
  - name: "custom-api"
    transport: "http"
    url: "http://localhost:3000/mcp"
    headers:
      Authorization: "Bearer ${MCP_TOKEN}"
```

## Available MCP Servers

Some official MCP servers:

- **@modelcontextprotocol/server-filesystem** - File operations
- **@modelcontextprotocol/server-postgres** - PostgreSQL access
- **@modelcontextprotocol/server-github** - GitHub API
- **@modelcontextprotocol/server-slack** - Slack integration

See: https://github.com/modelcontextprotocol/servers

## Troubleshooting

### MCP Server Not Found

If you see "command not found", install the MCP server:

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

Or use `npx` to run it automatically (as in this example).

### Tool Not Available

Check that:
1. The tool is provided by your MCP server
2. The tool is in the `allowedTools` list
3. The MCP server connected successfully (check logs)

### Connection Timeout

Increase the timeout if tools are slow:

```yaml
toolTimeout: 60000  # 60 seconds
```

## Next Steps

1. Run this example task
2. Modify the prompt to analyze different aspects
3. Try different MCP servers
4. Build your own MCP-enabled tasks

## Learn More

- [MCP Documentation](https://spec.modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [llm-daily MCP Implementation Plan](../../MCP_IMPLEMENTATION_PLAN.md)
