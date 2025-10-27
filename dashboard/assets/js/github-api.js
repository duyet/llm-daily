"use strict";
// GitHub API Integration
// Handles authentication, workflow triggers, and status polling
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'duyet'; // TODO: Make configurable
const REPO_NAME = 'llm-daily'; // TODO: Make configurable
// Rate limiting tracking
let apiCallCount = 0;
let rateLimitWindowStart = Date.now();
const RATE_LIMIT_MAX = 4900; // Leave buffer from 5000/hour limit
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
/**
 * Get GitHub Personal Access Token from localStorage
 * @returns Token or null if not set
 */
function getGitHubToken() {
    return localStorage.getItem('github_token');
}
/**
 * Set GitHub Personal Access Token in localStorage
 * @param token - GitHub PAT
 */
function setGitHubToken(token) {
    localStorage.setItem('github_token', token);
    console.log('[GitHubAPI] Token saved to localStorage');
}
/**
 * Remove GitHub token from localStorage
 */
function clearGitHubToken() {
    localStorage.removeItem('github_token');
    console.log('[GitHubAPI] Token cleared');
}
/**
 * Check if we're approaching rate limit
 * @returns True if safe to make API call
 */
function checkRateLimit() {
    const now = Date.now();
    // Reset counter if window has passed
    if (now - rateLimitWindowStart > RATE_LIMIT_WINDOW) {
        apiCallCount = 0;
        rateLimitWindowStart = now;
    }
    if (apiCallCount >= RATE_LIMIT_MAX) {
        const minutesUntilReset = Math.ceil((RATE_LIMIT_WINDOW - (now - rateLimitWindowStart)) / 60000);
        throw new Error(`GitHub API rate limit approaching. Please wait ${minutesUntilReset} minutes.`);
    }
    apiCallCount++;
    return true;
}
/**
 * Make authenticated GitHub API request
 * @param endpoint - API endpoint (e.g., '/repos/owner/repo')
 * @param options - Fetch options
 * @returns API response
 */
async function githubApiRequest(endpoint, options = {}) {
    const token = getGitHubToken();
    if (!token) {
        throw new Error('GitHub token not configured. Please set your token in Settings.');
    }
    // Check rate limit
    checkRateLimit();
    const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    // Handle rate limit headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining !== null) {
        console.log(`[GitHubAPI] Rate limit remaining: ${remaining}`);
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `GitHub API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
/**
 * Get workflow ID by filename
 * @param workflowFilename - Workflow filename (e.g., 'ai-news-vietnam.yml')
 * @returns Workflow ID
 */
async function getWorkflowId(workflowFilename) {
    try {
        const workflows = await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows`);
        const workflow = workflows.workflows.find((w) => w.path.endsWith(workflowFilename));
        if (!workflow) {
            throw new Error(`Workflow ${workflowFilename} not found`);
        }
        return workflow.id;
    }
    catch (error) {
        console.error('[GitHubAPI] Failed to get workflow ID:', error);
        throw error;
    }
}
/**
 * Trigger a workflow dispatch
 * @param taskName - Task name (e.g., 'ai-news-vietnam')
 * @param ref - Git ref (default: 'main')
 * @returns Success status
 */
async function triggerWorkflow(taskName, ref = 'main') {
    try {
        const workflowFilename = `${taskName}.yml`;
        console.log(`[GitHubAPI] Triggering workflow: ${workflowFilename}`);
        // Make API call to trigger workflow
        await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowFilename}/dispatches`, {
            method: 'POST',
            body: JSON.stringify({ ref }),
        });
        console.log(`[GitHubAPI] Workflow triggered successfully: ${taskName}`);
        return true;
    }
    catch (error) {
        console.error('[GitHubAPI] Failed to trigger workflow:', error);
        throw error;
    }
}
/**
 * Get recent workflow runs for a task
 * @param taskName - Task name
 * @param limit - Max number of runs to fetch (default: 10)
 * @returns Workflow runs
 */
async function getWorkflowRuns(taskName, limit = 10) {
    try {
        const workflowFilename = `${taskName}.yml`;
        const response = await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowFilename}/runs?per_page=${limit}`);
        return response.workflow_runs || [];
    }
    catch (error) {
        console.error('[GitHubAPI] Failed to get workflow runs:', error);
        throw error;
    }
}
/**
 * Get specific workflow run by ID
 * @param runId - Workflow run ID
 * @returns Workflow run details
 */
async function getWorkflowRun(runId) {
    try {
        return await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}`);
    }
    catch (error) {
        console.error('[GitHubAPI] Failed to get workflow run:', error);
        throw error;
    }
}
/**
 * Get current rate limit status
 * @returns Rate limit info
 */
async function getRateLimitStatus() {
    try {
        return await githubApiRequest('/rate_limit');
    }
    catch (error) {
        console.error('[GitHubAPI] Failed to get rate limit status:', error);
        throw error;
    }
}
/**
 * Validate GitHub token by making a test API call
 * @returns True if token is valid
 */
async function validateToken() {
    try {
        await githubApiRequest('/user');
        return true;
    }
    catch (error) {
        console.error('[GitHubAPI] Token validation failed:', error);
        return false;
    }
}
// Make functions globally available
window.getGitHubToken = getGitHubToken;
window.setGitHubToken = setGitHubToken;
window.clearGitHubToken = clearGitHubToken;
window.triggerWorkflow = triggerWorkflow;
window.getWorkflowRuns = getWorkflowRuns;
window.getWorkflowRun = getWorkflowRun;
window.getRateLimitStatus = getRateLimitStatus;
window.validateToken = validateToken;
window.checkRateLimit = checkRateLimit;
//# sourceMappingURL=github-api.js.map