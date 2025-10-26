// Dashboard main script - Claude.ai inspired

// Determine base path for GitHub Pages
const basePath = window.location.pathname.includes('llm-daily') ? '/llm-daily' : '';

// Global state
let analyticsData = null;
let currentModalTask = null;
let currentModalResult = null;
let autoRefreshInterval = null;
let lastUpdated = null;

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
    // Load analytics data
    const response = await fetch(`${basePath}/dashboard/data/analytics.json?t=${Date.now()}`);
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

  // Generate result cards with Tailwind classes
  container.innerHTML = tasks.map(task => {
    const statusClass = task.successRate >= 0.95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                       task.successRate >= 0.8 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                       'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    const statusIcon = task.successRate >= 0.95 ? '✓' :
                      task.successRate >= 0.8 ? '⚠' : '✗';

    const timeAgo = task.lastRun ? formatTimeAgo(new Date(task.lastRun)) : 'Never';

    // Get result preview (placeholder for now - will be populated by builder)
    const resultPreview = task.latestResult?.preview || 'Result data will be available after the next run';

    return `
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-purple-lighter shadow-sm">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${formatTaskName(task.name)}</h3>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
            ${statusIcon} ${(task.successRate * 100).toFixed(0)}% Success
          </span>
        </div>

        <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span class="flex items-center gap-1">🕐 ${timeAgo}</span>
          <span class="flex items-center gap-1">📊 ${formatNumber(task.tokens)} tokens</span>
          <span class="flex items-center gap-1">💰 $${task.cost.toFixed(3)}</span>
        </div>

        <div class="bg-beige dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 class="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Latest Result:</h4>
          <p class="text-sm leading-relaxed text-gray-900 dark:text-gray-100 max-h-20 overflow-hidden relative whitespace-pre-wrap result-preview-gradient">${escapeHtml(resultPreview)}</p>
        </div>

        <button class="w-full px-4 py-2.5 text-sm font-medium text-purple border border-purple rounded-lg transition-all hover:bg-purple hover:text-white" onclick="viewFullResult('${task.name}')">
          View Full Result →
        </button>
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
        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
          No tasks configured yet
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
        <td class="px-4 py-4"><span class="font-semibold text-gray-900 dark:text-gray-100">${formatTaskName(task.name)}</span></td>
        <td class="px-4 py-4 text-gray-700 dark:text-gray-300">${schedule}</td>
        <td class="px-4 py-4"><span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}">${statusText}</span></td>
        <td class="px-4 py-4 text-gray-700 dark:text-gray-300">${timeAgo}</td>
        <td class="px-4 py-4 text-gray-700 dark:text-gray-300">${formatNumber(task.tokens)}</td>
        <td class="px-4 py-4 text-gray-700 dark:text-gray-300">$${task.cost.toFixed(3)}</td>
        <td class="px-4 py-4"><button class="px-3 py-1.5 text-xs font-medium text-purple border border-purple rounded-md transition-all hover:bg-purple hover:text-white" onclick="event.stopPropagation(); viewTaskDetails('${task.name}')">View</button></td>
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
      <p class="text-sm mt-4">Please check the console for more details.</p>
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
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initKeyboardShortcuts();
  loadDashboard();

  // Start auto-refresh (every 30 seconds)
  startAutoRefresh(30);

  // Update "last updated" display every 10 seconds
  setInterval(updateLastUpdatedDisplay, 10000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});
