(() => {
  "use strict";

  window.setUser = (user) => {
    try {
      localStorage.setItem("codeio-user", JSON.stringify(user));
    } catch {
      // Demo-only auth should still work when storage is unavailable.
    }
  };

  window.toast = (message) => {
    const element = document.getElementById("toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(window.__codeioToastTimer);
    window.__codeioToastTimer = window.setTimeout(() => element.classList.remove("show"), 2600);
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  const wipe = document.createElement("div");
  wipe.className = "route-wipe";
  wipe.setAttribute("aria-hidden", "true");
  document.body.append(wipe);

  function updateProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${maxScroll > 0 ? window.scrollY / maxScroll : 0})`;
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.append(dot, ring);
    document.body.classList.add("cursor-ready");

    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let ringX = x;
    let ringY = y;

    window.addEventListener("pointermove", (event) => {
      x = event.clientX;
      y = event.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    const animateRing = () => {
      ringX += (x - ringX) * 0.16;
      ringY += (y - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    };
    animateRing();

    document.querySelectorAll("a, button, input").forEach((element) => {
      element.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
      element.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
    });
  }

  document.querySelectorAll("a").forEach((link) => {
    if (!link.href || link.target === "_blank") return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => { location.href = link.href; }, reducedMotion ? 0 : 500);
    });
  });
})();