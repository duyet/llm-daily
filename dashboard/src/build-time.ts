// Build time display
// Loads and displays the build timestamp in the footer

// Determine base path for GitHub Pages
const basePath = window.location.pathname.includes('llm-daily') ? '/llm-daily' : '';

interface BuildInfo {
  buildTime: string;
  timestamp: number;
}

/**
 * Format relative time from now
 */
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `Built ${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }

  return 'Built just now';
}

/**
 * Load and display build time
 */
async function loadBuildTime(): Promise<void> {
  const buildTimeText = document.getElementById('build-time-text');
  if (!buildTimeText) return;

  try {
    const response = await fetch(`${basePath}/dashboard/data/buildInfo.json?t=${Date.now()}`);

    if (!response.ok) {
      buildTimeText.textContent = 'Build time unavailable';
      return;
    }

    const buildInfo: BuildInfo = await response.json();
    const buildDate = new Date(buildInfo.buildTime);

    // Display relative time
    buildTimeText.textContent = formatTimeAgo(buildInfo.timestamp);
    buildTimeText.title = `Built on ${buildDate.toLocaleString()}`;
  } catch (error) {
    console.error('Failed to load build time:', error);
    buildTimeText.textContent = 'Build time unavailable';
  }
}

// Load build time on page load
document.addEventListener('DOMContentLoaded', loadBuildTime);

// Export to make this a module
export {};
