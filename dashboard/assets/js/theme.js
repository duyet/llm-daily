// Dark mode theme toggle

(function() {
  // Check for saved theme preference or default to 'light' mode
  const theme = localStorage.getItem('theme') || 'light';

  // Apply theme on page load
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
    }
  });
})();
