# LLM Daily Dashboard - Complete Feature Plan

**Created**: 2025-10-27
**Version**: 1.0
**Scope**: Overnight Implementation (8 hours)

---

## Executive Summary

- **Total Features Identified**: 28
- **Estimated Total Effort**: 47-95 hours (full scope)
- **Priority Breakdown**:
  - 🔴 **P0 Critical**: 6 features (12-24h)
  - 🟠 **P1 High**: 8 features (14-28h)
  - 🟡 **P2 Medium**: 9 features (15-30h)
  - 🟢 **P3 Low**: 5 features (6-13h)
- **Recommended Overnight Scope**: 6-8 P0+P1 features (~8-12h actual work)

**Current State Analysis**:
- ✅ **Implemented**: Tailwind styling, two-tab interface, result cards, config table, responsive design
- ❌ **Critical Gaps**: No full result viewing, no manual triggers, static data only
- 🎯 **User Blockers**: Cannot view complete outputs, cannot trigger jobs, no real-time status

---

## Feature Backlog

### 🔴 Core Features (Must-Have - P0)

#### [F001] View Full Result Modal
**Priority**: P0 (Critical - User Request #1)
**Effort**: M (2-4 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Display complete LLM output in a modal/overlay when user clicks "View Full Result"

**User Value**: Users cannot see full results currently (only 200-char preview). This is a critical UX blocker.

**Technical Approach**:
- Add modal component to `dashboard/index.html` with Tailwind classes
- Fetch result file from `tasks/{taskName}/results/{date}.md` on click
- Render markdown using simple markdown parser or raw text display
- Add copy-to-clipboard and download functionality
- Support keyboard navigation (Escape to close, Arrow keys for prev/next)
- Mobile-responsive modal with proper scrolling

**Implementation Files**:
- `dashboard/index.html` - Add modal HTML structure
- `dashboard/assets/js/dashboard.js` - Add modal logic and event handlers
- `dashboard/assets/css/modal.css` (optional) - Custom modal styles if needed

**Acceptance Criteria**:
- ✅ Click "View Full Result" opens modal overlay
- ✅ Complete result text displayed with proper formatting
- ✅ Metadata shown (timestamp, tokens, cost, duration)
- ✅ Copy to clipboard works (with success feedback)
- ✅ Download as `.md` file works
- ✅ Modal closes on Escape, backdrop click, or X button
- ✅ Responsive on mobile (full-screen on small screens)
- ✅ Navigate between results with prev/next buttons
- ✅ Loading state while fetching result file

**Testing Checklist**:
- [ ] Open modal for each task result
- [ ] Copy full result text
- [ ] Download result as file
- [ ] Close modal with Escape key
- [ ] Navigate between results
- [ ] Test on mobile viewport
- [ ] Test with missing result file (error handling)

---

#### [F002] Manual Job Trigger (GitHub Actions API)
**Priority**: P0 (Critical - User Request #2)
**Effort**: L (4-8 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Allow users to manually trigger GitHub Actions workflows from the dashboard

**User Value**: Currently requires going to GitHub UI. Direct trigger from dashboard streamlines workflow testing.

**Technical Approach**:
1. **Authentication**: Use GitHub Personal Access Token (PAT)
   - User provides PAT via settings (stored in localStorage)
   - Or use GitHub App installation (more complex)
2. **API Integration**: GitHub REST API `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`
3. **UI Flow**:
   - Add "Run Job" button to each result card and config row
   - Show confirmation dialog before triggering
   - Display progress spinner during API call
   - Show success/error toast notification
4. **Rate Limiting**: Implement client-side rate limiting (1 trigger per job per 30 seconds)

**Implementation Files**:
- `dashboard/index.html` - Add "Run Job" buttons, auth settings modal
- `dashboard/assets/js/dashboard.js` - Add trigger logic
- `dashboard/assets/js/github-api.js` (new) - GitHub API client wrapper

**Acceptance Criteria**:
- ✅ "Run Job" button appears on each task card and config row
- ✅ Click opens confirmation dialog with job details
- ✅ User can provide GitHub PAT via settings (masked input)
- ✅ API call triggers workflow dispatch successfully
- ✅ Success toast shows "Job triggered successfully"
- ✅ Error handling for auth failures, network issues, rate limits
- ✅ Loading state during API call (disable button, show spinner)
- ✅ PAT stored securely in localStorage (not exposed in code)
- ✅ Rate limiting prevents spam triggers

**Testing Checklist**:
- [ ] Trigger job without PAT (should prompt for auth)
- [ ] Trigger job with invalid PAT (should show error)
- [ ] Trigger job successfully (check GitHub Actions tab)
- [ ] Rapid consecutive triggers (should rate limit)
- [ ] Network failure handling
- [ ] Test on mobile (button positioning)

**Security Considerations**:
- ⚠️ PAT stored in localStorage (client-side only)
- ⚠️ Use `repo` scope PAT (minimal permissions)
- ⚠️ Mask PAT input field
- ⚠️ Add warning about PAT security

---

#### [F003] Real-Time Workflow Status Polling
**Priority**: P0 (Critical - User Request #2 dependency)
**Effort**: M (2-4 hours)
**Dependencies**: F002 (Manual Trigger)
**Status**: ❌ Not Started

**Description**: Poll GitHub Actions API to show live workflow execution status

**User Value**: After triggering a job, users need to see if it's running, succeeded, or failed without manual refresh.

**Technical Approach**:
1. **Polling Logic**:
   - After job trigger, start polling workflow runs API
   - Poll interval: 5 seconds during run, 30 seconds if idle
   - Stop polling when status is `completed`, `failure`, or `cancelled`
2. **Status Display**:
   - Add status badge to result cards: Running 🔄, Success ✅, Failed ❌
   - Show progress bar or spinner for running jobs
   - Display workflow logs link
3. **Auto-Refresh**: When job completes, refresh analytics data automatically

**Implementation Files**:
- `dashboard/assets/js/github-api.js` - Add polling functions
- `dashboard/assets/js/dashboard.js` - Integrate status updates into UI
- `dashboard/index.html` - Update card templates with status badges

**Acceptance Criteria**:
- ✅ After triggering job, status changes to "Running 🔄"
- ✅ Status updates every 5 seconds while running
- ✅ When complete, status shows "Success ✅" or "Failed ❌"
- ✅ Analytics data refreshes automatically on completion
- ✅ Polling stops when job finishes or user leaves page
- ✅ Link to GitHub Actions logs displayed
- ✅ Visual indicator shows last update time

**Testing Checklist**:
- [ ] Trigger job and watch status update in real-time
- [ ] Leave page and return (polling should resume)
- [ ] Multiple jobs running simultaneously
- [ ] Failed job shows error status
- [ ] Cancelled job handled correctly

---

#### [F004] Error Display System
**Priority**: P0 (Critical)
**Effort**: S (1-2 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Comprehensive error logging and display for failed jobs

**User Value**: Currently no visibility into why jobs fail. Essential for debugging.

**Technical Approach**:
- Parse GitHub Actions logs for errors
- Extract error messages from workflow failures
- Display errors in result cards with expandable details
- Add "View Logs" button linking to GitHub Actions run
- Store last 5 errors per task in analytics

**Implementation Files**:
- `dashboard/assets/js/dashboard.js` - Error display logic
- `dashboard/index.html` - Error UI components
- `dist/scripts/build-dashboard-data.js` - Track errors in analytics

**Acceptance Criteria**:
- ✅ Failed jobs show error badge and message
- ✅ Error details expandable/collapsible
- ✅ Link to full GitHub Actions logs
- ✅ Recent errors visible in config tab
- ✅ Error count badge on failed tasks

**Testing Checklist**:
- [ ] Trigger failing job (invalid API key)
- [ ] View error message in dashboard
- [ ] Click to expand full error
- [ ] Link to GitHub logs works

---

#### [F005] Result File Fetching & Caching
**Priority**: P0 (Critical - F001 dependency)
**Effort**: M (2-4 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Robust system to fetch, cache, and display result files from GitHub

**User Value**: Required for F001 (full result modal). Prevents redundant fetches.

**Technical Approach**:
- Fetch result files from `tasks/{taskName}/results/{date}.md` via GitHub raw content URL
- Implement browser caching (Cache-Control headers)
- Add in-memory cache for current session
- Handle missing files gracefully (404)
- Support markdown rendering (optional: use marked.js)

**Implementation Files**:
- `dashboard/assets/js/result-fetcher.js` (new) - Result fetching logic
- `dashboard/assets/js/cache.js` (new) - Simple cache wrapper

**Acceptance Criteria**:
- ✅ Fetch result file from GitHub raw URL
- ✅ Cache results in memory (session-scoped)
- ✅ Handle 404 gracefully (show "Result not found")
- ✅ Display loading spinner while fetching
- ✅ Markdown rendering (if `.md` file)
- ✅ Error handling for network failures

**Testing Checklist**:
- [ ] Fetch existing result file
- [ ] Fetch missing file (404 handling)
- [ ] Open same result twice (should use cache)
- [ ] Test with large result files (>100KB)
- [ ] Network failure simulation

---

#### [F006] Analytics Data Auto-Refresh
**Priority**: P0 (Critical)
**Effort**: S (1-2 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Auto-refresh analytics data from GitHub Pages on interval or after job completion

**User Value**: Dashboard shows stale data unless manually refreshed. Essential for real-time monitoring.

**Technical Approach**:
- Fetch `dashboard/data/analytics.json` on interval (60 seconds default)
- Trigger immediate refresh after job completion (F003 integration)
- Show "Last updated X seconds ago" indicator
- Add manual refresh button
- Implement smart polling (pause when tab inactive)

**Implementation Files**:
- `dashboard/assets/js/dashboard.js` - Add refresh logic
- `dashboard/index.html` - Add refresh button and timestamp

**Acceptance Criteria**:
- ✅ Auto-refresh every 60 seconds
- ✅ Immediate refresh after job completion
- ✅ "Last updated X ago" timestamp visible
- ✅ Manual refresh button works
- ✅ Polling pauses when tab hidden
- ✅ No flickering during refresh (smooth updates)

**Testing Checklist**:
- [ ] Wait 60 seconds, verify auto-refresh
- [ ] Trigger job, verify immediate refresh on completion
- [ ] Click manual refresh button
- [ ] Switch to another tab (polling should pause)
- [ ] Return to tab (polling should resume)

---

### 🟠 Enhanced Features (Should-Have - P1)

#### [F007] Job History Timeline
**Priority**: P1 (High)
**Effort**: M (2-4 hours)
**Dependencies**: F006 (Analytics Refresh)
**Status**: ❌ Not Started

**Description**: Visual timeline showing recent job executions with status indicators

**User Value**: Understand job execution patterns, identify failures over time.

**Technical Approach**:
- Display last 10 runs per task in chronological order
- Use timeline UI component with status badges
- Show timestamp, duration, tokens used
- Click to view that run's result
- Group by date (today, yesterday, last 7 days)

**Implementation Files**:
- `dashboard/index.html` - Add timeline component
- `dashboard/assets/js/dashboard.js` - Render timeline
- `dist/scripts/build-dashboard-data.js` - Track run history in analytics

**Acceptance Criteria**:
- ✅ Timeline shows last 10 runs per task
- ✅ Status badges (success/failure/running)
- ✅ Timestamps in relative format (2 hours ago)
- ✅ Click run to view that result
- ✅ Grouped by date sections
- ✅ Responsive on mobile (vertical timeline)

---

#### [F008] Cost Analytics Chart
**Priority**: P1 (High)
**Effort**: M (2-4 hours)
**Dependencies**: F006 (Analytics Refresh)
**Status**: ❌ Not Started

**Description**: Chart showing cost trends over time (daily/weekly/monthly)

**User Value**: Monitor spending, identify expensive tasks, budget planning.

**Technical Approach**:
- Use Chart.js or lightweight alternative (e.g., uPlot, Apex Charts)
- Display daily cost trend (last 30 days)
- Breakdown by task (stacked bar chart)
- Show total cost, average daily cost
- Toggle between daily/weekly/monthly views

**Implementation Files**:
- `dashboard/index.html` - Add chart container
- `dashboard/assets/js/charts.js` (new) - Chart rendering logic
- Include Chart.js from CDN

**Acceptance Criteria**:
- ✅ Line chart showing daily costs
- ✅ Breakdown by task (color-coded)
- ✅ Total cost displayed
- ✅ Toggle daily/weekly/monthly views
- ✅ Responsive chart on mobile
- ✅ Tooltip shows exact values on hover

---

#### [F009] Token Usage Visualization
**Priority**: P1 (High)
**Effort**: M (2-4 hours)
**Dependencies**: F008 (Cost Chart - share charting library)
**Status**: ❌ Not Started

**Description**: Visualize token consumption patterns (input/output ratio, trends)

**User Value**: Optimize prompts, identify inefficient tasks, understand usage patterns.

**Technical Approach**:
- Stacked bar chart: input vs output tokens per task
- Line chart: token usage trend over time
- Efficiency metrics: avg tokens per run, input/output ratio
- Highlight anomalies (sudden spikes)

**Implementation Files**:
- `dashboard/assets/js/charts.js` - Add token charts
- `dashboard/index.html` - Add token chart container

**Acceptance Criteria**:
- ✅ Stacked bar chart (input vs output)
- ✅ Token trend over time
- ✅ Efficiency metrics displayed
- ✅ Color-coded by task
- ✅ Tooltip with exact token counts

---

#### [F010] Search & Filter System
**Priority**: P1 (High)
**Effort**: M (2-4 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Search tasks by name, filter by status, date range, cost

**User Value**: Quickly find specific tasks or results in large dashboards.

**Technical Approach**:
- Add search input with debounced filtering (300ms)
- Filter dropdowns: status (success/failure/all), date range
- Filter by cost range (slider or input)
- Combine multiple filters (AND logic)
- URL state sync (query parameters)

**Implementation Files**:
- `dashboard/index.html` - Add search/filter UI
- `dashboard/assets/js/filters.js` (new) - Filter logic

**Acceptance Criteria**:
- ✅ Search by task name (real-time)
- ✅ Filter by status (dropdown)
- ✅ Filter by date range (date pickers)
- ✅ Filter by cost range (slider)
- ✅ Multiple filters work together
- ✅ URL updates with filter state
- ✅ "Clear filters" button

---

#### [F011] Export Results (CSV/JSON)
**Priority**: P1 (High)
**Effort**: S (1-2 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Export analytics data or individual results to CSV/JSON files

**User Value**: Analyze data in Excel/Sheets, backup results, reporting.

**Technical Approach**:
- Add "Export" button with dropdown (CSV, JSON)
- Generate CSV from analytics data client-side
- Trigger browser download
- Support exporting all data or filtered subset
- Include metadata (export date, version)

**Implementation Files**:
- `dashboard/assets/js/export.js` (new) - Export logic
- `dashboard/index.html` - Add export button

**Acceptance Criteria**:
- ✅ Export all analytics as CSV
- ✅ Export all analytics as JSON
- ✅ Export filtered results only
- ✅ CSV includes headers
- ✅ Proper filename with timestamp
- ✅ Works in all major browsers

---

#### [F012] Notification System for Failures
**Priority**: P1 (High)
**Effort**: M (2-4 hours)
**Dependencies**: F003 (Status Polling)
**Status**: ❌ Not Started

**Description**: Browser notifications when jobs fail (if dashboard is open)

**User Value**: Immediate awareness of failures without constant monitoring.

**Technical Approach**:
- Request notification permission on first visit
- Send browser notification on job failure
- Play subtle sound (optional)
- Show notification count badge
- Notification includes task name, error summary
- Settings to enable/disable notifications

**Implementation Files**:
- `dashboard/assets/js/notifications.js` (new) - Notification logic
- `dashboard/index.html` - Add notification settings

**Acceptance Criteria**:
- ✅ Request notification permission
- ✅ Send notification on job failure
- ✅ Notification shows task name and error
- ✅ Click notification opens dashboard
- ✅ Settings to toggle notifications
- ✅ Works when dashboard tab is open

---

#### [F013] Performance Metrics Display
**Priority**: P1 (High)
**Effort**: S (1-2 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Show execution time, response time metrics per task

**User Value**: Identify slow tasks, optimize performance.

**Technical Approach**:
- Track execution time in workflow runs
- Calculate average, min, max response times
- Display in config table and result cards
- Add performance badge (fast/slow)
- Track trends over time

**Implementation Files**:
- `dist/scripts/build-dashboard-data.js` - Calculate metrics
- `dashboard/assets/js/dashboard.js` - Display metrics

**Acceptance Criteria**:
- ✅ Execution time shown per run
- ✅ Average response time per task
- ✅ Min/max response times
- ✅ Performance badge (fast <10s, slow >60s)
- ✅ Trend indicator (improving/degrading)

---

#### [F014] Markdown Rendering for Results
**Priority**: P1 (High)
**Effort**: S (1-2 hours)
**Dependencies**: F001 (Full Result Modal)
**Status**: ❌ Not Started

**Description**: Render markdown-formatted results with syntax highlighting

**User Value**: Better readability, formatted code blocks, links clickable.

**Technical Approach**:
- Use marked.js (lightweight markdown parser)
- Add syntax highlighting with Prism.js or highlight.js
- Render in modal with styled markdown CSS
- Sanitize HTML to prevent XSS

**Implementation Files**:
- `dashboard/index.html` - Include marked.js from CDN
- `dashboard/assets/js/dashboard.js` - Render markdown
- `dashboard/assets/css/markdown.css` (optional) - Markdown styles

**Acceptance Criteria**:
- ✅ Markdown rendered correctly (headings, lists, links)
- ✅ Code blocks syntax highlighted
- ✅ Links are clickable
- ✅ Tables rendered properly
- ✅ HTML sanitized (no XSS)
- ✅ Fallback to plain text if parsing fails

---

### 🟡 Quality-of-Life Features (Nice-to-Have - P2)

#### [F015] Comparison View (Compare Runs)
**Priority**: P2 (Medium)
**Effort**: M (2-4 hours)
**Dependencies**: F007 (Job History)
**Status**: ❌ Not Started

**Description**: Side-by-side comparison of two job runs

**User Value**: Analyze changes in output, token usage, cost differences.

**Technical Approach**:
- Select two runs from history timeline
- Display side-by-side diff view
- Highlight differences in output text
- Compare metrics (tokens, cost, duration)
- Use diff algorithm (e.g., jsdiff library)

---

#### [F016] Dark Mode Toggle
**Priority**: P2 (Medium)
**Effort**: XS (<1 hour)
**Dependencies**: None
**Status**: ⚠️ Partial (utilities exist, no toggle UI)

**Description**: Manual dark mode toggle button

**User Value**: User preference, accessibility, eye strain reduction.

**Technical Approach**:
- Add toggle button in navbar
- Use existing Tailwind dark mode classes
- Store preference in localStorage
- Respect system preference by default

**Implementation Files**:
- `dashboard/index.html` - Add toggle button
- `dashboard/assets/js/theme.js` - Toggle logic (may already exist)

**Acceptance Criteria**:
- ✅ Toggle button in navbar
- ✅ Smooth transition between modes
- ✅ Preference persisted in localStorage
- ✅ Defaults to system preference

---

#### [F017] Task Configuration Editor
**Priority**: P2 (Medium)
**Effort**: L (4-8 hours)
**Dependencies**: F002 (GitHub API integration)
**Status**: ❌ Not Started

**Description**: Edit task config, prompt, schedule directly from dashboard

**User Value**: No need to edit files manually, beginner-friendly.

**Technical Approach**:
- Load task config via GitHub API
- Inline editor for prompt.md (textarea or CodeMirror)
- Form inputs for schedule, model, etc.
- Save changes via GitHub API (commit)
- Validate configuration before saving

---

#### [F018] Webhook Configuration UI
**Priority**: P2 (Medium)
**Effort**: M (2-4 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Configure webhook destinations for task results

**User Value**: Send results to Slack, Discord, email, custom endpoints.

**Technical Approach**:
- Add webhook settings per task
- Support Slack, Discord, generic webhooks
- Test webhook button
- Store webhook URLs securely (encrypted)

---

#### [F019] Scheduled Task Calendar View
**Priority**: P2 (Medium)
**Effort**: M (2-4 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Calendar showing when tasks will run next

**User Value**: Visualize schedule, avoid overlaps, plan capacity.

**Technical Approach**:
- Parse cron schedules to next 30 days
- Display in calendar grid (use FullCalendar.js or custom)
- Click date to see tasks scheduled
- Highlight today and current time

---

#### [F020] Task Duplication
**Priority**: P2 (Medium)
**Effort**: S (1-2 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Clone existing task to create new one

**User Value**: Faster task creation, reuse prompts and configurations.

**Technical Approach**:
- "Duplicate" button on config row
- Copy config, prompt, memory files
- Prompt for new task name
- Generate workflow automatically

---

#### [F021] Cost Budget Alerts
**Priority**: P2 (Medium)
**Effort**: M (2-4 hours)
**Dependencies**: F008 (Cost Analytics)
**Status**: ❌ Not Started

**Description**: Set monthly budget, show alerts when approaching limit

**User Value**: Cost control, prevent unexpected bills.

**Technical Approach**:
- User sets monthly budget in settings
- Track total cost vs budget
- Show progress bar (% of budget used)
- Alert at 80%, 90%, 100% thresholds
- Display days remaining in month

---

#### [F022] Advanced Filtering (Tags, Labels)
**Priority**: P2 (Medium)
**Effort**: M (2-4 hours)
**Dependencies**: F010 (Search/Filter), F017 (Config Editor)
**Status**: ❌ Not Started

**Description**: Add tags/labels to tasks, filter by them

**User Value**: Organize tasks by category (news, monitoring, research).

**Technical Approach**:
- Add `tags` field to task config
- Tag input with autocomplete
- Filter by tags (multi-select)
- Tag badges on result cards

---

#### [F023] Keyboard Shortcuts
**Priority**: P2 (Medium)
**Effort**: S (1-2 hours)
**Dependencies**: None
**Status**: ❌ Not Started

**Description**: Keyboard shortcuts for common actions

**User Value**: Power user efficiency, accessibility.

**Technical Approach**:
- `/` to focus search
- `r` to refresh
- `Escape` to close modal
- `1`, `2` to switch tabs
- `?` to show shortcut help

---

### 🟢 Future Enhancements (Could-Have - P3)

#### [F024] Multi-Repo Support
**Priority**: P3 (Low)
**Effort**: L (4-8 hours)
**Dependencies**: F002 (GitHub API)
**Status**: ❌ Not Started

**Description**: Manage tasks across multiple GitHub repositories

---

#### [F025] Result Sharing (Public Links)
**Priority**: P3 (Low)
**Effort**: M (2-4 hours)
**Dependencies**: F001 (Full Result Modal)
**Status**: ❌ Not Started

**Description**: Generate shareable links to individual results

---

#### [F026] AI-Powered Insights
**Priority**: P3 (Low)
**Effort**: XL (8+ hours)
**Dependencies**: F008, F009 (Analytics Charts)
**Status**: ❌ Not Started

**Description**: LLM-powered insights on cost optimization, performance improvements

---

#### [F027] Task Dependencies (DAG)
**Priority**: P3 (Low)
**Effort**: XL (8+ hours)
**Dependencies**: F002 (Manual Trigger)
**Status**: ❌ Not Started

**Description**: Define task dependencies, trigger chains

---

#### [F028] Browser Extension
**Priority**: P3 (Low)
**Effort**: XL (8+ hours)
**Dependencies**: F012 (Notifications)
**Status**: ❌ Not Started

**Description**: Browser extension for quick access, notifications

---

## Implementation Phases

### 🌙 Phase 1: Critical Foundations (Hours 0-3)

**Goal**: Enable core functionality blocking user workflows

**Features**:
1. **[F001] View Full Result Modal** (2-4h) 🔴 P0
   - **Why First**: User request #1, critical UX gap, no dependencies
   - **Risk**: Modal UX complexity on mobile
   - **Milestone**: Users can view complete task outputs

2. **[F005] Result File Fetching** (2-4h) 🔴 P0
   - **Why Now**: Required for F001, foundation for other features
   - **Risk**: GitHub API rate limits
   - **Milestone**: Reliable result loading system

3. **[F004] Error Display System** (1-2h) 🔴 P0
   - **Why Now**: Essential for debugging, quick to implement
   - **Risk**: Low complexity
   - **Milestone**: Visibility into job failures

**Phase 1 Total**: 5-10 hours
**Phase 1 Output**: Users can view full results and understand failures

---

### 🌅 Phase 2: Real-Time Capabilities (Hours 3-6)

**Goal**: Enable manual triggering and live monitoring

**Features**:
4. **[F006] Analytics Auto-Refresh** (1-2h) 🔴 P0
   - **Why Now**: Foundation for real-time features
   - **Risk**: Polling performance
   - **Milestone**: Live data updates

5. **[F002] Manual Job Trigger** (4-8h) 🔴 P0
   - **Why Now**: User request #2, high value
   - **Risk**: GitHub API auth complexity
   - **Milestone**: Trigger jobs from dashboard

6. **[F003] Real-Time Status Polling** (2-4h) 🔴 P0
   - **Why Now**: Completes F002 workflow
   - **Risk**: Polling management complexity
   - **Milestone**: Live job execution monitoring

**Phase 2 Total**: 7-14 hours
**Phase 2 Output**: Complete manual trigger + monitoring workflow

---

### ☀️ Phase 3: Enhanced UX (Hours 6-8+)

**Goal**: Polish user experience and add high-value features

**Features**:
7. **[F014] Markdown Rendering** (1-2h) 🟠 P1
   - **Why Now**: Enhances F001, quick win
   - **Risk**: Markdown parser edge cases
   - **Milestone**: Beautiful result display

8. **[F013] Performance Metrics** (1-2h) 🟠 P1
   - **Why Now**: Quick analytics enhancement
   - **Risk**: Low complexity
   - **Milestone**: Performance visibility

9. **[F016] Dark Mode Toggle** (<1h) 🟡 P2
   - **Why Now**: Quick polish, high user satisfaction
   - **Risk**: None (utilities exist)
   - **Milestone**: Theme customization

10. **[F007] Job History Timeline** (2-4h) 🟠 P1
    - **Why Now**: High value, builds on analytics
    - **Risk**: UI complexity
    - **Milestone**: Historical visibility

**Phase 3 Total**: 5-9 hours
**Phase 3 Output**: Polished, production-ready dashboard

---

### 🌤️ Phase 4: Advanced Features (Stretch Goals)

**Goal**: Analytics, optimization, power user features

**Features** (if time permits):
11. **[F008] Cost Analytics Chart** (2-4h) 🟠 P1
12. **[F009] Token Usage Visualization** (2-4h) 🟠 P1
13. **[F010] Search & Filter** (2-4h) 🟠 P1
14. **[F011] Export Results** (1-2h) 🟠 P1
15. **[F012] Notification System** (2-4h) 🟠 P1

**Phase 4 Total**: 9-18 hours
**Phase 4 Output**: Advanced analytics and productivity tools

---

## Risk Assessment

### 🔴 High Risk

#### GitHub Actions API Authentication
- **Risk**: PAT storage security, OAuth complexity
- **Impact**: F002 Manual Trigger blocked
- **Mitigation**:
  - Use localStorage with encryption
  - Add clear security warnings
  - Document PAT creation with minimal scopes
  - Consider GitHub App installation (complex but secure)

#### Real-Time Polling Rate Limits
- **Risk**: GitHub API rate limits (60 req/hour unauthenticated, 5000/hour authenticated)
- **Impact**: F003 Status Polling may fail
- **Mitigation**:
  - Implement exponential backoff
  - Smart polling intervals (5s active, 30s idle)
  - Cache responses
  - Pause polling when tab inactive

#### Result File Size & Performance
- **Risk**: Large result files (>1MB) slow down modal
- **Impact**: F001 Full Result Modal lag
- **Mitigation**:
  - Implement pagination for large files
  - Add lazy loading for content
  - Show file size warning before loading
  - Compress/truncate very large outputs

---

### 🟡 Medium Risk

#### Modal UI Complexity on Mobile
- **Risk**: Modal UX breaks on small screens
- **Impact**: F001 unusable on mobile
- **Mitigation**:
  - Use full-screen modal on mobile
  - Test thoroughly on various viewports
  - Add touch gestures (swipe to close)

#### Chart Library Integration
- **Risk**: Chart.js bundle size, performance
- **Impact**: F008, F009 slow page load
- **Mitigation**:
  - Use lightweight alternative (uPlot, Apex Charts)
  - Lazy load charts (only when tab visible)
  - Consider custom SVG charts for simple needs

#### Markdown Rendering Edge Cases
- **Risk**: XSS vulnerabilities, parsing errors
- **Impact**: F014 security/reliability issues
- **Mitigation**:
  - Use battle-tested library (marked.js)
  - Enable HTML sanitization
  - Test with malformed markdown
  - Fallback to plain text on error

---

### 🟢 Low Risk

#### Browser Compatibility
- **Risk**: Features work in Chrome but not Safari/Firefox
- **Impact**: Some users cannot use dashboard
- **Mitigation**:
  - Use standard Web APIs
  - Test in all major browsers
  - Polyfill if needed

#### GitHub Pages Deployment Lag
- **Risk**: Dashboard updates delayed (2-3 minutes)
- **Impact**: F006 auto-refresh shows stale data
- **Mitigation**:
  - Document expected delay
  - Show clear "last updated" timestamp
  - Consider GitHub API as live data source

---

## Success Metrics

### 🎯 Minimum Viable Dashboard (MVP)

**Must Complete** (8-hour overnight target):
- ✅ All P0 features functional (F001-F006)
- ✅ No critical bugs or errors
- ✅ Responsive on mobile (iPhone, Android)
- ✅ Works in Chrome, Firefox, Safari
- ✅ GitHub Actions integration working end-to-end
- ✅ Documentation updated (README, usage guide)

**Quality Gates**:
- [ ] Manual test checklist completed (all P0 features)
- [ ] No console errors on page load
- [ ] Lighthouse performance score >80
- [ ] Mobile viewport tested
- [ ] Cross-browser tested (Chrome, Firefox)
- [ ] Security review (PAT handling, XSS)

---

### 🚀 Stretch Goals

**If Time Permits** (10-12 hour scenario):
- ✅ 50%+ of P1 features complete
- ✅ One analytics chart implemented (F008 or F009)
- ✅ Dark mode toggle (F016)
- ✅ Markdown rendering (F014)
- ✅ Job history timeline (F007)

**Quality Enhancements**:
- [ ] Loading states on all async operations
- [ ] Smooth animations/transitions
- [ ] Accessibility audit (ARIA labels, keyboard nav)
- [ ] Performance optimization (code splitting, caching)

---

### 📊 Success Criteria

#### Feature Completion
- **P0 Critical**: 100% (6/6 features)
- **P1 High**: 25-50% (2-4/8 features)
- **P2 Medium**: 0-25% (0-2/9 features)
- **Overall Progress**: 30-40% of total backlog

#### Quality Metrics
- **Test Coverage**: All P0 features manually tested
- **Performance**: Page load <2s, modal open <500ms
- **Accessibility**: Keyboard navigation works, screen reader friendly
- **Security**: No exposed secrets, XSS protection enabled

#### User Experience
- **Mobile**: Full functionality on mobile devices
- **Error Handling**: Graceful failures with clear messages
- **Loading States**: Spinners/skeletons for all async ops
- **Feedback**: Success/error toasts for user actions

---

## Recommended Overnight Scope (8-Hour Plan)

### 🎯 Priority Execution Order

**Hours 0-3** (Phase 1 - Critical):
1. **[F005] Result File Fetching** (2-3h) - Foundation
2. **[F001] View Full Result Modal** (3-4h) - User Request #1
3. **[F004] Error Display** (1h) - Quick debugging win

**Hours 3-6** (Phase 2 - Real-Time):
4. **[F006] Analytics Auto-Refresh** (1h) - Foundation
5. **[F002] Manual Job Trigger** (4-6h) - User Request #2
6. **[F003] Real-Time Status** (2-3h) - Completes trigger workflow

**Hours 6-8** (Phase 3 - Polish):
7. **[F014] Markdown Rendering** (1h) - Quick enhancement
8. **[F016] Dark Mode Toggle** (30min) - Easy win
9. **[F013] Performance Metrics** (1h) - Analytics bonus

**Buffer** (1-2h): Testing, debugging, documentation

---

### 📝 Pre-Implementation Checklist

**Before Starting**:
- [ ] Read full feature plan (this document)
- [ ] Review existing codebase structure
- [ ] Set up local development environment
- [ ] Create feature branch (`feature/dashboard-overnight`)
- [ ] Prepare test data (sample results, workflows)
- [ ] Review GitHub API documentation
- [ ] Set up testing tools (browser dev tools, mobile emulator)

**During Implementation**:
- [ ] Follow feature order (F005 → F001 → F004 → F006 → F002 → F003)
- [ ] Test each feature before moving to next
- [ ] Commit after each completed feature
- [ ] Update this plan with actuals (time spent, blockers)
- [ ] Document any deviations or new discoveries

**Post-Implementation**:
- [ ] Complete manual test checklist (all implemented features)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (responsive design)
- [ ] Security review (PAT handling, XSS)
- [ ] Update README with new features
- [ ] Create PR with detailed description
- [ ] Deploy to GitHub Pages
- [ ] Verify production deployment

---

## Technical Architecture Notes

### File Structure (Proposed)
```
dashboard/
├── index.html                    # Main dashboard page
├── assets/
│   ├── js/
│   │   ├── dashboard.js          # Core dashboard logic (existing)
│   │   ├── github-api.js         # GitHub API client (NEW)
│   │   ├── result-fetcher.js     # Result file fetching (NEW)
│   │   ├── cache.js              # Simple cache wrapper (NEW)
│   │   ├── notifications.js      # Browser notifications (NEW)
│   │   ├── charts.js             # Chart rendering (NEW)
│   │   ├── filters.js            # Search/filter logic (NEW)
│   │   ├── export.js             # Data export (NEW)
│   │   └── theme.js              # Theme toggle (existing)
│   └── css/
│       ├── modal.css             # Modal styles (NEW, optional)
│       └── markdown.css          # Markdown styles (NEW, optional)
├── data/
│   └── analytics.json            # Dashboard data (generated)
└── guide/
    └── index.html                # Usage guide (existing)
```

### Key Dependencies
- **Tailwind CSS**: Already included via CDN
- **Chart.js**: For analytics charts (F008, F009)
- **marked.js**: For markdown rendering (F014)
- **GitHub REST API**: For triggers, status, auth

### Data Flow
```
GitHub Actions → Commit Results → Build Dashboard Data → GitHub Pages
                                         ↓
                              dashboard/data/analytics.json
                                         ↓
                          Dashboard fetches + renders
                                         ↓
                        User triggers job → GitHub API
                                         ↓
                          Poll status → Update UI
```

---

## Appendix: Feature Dependencies Graph

```
F005 (Result Fetching)
  └─→ F001 (Full Result Modal)
       └─→ F014 (Markdown Rendering)
       └─→ F025 (Result Sharing)

F006 (Auto-Refresh)
  └─→ F003 (Status Polling)
  └─→ F007 (Job History)
  └─→ F008 (Cost Charts)
       └─→ F009 (Token Charts)
       └─→ F021 (Budget Alerts)

F002 (Manual Trigger)
  └─→ F003 (Status Polling)
       └─→ F012 (Notifications)
  └─→ F017 (Config Editor)
  └─→ F024 (Multi-Repo)

F010 (Search/Filter)
  └─→ F022 (Advanced Filtering)

F007 (Job History)
  └─→ F015 (Comparison View)

(No dependencies: F004, F011, F013, F016, F018, F019, F020, F023, F026, F027, F028)
```

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-27 | 1.0 | Initial feature plan | PM Agent |

---

## Next Steps

1. **Review Plan**: Team reviews and approves scope
2. **Setup Environment**: Prepare development tools
3. **Begin Phase 1**: Start with F005 (Result Fetching)
4. **Continuous Testing**: Test after each feature
5. **Document Progress**: Update plan with actuals
6. **Deploy**: Push to production after testing

---

**Questions or Clarifications?**
Contact: PM Agent (via this document)

**Good luck with overnight implementation! 🚀**
