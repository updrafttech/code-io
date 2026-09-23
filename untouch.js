(function () {
  "use strict";

  // Frontend deterrence only: this does NOT provide real DRM-level protection.
  const blockedCombos = new Set([
    "F12",
    "Ctrl+Shift+I",
    "Ctrl+Shift+J",
    "Ctrl+Shift+C",
    "Ctrl+U",
    "Ctrl+S",
  ]);

  function normalizeCombo(e) {
    const keys = [];
    if (e.ctrlKey || e.metaKey) keys.push("Ctrl");
    if (e.shiftKey) keys.push("Shift");

    const key = (e.key || "").toUpperCase();
    if (key.length === 1) {
      keys.push(key);
    } else {
      keys.push(key.replace("ARROW", ""));
    }

    return keys.join("+");
  }

  function blockEvent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function isEditableTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(target.closest("input, textarea, [contenteditable='true']"));
  }

  // Disable right click and some common shortcuts used for easy copying/inspection.
  window.addEventListener("contextmenu", blockEvent, { capture: true });
  window.addEventListener(
    "selectstart",
    (e) => {
      if (isEditableTarget(e.target)) return;
      blockEvent(e);
    },
    { capture: true }
  );
  window.addEventListener(
    "dragstart",
    (e) => {
      if (isEditableTarget(e.target)) return;
      blockEvent(e);
    },
    { capture: true }
  );
  window.addEventListener(
    "copy",
    (e) => {
      if (isEditableTarget(e.target)) return;
      blockEvent(e);
    },
    { capture: true }
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (isEditableTarget(e.target)) return;
      const combo = normalizeCombo(e);
      if (blockedCombos.has(combo)) {
        blockEvent(e);
      }
    },
    { capture: true }
  );

  // Basic DevTools detection via viewport difference.
  // This is bypassable; used only as a light deterrent.
  function detectDevTools() {
    const widthGap = Math.abs(window.outerWidth - window.innerWidth);
    const heightGap = Math.abs(window.outerHeight - window.innerHeight);
    return widthGap > 180 || heightGap > 180;
  }

  setInterval(() => {
    if (!detectDevTools()) return;

    const audio = document.getElementById("audio");
    if (audio && !audio.paused) {
      audio.pause();
    }
  }, 1200);
})();
