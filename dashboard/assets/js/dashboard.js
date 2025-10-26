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
      <div class="empty-state">
        <h3>No tasks yet</h3>
        <p>Create your first task to see results here</p>
      </div>
    `;
    return;
  }

  // Generate result cards
  container.innerHTML = tasks.map(task => {
    const statusClass = task.successRate >= 0.95 ? 'success' :
                       task.successRate >= 0.8 ? 'pending' : 'error';
    const statusIcon = task.successRate >= 0.95 ? '✓' :
                      task.successRate >= 0.8 ? '⚠' : '✗';

    const timeAgo = task.lastRun ? formatTimeAgo(new Date(task.lastRun)) : 'Never';

    // Get result preview (placeholder for now - will be populated by builder)
    const resultPreview = task.latestResult?.preview || 'Result data will be available after the next run';

    return `
      <div class="result-card">
        <div class="card-header">
          <h3>${formatTaskName(task.name)}</h3>
          <span class="status-badge ${statusClass}">
            ${statusIcon} ${(task.successRate * 100).toFixed(0)}% Success
          </span>
        </div>

        <div class="meta">
          <span>🕐 ${timeAgo}</span>
          <span>📊 ${formatNumber(task.tokens)} tokens</span>
          <span>💰 $${task.cost.toFixed(3)}</span>
        </div>

        <div class="result-preview">
          <h4>Latest Result:</h4>
          <p>${escapeHtml(resultPreview)}</p>
        </div>

        <button class="view-more-btn" onclick="viewFullResult('${task.name}')">
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
    const statusClass = task.successRate >= 0.95 ? 'success' :
                       task.successRate >= 0.8 ? 'pending' : 'error';
    const statusText = task.successRate >= 0.95 ? 'Success' :
                      task.successRate >= 0.8 ? 'Warning' : 'Error';

    const timeAgo = task.lastRun ? formatTimeAgo(new Date(task.lastRun)) : 'Never';
    const schedule = formatSchedule(task.schedule || 'Daily');

    return `
      <tr onclick="viewTaskDetails('${task.name}')">
        <td><span class="task-name">${formatTaskName(task.name)}</span></td>
        <td>${schedule}</td>
        <td><span class="table-badge ${statusClass}">${statusText}</span></td>
        <td>${timeAgo}</td>
        <td>${formatNumber(task.tokens)}</td>
        <td>$${task.cost.toFixed(3)}</td>
        <td><button class="action-btn" onclick="event.stopPropagation(); viewTaskDetails('${task.name}')">View</button></td>
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
    <div class="empty-state" style="color: var(--error);">
      <h3>Error Loading Dashboard</h3>
      <p>${escapeHtml(message)}</p>
      <p style="margin-top: 1rem;">Please check the console for more details.</p>
    </div>
  `;
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadDashboard();
});
