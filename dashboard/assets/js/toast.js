// Toast Notification System
// Provides user feedback for actions, errors, and information

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'info', 'success', 'warning', 'error'
 * @param {number} duration - Duration in milliseconds (default: 5000)
 * @returns {HTMLElement} The toast element
 */
function showToast(message, type = 'info', duration = 5000) {
  // Ensure toast container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
    container.style.maxWidth = '400px';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `
    bg-white dark:bg-gray-800 border-l-4 p-4 rounded-lg shadow-xl
    pointer-events-auto
    transform transition-all duration-300 translate-x-0 opacity-100
    ${getToastBorderColor(type)}
  `;

  // Add content
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">${getToastIcon(type)}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">${escapeHtml(message)}</p>
      </div>
      <button
        onclick="this.closest('[role=alert]').remove()"
        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;

  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  // Add to container with slide-in animation
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  // Limit number of toasts (max 5)
  const toasts = container.querySelectorAll('[role=alert]');
  if (toasts.length > 5) {
    removeToast(toasts[0]);
  }

  console.log(`[Toast] ${type.toUpperCase()}: ${message}`);

  return toast;
}

/**
 * Remove toast with animation
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
  if (!toast || !toast.parentElement) return;

  // Animate out
  toast.style.transform = 'translateX(400px)';
  toast.style.opacity = '0';

  // Remove after animation
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 300);
}

/**
 * Get border color class for toast type
 */
function getToastBorderColor(type) {
  switch (type) {
    case 'success':
      return 'border-green-500';
    case 'error':
      return 'border-red-500';
    case 'warning':
      return 'border-yellow-500';
    case 'info':
    default:
      return 'border-blue-500';
  }
}

/**
 * Get icon emoji for toast type
 */
function getToastIcon(type) {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
    default:
      return 'ℹ️';
  }
}

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convenience methods for specific toast types
 */
const Toast = {
  info: (message, duration) => showToast(message, 'info', duration),
  success: (message, duration) => showToast(message, 'success', duration),
  warning: (message, duration) => showToast(message, 'warning', duration),
  error: (message, duration) => showToast(message, 'error', duration)
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast, Toast };
}
