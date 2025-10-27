// Result File Fetching System
// Handles fetching, caching, and error handling for task result files
const basePath = window.location.pathname.includes('llm-daily') ? '/llm-daily' : '';
// Simple in-memory cache for session
const resultCache = new Map();
/**
 * Fetch result file from GitHub
 * @param {string} taskName - Name of the task
 * @param {string} resultPath - Relative path to result file (e.g., 'results/2025-10-26.md')
 * @returns {Promise<{success: boolean, content?: string, metadata?: object, error?: string}>}
 */
async function fetchResultFile(taskName, resultPath = null) {
    // Generate cache key
    const cacheKey = `${taskName}:${resultPath || 'latest'}`;
    // Check cache first
    if (resultCache.has(cacheKey)) {
        console.log(`[ResultFetcher] Cache hit for ${cacheKey}`);
        return resultCache.get(cacheKey);
    }
    try {
        // Construct GitHub raw URL
        // Format: /dashboard/data/tasks/{taskName}/results/{date}.md
        let url;
        if (resultPath) {
            url = `${basePath}/dashboard/data/tasks/${taskName}/${resultPath}`;
        }
        else {
            // Fallback: try latest result
            url = `${basePath}/dashboard/data/tasks/${taskName}/latest.md`;
        }
        console.log(`[ResultFetcher] Fetching result from ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                const result = {
                    success: false,
                    error: 'Result file not found. The task may not have run yet or the result file is missing.'
                };
                resultCache.set(cacheKey, result);
                return result;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const content = await response.text();
        // Parse metadata if available (front matter)
        const metadata = parseResultMetadata(content);
        const result = {
            success: true,
            content,
            metadata,
            url
        };
        // Cache the result
        resultCache.set(cacheKey, result);
        console.log(`[ResultFetcher] Successfully fetched and cached ${cacheKey}`);
        return result;
    }
    catch (error) {
        console.error(`[ResultFetcher] Error fetching result:`, error);
        const result = {
            success: false,
            error: error.message || 'Failed to fetch result file'
        };
        return result;
    }
}
/**
 * Parse metadata from result file (if exists)
 * Looks for front matter in format:
 * ---
 * timestamp: 2025-10-26T08:00:00Z
 * tokens: 1500
 * cost: 0.00045
 * duration: 2.5
 * ---
 */
function parseResultMetadata(content) {
    const metadata = {};
    // Check for front matter
    const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontMatterRegex);
    if (match) {
        const frontMatter = match[1];
        const lines = frontMatter.split('\n');
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                const value = valueParts.join(':').trim();
                metadata[key.trim()] = value;
            }
        });
    }
    return metadata;
}
/**
 * Clear cache for a specific task or all tasks
 * @param {string} taskName - Optional task name to clear specific cache
 */
function clearResultCache(taskName = null) {
    if (taskName) {
        // Clear specific task cache
        const keysToDelete = [];
        for (const key of resultCache.keys()) {
            if (key.startsWith(`${taskName}:`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => resultCache.delete(key));
        console.log(`[ResultFetcher] Cleared cache for task: ${taskName}`);
    }
    else {
        // Clear all cache
        resultCache.clear();
        console.log(`[ResultFetcher] Cleared all result cache`);
    }
}
/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
function getCacheStats() {
    return {
        size: resultCache.size,
        keys: Array.from(resultCache.keys())
    };
}
// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchResultFile,
        clearResultCache,
        getCacheStats
    };
}
export {};
//# sourceMappingURL=result-fetcher.js.map