# 🤖 LLM Daily

> Automated LLM task scheduling with GitHub Actions - Run AI tasks on a schedule, for free, forever.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Tests](https://img.shields.io/badge/tests-218%20passing-brightgreen)](https://github.com/yourusername/llm-daily)

**LLM Daily** is a template repository that lets you run scheduled LLM tasks completely free using GitHub Actions. Perfect for daily summaries, monitoring, research, or any recurring AI task.

## ✨ Features

- 🤖 **Multiple LLM Providers** - OpenAI and OpenRouter support with promptfoo-compatible configuration
- 📅 **Scheduled Execution** - Auto-generate GitHub Actions workflows from task configurations
- 🧠 **Persistent Memory** - Automatic memory management with deduplication
- 📊 **Analytics Dashboard** - Track costs, tokens, and performance via GitHub Pages
- 🔧 **CLI Tool** - Create, test, and manage tasks locally
- 📝 **Flexible Outputs** - Commit results, trigger webhooks, or save files
- 🎯 **Template Ready** - Use as GitHub template for instant setup

## 🚀 Quick Start

### 1. Use This Template

Click "Use this template" on GitHub or:

```bash
git clone https://github.com/yourusername/llm-daily.git
cd llm-daily
npm install
```

### 2. Create Your First Task

```bash
npm run task:new my-daily-task
```

This creates:
```
tasks/my-daily-task/
├── config.yaml      # Task configuration
├── prompt.md        # Prompt template
└── memory.md        # Persistent memory
```

### 3. Configure Your Task

Edit `tasks/my-daily-task/config.yaml`:

```yaml
name: my-daily-task
description: My first automated task
schedule: '0 9 * * *'  # Daily at 9 AM UTC

provider:
  id: openai
  config:
    model: gpt-4o-mini
    temperature: 0.7
    max_tokens: 1000

memory:
  enabled: true
  strategy: append
  deduplication:
    enabled: true
    similarity_threshold: 0.9

outputs:
  - type: commit
    path: tasks/my-daily-task/output/{date}.md
```

### 4. Test Locally

```bash
npm run task:run my-daily-task
```

### 5. Generate Workflow

```bash
npm run task:generate
```

This creates `.github/workflows/task-my-daily-task.yml` automatically.

### 6. Deploy

```bash
git add .
git commit -m "feat: add my-daily-task"
git push
```

Your task now runs on schedule! View results at:
- **Dashboard**: `https://yourusername.github.io/llm-daily/`
- **Task Outputs**: `tasks/my-daily-task/output/`

## 📚 Documentation

- **[Getting Started Guide](https://yourusername.github.io/llm-daily/guide/getting-started.html)** - Complete setup walkthrough
- **[Configuration Reference](https://yourusername.github.io/llm-daily/guide/configuration.html)** - All config options
- **[CLI Documentation](https://yourusername.github.io/llm-daily/guide/cli.html)** - Command reference
- **[Examples](https://yourusername.github.io/llm-daily/guide/examples.html)** - Sample tasks

## 🛠️ CLI Commands

```bash
npm run task:new <name>       # Create new task
npm run task:list             # List all tasks
npm run task:run <name>       # Run task locally
npm run task:validate <name>  # Validate configuration
npm run task:generate         # Generate workflows
```

## 📦 Project Structure

```
llm-daily/
├── tasks/                    # Your tasks (add here)
│   ├── daily-news/
│   └── stock-summary/
├── docs/                     # GitHub Pages (auto-updated)
│   ├── index.html           # Dashboard
│   ├── guide/               # Documentation
│   └── data/                # Analytics JSON
├── src/                      # Framework (don't modify)
│   ├── cli.ts
│   ├── commands/
│   └── core/
└── .github/workflows/        # Auto-generated workflows
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# OpenRouter
OPENROUTER_API_KEY=sk-or-...

# Optional: Webhooks
WEBHOOK_URL=https://...
WEBHOOK_SECRET=...
```

### Provider Configuration

#### OpenAI
```yaml
provider:
  id: openai
  config:
    model: gpt-4o-mini
    temperature: 0.7
    max_tokens: 1000
```

#### OpenRouter
```yaml
provider:
  id: openrouter
  config:
    model: anthropic/claude-3.5-sonnet
    temperature: 0.7
    max_tokens: 2000
```

### Memory Strategies

- **`append`** - Add new content to memory
- **`replace`** - Replace entire memory
- **`extract`** - Use custom extraction prompt

### Output Types

- **`commit`** - Auto-commit results to repository
- **`webhook`** - POST results to URL
- **`file`** - Save to file (no commit)

## 📊 Dashboard

View analytics at `https://yourusername.github.io/llm-daily/`:

- Task execution history
- Cost tracking per provider
- Token usage charts
- Success/failure rates
- Latest outputs

## 🧪 Development

### Build

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
```

### Test

```bash
npm test             # Run tests
npm run test:ui      # Test UI
npm run test:coverage # Coverage report
```

### Lint & Format

```bash
npm run lint         # Check code
npm run lint:fix     # Fix issues
npm run format       # Format code
```

### Validate

```bash
npm run validate     # Run all checks (lint + type + test)
```

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [promptfoo](https://github.com/promptfoo/promptfoo) configuration format
- Built with TypeScript, Commander.js, and Vitest
- Dashboard powered by Tailwind CSS and Chart.js

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/llm-daily/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/llm-daily/discussions)
- **Documentation**: [Full Docs](https://yourusername.github.io/llm-daily/)

---

**Ready to automate your LLM tasks?** Use this template and start scheduling! 🚀
