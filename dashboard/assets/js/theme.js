// Dark mode theme toggle

(function() {
  // Check for saved theme preference or default to 'light' mode
  const theme = localStorage.getItem('theme') || 'light';

  // Apply theme on page load
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

// Global function to toggle dark mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
