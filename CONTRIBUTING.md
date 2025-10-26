# Contributing to LLM Daily

Thank you for your interest in contributing to LLM Daily! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/llm-daily/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Error messages or logs

### Suggesting Enhancements

1. Check existing [Issues](https://github.com/yourusername/llm-daily/issues) and [Discussions](https://github.com/yourusername/llm-daily/discussions)
2. Create a new issue or discussion with:
   - Clear description of the enhancement
   - Use cases and benefits
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following our guidelines
4. Write or update tests as needed
5. Run all checks: `npm run validate`
6. Commit using semantic commits (see below)
7. Push and create a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/llm-daily.git
cd llm-daily

# Install dependencies
npm install

# Run tests
npm test

# Run type checking
npm run type-check

# Run linter
npm run lint

# Run all validation
npm run validate
```

## Coding Standards

### TypeScript

- Use TypeScript for all source code
- Enable strict mode (`strict: true` in `tsconfig.json`)
- Avoid `any` types - use proper typing
- Document public APIs with JSDoc comments

### Code Style

- Follow existing code style
- Use Prettier for formatting: `npm run format`
- Use ESLint rules: `npm run lint`
- Maximum line length: 100 characters
- Use 2 spaces for indentation

### Testing

- Write tests for new features
- Maintain >80% code coverage
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

```typescript
describe('Feature', () => {
  it('should do something when condition', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `perf`: Performance improvements

Examples:
```
feat(cli): add create-task command
fix(memory): handle empty memory files
docs(readme): update quick start guide
test(analytics): add cost calculation tests
```

## Project Structure

```
llm-daily/
├── src/               # Source code
│   ├── cli.ts        # CLI entry point
│   ├── core/         # Core functionality
│   ├── types/        # TypeScript types
│   └── utils/        # Utilities
├── tests/            # Test files
├── tasks/            # Example tasks
├── docs/             # GitHub Pages
└── .github/          # GitHub workflows
```

## Testing Guidelines

### Unit Tests

- Test individual functions/classes
- Mock external dependencies
- Focus on edge cases and error handling

### Integration Tests

- Test component interactions
- Use real file system when appropriate
- Test full workflows end-to-end

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- path/to/file.test.ts
```

## Documentation

- Update README.md for user-facing changes
- Update inline comments for complex logic
- Add JSDoc for public APIs
- Update CHANGELOG.md for notable changes

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create PR to `main`
4. After merge, create GitHub release
5. Tag follows semantic versioning: `v1.2.3`

## Getting Help

- **Questions**: [GitHub Discussions](https://github.com/yourusername/llm-daily/discussions)
- **Bugs**: [GitHub Issues](https://github.com/yourusername/llm-daily/issues)
- **Chat**: [Discord/Slack if available]

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to LLM Daily! 🚀
