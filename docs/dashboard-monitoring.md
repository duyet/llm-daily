# Dashboard Monitoring Guide

## Overview

The LLM Daily dashboard provides comprehensive monitoring of all scheduled tasks with real-time status, execution history, and performance metrics.

## Features

### 1. Multi-Task Display

The dashboard displays all configured tasks on a single page with:

- **Task name and description**
- **Schedule information** (cron expression with human-readable format)
- **Current status** (✅ Success, ❌ Failed, 🔄 Running, ⏳ Pending)
- **Last run time** (e.g., "2 hours ago")
- **Next run countdown** (e.g., "in 22 hours")

### 2. Performance Metrics

Each task card shows:

- **Total runs**: Number of executions
- **Success rate**: Percentage of successful runs
- **Total tokens**: Token usage (input + output)
- **Total cost**: Estimated cost in USD
- **Average time**: Average response time

### 3. Job Run History

Expandable section showing last 10 runs with:

- **Timestamp**: When the job ran
- **Status**: Success (✅) or Failed (❌)
- **Duration**: How long it took
- **Tokens used**: Input/output/total tokens
- **Cost**: Estimated cost per run

### 4. Overview Cards

Top section displays:

- **Total Tasks**: Number of configured tasks
- **Active Today**: Tasks that ran in last 24 hours
- **Failed**: Tasks with failed status
- **Success Rate**: Overall success percentage

### 5. Analytics Charts

- **Cost & Tokens Chart**: 7-day trend of costs and token usage
- **Success Rate Chart**: Daily success vs. failure counts

## Data Architecture

### Analytics Data Structure

Located at `/Users/duet/project/llm-daily/dashboard/data/analytics.json`:

```json
{
  "totalRuns": 45,
  "totalTokens": 54000,
  "totalCost": 0,
  "successRate": 0.977,
  "lastUpdated": "2025-10-27T10:00:00Z",
  "tasks": {
    "ai-news-vietnam": {
      "runs": 45,
      "tokens": 54000,
      "cost": 0,
      "successRate": 0.977,
      "lastRun": "2025-10-27T08:00:00Z",
      "avgResponseTime": 23.5,
      "schedule": "0 8 * * *",
      "description": "AI News Summary - Vietnamese",
      "status": "success",
      "nextRun": "2025-10-28T08:00:00Z",
      "recentRuns": [
        {
          "timestamp": "2025-10-27T08:00:00Z",
          "status": "success",
          "duration": 25.3,
          "tokens": {
            "input": 800,
            "output": 400,
            "total": 1200
          },
          "cost": 0,
          "provider": "openrouter",
          "model": "minimax/minimax-m2:free"
        }
      ]
    }
  },
  "daily": [
    {
      "date": "2025-10-27",
      "runs": 1,
      "tokens": 1200,
      "cost": 0,
      "successes": 1,
      "failures": 0
    }
  ]
}
```

### Historical Data

Monthly execution history stored in `/Users/duet/project/llm-daily/dashboard/data/history/YYYY-MM.json`:

```json
{
  "month": "2025-10",
  "executions": [
    {
      "taskName": "ai-news-vietnam",
      "timestamp": "2025-10-27T08:00:00Z",
      "success": true,
      "tokens": {
        "input": 800,
        "output": 400,
        "total": 1200
      },
      "cost": 0,
      "responseTime": 25.3,
      "provider": "openrouter",
      "model": "minimax/minimax-m2:free"
    }
  ],
  "summary": {
    "totalRuns": 45,
    "totalTokens": 54000,
    "totalCost": 0,
    "successRate": 0.977,
    "tasks": { }
  }
}
```

## Implementation Components

### 1. Dashboard Data Builder (`src/scripts/build-dashboard-data.ts`)

Aggregates data from:
- Task configurations (`tasks/*/config.yaml`)
- Analytics data (`dashboard/data/analytics.json`)
- Historical executions (`dashboard/data/history/*.json`)

Features:
- Scans all task directories
- Loads task configurations (schedule, description)
- Aggregates last 10 runs per task
- Calculates next run times from cron expressions
- Determines task status from recent runs

Run manually:
```bash
npm run dashboard:build
```

### 2. Enhanced Analytics Types (`src/types/analytics.types.ts`)

Extended `TaskMetrics` interface with:
- `schedule`: Cron expression
- `description`: Task description
- `status`: Current task status
- `nextRun`: Next scheduled run timestamp
- `recentRuns`: Array of last 10 executions

### 3. Analytics Manager (`src/core/analytics.ts`)

Automatically rebuilds dashboard data after each task execution:
- Records execution to analytics.json
- Saves to historical data
- Triggers dashboard data rebuild

### 4. Enhanced Dashboard UI (`dashboard/assets/js/dashboard-enhanced.js`)

Features:
- Human-readable time formatting ("2 hours ago", "in 22 hours")
- Cron expression to human text conversion
- Expandable job run history
- Status badges with color coding
- Dark mode support

### 5. Workflow Integration

GitHub Actions workflows automatically:
1. Run scheduled tasks
2. Record analytics
3. Build dashboard data
4. Commit results to repository

## Usage

### Viewing the Dashboard

1. **Local Development:**
   ```bash
   # Serve the dashboard locally
   npx http-server dashboard -p 8080
   # Open http://localhost:8080
   ```

2. **GitHub Pages:**
   - Dashboard is automatically published to GitHub Pages
   - URL: `https://yourusername.github.io/llm-daily/`

### Understanding Task Status

- **✅ Success**: Last run completed successfully
- **❌ Failed**: Last run encountered an error
- **🔄 Running**: Task is currently executing
- **⏳ Pending**: Task hasn't run yet

### Viewing Run History

1. Click "View Recent Runs" button on any task card
2. Expands to show last 10 executions with details
3. Click again to collapse

### Schedule Information

Each task displays:
- **Schedule**: Human-readable cron description
- **Last run**: Time since last execution
- **Next run**: Countdown to next execution

## Maintenance

### Rebuilding Dashboard Data

If analytics.json gets out of sync:

```bash
npm run dashboard:build
```

This will:
- Scan all task configurations
- Load historical execution data
- Recalculate all metrics
- Update analytics.json

### Adding New Tasks

When you add a new task:

1. Task configuration is automatically detected
2. First execution records to analytics
3. Dashboard updates automatically
4. No manual intervention needed

### Troubleshooting

#### Dashboard shows no data

1. Check if `dashboard/data/analytics.json` exists
2. Run `npm run dashboard:build` to regenerate
3. Verify task configurations in `tasks/*/config.yaml`

#### Next run times are incorrect

1. Verify cron expressions in task configs
2. Rebuild dashboard data: `npm run dashboard:build`
3. Check timezone settings (defaults to UTC)

#### Historical data missing

1. Check `dashboard/data/history/` directory
2. Verify workflow has `contents: write` permission
3. Ensure workflows are committing results

## Technical Details

### Cron Expression Parsing

Uses `cron-parser` library to:
- Parse cron expressions
- Calculate next run times
- Handle timezones (defaults to UTC)

### Data Aggregation

Dashboard builder:
1. Scans all tasks in `tasks/` directory
2. Loads each `config.yaml` file
3. Reads historical execution data
4. Sorts runs by timestamp (newest first)
5. Keeps last 10 runs per task
6. Writes enhanced analytics.json

### Performance

- **Load time**: <1 second (single JSON fetch)
- **No API calls**: Pure static site
- **No rate limits**: All data is local
- **Offline capable**: Works without internet

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- No external dependencies (except Tailwind CSS and Chart.js from CDN)

## Future Enhancements

Possible improvements:

1. **GitHub API Integration** (optional):
   - Fetch workflow run status
   - Link to GitHub Actions logs
   - Real-time status updates

2. **Search and Filters**:
   - Filter tasks by status
   - Search tasks by name
   - Sort by various metrics

3. **Notifications**:
   - Email/webhook on task failures
   - Slack/Discord integration
   - Summary reports

4. **Advanced Analytics**:
   - Cost trends over time
   - Token usage patterns
   - Performance benchmarks
   - Provider comparison

## Related Documentation

- [Task Configuration Guide](../tasks/README.md)
- [Analytics System](./analytics.md)
- [GitHub Actions Integration](./github-actions.md)
