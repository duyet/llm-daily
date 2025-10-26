# Implementation Dependencies

This document maps out dependencies between files, tasks, and phases to optimize development workflow.

## 🔗 Phase Dependencies

### Critical Path (Sequential)
```
Phase 0 (Setup)
    ↓
Phase 1 (Providers)
    ↓
Phase 2 (Memory) ──┐
    ↓              ↓
Phase 3 (CLI) ─────┤
    ↓              ↓
Phase 4 (Workflows)│
    ↓              ↓
Phase 7 (Testing)  ↓
                   ↓
    ┌──────────────┘
    ↓
Phase 5 (Pages)
    ↓
Phase 6 (Analytics)
```

### Parallel Opportunities

**After Phase 2 completion:**
- Phase 3 (CLI) - depends on Phase 1, 2
- Phase 5 (Pages) can start in parallel - minimal dependencies
- Phase 6 (Analytics) can start in parallel - depends only on Phase 2

**Optimal Strategy:**
1. Complete Phase 0-2 sequentially (foundation)
2. Split team:
   - Team A: Phase 3 → Phase 4
   - Team B: Phase 5
   - Team C: Phase 6
3. Merge for Phase 7 (testing)

## 📦 File Dependencies

### Core Files (Must Build First)

```
src/types/
├── config.types.ts          (0 dependencies)
├── provider.types.ts        (0 dependencies)
├── memory.types.ts          (0 dependencies)
├── output.types.ts          (0 dependencies)
└── analytics.types.ts       (0 dependencies)

src/utils/
├── logger.ts                (→ types)
├── config-validator.ts      (→ types, zod)
└── cost-calculator.ts       (→ types)

src/core/
├── providers/
│   ├── base.ts              (→ types)
│   ├── openai.ts            (→ base, types)
│   ├── openrouter.ts        (→ base, types)
│   └── registry.ts          (→ all providers, types)
├── memory.ts                (→ types, utils)
├── outputs/
│   ├── base.ts              (→ types)
│   ├── commit.ts            (→ base)
│   ├── webhook.ts           (→ base)
│   └── file.ts              (→ base)
└── analytics.ts             (→ types, utils)

src/core/
└── task-runner.ts           (→ providers, memory, outputs, analytics)

src/
├── workflow-generator.ts    (→ core, types, utils)
└── commands/
    ├── generate.ts          (→ workflow-generator)
    ├── new.ts               (→ utils)
    ├── run.ts               (→ task-runner)
    ├── list.ts              (→ utils)
    └── validate.ts          (→ utils)

src/
└── cli.ts                   (→ commands)
```

### Build Order Recommendation

**Layer 1** (0 external dependencies):
1. All type files in `src/types/`
2. Package.json, tsconfig.json, configs

**Layer 2** (depends on Layer 1):
3. `src/utils/logger.ts`
4. `src/utils/config-validator.ts`
5. `src/utils/cost-calculator.ts`

**Layer 3** (depends on Layer 1-2):
6. `src/core/providers/base.ts`
7. `src/core/outputs/base.ts`

**Layer 4** (depends on Layer 3):
8. `src/core/providers/openai.ts`
9. `src/core/providers/openrouter.ts`
10. `src/core/providers/registry.ts`
11. `src/core/outputs/commit.ts`
12. `src/core/outputs/webhook.ts`
13. `src/core/outputs/file.ts`
14. `src/core/memory.ts`
15. `src/core/analytics.ts`

**Layer 5** (depends on Layer 4):
16. `src/core/task-runner.ts`
17. `src/workflow-generator.ts`

**Layer 6** (depends on Layer 5):
18. All command files in `src/commands/`

**Layer 7** (top level):
19. `src/cli.ts`

### Frontend Files (Parallel Track)

```
docs/assets/
├── css/
│   └── main.css             (0 dependencies)
└── js/
    ├── utils.js             (0 dependencies)
    ├── api.js               (→ utils)
    ├── charts.js            (→ Chart.js, api)
    └── dashboard.js         (→ api, charts, utils)

docs/
├── index.html               (→ all CSS/JS)
└── guide/
    └── *.html               (→ CSS)
```

**Frontend Build Order**:
1. CSS files (can be done early, in parallel)
2. Utility JS files
3. API and data loading
4. Chart components
5. Main dashboard
6. HTML pages

## 🔄 Dependency Matrix

| Component | Depends On | Blocks |
|-----------|-----------|--------|
| Types | None | Everything |
| Utils | Types | Core, CLI |
| Provider Base | Types | Providers |
| OpenAI Provider | Provider Base | Provider Registry, Task Runner |
| OpenRouter Provider | Provider Base | Provider Registry, Task Runner |
| Provider Registry | All Providers | Task Runner |
| Memory | Types, Utils | Task Runner |
| Outputs | Types | Task Runner |
| Analytics | Types, Utils | Task Runner, Dashboard |
| Task Runner | Providers, Memory, Outputs, Analytics | CLI Commands, Workflows |
| Workflow Generator | Task Runner, Utils | Generate Command |
| CLI Commands | Task Runner, Workflow Generator, Utils | CLI |
| CLI | All Commands | End Users |
| Dashboard | Analytics data format | End Users |
| Documentation | None (parallel) | End Users |

## 🚀 Parallel Work Opportunities

### Early Parallel Work (During Phase 0-1)
- [ ] Design dashboard UI mockups
- [ ] Write user documentation drafts
- [ ] Create example task templates
- [ ] Design analytics data schema

### Mid-Project Parallel Work (After Phase 2)

**Track A: Backend**
- Phase 3: CLI Implementation
- Phase 4: Workflow Generator

**Track B: Frontend**
- Phase 5: GitHub Pages Dashboard
- Design and CSS can start even earlier

**Track C: Analytics**
- Phase 6: Analytics & Tracking
- Can start once data structures defined in Phase 2

### Testing (Continuous)
- Unit tests written alongside each component
- Integration tests after Phase 4
- E2E tests after Phase 5

## 📋 Task Assignment Strategy

### For Solo Developer
Follow phases sequentially, but prepare next phase during current:
- While coding Phase 1, design Phase 2 schemas
- While coding Phase 3, design Phase 5 UI
- Test each phase before moving on

### For Team of 2-3
- Developer 1: Phases 0-4 (backend/core)
- Developer 2: Phase 5 (frontend)
- Developer 3: Phase 6-7 (analytics/testing)
- Sync points after Phases 2 and 4

### For Team of 5-10
**Squad 1 - Core (2 people)**
- Phase 0: Setup
- Phase 1: Provider system
- Phase 2: Memory system

**Squad 2 - CLI (2 people)**
- Phase 3: CLI implementation
- Phase 4: Workflow generator

**Squad 3 - Frontend (2-3 people)**
- Phase 5: Dashboard (1-2 people)
- Phase 5: Documentation site (1 person)

**Squad 4 - Quality (2 people)**
- Phase 6: Analytics
- Phase 7: Testing & examples

**Timeline**: Squads 1-2 sequential, then all parallel after Phase 2

## ⚠️ Critical Dependencies

### Must Complete Before Parallel Work
1. **Type Definitions** - Everything depends on these
2. **Provider Base** - Both providers need this
3. **Task Runner Core** - CLI and workflows need this
4. **Analytics Schema** - Dashboard needs this format

### Blocking Issues to Avoid
❌ Don't start CLI commands without task-runner
❌ Don't build dashboard without analytics schema
❌ Don't write workflows without CLI generate command
❌ Don't create examples without working task-runner

## 🔍 Dependency Validation

### Pre-Phase Checklist

**Before Phase 1:**
- [ ] All type definitions complete
- [ ] Validation utilities working
- [ ] Logger implemented

**Before Phase 2:**
- [ ] Provider base interface defined
- [ ] At least one provider working (OpenAI)

**Before Phase 3:**
- [ ] Memory system functional
- [ ] Task runner can execute tasks

**Before Phase 4:**
- [ ] CLI framework setup
- [ ] All commands working locally

**Before Phase 5:**
- [ ] Analytics data format defined
- [ ] JSON output structure documented

**Before Phase 6:**
- [ ] Task runner producing analytics data
- [ ] Cost calculation working

**Before Phase 7:**
- [ ] All core features complete
- [ ] Example tasks defined

## 📊 Dependency Graph Visualization

```
                    [Types]
                       |
        +--------------+-------------+
        |              |             |
    [Utils]      [Providers]    [Outputs]
        |              |             |
        +------+-------+-------+-----+
               |               |
          [Memory]        [Analytics]
               |               |
               +-------+-------+
                       |
                 [Task Runner]
                       |
         +-------------+------------+
         |             |            |
    [Workflow]     [CLI]      [Dashboard]
         |             |            |
         +------+------+------+-----+
                       |
                  [Complete]
```

## 🎯 Critical Path Timeline

**Week 1**: Types → Utils → Provider Base
**Week 2**: Providers → Memory → Task Runner (critical!)
**Week 3**: CLI → Workflows
**Week 4-5**: Parallel (Dashboard + Analytics)
**Week 6**: Testing & Integration

**Bottleneck Warning**: Task Runner is the critical bottleneck. Everything waits for this.

## 🔗 External Dependencies

### NPM Packages (must install)
- `commander` (CLI) - no alternatives
- `openai` (provider) - official SDK
- `zod` (validation) - type-safe schemas
- `inquirer` (prompts) - interactive CLI
- `husky` (hooks) - git automation
- `yaml` (config) - YAML parsing

### Optional Dependencies
- `chalk` (colors) - nice-to-have
- `ora` (spinners) - nice-to-have
- `boxen` (boxes) - nice-to-have

### CDN Dependencies (frontend)
- Tailwind CSS
- Chart.js
- Alpine.js (optional)

---

**Next Steps**: Review this before starting implementation to understand what can run in parallel and what must be sequential.
