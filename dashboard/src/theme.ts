// Dark mode theme toggle

// Check for saved theme preference or default to 'light' mode
(function (): void {
  const theme = localStorage.getItem('theme') || 'light';

  // Apply theme on page load
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

// Global function to toggle dark mode
declare global {
  interface Window {
    toggleDarkMode: () => void;
  }
}

window.toggleDarkMode = function (): void {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// Export to make this a module
export {};
