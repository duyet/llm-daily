# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Daily is a GitHub template repository for automated LLM task scheduling using GitHub Actions. Users create task configurations in `tasks/`, and the CLI generates corresponding GitHub Actions workflows that run on schedule, managing persistent memory and tracking costs.

## Development Commands

### Build and Development
```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode for development
npm run validate       # Run all checks: lint + typecheck + test
```

### Testing
```bash
npm test               # Run all tests
npm run test:ui        # Open Vitest UI
npm run test:coverage  # Generate coverage report
```

### Code Quality
```bash
npm run lint           # Check code with ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without changes
```

### CLI Commands (after build)
```bash
npm run task:new <name>      # Create new task scaffold
npm run task:list            # List all configured tasks
npm run task:run <name>      # Run task locally
npm run task:validate <name> # Validate task configuration
npm run task:generate        # Generate GitHub Actions workflows
```

### Running Single Tests
```bash
npx vitest run path/to/test.test.ts          # Run specific test file
npx vitest run -t "test name pattern"         # Run tests matching pattern
npx vitest run src/core/providers/            # Run all tests in directory
```

## Architecture Overview

### Core Concepts

**Provider System** (`src/core/providers/`)
- Promptfoo-compatible abstraction layer for LLM providers
- Base interface: `Provider` with `generateText()` method
- Implementations: `OpenAIProvider`, `OpenRouterProvider`
- Provider registry handles instantiation from config
- Configuration uses promptfoo YAML format for compatibility

**Memory Management** (`src/core/memory.ts`)
- Persistent memory stored in `tasks/{task-name}/memory.md`
- YAML frontmatter + markdown content structure
- Three update strategies:
  - `append`: Add new content to existing memory
  - `replace`: Overwrite entire memory
  - `extract`: Use custom prompt to extract/transform memory
- Deduplication via similarity threshold (cosine similarity)
- Memory injected into prompts via template variables: `{{memory}}`

**Task Configuration** (`tasks/{task-name}/config.yaml`)
- Each task directory contains:
  - `config.yaml`: Provider settings, schedule, memory config, outputs
  - `prompt.md`: Prompt template with variable substitution
  - `memory.md`: Persistent memory (auto-managed)
  - `output/`: Generated outputs (auto-committed if configured)
- Configuration schema validated with Zod
- Template variables: `{{memory}}`, `{{date}}`, `{{previousOutput}}`

**Workflow Generation** (`src/workflow-generator.ts`)
- Scans `tasks/` directory for all `config.yaml` files
- Generates `.github/workflows/task-{name}.yml` for each task
- Workflow includes:
  - Scheduled trigger (cron from config)
  - Manual dispatch option
  - Task execution with environment secrets
  - Output handling (commit, webhook, file)
  - Analytics data update

**Output System** (`src/core/outputs/`)
- Three output types:
  - `commit`: Auto-commit results to repository
  - `webhook`: POST results to external URL
  - `file`: Save to filesystem without commit
- Multiple outputs can be configured per task
- Outputs receive: content, metadata, task config

### Directory Structure Philosophy

- **`tasks/`** - User-managed task configurations (committed to repo)
- **`src/`** - Framework code (don't modify unless fixing bugs or adding features)
- **`.github/workflows/`** - Auto-generated (regenerate via `npm run task:generate`)
- **`dashboard/`** - GitHub Pages site (dashboard auto-updates via workflows)
- **`dashboard/implementation/`** - Implementation tracking documentation

### Data Flow

```
Task Config (tasks/{name}/config.yaml)
  ↓
CLI Generate Command (npm run task:generate)
  ↓
GitHub Actions Workflow (.github/workflows/task-{name}.yml)
  ↓
Scheduled Execution
  ↓
Provider Call (OpenAI/OpenRouter)
  ↓
Memory Update (tasks/{name}/memory.md)
  ↓
Output Processing (commit/webhook/file)
  ↓
Analytics Update (dashboard/data/analytics.json)
  ↓
Dashboard Refresh (dashboard/index.html)
```

## MCP (Model Context Protocol) Support

**Status**: Core implementation complete ✅ (454 tests passing)

LLM Daily includes full support for MCP (Model Context Protocol), Anthropic's protocol for connecting AI assistants to external tools and data sources.

### MCP Architecture

MCP is implemented as a **provider-independent wrapper** that works with ANY LLM provider:

```
TaskRunner
  ↓ uses createProviderWithMCP()
MCPWrapper (wraps any provider)
  ↓
BaseProvider (OpenAI/Anthropic/OpenRouter/custom)
  ↓
MCP Client → MCP Servers (filesystem, database, web, etc.)
```

**Key files**:
- `src/core/mcp/wrapper.ts` - MCPWrapper class (wraps providers)
- `src/core/mcp/client.ts` - MCP client for server connections
- `src/core/mcp/strategies/` - Tool call format strategies
- `src/core/task-runner.ts` - Uses createProviderWithMCP()

### Configuration

Enable MCP for any task by adding `options.mcp` to provider config:

```yaml
provider:
  id: "openai:gpt-4o-mini"  # Standard provider ID (no mcp: prefix!)
  options:
    mcp:
      enabled: true
      servers:
        - name: "filesystem"
          transport: "stdio"
          command: "npx"
          args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
      allowedTools: ["read_file", "list_directory"]
      toolTimeout: 30000
      maxToolCalls: 10
```

**Important**: MCP works with ANY provider - just add `options.mcp` to enable.

### Core Features

1. **Provider-Independent**: Wraps OpenAI, Anthropic, OpenRouter, or custom providers
2. **Tool Calling**: Automatic tool discovery, execution, and result formatting
3. **Strategy Pattern**: Auto-selects tool call format (OpenAI/Anthropic/XML)
4. **Security**: Tool allowlist/blocklist filtering
5. **Multi-turn**: Handles tool calls in conversation loops
6. **Transport Support**: stdio (http/websocket planned)
7. **Testing**: 20 MCP-specific tests (client + wrapper)

### Example Task

See `tasks/mcp-example/` for a complete filesystem analysis example.

### Implementation Notes

- MCP is a **wrapper**, not a provider type
- No special provider IDs needed (no `mcp:` prefix)
- Configuration under `options.mcp.enabled`
- Task runner automatically wraps providers when MCP enabled
- Tool call format auto-detected per provider

### Future Enhancements

- MCP resources and prompts (currently tools only)
- HTTP/WebSocket transports
- Memory integration for tool results
- Analytics dashboard for tool usage
- Streaming tool calls

## Key Implementation Patterns

### Provider Implementation
When adding a new LLM provider:
1. Extend `Provider` interface in `src/core/providers/base.ts`
2. Implement required methods: `generateText()`, `calculateCost()`
3. Add provider to registry in `src/core/providers/registry.ts`
4. Follow promptfoo config conventions for compatibility
5. Include usage tracking for cost analytics

### Memory Deduplication Algorithm
- Extract semantic meaning from new content
- Compare with existing memory entries using embedding similarity
- Threshold-based filtering (default: 0.9 cosine similarity)
- Preserve unique content, discard near-duplicates
- Maintain chronological order of unique entries

### Workflow Template Variables
Available in generated workflows:
- `${{ secrets.OPENAI_API_KEY }}` - Provider API keys
- `${{ secrets.WEBHOOK_SECRET }}` - Webhook authentication
- Task name, schedule, and config embedded as workflow inputs

### Testing Strategy
- **Unit tests**: Individual functions and classes in `src/`
- **Integration tests**: Provider interactions, memory operations
- **E2E tests**: Full task execution flow (optional, Playwright)
- Test files colocated: `*.test.ts` next to implementation
- Mock external APIs (OpenAI, OpenRouter) in tests

## Important Constraints

### Provider Compatibility
- Configuration must remain promptfoo-compatible
- Use same provider IDs: `openai`, `openrouter`
- Support standard promptfoo config fields: `model`, `temperature`, `max_tokens`
- Enable migration from promptfoo to llm-daily

### Memory File Format
- Always preserve YAML frontmatter structure
- Markdown content follows frontmatter
- Don't break memory file format (breaks user tasks)
- Validate before writing to prevent corruption

### Workflow Generation
- Workflows are auto-generated, manual edits will be overwritten
- If workflow customization is needed, add to config.yaml first
- Workflow generator is run via git pre-commit hook
- Keep generated workflows in sync with task configs

### Task Directory Isolation
- Each task is fully self-contained in its directory
- Tasks can't access other tasks' memory or outputs
- Shared utilities go in `src/utils/`, not task directories
- Task configs should be portable across repositories

## Development Workflow Notes

### Adding a New Feature
1. Check implementation plan in `dashboard/implementation/` for phase alignment
2. Follow existing patterns in `src/core/` and `src/commands/`
3. Add tests alongside implementation
4. Update relevant documentation in `dashboard/guide/`
5. Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

### Debugging Task Execution
- Run locally first: `npm run task:run <name>`
- Check task logs in GitHub Actions for remote debugging
- Verify memory file structure if deduplication seems broken
- Test provider configuration with minimal prompt

### Modifying Provider System
- Maintain backward compatibility with existing configs
- Test with both OpenAI and OpenRouter
- Update cost calculation formulas when pricing changes
- Document new provider-specific config options

### Working with Memory System
- Memory updates are atomic operations
- Deduplication runs before memory write
- Failed memory writes don't corrupt existing memory
- Memory template injection happens at prompt render time

## Commit Message Conventions

Follow semantic commit format with consistent scoping:
- `feat(core): add new provider interface`
- `fix(cli): handle empty task directory`
- `docs(guide): update configuration reference`
- `refactor(memory): improve deduplication algorithm`
- `test(providers): add OpenRouter integration tests`

Avoid complex or fancy words like "comprehensive", "elaborate", "detailed", "extensive" in commit messages. Use simple, clear English.

## Co-author Convention

All commits should include co-author attribution:
```bash
git commit -m "feat: your commit message

Co-authored-by: duyetbot <duyetbot@users.noreply.github.com>"
```

Or configure git to automatically include:
```bash
git config commit.template .gitmessage
```

## Phase-Based Development

This project follows an 8-phase implementation plan (Phase 0-7). See `dashboard/implementation/PROGRESS.md` for current status and `dashboard/implementation/phase-*.md` for detailed task breakdowns.

When implementing features:
- Check which phase the feature belongs to
- Follow dependency chain: Phase 0 → 1 → 2 → 3 → 4
- Phases 5-6 can proceed in parallel after Phase 3
- Update progress trackers after completing tasks
