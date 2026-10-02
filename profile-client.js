/* Account data and profile actions are pending backend integration. */
(() => {
  const status = document.createElement('p');
  status.className = 'profile-backend-note';
  status.textContent = 'Profile and account features will be available after backend integration.';
  document.querySelector('.profile-card')?.prepend(status);

  document.getElementById('save-profile')?.addEventListener('click', () => {
    status.textContent = 'Profile updates are pending backend integration.';
  });
  document.getElementById('logout-profile')?.addEventListener('click', () => {
    status.textContent = 'Sign out will be available after backend integration.';
  });
  document.getElementById('admin-profile')?.addEventListener('click', () => {
    location.href = 'admin.html';
  });
})();
