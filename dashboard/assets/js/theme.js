"use strict";
// Dark mode theme toggle
// Check for saved theme preference or default to 'light' mode
(function () {
    const theme = localStorage.getItem('theme') || 'light';
    // Apply theme on page load
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
})();
window.toggleDarkMode = function () {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};
//# sourceMappingURL=theme.js.map