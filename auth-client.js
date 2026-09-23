(() => {
  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    let data = {};
    try { data = await response.json(); } catch { /* Return a generic error for non-JSON responses. */ }
    return { response, data };
  };

  const currentUser = async () => {
    const { response, data } = await requestJson("/api/auth/me", { method: "GET" });
    return response.ok ? data.user : null;
  };

  const login = async (email, password) => {
    const result = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!result.response.ok) return { ...result, user: null };
    return { ...result, user: await currentUser() };
  };

  const logout = async () => {
    await requestJson("/api/auth/logout", { method: "POST", body: "{}" });
  };

  window.CodeIOAuth = { currentUser, login, logout };

  window.updateAuthUI = async () => {
    let user = null;
    try { user = await currentUser(); } catch { /* Render signed-out navigation on failure. */ }
    document.querySelectorAll("[data-auth-slot]").forEach((slot) => {
      slot.replaceChildren();
      if (!user) {
        const link = document.createElement("a");
        link.className = "nav-login";
        link.href = "admin-login.html";
        link.textContent = "Login";
        slot.append(link);
        return;
      }

      const avatar = document.createElement("button");
      avatar.className = "public-avatar";
      avatar.type = "button";
      avatar.setAttribute("aria-label", "Open account menu");
      avatar.textContent = (user.name || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
      const menu = document.createElement("div");
      menu.className = "public-account-menu";
      menu.hidden = true;
      const name = document.createElement("strong");
      name.textContent = user.name;
      const email = document.createElement("small");
      email.textContent = user.email;
      const profile = document.createElement("a");
      profile.href = "profile.html";
      profile.textContent = "Profile";
      menu.append(name, email, profile);
      if (user.role === "admin") {
        const admin = document.createElement("a");
        admin.href = "admin.html";
        admin.textContent = "Admin Panel";
        menu.append(admin);
      }
      const signout = document.createElement("button");
      signout.type = "button";
      signout.textContent = "Logout";
      signout.addEventListener("click", async () => {
        await logout();
        location.href = "index.html";
      });
      menu.append(signout);
      avatar.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      slot.append(avatar, menu);
    });
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-auth-slot]")) {
      document.querySelectorAll(".public-account-menu").forEach((menu) => { menu.hidden = true; });
    }
  });
})();
