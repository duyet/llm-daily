# Phase 4: Workflow Generator

**Status**: ⏳ Not Started
**Progress**: 0/13 tasks (0%)
**Duration**: 3-4 days
**Prerequisites**: Phase 0-3 complete

## 🎯 Objectives

Automate GitHub Actions workflow generation:
- Workflow template system
- Task scanner (reads tasks/ folder)
- YAML generation logic
- Git hooks with Husky
- Auto-generation on config changes
- Workflow validation

## 📋 Task Breakdown

### Workflow Templates (3 tasks)

- [ ] **P4.1** - Create workflow template - `src/templates/workflow.yml.template`
  - Parameterized GitHub Actions YAML
  - Variables: taskName, schedule, env vars
  - Checkout, setup, run, commit steps
  - **Acceptance**: Valid GitHub Actions syntax

- [ ] **P4.2** - Create template engine - `src/utils/template-engine.ts`
  - Replace template variables
  - Support conditionals
  - **Acceptance**: Renders valid YAML

- [ ] **P4.3** - Add workflow types - `src/types/workflow.types.ts`
  - WorkflowConfig interface
  - WorkflowTemplate type
  - **Acceptance**: Types cover workflow structure

### Task Scanner (2 tasks)

- [ ] **P4.4** - Implement task scanner - `src/workflow-generator/scanner.ts`
  - Scan tasks/ directory recursively
  - Find all config.yaml files
  - Parse and validate configs
  - **Acceptance**: Finds all valid tasks

- [ ] **P4.5** - Add task filtering
  - Skip invalid tasks
  - Warn about issues
  - Support include/exclude patterns
  - **Acceptance**: Only processes valid tasks

### Workflow Generator (4 tasks)

- [ ] **P4.6** - Implement generator core - `src/workflow-generator.ts`
  - Generate workflow for each task
  - Use template engine
  - Write to .github/workflows/
  - **Acceptance**: Generates valid workflows

- [ ] **P4.7** - Add workflow naming
  - Name: `task-{taskName}.yml`
  - Avoid name conflicts
  - **Acceptance**: Names are consistent

- [ ] **P4.8** - Add secret detection
  - Detect required secrets (API keys)
  - List in workflow
  - Warn if missing
  - **Acceptance**: Secrets documented

- [ ] **P4.9** - Add workflow validation
  - Validate generated YAML syntax
  - Check required fields
  - **Acceptance**: Only valid workflows generated

### Git Hooks (2 tasks)

- [ ] **P4.10** - Setup pre-commit hook - `.husky/pre-commit`
  - Run `npm run generate` on commit
  - Check for config.yaml changes
  - Auto-stage generated workflows
  - **Acceptance**: Hook triggers correctly

- [ ] **P4.11** - Add hook bypass option
  - Allow `--no-verify` to skip
  - Document when to use
  - **Acceptance**: Can bypass when needed

### Integration (2 tasks)

- [ ] **P4.12** - Integrate with generate command
  - `llm-daily generate` uses workflow generator
  - Show generated workflows
  - Provide summary
  - **Acceptance**: CLI command works

- [ ] **P4.13** - Add comprehensive tests
  - Unit tests for generator
  - Test template rendering
  - Test task scanning
  - **Acceptance**: >80% coverage

## 📁 Files Created (9 files)

```
src/
├── types/
│   └── workflow.types.ts               # P4.3
├── utils/
│   └── template-engine.ts              # P4.2
├── templates/
│   └── workflow.yml.template           # P4.1
├── workflow-generator/
│   ├── scanner.ts                      # P4.4, P4.5
│   └── scanner.test.ts
├── workflow-generator.ts               # P4.6, P4.7, P4.8, P4.9, P4.12
└── workflow-generator.test.ts          # P4.13

.husky/
└── pre-commit                          # P4.10, P4.11
```

## ✅ Acceptance Criteria

### Functional
- [ ] Generates valid GitHub Actions workflows
- [ ] Git hook triggers on config changes
- [ ] Workflow names are consistent
- [ ] Secrets are properly detected
- [ ] Can regenerate all workflows

### Quality
- [ ] Generated YAML is valid
- [ ] Workflows follow best practices
- [ ] Error handling is robust
- [ ] Tests cover edge cases

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test template rendering
- [ ] Test task scanning
- [ ] Test workflow generation
- [ ] Test secret detection

### Integration Tests
- [ ] Generate workflows for sample tasks
- [ ] Test git hook execution
- [ ] Validate generated YAML

## 📝 Implementation Notes

### Workflow Template
```yaml
name: "Task: {{taskName}}"

on:
  schedule:
    - cron: "{{schedule}}"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  run-task:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run task
        run: npm run task:run {{taskName}}
        env: {{#each secrets}}
          {{name}}: ${{{{ secrets.{{name}} }}}}{{/each}}
      - name: Commit results
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "actions@github.com"
          git add docs/data/ tasks/*/memory.md
          git diff --quiet && git diff --staged --quiet || {
            git commit -m "chore({{taskName}}): update results [skip ci]"
            git push
          }
```

## 🚀 Getting Started

1. Create workflow templates (P4.1-P4.3)
2. Build task scanner (P4.4-P4.5)
3. Implement generator (P4.6-P4.9)
4. Setup git hooks (P4.10-P4.11)
5. Integration and tests (P4.12-P4.13)

---

**Previous Phase**: [Phase 3: CLI Implementation](phase-3-cli.md)
**Next Phase**: [Phase 5: GitHub Pages](phase-5-pages.md)
