# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Security Best Practices

### API Keys

**NEVER commit API keys to your repository**. Always use GitHub Secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `OPENAI_API_KEY`
   - `OPENROUTER_API_KEY`
   - Any webhook secrets

### Local Development

Create `.env` file (already in `.gitignore`):

```env
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

**Never commit `.env` files.**

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

### GitHub Actions Security

- Use specific versions for actions (not `@latest`)
- Review workflow permissions
- Limit `GITHUB_TOKEN` scope
- Don't expose secrets in logs

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
- [OpenAI API Security](https://platform.openai.com/docs/guides/safety-best-practices)

---

Thank you for helping keep LLM Daily secure! 🔒
