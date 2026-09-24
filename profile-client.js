(() => {
  const byId = (id) => document.getElementById(id);

  const initialize = async () => {
    let user;
    try {
      user = await CodeIOAuth.currentUser();
    } catch {
      user = null;
    }
    if (!user) {
      location.replace("/login.html");
      return;
    }

    byId("profile-name").textContent = user.name;
    byId("profile-email").textContent = user.email;
    byId("profile-role").textContent = `Role: ${user.role === "admin" ? "Administrator" : "User"}`;
    byId("profile-avatar").textContent = (user.name || "?").split(/\s+/).map((part) => part[0]).join("");
    byId("name-input").value = user.name;
    byId("email-input").value = user.email;
    byId("admin-profile").hidden = user.role !== "admin";
    byId("admin-profile").onclick = () => { location.href = "admin.html"; };
    byId("save-profile").onclick = () => {
      const status = document.createElement("p");
      status.textContent = "Profile updates are not available yet.";
      byId("save-profile").after(status);
      byId("save-profile").disabled = true;
    };
    byId("logout-profile").onclick = async () => {
      await CodeIOAuth.logout();
      location.href = "index.html";
    };
    await window.updateAuthUI?.();
  };

  initialize();
})();
