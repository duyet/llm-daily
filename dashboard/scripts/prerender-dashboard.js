#!/usr/bin/env node
/**
 * Pre-render Dashboard HTML with Analytics Data
 *
 * This script reads analytics.json and injects the data directly into index.html,
 * eliminating the need for client-side AJAX loading and making the page instant.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DASHBOARD_DIR = path.join(__dirname, '..');
const ANALYTICS_PATH = path.join(DASHBOARD_DIR, 'data/analytics.json');
const INDEX_TEMPLATE = path.join(DASHBOARD_DIR, 'index.html');
const INDEX_OUTPUT = path.join(DASHBOARD_DIR, 'index.html');

/**
 * Format task name (convert kebab-case to Title Case)
 */
function formatTaskName(name) {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format time ago
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
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

/**
 * Format number (1000 -> 1K)
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}

/**
 * Generate results tab HTML
 */
function generateResultsTabHTML(analytics) {
  const tasks = Object.entries(analytics.tasks || {}).map(([name, metrics]) => ({
    name,
    ...metrics
  }));

  if (tasks.length === 0) {
    return `
      <div class="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No tasks yet</h3>
        <p class="text-sm">Create your first task to see results here</p>
      </div>
    `;
  }

  return tasks.map(task => {
    const statusClass = task.successRate >= 0.95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
      task.successRate >= 0.8 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

    const statusIcon = task.successRate >= 0.95 ?
      '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' :
      task.successRate >= 0.8 ?
        '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>' :
        '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

    const timeAgo = task.lastRun ? formatTimeAgo(task.lastRun) : 'Never';
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

/**
 * Generate config tab HTML
 */
function generateConfigTabHTML(analytics) {
  const tasks = Object.entries(analytics.tasks || {}).map(([name, metrics]) => ({
    name,
    ...metrics
  }));

  if (tasks.length === 0) {
    return `
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
  }

  return tasks.map(task => {
    const statusClass = task.successRate >= 0.95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
      task.successRate >= 0.8 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

    const statusText = task.successRate >= 0.95 ? 'Success' :
      task.successRate >= 0.8 ? 'Warning' : 'Error';

    const timeAgo = task.lastRun ? formatTimeAgo(task.lastRun) : 'Never';
    const schedule = task.schedule || 'Daily';

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

/**
 * Pre-render dashboard HTML
 */
async function prerenderDashboard() {
  console.log('🔨 Pre-rendering dashboard HTML with analytics data...');

  try {
    // Read analytics data
    let analytics;
    try {
      const analyticsContent = await fs.readFile(ANALYTICS_PATH, 'utf-8');
      analytics = JSON.parse(analyticsContent);
      console.log(`✓ Loaded analytics data (${Object.keys(analytics.tasks || {}).length} tasks)`);
    } catch (error) {
      console.warn('⚠️  No analytics.json found, using empty data');
      analytics = {
        totalRuns: 0,
        totalTokens: 0,
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        successRate: 0,
        lastUpdated: new Date().toISOString(),
        tasks: {},
        daily: [],
      };
    }

    // Read index.html template
    let html = await fs.readFile(INDEX_TEMPLATE, 'utf-8');
    console.log('✓ Read index.html template');

    // Generate results tab HTML
    const resultsHTML = generateResultsTabHTML(analytics);

    // Generate config tab HTML
    const configHTML = generateConfigTabHTML(analytics);

    // Replace loading placeholders with actual data
    // Results tab: Replace the loading div with actual cards
    html = html.replace(
      /<div id="results-grid"[^>]*>[\s\S]*?<\/div>\s*<\/div>/m,
      `<div id="results-grid" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">\n${resultsHTML}\n      </div>`
    );

    // Config tab: Replace tbody content
    html = html.replace(
      /<tbody>[\s\S]*?<\/tbody>/m,
      `<tbody>\n${configHTML}\n            </tbody>`
    );

    // Inject analytics data as inline JavaScript for dynamic features
    const analyticsScript = `
  <script>
    // Pre-rendered analytics data (for dynamic features like refresh)
    window.prerenderedAnalytics = ${JSON.stringify(analytics, null, 2)};
    console.log('✅ Pre-rendered dashboard loaded with', Object.keys(window.prerenderedAnalytics.tasks || {}).length, 'tasks');
  </script>
`;
    html = html.replace('</body>', `${analyticsScript}\n</body>`);

    // Write pre-rendered HTML
    await fs.writeFile(INDEX_OUTPUT, html, 'utf-8');
    console.log('✅ Pre-rendered dashboard saved to index.html');
    console.log(`   Tasks: ${Object.keys(analytics.tasks || {}).length}`);
    console.log(`   Total runs: ${analytics.totalRuns || 0}`);
    console.log(`   Last updated: ${analytics.lastUpdated || 'N/A'}`);
  } catch (error) {
    console.error('❌ Failed to pre-render dashboard:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prerenderDashboard().catch((error) => {
    console.error('❌ Pre-rendering failed:', error);
    process.exit(1);
  });
}

export { prerenderDashboard };
