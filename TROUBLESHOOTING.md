# Troubleshooting Guide

Common issues and solutions for LLM Daily.

## Table of Contents

- [Setup Issues](#setup-issues)
- [Workflow Failures](#workflow-failures)
- [API and Provider Issues](#api-and-provider-issues)
- [Dashboard Issues](#dashboard-issues)
- [Local Development Issues](#local-development-issues)
- [Cost and Usage Issues](#cost-and-usage-issues)

---

## Setup Issues

### ❌ "Actions are disabled for this repository"

**Problem:** GitHub Actions not enabled in repository settings.

**Solution:**
1. Go to **Settings** → **Actions** → **General**
2. Select **Allow all actions and reusable workflows**
3. Save changes

---

### ❌ "Permission denied" when workflow tries to commit

**Problem:** Workflow doesn't have write permissions.

**Solution:**
1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Save changes

**Verify in workflow file:**
```yaml
permissions:
  contents: write  # This line must be present
```

---

### ❌ GitHub Pages not deploying

**Problem:** Pages source not configured correctly.

**Solution:**
1. Go to **Settings** → **Pages**
2. Under **Source**, select: **GitHub Actions** (not "Deploy from branch")
3. Save changes
4. Wait 2-3 minutes after workflow completes
5. Visit `https://yourusername.github.io/llm-daily/`

**Check deployment status:**
1. Go to **Actions** tab
2. Look for "pages build and deployment" workflow
3. Check if it completed successfully

---

## Workflow Failures

### ❌ Workflow fails with "npm ci" errors

**Problem:** Dependencies not properly cached or `package-lock.json` out of sync.

**Solution:**
```bash
# Local fix
rm -rf node_modules package-lock.json
npm install
npm run build

# Commit updated lock file
git add package-lock.json
git commit -m "fix: update package-lock.json"
git push
```

---

### ❌ Workflow fails with "API request failed"

**Problem:** API provider is down or rate-limited.

**Solution:**

**For Free Models (OpenRouter):**
- Check [OpenRouter Status](https://status.openrouter.ai/)
- Free models may have rate limits - add retry logic or use different model

**For Paid Models:**
1. Verify API key is set correctly in GitHub Secrets
2. Check API key has sufficient credits/quota
3. Check provider status page:
   - OpenAI: https://status.openai.com/
   - OpenRouter: https://status.openrouter.ai/

**Add retry logic to config:**
```yaml
provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free
    retry: 3
    timeout: 30000
```

---

### ❌ Workflow succeeds but no results committed

**Problem:** Git commit step skipped due to no changes.

**Solution:**

**Check workflow logs:**
1. Go to **Actions** → failed workflow
2. Expand "Commit results" step
3. Look for "No changes to commit" message

**Possible causes:**
- Task output is identical to previous run (deduplication working correctly)
- Output path is incorrect in `config.yaml`
- Task failed but error was swallowed

**Verify output configuration:**
```yaml
outputs:
  - type: commit
    path: tasks/my-task/results/{date}.md  # Check this path
```

**Test locally:**
```bash
npm run task:run my-task
ls -la tasks/my-task/results/  # Verify files were created
```

---

### ❌ "fatal: refusing to merge unrelated histories"

**Problem:** Git history conflict when committing results.

**Solution:**
```bash
# Pull latest changes first
git pull origin main --rebase

# Then push
git push origin main
```

**In workflow, this is usually caused by:**
- Multiple workflows running simultaneously
- Manual commits between workflow runs

**Prevention:** Use `[skip ci]` in commit messages to prevent infinite loops.

---

## API and Provider Issues

### ❌ "Invalid API key" error

**Problem:** API key not set or incorrect in GitHub Secrets.

**Solution:**

**For OpenAI:**
1. Verify key at https://platform.openai.com/api-keys
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Update or add `OPENAI_API_KEY` secret
4. Ensure value starts with `sk-`
5. No spaces or quotes around the key

**For OpenRouter:**
1. Verify key at https://openrouter.ai/keys
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Update or add `OPENROUTER_API_KEY` secret
4. Ensure value starts with `sk-or-v1-`

**Common mistakes:**
- ❌ `"sk-..."` (quotes included)
- ❌ `sk-... ` (trailing space)
- ✅ `sk-...` (correct format)

---

### ❌ Free model not working

**Problem:** Free model configuration incorrect or model unavailable.

**Solution:**

**Verify model exists:**
- Check [OpenRouter Models](https://openrouter.ai/models) for current free models
- Model names change over time

**Current working free models:**
```yaml
model: minimax/minimax-m2:free
# or
model: openrouter/andromeda-alpha
```

**If model removed, update config.yaml:**
```yaml
provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free  # Update to current free model
```

---

### ❌ "Rate limit exceeded" error

**Problem:** Too many requests to API provider.

**Solution:**

**For Free Models:**
- Add delay between requests
- Reduce schedule frequency
- Switch to different free model

**For Paid Models:**
- Check rate limits in provider dashboard
- Upgrade to higher tier
- Add exponential backoff

**Adjust schedule:**
```yaml
# Instead of every hour:
schedule: '0 * * * *'

# Try every 6 hours:
schedule: '0 */6 * * *'
```

---

## Dashboard Issues

### ❌ Dashboard shows 404 error

**Problem:** GitHub Pages not enabled or deployed.

**Solution:**
1. Check **Settings** → **Pages** shows "Your site is live at..."
2. Go to **Actions** → "pages build and deployment" workflow
3. Ensure it completed successfully (green ✓)
4. Wait 2-3 minutes for DNS propagation
5. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

### ❌ Dashboard shows no tasks

**Problem:** Analytics data not generated or committed.

**Solution:**

**Check data files exist:**
```bash
ls -la dashboard/data/
# Should show: analytics.json, task-logs.json
```

**Regenerate analytics:**
```bash
npm run task:run my-task
# Analytics generated automatically after task runs
```

**Verify workflow commits data:**
```yaml
- name: Commit results
  run: |
    git add dashboard/data/ tasks/*/memory.md tasks/*/results/
```

---

### ❌ Dashboard shows old data

**Problem:** Browser caching or deployment delay.

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check latest commit timestamp in repository
3. Verify workflow completed recently in Actions tab
4. Check `dashboard/data/analytics.json` for updated timestamp

**Force redeploy:**
```bash
# Make small change to dashboard
echo "<!-- Updated $(date) -->" >> dashboard/index.html
git add dashboard/index.html
git commit -m "chore: force dashboard redeploy"
git push
```

---

## Local Development Issues

### ❌ "Module not found" errors

**Problem:** Dependencies not installed.

**Solution:**
```bash
rm -rf node_modules
npm install
npm run build
```

---

### ❌ TypeScript compilation errors

**Problem:** Type definitions out of sync.

**Solution:**
```bash
# Clean build artifacts
rm -rf dist/

# Reinstall TypeScript
npm install --save-dev typescript

# Rebuild
npm run build
```

---

### ❌ Task runs locally but fails in GitHub Actions

**Problem:** Environment differences between local and GitHub Actions.

**Solution:**

**Check environment variables:**
```bash
# Local - uses .env file
cat .env

# GitHub Actions - uses secrets
# Settings → Secrets → Actions
```

**Verify Node version matches:**
```yaml
# .github/workflows/task-*.yml
- uses: actions/setup-node@v4
  with:
    node-version: '20'  # Match your local version
```

**Test with clean environment:**
```bash
# Remove local .env
mv .env .env.backup

# Run task (should use default free models)
npm run task:run my-task
```

---

## Cost and Usage Issues

### ❌ Unexpected API costs

**Problem:** Using paid model without realizing it.

**Solution:**

**Check current configuration:**
```yaml
provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free  # Should say ":free"
```

**Verify costs:**
- OpenAI: https://platform.openai.com/usage
- OpenRouter: https://openrouter.ai/activity

**Switch to free model:**
```yaml
provider:
  id: openrouter
  config:
    model: minimax/minimax-m2:free  # $0.00 per token
    max_tokens: 2000  # Limit output size
```

**Set spending limits:**
- OpenAI: Platform → Settings → Limits
- OpenRouter: Account → Limits

---

### ❌ How to monitor costs?

**Solution:**

**Dashboard Analytics:**
- View `https://yourusername.github.io/llm-daily/`
- Check cost per task and total spend

**Provider Dashboards:**
- OpenAI: https://platform.openai.com/usage
- OpenRouter: https://openrouter.ai/activity

**Local monitoring:**
```bash
# Check analytics file
cat dashboard/data/analytics.json | jq '.totalCost'

# Check task logs
cat dashboard/data/task-logs.json | jq '.[] | {name, cost}'
```

---

## Still Having Issues?

### 1. Check Workflow Logs

**Detailed error information:**
1. Go to **Actions** tab
2. Click on failed workflow run
3. Expand each step to see output
4. Look for error messages (usually in red)

### 2. Enable Debug Logging

**Add to workflow secrets:**
1. Settings → Secrets → Actions → New secret
2. Name: `ACTIONS_STEP_DEBUG`
3. Value: `true`
4. Re-run workflow for verbose output

### 3. Test Locally First

**Always test before pushing:**
```bash
# Validate configuration
npm run task:validate my-task

# Test task execution
npm run task:run my-task

# Generate workflow
npm run task:generate

# Review generated workflow
cat .github/workflows/task-my-task.yml
```

### 4. Common Debug Commands

```bash
# Check workflow syntax
npm run validate

# Verify task configuration
cat tasks/my-task/config.yaml

# Check last commit
git log -1 --stat

# View workflow runs
gh run list  # Requires GitHub CLI

# Check repository settings
gh repo view --web  # Opens repo in browser
```

### 5. Get Help

Still stuck? Open an issue:
1. Go to https://github.com/yourusername/llm-daily/issues
2. Click **New Issue**
3. Include:
   - Description of problem
   - Steps to reproduce
   - Error messages from workflow logs
   - Your `config.yaml` (remove any secrets)
   - Operating system and Node version

---

## Quick Reference

### Common Fixes

| Problem | Quick Fix |
|---------|-----------|
| Workflow won't run | Enable Actions in Settings → Actions |
| Can't commit results | Enable write permissions in Settings → Actions → General |
| Dashboard 404 | Set Pages source to "GitHub Actions" |
| API errors | Check provider status page |
| No results | Verify output path in config.yaml |
| Old data | Hard refresh browser (Ctrl+Shift+R) |
| Build fails | Delete node_modules and npm install |
| Cost concerns | Switch to free model (`:free` suffix) |

### Health Check Commands

```bash
# Verify installation
npm run validate

# Test task locally
npm run task:run <task-name>

# Check configuration
npm run task:validate <task-name>

# List all tasks
npm run task:list

# Check build
npm run build && npm test
```

---

**Need more help?** Check the [full documentation](https://yourusername.github.io/llm-daily/) or [open an issue](https://github.com/yourusername/llm-daily/issues).
