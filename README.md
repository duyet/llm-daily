# 🤖 LLM Daily

> Automated LLM task scheduling with GitHub Actions - Run AI tasks on a schedule, for free, forever.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Tests](https://img.shields.io/badge/tests-221%20passing-brightgreen)](https://github.com/yourusername/llm-daily)

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

### Prerequisites
- GitHub account
- Git installed locally
- Node.js 18+ installed

### 1. Use This Template

Click **"Use this template"** button on GitHub to create your own repository, then:

```bash
git clone https://github.com/yourusername/llm-daily.git
cd llm-daily
npm install
```

### 2. Configure GitHub Repository

**Enable GitHub Actions** (required for scheduled tasks):
1. Go to **Settings** → **Actions** → **General**
2. Under **Actions permissions**, select: **Allow all actions and reusable workflows**
3. Under **Workflow permissions**, select: **Read and write permissions**
4. Check: **Allow GitHub Actions to create and approve pull requests**

**Enable GitHub Pages** (required for dashboard):
1. Go to **Settings** → **Pages**
2. Under **Source**, select: **GitHub Actions**
3. Click **Save**

**That's it!** Free models work with no API keys needed. Skip to step 3.

**Optional - For Paid Models Only:**

If you want to use paid OpenAI/OpenRouter models, add API keys:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add one or both:
   - Name: `OPENAI_API_KEY`, Value: `sk-...` (from https://platform.openai.com/api-keys)
   - Name: `OPENROUTER_API_KEY`, Value: `sk-or-v1-...` (from https://openrouter.ai/keys)

### 3. Test the Workflow

Before creating your own tasks, test the included example:

1. Go to **Actions** tab in your repository
2. Click **Task: ai-news-vietnam** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait ~30 seconds and refresh the page
5. Check workflow status (should show green ✓)

**Verify Results:**
- New commit should appear in your repository
- Results file: `tasks/ai-news-vietnam/results/YYYY-MM-DD.md`
- Dashboard: `https://yourusername.github.io/llm-daily/` (may take 2-3 minutes to deploy)

### 4. Create Your First Task

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

### 5. Configure Your Task

Edit `tasks/my-daily-task/config.yaml`:

```yaml
name: my-daily-task
description: My first automated task
schedule: '0 9 * * *'  # Daily at 9 AM UTC

provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free  # FREE model, no API key needed
    temperature: 0.7
    max_tokens: 2000

memory:
  enabled: true
  strategy: append
  deduplication:
    enabled: true
    similarity_threshold: 0.9

outputs:
  - type: commit
    path: tasks/my-daily-task/results/{date}.md
```

Edit `tasks/my-daily-task/prompt.md` with your task instructions.

### 6. Test Locally

```bash
npm run task:run my-daily-task
```

Check the output in `tasks/my-daily-task/results/`.

### 7. Generate Workflow

```bash
npm run task:generate
```

This creates `.github/workflows/task-my-daily-task.yml` automatically.

### 8. Deploy

```bash
git add .
git commit -m "feat: add my-daily-task"
git push
```

**Your task now runs on schedule!**

View results at:
- **Dashboard**: `https://yourusername.github.io/llm-daily/`
- **Task Results**: `tasks/my-daily-task/results/`
- **Workflow Runs**: Repository → **Actions** tab

## 🔧 GitHub Token Permissions Explained

The workflow uses GitHub's automatic `GITHUB_TOKEN` which is:
- ✅ **Automatically provided** - No manual token creation needed
- ✅ **Repository-scoped** - Can only access your repository
- ✅ **Temporary** - Expires after each workflow run
- ✅ **Secure** - Cannot access other repositories or organization secrets

**Required Permissions:**
- `contents: write` - Allows workflow to commit task results and update memory files
- `pages: write` - Allows workflow to deploy dashboard to GitHub Pages
- `id-token: write` - Required for GitHub Pages deployment authentication

**Why These Permissions Are Safe:**
- Token is scoped only to your repository
- Token expires after workflow completes
- All commits are signed as `github-actions[bot]`
- No access to other repositories or secrets
- Follows GitHub's principle of least privilege

**Security Note:** If you fork this repository, ensure you trust the workflow code before enabling Actions. Always review workflow files in `.github/workflows/` before granting permissions.

## 🔍 Common Issues

**Workflow fails with "Permission denied":**
- Enable **Read and write permissions** in Settings → Actions → General

**Dashboard shows 404:**
- Set Pages source to **GitHub Actions** in Settings → Pages
- Wait 2-3 minutes after workflow completes

**API errors:**
- For free models: Check [OpenRouter status](https://status.openrouter.ai/)
- For paid models: Verify API key in GitHub Secrets

**No results committed:**
- Check workflow logs in Actions tab
- Verify output path in `config.yaml`
- Test locally first: `npm run task:run <task-name>`

**📖 See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.**

## 📚 Documentation

- **[Getting Started Guide](https://yourusername.github.io/llm-daily/guide/getting-started.html)** - Complete setup walkthrough
- **[Configuration Reference](https://yourusername.github.io/llm-daily/guide/configuration.html)** - All config options
- **[CLI Documentation](https://yourusername.github.io/llm-daily/guide/cli.html)** - Command reference
- **[Examples](https://yourusername.github.io/llm-daily/guide/examples.html)** - Sample tasks
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security Policy](SECURITY.md)** - Token permissions and best practices

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
├── dashboard/                # GitHub Pages (auto-updated)
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

Both configuration formats are supported:

**Compact format** (recommended):
```yaml
provider:
  id: openrouter:anthropic/claude-3.5-sonnet
```

**Explicit format** (for more control):
```yaml
provider:
  id: openrouter
  config:
    model: anthropic/claude-3.5-sonnet
    temperature: 0.7
    max_tokens: 2000
```

**Free Models Available:**
OpenRouter offers several free models that you can use without any cost or API key:

```yaml
provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free  # 10B params, 204K context, coding & reasoning
    temperature: 0.7
    max_tokens: 2000
```

**Benefits of Free Models:**
- ✅ **No API key required** - Works out of the box, no GitHub secrets needed
- ✅ **$0.00 cost** - Both input and output tokens are completely free
- ✅ **Generous limits** - Suitable for daily tasks and automation
- ✅ **Production ready** - Built into GitHub Actions workflows automatically

Other free options:
- `minimax/minimax-m2:free` - 10B params, 204K context, great for coding & reasoning
- `openrouter/andromeda-alpha` - Vision model for multi-image comprehension, charts, and text

**Example with free model:**
```yaml
name: ai-news-summary
schedule: '0 9 * * *'

provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free
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

- **Task execution history** - Complete run history with status
- **Cost tracking** - Per-provider cost breakdown
- **Token usage** - Input/output token statistics
- **Success/failure rates** - Real-time task metrics
- **Latest outputs** - Most recent task results
- **Claude.ai design** - Beautiful, responsive interface
- **Tailwind CSS** - Easy customization with utility classes
- **Dark mode** - Built-in theme support

### Customizing the Dashboard

The dashboard uses Tailwind CSS for styling. No build step required:

1. Edit `dashboard/index.html` Tailwind config
2. Modify colors in `theme.extend.colors`
3. Changes apply immediately via CDN
4. See [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) for details

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
