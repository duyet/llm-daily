# GitHub Pages Setup Guide

Complete guide to setting up and troubleshooting GitHub Pages for LLM Daily dashboard.

## Quick Setup (5 Steps)

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Pages** (left sidebar under "Code and automation")
4. Under **Source**, select: **GitHub Actions**
5. Click **Save**

That's it! Your dashboard will be available at: `https://yourusername.github.io/llm-daily/`

### 2. Verify Deployment

After your first task runs or you manually trigger a deployment:

1. Go to **Actions** tab
2. Look for **Deploy GitHub Pages** workflow
3. Wait for green checkmark (usually 1-2 minutes)
4. Visit your dashboard URL

### 3. Test the Dashboard

Run the example task to generate data:

1. Go to **Actions** tab
2. Click **Task: ai-news-vietnam**
3. Click **Run workflow** → **Run workflow**
4. Wait ~30 seconds
5. Check dashboard (may take 2-3 minutes to update)

## Dashboard Features

Your GitHub Pages dashboard displays:

- **Task execution history** - All task runs with timestamps
- **Cost tracking** - Per-provider cost breakdown
- **Token usage** - Input/output token statistics
- **Success rates** - Task success/failure metrics
- **Latest outputs** - Most recent task results

## How It Works

### Automatic Updates

1. **Task runs** → Generates analytics data
2. **Workflow commits** → Updates `dashboard/data/analytics.json`
3. **Pages workflow** → Deploys updated dashboard
4. **Dashboard refreshes** → Shows new data

### File Structure

```
dashboard/
├── index.html           # Main dashboard page (Tailwind CSS)
├── guide/              # Documentation pages
│   ├── index.html
│   └── .gitkeep
├── data/               # Analytics data (auto-updated)
│   ├── analytics.json  # Current analytics
│   └── history/        # Monthly historical data
│       └── YYYY-MM.json
└── assets/             # JS for dashboard
    └── js/
        ├── dashboard.js
        └── theme.js
```

## Deployment Workflows

### Task Workflows

Each task workflow:
1. Runs on schedule or manual trigger
2. Executes LLM task
3. Updates memory and results
4. **Commits to `dashboard/data/`**
5. Triggers Pages deployment

### Pages Workflow

The `deploy-pages.yml` workflow:
1. Triggers on changes to `dashboard/**`
2. Uploads `dashboard/` folder as artifact
3. Deploys to GitHub Pages
4. Usually completes in 1-2 minutes

## Customization

### Custom Domain

To use a custom domain (e.g., `llm.yourdomain.com`):

1. Go to **Settings** → **Pages**
2. Under **Custom domain**, enter: `llm.yourdomain.com`
3. Click **Save**
4. Add DNS records at your domain provider:
   ```
   Type: CNAME
   Name: llm
   Value: yourusername.github.io
   ```
5. Wait for DNS propagation (5-30 minutes)
6. Enable **Enforce HTTPS** (recommended)

### Dashboard Styling

The dashboard uses **Tailwind CSS** for styling. To customize:

1. Edit the Tailwind config in `dashboard/index.html`:
   ```javascript
   tailwind.config = {
     theme: {
       extend: {
         colors: {
           // Your custom colors
           cream: '#FAF9F6',
           purple: '#6B4FBB',
         }
       }
     }
   }
   ```
2. Modify utility classes directly in HTML elements
3. Add custom animations in the `<style type="text/tailwindcss">` block
4. Commit and push changes
5. Dashboard updates automatically

**Benefits**:
- No CSS build step required
- Instant class changes via CDN
- Industry-standard utility classes
- Responsive design built-in
- Dark mode support included

### Add Custom Pages

Add new pages to the dashboard:

1. Create HTML files in `dashboard/guide/`
2. Link from `dashboard/index.html`
3. Use existing CSS/JS from `dashboard/assets/`
4. Commit and deploy

## Troubleshooting

### Dashboard Shows 404

**Cause**: GitHub Pages not enabled or incorrect source

**Solution**:
1. Go to **Settings** → **Pages**
2. Ensure **Source** is set to **GitHub Actions** (not branch)
3. Run a task to trigger deployment
4. Wait 2-3 minutes for Pages to deploy

### Dashboard Not Updating

**Cause**: Workflow not committing data or Pages deployment failing

**Solution**:
1. Check **Actions** tab for workflow failures
2. Verify task workflow has `contents: write` permission
3. Ensure `dashboard/data/` path exists
4. Check Pages deployment logs for errors

### No Analytics Data

**Cause**: Tasks haven't run yet or data not committed

**Solution**:
1. Run a task manually: **Actions** → workflow → **Run workflow**
2. Wait for task to complete
3. Check commit history for `dashboard/data/analytics.json`
4. Refresh dashboard (may take 2-3 minutes)

### Custom Domain Not Working

**Cause**: DNS not configured or not propagated

**Solution**:
1. Verify DNS records at your domain provider
2. Wait 5-30 minutes for DNS propagation
3. Check DNS with: `dig llm.yourdomain.com`
4. Ensure CNAME points to `yourusername.github.io`

### Deployment Takes Too Long

**Cause**: Large files or GitHub Actions queue

**Solution**:
1. Check **Actions** tab for queue status
2. Typical deployment: 1-2 minutes
3. If >5 minutes, check workflow logs
4. Consider reducing file sizes in `dashboard/`

## Security Considerations

### Public Dashboard

Your dashboard is **publicly accessible** by default:
- Anyone can view your dashboard URL
- Analytics data is public
- Task outputs (if committed) are public

**To keep dashboard private**:
1. Make repository private (Settings → General → Danger Zone)
2. Only collaborators can access dashboard
3. Note: Free GitHub has limits on private repos

### Sensitive Data

**Never commit sensitive data to dashboard/**:
- API keys or credentials
- Personal information
- Proprietary data or code
- Authentication tokens

All task results committed to `dashboard/data/` are **public** if repository is public.

### API Keys

API keys are stored as **GitHub Secrets** (not in dashboard):
- Secrets are encrypted and not exposed
- Only workflows can access secrets
- Dashboard never displays API keys
- Cost data is aggregated (no key details)

## Advanced Configuration

### Disable Pages

If you don't want the dashboard:

1. Go to **Settings** → **Pages**
2. Under **Source**, select: **None**
3. Click **Save**
4. Remove `dashboard/` commits from workflows:
   ```yaml
   # In workflow files, remove:
   git add dashboard/data/
   ```

### Analytics Data Retention

By default, analytics keeps:
- **90 days** of daily metrics
- **All-time** monthly historical data

To change retention, edit `src/core/analytics.ts`:
```typescript
// Keep only last 30 days
this.analytics!.daily.slice(0, 30);
```

### Custom Analytics

Add custom metrics to `dashboard/data/analytics.json`:

1. Edit `src/core/analytics.ts`
2. Add new metrics to `Analytics` type
3. Update dashboard JavaScript to display new metrics
4. Rebuild: `npm run build`
5. Commit and deploy

## Monitoring

### Check Dashboard Health

1. **Analytics page**: Should show data from recent tasks
2. **Browser console**: Check for JavaScript errors
3. **Network tab**: Verify `analytics.json` loads
4. **GitHub Actions**: Ensure deployments succeed

### Automated Monitoring

Set up monitoring for dashboard availability:

1. Use a service like UptimeRobot or Pingdom
2. Monitor your dashboard URL
3. Get alerts if dashboard goes down
4. Typical uptime: 99.9%+ (GitHub Pages SLA)

## Performance Optimization

### Reduce Load Times

1. **Minimize assets**: Minify CSS/JS
2. **Compress images**: Use WebP or optimized PNG
3. **Enable caching**: Add cache headers via GitHub Pages
4. **Lazy load data**: Load analytics.json on demand

### Analytics Data Size

Keep `analytics.json` under 1 MB for best performance:
- Archive old data to `history/` folder
- Aggregate data monthly
- Remove detailed execution logs after 90 days

## Migration

### From Legacy `docs/` Folder

If you have an older version using `docs/` folder:

1. All new setups use `dashboard/` folder
2. GitHub Pages setup remains the same
3. Update any hardcoded `docs/` references to `dashboard/`
4. Analytics data path is now `dashboard/data/`

### Backup Dashboard Data

To backup your analytics:

1. Download `dashboard/data/analytics.json`
2. Save monthly archives from `dashboard/data/history/`
3. Export data via git: `git clone --depth 1 <repo>`
4. Store backups securely off-GitHub

## Support

- **Documentation**: [README.md](README.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/llm-daily/issues)
- **Security**: [SECURITY.md](SECURITY.md)

---

**Need help?** Open an issue or check our troubleshooting guide!
