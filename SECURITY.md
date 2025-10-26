# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## GITHUB_TOKEN Security

### Automatic Token Provisioning

LLM Daily uses GitHub's automatic `GITHUB_TOKEN` for workflow operations. This token is:

- ✅ **Automatically provided** - GitHub creates it for each workflow run
- ✅ **Repository-scoped** - Limited to the repository where workflow runs
- ✅ **Time-limited** - Expires automatically after workflow completion
- ✅ **Read-only by default** - Write permissions must be explicitly granted
- ✅ **Audit logged** - All actions tracked in repository activity

### Required Token Permissions

The workflows require these specific permissions:

```yaml
permissions:
  contents: write      # Commit task results and update memory files
  pages: write        # Deploy dashboard to GitHub Pages
  id-token: write     # Authenticate with GitHub Pages deployment
```

**Why Each Permission Is Needed:**

| Permission | Scope | Justification |
|------------|-------|---------------|
| `contents: write` | Repository content | Tasks must commit results to `tasks/*/results/` and update `memory.md` files for persistent state |
| `pages: write` | GitHub Pages | Dashboard deployment requires write access to Pages environment |
| `id-token: write` | OIDC authentication | Required for secure GitHub Pages deployment via OIDC token exchange |

### Permission Boundaries

**What GITHUB_TOKEN CAN do in workflows:**
- ✅ Read repository contents
- ✅ Commit files to the repository
- ✅ Deploy to GitHub Pages
- ✅ Create/update issues and pull requests (if enabled)
- ✅ Access public repository data

**What GITHUB_TOKEN CANNOT do:**
- ❌ Access other repositories (even in same organization)
- ❌ Access organization secrets or settings
- ❌ Access user's personal repositories
- ❌ Make changes outside the repository
- ❌ Access encrypted secrets from other repositories
- ❌ Persist beyond workflow execution

### Security Best Practices

#### For Free Models (Default Configuration)
No API keys required. Zero secret management overhead.

**Minimal Attack Surface:**
- No external API credentials stored
- Only GITHUB_TOKEN (automatic, scoped, temporary)
- Results committed to repository (version controlled, auditable)

#### For Paid Models (Optional)

**NEVER commit API keys to your repository**. Always use GitHub Secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `OPENAI_API_KEY` (if using OpenAI)
   - `OPENROUTER_API_KEY` (if using OpenRouter)
   - Any webhook authentication tokens

**API Key Security Guidelines:**
- ✅ Use repository secrets only (never commit to code)
- ✅ Rotate keys every 90 days
- ✅ Use separate keys for development and production
- ✅ Monitor usage in provider dashboards
- ✅ Set spending limits in provider accounts
- ✅ Revoke immediately if compromised

### Local Development Security

Create `.env` file (already in `.gitignore`):

```env
# OpenAI (optional, for paid models)
OPENAI_API_KEY=sk-...

# OpenRouter (optional, for paid models)
OPENROUTER_API_KEY=sk-or-v1-...

# GitHub Token (optional, only for local testing of Actions)
GITHUB_TOKEN=ghp_...
```

**Never commit `.env` files or share them publicly.**

### Webhook Security

When using webhooks:

1. Use HTTPS URLs only
2. Validate webhook signatures if supported
3. Store webhook URLs in secrets
4. Limit data sent to webhooks

Example:
```yaml
outputs:
  - type: webhook
    url: ${{ secrets.WEBHOOK_URL }}  # From GitHub Secrets
    headers:
      Authorization: Bearer ${{ secrets.WEBHOOK_TOKEN }}
```

### Repository Settings

**Required Settings for Workflows:**

1. **Actions Permissions** (Settings → Actions → General):
   - ✅ Allow all actions and reusable workflows
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

2. **GitHub Pages** (Settings → Pages):
   - ✅ Source: GitHub Actions
   - ✅ Build and deployment from Actions

**Why These Settings Are Required:**
- **Write permissions** - Workflows must commit results and deploy Pages
- **PR approval** - Optional, for automated PR workflows in future
- **Pages from Actions** - Dashboard deploys via Actions, not branch

### GitHub Actions Security

**Best Practices for Workflow Security:**
- ✅ Use specific versions for actions (e.g., `actions/checkout@v4` not `@latest`)
- ✅ Review workflow permissions before enabling
- ✅ Limit `GITHUB_TOKEN` scope to minimum required
- ✅ Never expose secrets in logs (`echo $SECRET` is forbidden)
- ✅ Use `[skip ci]` in commit messages to prevent infinite loops
- ✅ Review workflow YAML before pushing to repository

**Audit Workflow Changes:**
```bash
# Review workflow file before committing
git diff .github/workflows/

# Check for exposed secrets (should return nothing)
grep -r "OPENAI_API_KEY\|OPENROUTER_API_KEY" .github/workflows/
```

### Input Validation

- Validate all user inputs in prompts
- Sanitize file paths to prevent traversal
- Check YAML parsing for injection

### Memory Files

- Memory files may contain sensitive information
- Don't commit sensitive data to `memory.md`
- Use `.gitignore` for sensitive task outputs
- Review memory content before pushing

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

### Email

Send email to: **security@yourproject.com** (replace with your email)

Include:
- Type of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **24 hours**: Initial response
- **48 hours**: Assessment and triage
- **7 days**: Fix development
- **14 days**: Public disclosure (after fix)

## Security Updates

Security updates will be released as patch versions and announced via:

- GitHub Security Advisories
- Release notes
- README updates

## Acknowledgments

We thank the following researchers for responsible disclosure:

- [List will be updated as reports come in]

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OpenAI API Security](https://platform.openai.com/dashboard/guides/safety-best-practices)

---

Thank you for helping keep LLM Daily secure! 🔒
