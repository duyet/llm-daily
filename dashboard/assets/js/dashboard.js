// Dashboard main script - Claude.ai inspired

// Determine base path for GitHub Pages
const basePath = window.location.pathname.includes('llm-daily') ? '/llm-daily' : '';

// Global state
let analyticsData = null;
let currentModalTask = null;
let currentModalResult = null;
let autoRefreshInterval = null;
let lastUpdated = null;
let activeWorkflowPolling = new Map(); // Map of taskName -> polling interval

// Tab Management
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
}

// Load and display dashboard data
async function loadDashboard() {
  try {
    // Add timeout to prevent indefinite loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Load analytics data
      const response = await fetch(`${basePath}/dashboard/data/analytics.json?t=${Date.now()}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to load analytics: ${response.status} ${response.statusText}`);
      }

      analyticsData = await response.json();
      lastUpdated = new Date();

      // Render components
      renderResultsTab(analyticsData);
      renderConfigTab(analyticsData);

      // Update last updated display
      updateLastUpdatedDisplay();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - analytics data took too long to load');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError(error.message);
  }
}

// Render Tab 1: Results Dashboard
function renderResultsTab(analytics) {
  const container = document.getElementById('results-grid');

  const tasks = Object.entries(analytics.tasks || {}).map(([name, metrics]) => ({
    name,
    ...metrics
  }));

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No tasks yet</h3>
        <p class="text-sm">Create your first task to see results here</p>
      </div>
    `;
    return;
  }

  // Generate result cards with Tailwind classes and SVG icons
  container.innerHTML = tasks.map(task => {
    const statusClass = task.successRate >= 0.95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                       task.successRate >= 0.8 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                       'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    const statusIcon = task.successRate >= 0.95 ?
      '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' :
      task.successRate >= 0.8 ?
      '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>' :
      '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

    const timeAgo = task.lastRun ? formatTimeAgo(new Date(task.lastRun)) : 'Never';
    const resultPreview = task.latestResult?.preview || 'Result data will be available after the next run';

    return `
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all hover:shadow-md hover:border-purple-lighter shadow-sm" data-task="${task.name}">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">${formatTaskName(task.name)}</h3>
          <div class="status-badge">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}">
              ${statusIcon}
              ${(task.successRate * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ${timeAgo}
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            ${formatNumber(task.tokens)}
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            $${task.cost.toFixed(3)}
          </span>
        </div>

        <div class="bg-beige dark:bg-gray-700 rounded-md p-3 mb-3">
          <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Latest Result:</h4>
          <p class="text-xs leading-relaxed text-gray-900 dark:text-gray-100 max-h-16 overflow-hidden relative whitespace-pre-wrap result-preview-gradient">${escapeHtml(resultPreview)}</p>
        </div>

        <div class="workflow-link mb-2 text-center text-xs"></div>

        <div class="grid grid-cols-2 gap-2">
          <button class="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple border border-purple rounded-md transition-colors hover:bg-purple hover:text-white" onclick="viewFullResult('${task.name}')">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            View
          </button>
          <button class="run-now-btn flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple rounded-md transition-colors hover:bg-purple-light" onclick="triggerJob('${task.name}')">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Run
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render Tab 2: Configuration Table
function renderConfigTab(analytics) {
  const tbody = document.querySelector('#config-table tbody');

  const tasks = Object.entries(analytics.tasks || {}).map(([name, metrics]) => ({
    name,
    ...metrics
  }));

  if (tasks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-gray-500 dark:text-gray-400">
          <div class="flex flex-col items-center">
            <svg class="w-10 h-10 mb-2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-xs">No tasks configured yet</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tasks.map(task => {
    const statusClass = task.successRate >= 0.95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                       task.successRate >= 0.8 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                       'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    const statusText = task.successRate >= 0.95 ? 'Success' :
                      task.successRate >= 0.8 ? 'Warning' : 'Error';

    const timeAgo = task.lastRun ? formatTimeAgo(new Date(task.lastRun)) : 'Never';
    const schedule = formatSchedule(task.schedule || 'Daily');

    return `
      <tr class="cursor-pointer transition-colors hover:bg-beige dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0" onclick="viewTaskDetails('${task.name}')">
        <td class="px-3 py-2.5"><span class="font-semibold text-gray-900 dark:text-gray-100 text-xs">${formatTaskName(task.name)}</span></td>
        <td class="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">${schedule}</td>
        <td class="px-3 py-2.5"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}">${statusText}</span></td>
        <td class="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">${timeAgo}</td>
        <td class="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">${formatNumber(task.tokens)}</td>
        <td class="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">$${task.cost.toFixed(3)}</td>
        <td class="px-3 py-2.5">
          <button class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple border border-purple rounded-md transition-colors hover:bg-purple hover:text-white" onclick="event.stopPropagation(); viewTaskDetails('${task.name}')">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Helper Functions
function formatTaskName(name) {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatSchedule(schedule) {
  // Parse cron or display friendly schedule
  if (typeof schedule === 'string') {
    if (schedule.includes('*')) return 'Custom Schedule';
    return schedule;
  }
  return 'Daily';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Actions
async function viewFullResult(taskName) {
  currentModalTask = taskName;

  // Show modal immediately
  const modal = document.getElementById('result-modal');
  modal.classList.remove('hidden');

  // Update modal title
  document.getElementById('modal-task-name').textContent = `Full Result: ${formatTaskName(taskName)}`;

  // Show loading state
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = `
    <div class="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple mb-4"></div>
        <p class="text-sm">Loading result...</p>
      </div>
    </div>
  `;

  // Fetch result file
  try {
    const result = await fetchResultFile(taskName);

    if (!result.success) {
      // Show error
      modalContent.innerHTML = `
        <div class="text-center py-12">
          <span class="text-5xl mb-4 block">❌</span>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Failed to Load Result</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(result.error)}</p>
        </div>
      `;
      document.getElementById('modal-metadata').textContent = 'Error occurred';
      return;
    }

    // Store for copy/download
    currentModalResult = result;

    // Display result content
    modalContent.innerHTML = `
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <pre class="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100 bg-beige dark:bg-gray-700 p-4 rounded-lg">${escapeHtml(result.content)}</pre>
      </div>
    `;

    // Update metadata
    const metadata = result.metadata || {};
    const metadataParts = [];
    if (metadata.timestamp) metadataParts.push(`⏰ ${new Date(metadata.timestamp).toLocaleString()}`);
    if (metadata.tokens) metadataParts.push(`📊 ${metadata.tokens} tokens`);
    if (metadata.cost) metadataParts.push(`💰 $${metadata.cost}`);
    if (metadata.duration) metadataParts.push(`⚡ ${metadata.duration}s`);

    document.getElementById('modal-metadata').textContent =
      metadataParts.length > 0 ? metadataParts.join(' • ') : 'No metadata available';

  } catch (error) {
    console.error('Error loading result:', error);
    modalContent.innerHTML = `
      <div class="text-center py-12">
        <span class="text-5xl mb-4 block">❌</span>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Unexpected Error</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(error.message)}</p>
      </div>
    `;
    showToast('Failed to load result: ' + error.message, 'error');
  }
}

function closeResultModal() {
  const modal = document.getElementById('result-modal');
  modal.classList.add('hidden');
  currentModalTask = null;
  currentModalResult = null;
}

function copyResultToClipboard() {
  if (!currentModalResult || !currentModalResult.content) {
    showToast('No result to copy', 'warning');
    return;
  }

  navigator.clipboard.writeText(currentModalResult.content)
    .then(() => {
      showToast('Result copied to clipboard!', 'success');
    })
    .catch(error => {
      console.error('Copy failed:', error);
      showToast('Failed to copy to clipboard', 'error');
    });
}

function downloadResult() {
  if (!currentModalResult || !currentModalResult.content) {
    showToast('No result to download', 'warning');
    return;
  }

  const content = currentModalResult.content;
  const filename = `${currentModalTask}-${new Date().toISOString().split('T')[0]}.md`;

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Result downloaded!', 'success');
}

function viewTaskDetails(taskName) {
  // For now, show alert. Can be enhanced to open modal with full task details
  alert(`View details for: ${formatTaskName(taskName)}\n\nThis will show configuration, history, and full results.`);
}

// Error Display
function showError(message) {
  const container = document.getElementById('results-grid');
  container.innerHTML = `
    <div class="col-span-full text-center py-16 text-red-600 dark:text-red-400">
      <h3 class="text-xl font-semibold mb-2">Error Loading Dashboard</h3>
      <p class="text-sm">${escapeHtml(message)}</p>
      <button onclick="loadDashboard()" class="mt-6 px-6 py-2.5 text-sm font-medium text-white bg-purple rounded-lg transition-all hover:bg-purple-light">
        🔄 Retry
      </button>
    </div>
  `;
}

// Auto-refresh functionality
function startAutoRefresh(intervalSeconds = 30) {
  // Stop existing interval if any
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  // Start new interval
  autoRefreshInterval = setInterval(async () => {
    // Don't refresh if modal is open (UX consideration)
    const modal = document.getElementById('result-modal');
    if (!modal.classList.contains('hidden')) {
      console.log('[Auto-Refresh] Skipped - modal is open');
      return;
    }

    console.log('[Auto-Refresh] Refreshing analytics...');
    try {
      await loadDashboard();
      console.log('[Auto-Refresh] Success');
    } catch (error) {
      console.error('[Auto-Refresh] Failed:', error);
    }
  }, intervalSeconds * 1000);

  console.log(`[Auto-Refresh] Started (every ${intervalSeconds}s)`);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log('[Auto-Refresh] Stopped');
  }
}

function manualRefresh() {
  console.log('[Manual-Refresh] Triggered by user');
  showToast('Refreshing dashboard...', 'info', 2000);
  loadDashboard();
}

// Update last updated timestamp
function updateLastUpdatedDisplay() {
  if (!lastUpdated) return;

  const secondsAgo = Math.floor((new Date() - lastUpdated) / 1000);
  let timeAgo = '';

  if (secondsAgo < 60) {
    timeAgo = `${secondsAgo} seconds ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    timeAgo = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else {
    const hours = Math.floor(secondsAgo / 3600);
    timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  // Update display if element exists
  const element = document.getElementById('last-updated');
  if (element) {
    element.textContent = `Last updated: ${timeAgo}`;
  }
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // ESC - Close modal
    if (event.key === 'Escape') {
      const modal = document.getElementById('result-modal');
      if (!modal.classList.contains('hidden')) {
        closeResultModal();
      }
    }
  });
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initKeyboardShortcuts();

  // Load dashboard first before starting auto-refresh
  await loadDashboard();

  // Start auto-refresh only after initial load (every 30 seconds)
  startAutoRefresh(30);

  // Update "last updated" display every 10 seconds
  setInterval(updateLastUpdatedDisplay, 10000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
  // Stop all workflow polling
  for (const [taskName, interval] of activeWorkflowPolling) {
    clearInterval(interval);
  }
  activeWorkflowPolling.clear();
});

// ===========================
// GitHub API Integration (F002, F003)
// ===========================

// Settings Modal Functions
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.classList.remove('hidden');

  // Load existing token (masked)
  const token = getGitHubToken();
  const input = document.getElementById('github-token-input');
  if (token) {
    input.value = token;
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.classList.add('hidden');
}

function toggleTokenVisibility() {
  const input = document.getElementById('github-token-input');
  const showIcon = document.getElementById('token-toggle-icon-show');
  const hideIcon = document.getElementById('token-toggle-icon-hide');

  if (input.type === 'password') {
    input.type = 'text';
    showIcon.classList.add('hidden');
    hideIcon.classList.remove('hidden');
  } else {
    input.type = 'password';
    showIcon.classList.remove('hidden');
    hideIcon.classList.add('hidden');
  }
}

async function validateAndSaveToken() {
  const input = document.getElementById('github-token-input');
  const token = input.value.trim();

  if (!token) {
    showToast('Please enter a GitHub token', 'warning');
    return;
  }

  // Show loading
  showToast('Validating token...', 'info', 2000);

  // Save token first
  setGitHubToken(token);

  // Validate token
  try {
    const isValid = await validateToken();
    if (isValid) {
      showToast('Token validated and saved successfully!', 'success');
      closeSettingsModal();
    } else {
      showToast('Token validation failed. Please check your token.', 'error');
      clearGitHubToken();
    }
  } catch (error) {
    showToast('Token validation error: ' + error.message, 'error');
    clearGitHubToken();
  }
}

function clearToken() {
  if (confirm('Are you sure you want to clear the GitHub token? You will need to re-enter it to trigger jobs.')) {
    clearGitHubToken();
    document.getElementById('github-token-input').value = '';
    showToast('Token cleared', 'info');
  }
}

// Manual Job Trigger (F002)
async function triggerJob(taskName) {
  // Check if token is configured
  if (!getGitHubToken()) {
    showToast('GitHub token not configured. Please set it in Settings.', 'warning');
    openSettingsModal();
    return;
  }

  // Confirm trigger
  const confirmed = confirm(`Trigger job "${formatTaskName(taskName)}"?\n\nThis will start a new workflow run on GitHub Actions.`);
  if (!confirmed) return;

  try {
    // Show loading state
    showToast(`Triggering ${formatTaskName(taskName)}...`, 'info', 2000);

    // Update button state
    const button = document.querySelector(`[data-task="${taskName}"] .run-now-btn`);
    if (button) {
      button.disabled = true;
      button.innerHTML = '<svg class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Triggering...';
    }

    // Trigger workflow
    await triggerWorkflow(taskName);

    // Success
    showToast(`Job "${formatTaskName(taskName)}" triggered successfully!`, 'success');

    // Start polling for status (F003)
    startWorkflowPolling(taskName);

    // Update button state
    if (button) {
      button.disabled = false;
      button.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Run';
    }

    // Refresh analytics after a short delay
    setTimeout(() => {
      loadDashboard();
    }, 3000);

  } catch (error) {
    console.error('Failed to trigger job:', error);
    showToast(`Failed to trigger job: ${error.message}`, 'error');

    // Reset button state
    const button = document.querySelector(`[data-task="${taskName}"] .run-now-btn`);
    if (button) {
      button.disabled = false;
      button.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Run';
    }
  }
}

// Real-Time Status Polling (F003)
function startWorkflowPolling(taskName) {
  // Stop existing polling if any
  if (activeWorkflowPolling.has(taskName)) {
    clearInterval(activeWorkflowPolling.get(taskName));
  }

  console.log(`[Polling] Started for ${taskName}`);

  // Poll immediately
  pollWorkflowStatus(taskName);

  // Poll every 5 seconds
  const interval = setInterval(() => {
    pollWorkflowStatus(taskName);
  }, 5000);

  activeWorkflowPolling.set(taskName, interval);
}

function stopWorkflowPolling(taskName) {
  if (activeWorkflowPolling.has(taskName)) {
    clearInterval(activeWorkflowPolling.get(taskName));
    activeWorkflowPolling.delete(taskName);
    console.log(`[Polling] Stopped for ${taskName}`);
  }
}

async function pollWorkflowStatus(taskName) {
  try {
    const runs = await getWorkflowRuns(taskName, 1);
    if (runs.length === 0) return;

    const latestRun = runs[0];
    const status = latestRun.status; // queued, in_progress, completed
    const conclusion = latestRun.conclusion; // success, failure, cancelled, etc.

    console.log(`[Polling] ${taskName}: ${status} (${conclusion || 'pending'})`);

    // Update UI with status
    updateTaskStatus(taskName, status, conclusion, latestRun);

    // Stop polling if completed
    if (status === 'completed') {
      stopWorkflowPolling(taskName);
      // Refresh analytics to show new results
      loadDashboard();
    }

  } catch (error) {
    console.error(`[Polling] Error for ${taskName}:`, error);
    // Continue polling despite errors
  }
}

function updateTaskStatus(taskName, status, conclusion, run) {
  // Find task card or config row
  const card = document.querySelector(`[data-task="${taskName}"]`);
  if (!card) return;

  // Update status badge with SVG icons
  let statusHTML = '';
  if (status === 'queued') {
    statusHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Queued</span>';
  } else if (status === 'in_progress') {
    statusHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><svg class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Running</span>';
  } else if (status === 'completed' && conclusion === 'success') {
    statusHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Success</span>';
  } else if (status === 'completed' && conclusion === 'failure') {
    statusHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Failed</span>';
  }

  const statusBadge = card.querySelector('.status-badge');
  if (statusBadge && statusHTML) {
    statusBadge.innerHTML = statusHTML;
  }

  // Add link to workflow run with SVG icon
  if (run && run.html_url) {
    const linkHTML = `<a href="${run.html_url}" target="_blank" class="inline-flex items-center gap-0.5 text-xs text-purple hover:underline">View on GitHub<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>`;
    const linkContainer = card.querySelector('.workflow-link');
    if (linkContainer) {
      linkContainer.innerHTML = linkHTML;
    }
  }
}
