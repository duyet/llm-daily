# Tasks Directory

This is where you add your scheduled LLM tasks.

## Creating a New Task

### Option 1: CLI (Recommended)
```bash
npm run task:new <task-name>
```

This will create a new task folder with template files.

### Option 2: Manual Creation

1. Create folder: `tasks/your-task-name/`
2. Add required files:
   - `config.yaml` - Task configuration
   - `prompt.md` - Main prompt template
   - `memory.md` - Persistent memory (optional)
3. Run `npm run task:generate` to create GitHub Actions workflow

## Task Structure

```
tasks/
└── your-task-name/
    ├── config.yaml      # Task configuration
    ├── prompt.md        # Prompt template with variables
    ├── memory.md        # Persistent memory (auto-updated)
    └── output/          # Task outputs (auto-generated)
        └── YYYY-MM-DD.md
```

## Configuration Format

See `config.yaml` documentation for all available options:
- Provider settings (OpenAI, OpenRouter)
- Schedule configuration (cron syntax)
- Memory settings
- Output destinations

## Example Tasks

See `examples/` directory for sample tasks:
- `daily-news/` - Daily news summarization
- `stock-summary/` - Stock market summary

## Next Steps

1. Create your first task: `npm run task:new my-first-task`
2. Edit the generated `config.yaml` and `prompt.md`
3. Test locally: `npm run task:run my-first-task`
4. Generate workflow: `npm run task:generate`
5. Commit and push to activate automation

## Documentation

For detailed documentation, see:
- [Getting Started Guide](../docs/guide/getting-started.html)
- [Configuration Reference](../docs/guide/configuration.html)
- [CLI Documentation](../docs/guide/cli.html)
