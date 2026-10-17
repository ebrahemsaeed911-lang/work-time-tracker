// ==========================================================================
// Offline page — retry button (progressive enhancement only)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => window.location.reload());
  }
});
