// Documentation viewer
// Loads and renders markdown documentation
// Determine base path for GitHub Pages
const basePath = window.location.pathname.includes('llm-daily') ? '/llm-daily' : '';
// Documentation sections mapping
const docSections = {
    'overview': {
        title: 'Overview',
        source: 'README.md',
        transform: (content) => {
            // Extract main content, skip badges and quick start
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('## ✨ Features'));
            return lines.slice(0, startIndex > 0 ? startIndex : 50).join('\n');
        }
    },
    'quick-start': {
        title: 'Quick Start',
        source: 'README.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('## 🚀 Quick Start'));
            const endIndex = lines.findIndex((line, i) => i > startIndex && line.startsWith('##'));
            return lines.slice(startIndex, endIndex).join('\n');
        }
    },
    'installation': {
        title: 'Installation & Setup',
        source: 'README.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('### 1. Use This Template'));
            const endIndex = lines.findIndex((line, i) => i > startIndex && line.startsWith('##'));
            return '# Installation & Setup\n\n' + lines.slice(startIndex, endIndex).join('\n');
        }
    },
    'configuration': {
        title: 'Configuration',
        source: 'README.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('### 5. Configure Your Task'));
            const endIndex = lines.findIndex((line, i) => i > startIndex && line.startsWith('##'));
            return '# Configuration\n\n' + lines.slice(startIndex, endIndex).join('\n');
        }
    },
    'architecture': {
        title: 'Architecture Overview',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('## Architecture Overview'));
            const endIndex = lines.findIndex((line, i) => i > startIndex && line.startsWith('## '));
            return lines.slice(startIndex, endIndex).join('\n');
        }
    },
    'providers': {
        title: 'Provider System',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('**Provider System**'));
            return '# Provider System\n\n' + lines.slice(startIndex, startIndex + 50).join('\n');
        }
    },
    'memory': {
        title: 'Memory Management',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('**Memory Management**'));
            return '# Memory Management\n\n' + lines.slice(startIndex, startIndex + 50).join('\n');
        }
    },
    'tasks': {
        title: 'Task Configuration',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('**Task Configuration**'));
            return '# Task Configuration\n\n' + lines.slice(startIndex, startIndex + 50).join('\n');
        }
    },
    'workflows': {
        title: 'Workflow Generation',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('**Workflow Generation**'));
            return '# Workflow Generation\n\n' + lines.slice(startIndex, startIndex + 50).join('\n');
        }
    },
    'cli': {
        title: 'CLI Commands',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('## Development Commands'));
            const endIndex = lines.findIndex((line, i) => i > startIndex && line.startsWith('## '));
            return lines.slice(startIndex, endIndex).join('\n');
        }
    },
    'testing': {
        title: 'Testing',
        source: 'CLAUDE.md',
        transform: (content) => {
            const lines = content.split('\n');
            const startIndex = lines.findIndex(line => line.includes('### Testing'));
            return '# Testing\n\n' + lines.slice(startIndex, startIndex + 30).join('\n');
        }
    },
    'contributing': {
        title: 'Contributing',
        source: 'CONTRIBUTING.md'
    },
    'troubleshooting': {
        title: 'Troubleshooting',
        source: 'TROUBLESHOOTING.md'
    },
    'security': {
        title: 'Security',
        source: 'SECURITY.md'
    },
    'best-practices': {
        title: 'Best Practices',
        content: `# Best Practices

## Task Design

### Keep Tasks Focused
Each task should have a single, well-defined purpose. Don't try to do too much in one task.

### Use Meaningful Names
Task names should clearly describe what the task does. Use lowercase with hyphens (kebab-case).

### Optimize Prompts
Write clear, specific prompts. Include examples and constraints to get better results.

## Memory Management

### Be Selective
Only store information that will be useful in future runs. Avoid storing redundant data.

### Use Deduplication
Enable memory deduplication to prevent storing similar information multiple times.

### Monitor Memory Size
Large memories increase token usage and costs. Periodically review and clean up memory.

## Cost Optimization

### Choose the Right Model
Use smaller/cheaper models for simple tasks. Reserve powerful models for complex tasks.

### Batch Operations
Group related operations to minimize API calls and reduce costs.

### Monitor Usage
Regularly review the analytics dashboard to track costs and identify optimization opportunities.

## Security

### Protect API Keys
Never commit API keys to your repository. Always use GitHub Secrets.

### Limit Permissions
Use the minimum required permissions for GitHub tokens and API keys.

### Review Code
Always review generated code and outputs before committing to your repository.

## Performance

### Optimize Schedules
Don't run tasks more frequently than necessary. Use appropriate cron schedules.

### Use Webhooks
For real-time integrations, use webhooks instead of frequent polling.

### Monitor Execution Time
Tasks should complete within GitHub Actions' time limits (typically 5-6 hours).
`
    }
};
// Current state
let currentSection = null;
let documentCache = new Map();
// Initialize documentation viewer
async function initDocs() {
    // Get section from URL hash or default to overview
    const hash = window.location.hash.slice(1) || 'overview';
    await loadSection(hash);
    // Setup event listeners
    setupNavigation();
    setupSearch();
    updateActiveLink(hash);
}
// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            window.location.hash = section;
            await loadSection(section);
            updateActiveLink(section);
        });
    });
    // Handle browser back/forward
    window.addEventListener('hashchange', async () => {
        const section = window.location.hash.slice(1) || 'overview';
        await loadSection(section);
        updateActiveLink(section);
    });
}
// Update active link in sidebar
function updateActiveLink(section) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-section="${section}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
// Load documentation section
async function loadSection(sectionId) {
    const section = docSections[sectionId];
    if (!section) {
        showError(`Section "${sectionId}" not found`);
        return;
    }
    const container = document.getElementById('doc-content');
    container.innerHTML = `
    <div class="text-center py-16">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Loading ${section.title}...</p>
    </div>
  `;
    try {
        let content;
        if (section.content) {
            // Use inline content
            content = section.content;
        }
        else if (section.source) {
            // Fetch from source file
            content = await fetchDocument(section.source);
            // Apply transformation if specified
            if (section.transform) {
                content = section.transform(content);
            }
        }
        // Render markdown to HTML
        const html = marked.parse(content);
        container.innerHTML = html;
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        currentSection = sectionId;
    }
    catch (error) {
        console.error('Error loading section:', error);
        showError(`Failed to load ${section.title}`);
    }
}
// Fetch document from repository
async function fetchDocument(filename) {
    // Check cache first
    if (documentCache.has(filename)) {
        return documentCache.get(filename);
    }
    try {
        // Try to fetch from repository root
        const response = await fetch(`${basePath}/../../${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        const content = await response.text();
        documentCache.set(filename, content);
        return content;
    }
    catch (error) {
        console.error('Fetch error:', error);
        // Fallback: try GitHub raw content
        try {
            const fallbackUrl = `https://raw.githubusercontent.com/duet/llm-daily/main/${filename}`;
            const response = await fetch(fallbackUrl);
            if (!response.ok)
                throw new Error('GitHub fetch failed');
            const content = await response.text();
            documentCache.set(filename, content);
            return content;
        }
        catch (fallbackError) {
            throw new Error(`Could not load ${filename}: ${error.message}`);
        }
    }
}
// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('doc-search');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            // Reset all links
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.style.display = 'block';
            });
            return;
        }
        searchTimeout = setTimeout(() => {
            // Filter links based on search query
            document.querySelectorAll('.sidebar-link').forEach(link => {
                const text = link.textContent.toLowerCase();
                const section = link.dataset.section;
                const sectionData = docSections[section];
                const matches = text.includes(query) ||
                    (sectionData && sectionData.title.toLowerCase().includes(query));
                link.style.display = matches ? 'block' : 'none';
            });
        }, 300);
    });
}
// Show error message
function showError(message) {
    const container = document.getElementById('doc-content');
    container.innerHTML = `
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <h3 class="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
      <p class="text-red-700 dark:text-red-300">${message}</p>
    </div>
  `;
}
// Initialize on page load
document.addEventListener('DOMContentLoaded', initDocs);
export {};
//# sourceMappingURL=docs.js.map