(() => {
  "use strict";

  const header = document.getElementById("site-header");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuLabel = document.getElementById("mobile-menu-label");
  const mobileNavigation = document.getElementById("mobile-navigation");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Avoid continuous visual work on lower-powered devices.
  const canRunRichMotion = !reducedMotion && (navigator.hardwareConcurrency || 4) >= 6 && !window.matchMedia("(max-width: 900px)").matches;

  function closeMobileMenu() {
    if (!mobileMenu || !mobileNavigation) return;
    mobileMenu.setAttribute("aria-expanded", "false");
    if (mobileMenuLabel) mobileMenuLabel.textContent = "Menu";
    mobileNavigation.hidden = true;
  }

  mobileMenu?.addEventListener("click", () => {
    const open = mobileMenu.getAttribute("aria-expanded") === "true";
    mobileMenu.setAttribute("aria-expanded", String(!open));
    if (mobileMenuLabel) mobileMenuLabel.textContent = open ? "Menu" : "Close";
    mobileNavigation.hidden = open;
  });

  mobileNavigation?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  document.querySelectorAll("[data-scroll]").forEach((element) => {
    element.addEventListener("click", () => {
      const target = document.getElementById(element.dataset.scroll);
      if (!target) return;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      closeMobileMenu();
    });
  });

  function updateScrollUI() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    document.documentElement.style.setProperty("--scroll-progress", progress);
    const progressBar = document.querySelector(".scroll-progress");
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    header?.classList.toggle("scrolled", window.scrollY > 24);
  }

  window.addEventListener("scroll", updateScrollUI, { passive: true });
  updateScrollUI();

  const observer = new IntersectionObserver((entries, io) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".section, .manifesto, .contact-panel, .person, .process-item, .team-member").forEach((element) => {
    element.classList.add("observe-reveal");
    observer.observe(element);
  });

  function addMotionChrome() {
    if (!canRunRichMotion) return;

    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.append(progress);

    const wipe = document.createElement("div");
    wipe.className = "route-wipe";
    wipe.setAttribute("aria-hidden", "true");
    document.body.append(wipe);

    if (window.matchMedia("(pointer: fine)").matches) {
      const dot = document.createElement("div");
      const ring = document.createElement("div");
      dot.className = "cursor-dot";
      ring.className = "cursor-ring";
      dot.setAttribute("aria-hidden", "true");
      ring.setAttribute("aria-hidden", "true");
      document.body.append(dot, ring);
      document.body.classList.add("cursor-ready");

      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let ringX = mouseX;
      let ringY = mouseY;

      window.addEventListener("pointermove", (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }, { passive: true });

      const followCursor = () => {
        ringX += (mouseX - ringX) * 0.16;
        ringY += (mouseY - ringY) * 0.16;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(followCursor);
      };
      followCursor();

      document.querySelectorAll("a, button, input, textarea, .project-card, .skill-list span").forEach((element) => {
        element.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
        element.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
      });
    }
  }

  function addTilt(selector) {
    if (!canRunRichMotion || !window.matchMedia("(pointer: fine)").matches) return;
    document.querySelectorAll(selector).forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        element.style.setProperty("--ry", `${x * 5}deg`);
        element.style.setProperty("--rx", `${y * -5}deg`);
      });
      element.addEventListener("pointerleave", () => {
        element.style.setProperty("--ry", "0deg");
        element.style.setProperty("--rx", "0deg");
      });
    });
  }

  addMotionChrome();
  addTilt(".project-card, .hero-rail-card");

  function internalLink(link) {
    if (!link.href || link.target === "_blank") return false;
    const url = new URL(link.href, window.location.href);
    return url.origin === window.location.origin && url.pathname !== window.location.pathname;
  }

  document.querySelectorAll("a").forEach((link) => {
    if (!internalLink(link)) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => { window.location.href = link.href; }, reducedMotion ? 0 : 500);
    });
  });

  function formValues() {
    return {
      name: document.getElementById("contact-name")?.value.trim() || "",
      email: document.getElementById("contact-email")?.value.trim() || "",
      project: document.getElementById("contact-project")?.value.trim() || "",
      message: document.getElementById("contact-message")?.value.trim() || "",
    };
  }

  document.getElementById("contact-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = formValues();
    const subject = `Project enquiry from ${values.name || "a new friend"}`;
    const body = [`Name: ${values.name}`, `Email: ${values.email}`, `Project: ${values.project}`, "", values.message].join("\n");
    window.location.href = `mailto:updrafttech.ai@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const status = document.getElementById("contact-status");
    if (status) status.hidden = false;
  });

  document.getElementById("whatsapp-button")?.addEventListener("click", () => {
    const values = formValues();
    const text = `Hello CODE.IO. I am ${values.name || "interested in working together"}${values.project ? `, working on ${values.project}` : ""}. ${values.message || "I would love to share a project brief."}`;
    window.open(`https://wa.me/918737820680?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  });
})();
