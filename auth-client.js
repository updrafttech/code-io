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

  const signup = async (name, email, password) => {
    const result = await requestJson("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    if (!result.response.ok) return { ...result, user: null };
    return { ...result, user: await currentUser() };
  };

  const logout = async () => {
    await requestJson("/api/auth/logout", { method: "POST", body: "{}" });
  };

  window.CodeIOAuth = { currentUser, login, signup, logout };

  window.updateAuthUI = async () => {
    let user = null;
    try { user = await currentUser(); } catch { /* Render signed-out navigation on failure. */ }
    document.querySelectorAll("[data-auth-slot]").forEach((slot) => {
      slot.replaceChildren();
      if (!user) {
        const link = document.createElement("a");
        link.className = "nav-login";
        link.href = "/login.html";
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

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const submitBtn = document.getElementById("authSubmit");
    const error = document.getElementById("authErr");
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitBtn.disabled = true;
      error.classList.remove("show");
      const email = document.getElementById("femail").value.trim();
      const password = document.getElementById("fpass").value;
      try {
        const result = await CodeIOAuth.login(email, password);
        if (!result.response.ok) {
          error.textContent = result.response.status === 400 || result.response.status === 401
            ? "Invalid credentials."
            : "Sign in is temporarily unavailable. Please try again.";
          error.classList.add("show");
          return;
        }
        location.href = result.user?.role === "admin" ? "admin.html" : "index.html";
      } catch {
        error.textContent = "Sign in is temporarily unavailable. Please try again.";
        error.classList.add("show");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const submitBtn = document.getElementById("authSubmit");
    const error = document.getElementById("authErr");
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      submitBtn.disabled = true;
      error.classList.remove("show");
      const name = document.getElementById("fname").value.trim();
      const email = document.getElementById("femail").value.trim();
      const password = document.getElementById("fpass").value;
      if (!name || name.length > 100 || !email.includes("@") || password.length < 12 || password.length > 1024) {
        error.textContent = "Enter your name, a valid email, and a password of at least 12 characters.";
        error.classList.add("show");
        submitBtn.disabled = false;
        return;
      }
      try {
        const result = await CodeIOAuth.signup(name, email, password);
        if (!result.response.ok) {
          error.textContent = result.response.status === 409
            ? "An account with this email may already exist. Try logging in or use another email."
            : result.response.status === 400
              ? "Check your name, email, and password. Use a valid email and a password of at least 12 characters."
              : "We couldn't create your account right now. Please try again.";
          error.classList.add("show");
          return;
        }
        location.href = result.user?.role === "admin" ? "admin.html" : "index.html";
      } catch {
        error.textContent = "We couldn't create your account right now. Please try again.";
        error.classList.add("show");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-auth-slot]")) {
      document.querySelectorAll(".public-account-menu").forEach((menu) => { menu.hidden = true; });
    }
  });
})();
