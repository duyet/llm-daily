// Dashboard main script - Claude.ai inspired

// Determine base path for GitHub Pages
const basePath = window.location.pathname.includes('llm-daily') ? '/llm-daily' : '';

// Global state
let analyticsData = null;

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
    const response = await fetch(`${basePath}/data/analytics.json`);
    if (!response.ok) {
      throw new Error(`Failed to load analytics: ${response.status} ${response.statusText}`);
    }

    analyticsData = await response.json();

    // Render components
    renderResultsTab(analyticsData);
    renderConfigTab(analyticsData);
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
function viewFullResult(taskName) {
  // For now, show alert. Can be enhanced to open modal or navigate
  alert(`View full result for: ${formatTaskName(taskName)}\n\nThis will be implemented to show the complete result output.`);
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

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadDashboard();
});
