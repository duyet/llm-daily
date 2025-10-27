// Enhanced Dashboard with Job Monitoring
// Extends the basic dashboard with schedule display and run history
/**
 * Format time ago
 */
function timeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
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
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    return 'just now';
}
/**
 * Format time until
 */
function timeUntil(timestamp) {
    const seconds = Math.floor((new Date(timestamp) - new Date()) / 1000);
    if (seconds < 0)
        return 'overdue';
    const intervals = {
        day: 86400,
        hour: 3600,
        minute: 60
    };
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `in ${interval} ${unit}${interval === 1 ? '' : 's'}`;
        }
    }
    return 'in <1 min';
}
/**
 * Format duration
 */
function formatDuration(seconds) {
    if (seconds < 60)
        return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}
/**
 * Format cron expression to human readable
 */
function formatCron(cron) {
    // Simple cron to human mapping (basic cases)
    const patterns = {
        '0 * * * *': 'Hourly',
        '0 0 * * *': 'Daily at midnight',
        '0 8 * * *': 'Daily at 8:00 AM',
        '0 9 * * *': 'Daily at 9:00 AM',
        '0 12 * * *': 'Daily at noon',
        '0 0 * * 1': 'Weekly on Monday',
        '0 0 1 * *': 'Monthly on 1st',
    };
    return patterns[cron] || cron;
}
/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
    const badges = {
        success: '<span class="badge-success">✅ Success</span>',
        failed: '<span class="badge-error">❌ Failed</span>',
        running: '<span class="badge-pending">🔄 Running</span>',
        pending: '<span class="badge-pending">⏳ Pending</span>',
    };
    return badges[status] || badges.pending;
}
/**
 * Render enhanced task cards with schedule and history
 */
function renderEnhancedTaskCards(analytics) {
    const container = document.getElementById('task-cards');
    const tasks = Object.entries(analytics.tasks).map(([name, metrics]) => ({
        name,
        ...metrics
    }));
    if (tasks.length === 0) {
        container.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
        <p class="text-lg">No tasks yet. Create your first task to get started!</p>
      </div>
    `;
        return;
    }
    container.innerHTML = tasks.map(task => `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow card">
      <!-- Task Header -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${task.name}</h3>
            ${task.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${task.description}</p>` : ''}
          </div>
          ${getStatusBadge(task.status || 'pending')}
        </div>

        <!-- Schedule Info -->
        ${task.schedule ? `
          <div class="mt-3 space-y-1 text-sm">
            <div class="flex items-center text-gray-600 dark:text-gray-400">
              <span class="mr-2">📅</span>
              <span>${formatCron(task.schedule)}</span>
            </div>
            ${task.lastRun ? `
              <div class="flex items-center text-gray-600 dark:text-gray-400">
                <span class="mr-2">🕐</span>
                <span>Last run: ${timeAgo(task.lastRun)}</span>
              </div>
            ` : ''}
            ${task.nextRun ? `
              <div class="flex items-center text-gray-600 dark:text-gray-400">
                <span class="mr-2">⏭️</span>
                <span>Next run: ${timeUntil(task.nextRun)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Task Metrics -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600 dark:text-gray-400">Runs:</span>
            <span class="font-medium text-gray-900 dark:text-white ml-2">${task.runs}</span>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">Success:</span>
            <span class="font-medium text-gray-900 dark:text-white ml-2">${(task.successRate * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">Tokens:</span>
            <span class="font-medium text-gray-900 dark:text-white ml-2">${(task.tokens / 1000).toFixed(1)}K</span>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">Cost:</span>
            <span class="font-medium text-gray-900 dark:text-white ml-2">$${task.cost.toFixed(2)}</span>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">Avg Time:</span>
            <span class="font-medium text-gray-900 dark:text-white ml-2">${task.avgResponseTime.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      <!-- Recent Runs Section (Expandable) -->
      ${task.recentRuns && task.recentRuns.length > 0 ? `
        <div class="p-6">
          <button
            class="expand-history-btn w-full flex items-center justify-between text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            data-task="${task.name}"
          >
            <span>View Recent Runs (${task.recentRuns.length})</span>
            <span class="expand-icon">▼</span>
          </button>

          <div class="task-history hidden mt-4">
            <div class="space-y-2">
              ${task.recentRuns.map(run => `
                <div class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  <div class="flex items-center space-x-3">
                    <span>${run.status === 'success' ? '✅' : '❌'}</span>
                    <span class="text-gray-600 dark:text-gray-400">${new Date(run.timestamp).toLocaleString()}</span>
                  </div>
                  <div class="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                    <span>${formatDuration(run.duration)}</span>
                    <span>${(run.tokens.total / 1000).toFixed(1)}K tokens</span>
                    ${run.cost > 0 ? `<span>$${run.cost.toFixed(3)}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
    // Add event listeners for expand/collapse
    document.querySelectorAll('.expand-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const historyDiv = e.currentTarget.nextElementSibling;
            const icon = e.currentTarget.querySelector('.expand-icon');
            historyDiv.classList.toggle('hidden');
            icon.textContent = historyDiv.classList.contains('hidden') ? '▼' : '▲';
        });
    });
}
/**
 * Render enhanced overview cards
 */
function renderEnhancedOverviewCards(analytics) {
    const container = document.getElementById('overview-cards');
    // Calculate active tasks (ran in last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeTasks = Object.values(analytics.tasks).filter(task => task.lastRun && new Date(task.lastRun) > yesterday).length;
    // Calculate failed tasks
    const failedTasks = Object.values(analytics.tasks).filter(task => task.status === 'failed').length;
    const cards = [
        {
            title: 'Total Tasks',
            value: Object.keys(analytics.tasks).length,
            icon: '📋',
            color: 'blue'
        },
        {
            title: 'Active Today',
            value: activeTasks,
            icon: '🚀',
            color: activeTasks > 0 ? 'green' : 'gray'
        },
        {
            title: 'Failed',
            value: failedTasks,
            icon: '⚠️',
            color: failedTasks > 0 ? 'red' : 'green'
        },
        {
            title: 'Success Rate',
            value: (analytics.successRate * 100).toFixed(1) + '%',
            icon: '✅',
            color: analytics.successRate >= 0.95 ? 'green' : analytics.successRate >= 0.8 ? 'yellow' : 'red'
        }
    ];
    container.innerHTML = cards.map(card => `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow card">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">${card.title}</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">${card.value}</p>
        </div>
        <div class="text-4xl">${card.icon}</div>
      </div>
    </div>
  `).join('');
}
/**
 * Load and display enhanced dashboard
 */
async function loadEnhancedDashboard() {
    try {
        // Add timeout to prevent indefinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        try {
            // Load analytics data - use basePath for GitHub Pages compatibility
            const response = await fetch(`${basePath}/dashboard/data/analytics.json?t=${Date.now()}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok)
                throw new Error('Failed to load analytics');
            const analytics = await response.json();
            // Render enhanced components
            renderEnhancedOverviewCards(analytics);
            renderEnhancedTaskCards(analytics);
            renderCharts(analytics);
        }
        catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout - analytics data took too long to load');
            }
            throw fetchError;
        }
    }
    catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load analytics data');
    }
}
// Override the default loadDashboard function
if (typeof loadDashboard !== 'undefined') {
    loadDashboard = loadEnhancedDashboard;
}
// Initialize enhanced dashboard on load
document.addEventListener('DOMContentLoaded', loadEnhancedDashboard);
// Re-render on theme change
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTimeout(loadEnhancedDashboard, 100);
    });
}
export {};
//# sourceMappingURL=dashboard-enhanced.js.map