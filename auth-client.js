/* Frontend-only placeholder. Replace these handlers with the chosen auth API contract. */
(() => {
  const pendingMessage = 'Account features will be available after backend integration.';

  window.CodeIOAuth = {
    currentUser: async () => null,
    login: async () => ({ ok: false, pending: true }),
    signup: async () => ({ ok: false, pending: true }),
    logout: async () => ({ ok: false, pending: true }),
  };

  window.updateAuthUI = () => {
    document.querySelectorAll('[data-auth-slot]').forEach((slot) => {
      const link = document.createElement('a');
      link.className = 'nav-login';
      link.href = 'login.html';
      link.textContent = 'Login';
      slot.replaceChildren(link);
    });
  };

  ['loginForm', 'registerForm'].forEach((id) => {
    document.getElementById(id)?.addEventListener('submit', (event) => {
      event.preventDefault();
      const error = document.getElementById('authErr');
      if (!error) return;
      error.textContent = pendingMessage;
      error.classList.add('show');
    });
  });

  window.updateAuthUI();
})();
