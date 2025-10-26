// Dashboard main script

// Load and display analytics data
async function loadDashboard() {
  try {
    // Load analytics data
    const response = await fetch('/data/analytics.json');
    if (!response.ok) throw new Error('Failed to load analytics');

    const analytics = await response.json();

    // Render components
    renderOverviewCards(analytics);
    renderTaskCards(analytics);
    renderCharts(analytics);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Failed to load analytics data');
  }
}

// Render overview cards
function renderOverviewCards(analytics) {
  const container = document.getElementById('overview-cards');

  const cards = [
    {
      title: 'Total Runs',
      value: analytics.totalRuns.toLocaleString(),
      icon: '🚀',
      color: 'blue'
    },
    {
      title: 'Total Tokens',
      value: (analytics.totalTokens / 1000).toFixed(1) + 'K',
      icon: '🔤',
      color: 'purple'
    },
    {
      title: 'Total Cost',
      value: '$' + analytics.totalCost.toFixed(2),
      icon: '💰',
      color: 'green'
    },
    {
      title: 'Success Rate',
      value: (analytics.successRate * 100).toFixed(1) + '%',
      icon: '✅',
      color: analytics.successRate >= 0.95 ? 'green' : 'yellow'
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

// Render task cards
function renderTaskCards(analytics) {
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
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${task.name}</h3>
        <span class="${task.successRate >= 0.95 ? 'badge-success' : task.successRate >= 0.8 ? 'badge-pending' : 'badge-error'}">
          ${(task.successRate * 100).toFixed(0)}% success
        </span>
      </div>
      <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex justify-between">
          <span>Runs:</span>
          <span class="font-medium text-gray-900 dark:text-white">${task.runs}</span>
        </div>
        <div class="flex justify-between">
          <span>Tokens:</span>
          <span class="font-medium text-gray-900 dark:text-white">${(task.tokens / 1000).toFixed(1)}K</span>
        </div>
        <div class="flex justify-between">
          <span>Cost:</span>
          <span class="font-medium text-gray-900 dark:text-white">$${task.cost.toFixed(2)}</span>
        </div>
        <div class="flex justify-between">
          <span>Avg Time:</span>
          <span class="font-medium text-gray-900 dark:text-white">${task.avgResponseTime.toFixed(1)}s</span>
        </div>
        ${task.lastRun ? `
          <div class="flex justify-between">
            <span>Last Run:</span>
            <span class="font-medium text-gray-900 dark:text-white">${new Date(task.lastRun).toLocaleDateString()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Render charts
function renderCharts(analytics) {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  // Cost & Tokens Chart
  const costCtx = document.getElementById('cost-chart').getContext('2d');
  new Chart(costCtx, {
    type: 'line',
    data: {
      labels: analytics.daily.slice(0, 7).reverse().map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Cost ($)',
          data: analytics.daily.slice(0, 7).reverse().map(d => d.cost),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Tokens (K)',
          data: analytics.daily.slice(0, 7).reverse().map(d => d.tokens / 1000),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: textColor },
          grid: { drawOnChartArea: false }
        },
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      }
    }
  });

  // Success Rate Chart
  const successCtx = document.getElementById('success-chart').getContext('2d');
  new Chart(successCtx, {
    type: 'bar',
    data: {
      labels: analytics.daily.slice(0, 7).reverse().map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Successes',
          data: analytics.daily.slice(0, 7).reverse().map(d => d.successes),
          backgroundColor: '#10b981'
        },
        {
          label: 'Failures',
          data: analytics.daily.slice(0, 7).reverse().map(d => d.failures),
          backgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          stacked: true,
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      }
    }
  });
}

// Show error message
function showError(message) {
  const container = document.getElementById('overview-cards');
  container.innerHTML = `
    <div class="col-span-full bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
      <p class="text-red-800 dark:text-red-200">${message}</p>
    </div>
  `;
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', loadDashboard);

// Re-render charts on theme change
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTimeout(loadDashboard, 100); // Wait for theme to apply
  });
}
