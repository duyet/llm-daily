/**
 * Configuration System for LLM Daily Dashboard
 * Manages repository settings and dashboard configuration
 *
 * Configuration sources (in priority order):
 * 1. localStorage (user-set values)
 * 2. URL parameters
 * 3. Environment variables (if available)
 * 4. Auto-detection from window.location
 * 5. Default values
 */

interface DashboardConfig {
  repoOwner: string;
  repoName: string;
  githubApiBase: string;
  rateLimitMax: number;
  rateLimitWindow: number;
}

/**
 * Auto-detect repository from GitHub Pages URL
 * Format: https://username.github.io/repo-name/
 * @returns Detected repo owner and name, or null if can't detect
 */
function autoDetectRepo(): { owner: string; name: string } | null {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // GitHub Pages format: username.github.io
  if (hostname.endsWith('.github.io')) {
    const owner = hostname.replace('.github.io', '');

    // Get repo name from path
    const pathParts = pathname.split('/').filter(Boolean);
    const name = pathParts[0] || owner; // Default to owner name if no path

    console.log(`[Config] Auto-detected from GitHub Pages: ${owner}/${name}`);
    return { owner, name };
  }

  // Custom domain or local dev - can't auto-detect
  return null;
}

/**
 * Get configuration value with fallback chain
 * @param key - Config key
 * @param defaultValue - Default value if not found
 * @returns Configuration value
 */
function getConfigValue(key: string, defaultValue: string): string {
  // 1. Check localStorage (user override)
  const localStorageValue = localStorage.getItem(`config_${key}`);
  if (localStorageValue) {
    return localStorageValue;
  }

  // 2. Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlValue = urlParams.get(key);
  if (urlValue) {
    return urlValue;
  }

  // 3. Use default
  return defaultValue;
}

/**
 * Load dashboard configuration
 * @returns Dashboard configuration object
 */
function loadConfig(): DashboardConfig {
  // Try to auto-detect repository
  const autoDetected = autoDetectRepo();

  const config: DashboardConfig = {
    repoOwner: getConfigValue(
      'repo_owner',
      autoDetected?.owner || 'duyet'
    ),
    repoName: getConfigValue(
      'repo_name',
      autoDetected?.name || 'llm-daily'
    ),
    githubApiBase: getConfigValue(
      'github_api_base',
      'https://api.github.com'
    ),
    rateLimitMax: parseInt(getConfigValue('rate_limit_max', '4900'), 10),
    rateLimitWindow: parseInt(getConfigValue('rate_limit_window', '3600000'), 10),
  };

  console.log('[Config] Loaded configuration:', {
    repoOwner: config.repoOwner,
    repoName: config.repoName,
    autoDetected: !!autoDetected,
  });

  return config;
}

/**
 * Set configuration value in localStorage
 * @param key - Config key
 * @param value - Config value
 */
function setConfigValue(key: string, value: string): void {
  localStorage.setItem(`config_${key}`, value);
  console.log(`[Config] Set ${key} = ${value}`);
}

/**
 * Clear configuration value from localStorage
 * @param key - Config key
 */
function clearConfigValue(key: string): void {
  localStorage.removeItem(`config_${key}`);
  console.log(`[Config] Cleared ${key}`);
}

/**
 * Reset all configuration to defaults
 */
function resetConfig(): void {
  const keys = ['repo_owner', 'repo_name', 'github_api_base', 'rate_limit_max', 'rate_limit_window'];
  keys.forEach((key) => clearConfigValue(key));
  console.log('[Config] Reset all configuration');
}

// Load configuration on module load
const config = loadConfig();

// Declare global functions
declare global {
  interface Window {
    dashboardConfig: DashboardConfig;
    setConfigValue: typeof setConfigValue;
    clearConfigValue: typeof clearConfigValue;
    resetConfig: typeof resetConfig;
    reloadConfig: () => DashboardConfig;
  }
}

// Make config and functions globally available
window.dashboardConfig = config;
window.setConfigValue = setConfigValue;
window.clearConfigValue = clearConfigValue;
window.resetConfig = resetConfig;
window.reloadConfig = loadConfig;

// Export to make this a module
export type { DashboardConfig };
export { config, loadConfig, setConfigValue, clearConfigValue, resetConfig };
