# Phase 6: Analytics & Tracking

**Status**: ✅ Complete
**Progress**: 11/11 tasks (100%)
**Duration**: Completed 2025-10-26
**Prerequisites**: Phase 0-5 complete ✅

## 🎯 Objectives

Implement comprehensive analytics system:
- Cost calculation per provider
- Token counting and tracking
- Metrics aggregation
- JSON output for dashboard
- Historical data storage
- Performance tracking

## 📋 Task Breakdown

### Type Definitions (2 tasks)

- [ ] **P6.1** - Define analytics types - `src/types/analytics.types.ts`
  - TaskMetrics interface
  - Analytics interface
  - HistoricalData type
  - **Acceptance**: All analytics structures typed

- [ ] **P6.2** - Define output types - `src/types/output.types.ts`
  - OutputIntegration interface
  - CommitOutput, WebhookOutput, FileOutput types
  - **Acceptance**: Output types complete

### Cost Calculation (2 tasks)

- [ ] **P6.3** - Implement cost calculator - `src/utils/cost-calculator.ts`
  - Per-provider pricing
  - Token-based calculation
  - Input/output token distinction
  - **Acceptance**: Accurate cost estimates

- [ ] **P6.4** - Add pricing database
  - Pricing for OpenAI models
  - Pricing for OpenRouter models
  - Update mechanism for prices
  - **Acceptance**: Pricing is up-to-date

### Metrics Tracking (3 tasks)

- [ ] **P6.5** - Implement analytics manager - `src/core/analytics.ts`
  - Record task execution
  - Calculate metrics
  - Aggregate data
  - **Acceptance**: Tracks all metrics

- [ ] **P6.6** - Add metrics aggregation
  - Daily, weekly, monthly totals
  - Per-task statistics
  - Success rate calculation
  - **Acceptance**: Aggregations correct

- [ ] **P6.7** - Implement historical data storage
  - Store data in `dashboard/data/history/`
  - Monthly JSON files
  - Efficient retrieval
  - **Acceptance**: Historical data persists

### Output System (2 tasks)

- [ ] **P6.8** - Implement commit output - `src/core/outputs/commit.ts`
  - Write to `dashboard/data/tasks/*.json`
  - Update memory files
  - Git add and commit
  - **Acceptance**: Auto-commits work

- [ ] **P6.9** - Implement webhook output - `src/core/outputs/webhook.ts`
  - POST to configured URL
  - Retry logic
  - Error handling
  - **Acceptance**: Webhooks send correctly

- [ ] **P6.10** - Implement file output - `src/core/outputs/file.ts`
  - Write to results/ folder
  - Support markdown and JSON
  - Template variables
  - **Acceptance**: File output works

### Integration (1 task)

- [ ] **P6.11** - Add comprehensive tests
  - Test cost calculations
  - Test metrics tracking
  - Test all output types
  - **Acceptance**: >80% coverage

## 📁 Files Created (10 files)

```
src/
├── types/
│   ├── analytics.types.ts              # P6.1
│   └── output.types.ts                 # P6.2
├── utils/
│   └── cost-calculator.ts              # P6.3, P6.4
├── core/
│   ├── analytics.ts                    # P6.5, P6.6, P6.7
│   ├── analytics.test.ts               # P6.11
│   └── outputs/
│       ├── base.ts                     # (from Phase 1)
│       ├── commit.ts                   # P6.8
│       ├── webhook.ts                  # P6.9
│       ├── file.ts                     # P6.10
│       └── outputs.test.ts             # P6.11
```

## ✅ Acceptance Criteria

### Functional
- [ ] Cost calculation is accurate
- [ ] All metrics are tracked correctly
- [ ] Historical data is stored
- [ ] All output integrations work
- [ ] Analytics JSON format is correct

### Quality
- [ ] Pricing data is current
- [ ] No data loss
- [ ] Output is atomic
- [ ] Tests cover edge cases

## 🧪 Testing Requirements

### Unit Tests
- [ ] Test cost calculations for all models
- [ ] Test metrics aggregation
- [ ] Test each output type
- [ ] Test historical data storage

### Integration Tests
- [ ] Run full task and verify analytics
- [ ] Test commit output end-to-end
- [ ] Test webhook with real endpoint
- [ ] Verify JSON format matches dashboard expectations

## 📝 Implementation Notes

### Analytics Data Format
```json
{
  "totalRuns": 1000,
  "totalTokens": 2500000,
  "totalCost": 35.75,
  "successRate": 0.98,
  "lastUpdated": "2025-01-26T10:00:00Z",
  "tasks": {
    "daily-news": {
      "runs": 145,
      "tokens": 325000,
      "cost": 4.25,
      "successRate": 1.0,
      "lastRun": "2025-01-26T08:00:00Z",
      "avgResponseTime": 2.3
    }
  },
  "daily": [
    {
      "date": "2025-01-26",
      "runs": 10,
      "tokens": 25000,
      "cost": 0.35
    }
  ]
}
```

### Output Integrations
```typescript
interface OutputIntegration {
  type: 'commit' | 'webhook' | 'file';
  execute(result: TaskResult): Promise<void>;
}

class CommitOutput implements OutputIntegration {
  async execute(result: TaskResult): Promise<void> {
    // 1. Write to dashboard/data/tasks/{taskName}.json
    // 2. Update memory.md
    // 3. Git add
    // 4. Git commit with [skip ci]
    // (No push - done by workflow)
  }
}
```

## 🚀 Getting Started

1. Define types (P6.1-P6.2)
2. Build cost calculator (P6.3-P6.4)
3. Implement analytics (P6.5-P6.7)
4. Add outputs (P6.8-P6.10)
5. Test comprehensively (P6.11)

---

**Previous Phase**: [Phase 5: GitHub Pages](phase-5-pages.md)
**Next Phase**: [Phase 7: Testing & Polish](phase-7-testing.md)
