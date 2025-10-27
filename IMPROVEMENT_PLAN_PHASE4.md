# Phase 4 Improvement Plan

**Target**: 5-7 quick-win improvements focusing on error handling, testing, and code quality
**Current Status**: 9/44 improvements completed (20.5%)
**Test Coverage**: 294 tests passing (100%)

---

## Selected Improvements for Phase 4 (High Priority Quick Wins)

### 1. EH-3: Enhanced Error Messages ⚡ **QUICK WIN**
**Category**: Error Handling
**Priority**: High
**Complexity**: Low
**Estimated Time**: 1 hour
**Files**:
- `src/utils/error-formatter.ts` (new)
- Update error handling across codebase

**Description**: Standardize error messages with contextual information, actionable suggestions, and consistent formatting.

**Implementation**:
- Create error formatter utility with context injection
- Add error codes for programmatic handling
- Include file/line/operation context
- Provide actionable suggestions for common errors
- Integrate into existing error paths

**Acceptance Criteria**:
- Error formatter utility created with tests
- Consistent error format: `[CODE] Operation failed: <message>. Suggestion: <action>`
- Applied to all error handlers
- 10+ tests for error formatting

---

### 2. CQ-1: Extract Magic Numbers to Constants ⚡ **QUICK WIN**
**Category**: Code Quality
**Priority**: High
**Complexity**: Low
**Estimated Time**: 1 hour
**Files**:
- `src/constants.ts` (new)
- `src/core/providers/base.ts` (timeout: 30000)
- `src/core/providers/base.ts` (initialDelay: 1000)
- `src/core/outputs/webhook.ts` (timeout: 10000)
- `src/utils/validation.ts` (MIN_TIMEOUT: 1000)

**Description**: Extract hardcoded values to named constants for better maintainability and configuration.

**Constants to Extract**:
```typescript
// Timeouts
DEFAULT_PROVIDER_TIMEOUT = 30000  // 30s
DEFAULT_WEBHOOK_TIMEOUT = 10000   // 10s
MIN_TIMEOUT = 1000                // 1s
MAX_TIMEOUT = 300000              // 5min

// Retry Configuration
DEFAULT_INITIAL_DELAY = 1000      // 1s
MAX_RETRY_ATTEMPTS = 3
MAX_RETRY_DELAY = 10000           // 10s

// Memory Limits (already in validation.ts, consolidate)
// ... existing memory limits
```

**Acceptance Criteria**:
- Central constants file with documentation
- All magic numbers replaced with named constants
- No behavior changes
- Tests still passing

---

### 3. TEST-1: CLI Command Error Tests ⚡ **HIGH PRIORITY**
**Category**: Testing
**Priority**: High
**Complexity**: Medium
**Estimated Time**: 2-3 hours
**Files**:
- `src/commands/run.test.ts` (new)
- `src/commands/new.test.ts` (new)
- `src/commands/generate.test.ts` (new)
- `src/commands/validate.test.ts` (new)
- `src/commands/list.test.ts` (new)

**Description**: Add comprehensive tests for CLI commands focusing on error scenarios.

**Test Coverage Per Command**:
- Success cases (happy path)
- Missing files/directories
- Invalid configurations
- Permission errors
- Edge cases (empty dirs, special chars)
- Output verification

**Target**: 30-40 new tests (6-8 per command)

**Acceptance Criteria**:
- Test file for each command
- Error scenarios covered
- Mock file system operations
- All tests passing

---

### 4. EH-4: Timeout Handling ⚡ **MEDIUM PRIORITY**
**Category**: Error Handling
**Priority**: Medium
**Complexity**: Medium
**Estimated Time**: 1.5 hours
**Files**:
- `src/utils/timeout.ts` (new)
- `src/core/task-runner.ts` (add timeout wrapper)
- `src/core/providers/base.ts` (timeout handling)
- `src/core/memory.ts` (file operation timeouts)

**Description**: Add proper timeout handling with graceful degradation and cleanup.

**Implementation**:
- Create timeout wrapper utility with AbortController
- Apply to all async operations (LLM calls, file I/O)
- Configurable via environment variables
- Graceful timeout with partial results
- Proper cleanup on timeout

**Acceptance Criteria**:
- Timeout utility with cancellation support
- Applied to critical paths
- Environment variable configuration
- 8-10 tests for timeout scenarios

---

### 5. EH-5: Retry Logic Enhancement ⚡ **MEDIUM PRIORITY**
**Category**: Error Handling
**Priority**: Medium
**Complexity**: Medium
**Estimated Time**: 1.5 hours
**Files**:
- `src/core/providers/base.ts` (enhance retry method)
- `src/core/memory/writer.ts` (add retry to file ops)
- `src/utils/retry.ts` (new, optional extraction)

**Description**: Improve retry logic with exponential backoff + jitter, better error classification.

**Enhancements**:
- Add jitter to exponential backoff (prevent thundering herd)
- Classify errors: retryable vs. non-retryable
- Configurable max attempts and delays
- Retry event logging for observability
- Circuit breaker integration (optional, if time permits)

**Acceptance Criteria**:
- Jitter added to backoff calculation
- Error classification implemented
- Configuration via constants
- 10+ tests for retry scenarios

---

### 6. CQ-2: Reduce Function Complexity (STRETCH GOAL)
**Category**: Code Quality
**Priority**: Medium
**Complexity**: Medium
**Estimated Time**: 1-2 hours
**Files**:
- `src/core/task-runner.ts` (run method ~150 lines)
- `src/core/memory.ts` (update method ~100 lines)

**Description**: Refactor complex functions to improve readability and maintainability.

**Refactoring Targets**:
- `TaskRunner.run()`: Extract validation, execution, output handling
- `MemoryManager.update()`: Extract strategy-specific logic
- Target: No function > 50 lines
- Single responsibility per function

**Acceptance Criteria**:
- Complex functions broken into helpers
- Clear function responsibilities
- All tests still passing
- No behavior changes

---

### 7. TEST-2: Memory Deduplication Edge Cases (STRETCH GOAL)
**Category**: Testing
**Priority**: Medium
**Complexity**: Low
**Estimated Time**: 1 hour
**Files**:
- `src/core/memory/deduplication.test.ts` (enhance)

**Description**: Add edge case tests for memory deduplication logic.

**Additional Test Cases**:
- Unicode and emoji handling
- Very large content (near limit)
- Concurrent deduplication requests
- Empty/null content handling
- Metadata edge cases

**Target**: 8-10 additional tests

**Acceptance Criteria**:
- Edge cases covered
- No deduplication bugs found
- All tests passing

---

## Phase 4 Execution Plan

### Parallel Execution Strategy (3 Agents)

**Agent 1** (Error Handling Specialist):
- EH-3: Enhanced Error Messages (1h)
- EH-4: Timeout Handling (1.5h)
**Total**: 2.5 hours

**Agent 2** (Code Quality Specialist):
- CQ-1: Extract Constants (1h)
- EH-5: Retry Logic Enhancement (1.5h)
**Total**: 2.5 hours

**Agent 3** (Testing Specialist):
- TEST-1: CLI Command Error Tests (2-3h)
**Total**: 2-3 hours

**Stretch Goals** (If time permits, assign to available agent):
- CQ-2: Reduce Function Complexity (1-2h)
- TEST-2: Memory Deduplication Edge Cases (1h)

---

## Success Criteria

### Must-Have (Core 5)
- [x] EH-3: Enhanced Error Messages
- [x] CQ-1: Extract Constants
- [x] TEST-1: CLI Command Tests
- [x] EH-4: Timeout Handling
- [x] EH-5: Retry Logic Enhancement

### Nice-to-Have (Stretch)
- [ ] CQ-2: Function Complexity
- [ ] TEST-2: Deduplication Tests

### Quality Gates
- [ ] Test count increases to 330+ (from 294)
- [ ] All tests passing (100%)
- [ ] TypeScript compilation clean
- [ ] ESLint passes with no errors
- [ ] Validation passes: `npm run validate`
- [ ] No regressions in existing functionality

---

## Metrics Targets

| Metric | Before Phase 4 | Target After Phase 4 |
|--------|----------------|----------------------|
| Improvements Completed | 9/44 (20.5%) | 14/44 (31.8%) |
| Test Count | 294 | 330+ |
| Test Pass Rate | 100% | 100% |
| Magic Numbers | ~15 | 0 |
| CLI Command Test Coverage | 0% | 80%+ |
| Error Message Quality | Basic | Enhanced with context |

---

## Risk Mitigation

**Risk 1**: Agent coordination overhead
- Mitigation: Clear task boundaries, independent work streams

**Risk 2**: Test flakiness
- Mitigation: Use proper mocking, deterministic tests

**Risk 3**: Breaking changes
- Mitigation: Run validation after each improvement

**Risk 4**: Time overruns
- Mitigation: Focus on core 5, defer stretch goals

---

## Execution Timeline

**Hour 0-1**:
- All agents: Setup and planning
- Agent 1: Start EH-3
- Agent 2: Start CQ-1
- Agent 3: Start TEST-1

**Hour 1-2**:
- Agent 1: Complete EH-3, start EH-4
- Agent 2: Complete CQ-1, start EH-5
- Agent 3: Continue TEST-1

**Hour 2-3**:
- Agent 1: Complete EH-4
- Agent 2: Complete EH-5
- Agent 3: Complete TEST-1

**Hour 3+** (If time/resources available):
- Available agent: CQ-2 or TEST-2

---

## Notes

- Each improvement must include tests
- Run `npm run validate` after each improvement
- Fix any issues immediately before proceeding
- Document any deferred work
- Update PHASE4_REPORT.md with results
