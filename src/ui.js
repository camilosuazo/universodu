/**
 * UI module for UniversoDu
 * Handles DOM interactions and user interface state
 */

import { UI_CONFIG } from "./constants.js";

const { MAX_LOG_ITEMS, TOAST_DURATION_MS } = UI_CONFIG;

export function initUI({
  onEnterWorld,
  onPrompt,
  onDayChange,
  onTogglePanel,
  onRequestLocalServerHelp,
  onToggleAudio,
}) {
  const enterButton = document.getElementById("enter-button");
  const enterButtonLabel = document.getElementById("enter-button-label");
  const promptForm = document.getElementById("prompt-form");
  const promptInput = document.getElementById("prompt-input");
  const promptLog = document.getElementById("prompt-log");
  const lockHint = document.getElementById("lock-hint");
  const statusPill = document.getElementById("status-pill");
  const daySelect = document.getElementById("day-select");
  const hudCard = document.getElementById("hud-card");
  const hudToggle = document.getElementById("hud-toggle");
  const panel = document.getElementById("control-panel");
  const panelToggle = document.getElementById("panel-toggle");
  const panelFab = document.getElementById("panel-fab");
  const fileOverlay = document.getElementById("file-overlay");
  const fileOverlayButton = document.getElementById("file-overlay-button");
  const errorOverlay = document.getElementById("error-overlay");
  const errorOverlayButton = document.getElementById("error-overlay-button");
  const audioToggle = document.getElementById("audio-toggle");
  const submitButton = promptForm?.querySelector('button[type="submit"]');

  // Loading state
  let isLoading = false;

  // Create toast element
  const toast = document.createElement("div");
  toast.style.position = "absolute";
  toast.style.bottom = "1.2rem";
  toast.style.right = "1.2rem";
  toast.style.padding = "0.7rem 1rem";
  toast.style.borderRadius = "999px";
  toast.style.background = "rgba(15, 23, 42, 0.9)";
  toast.style.border = "1px solid rgba(255,255,255,0.2)";
  toast.style.color = "#fff";
  toast.style.fontSize = "0.85rem";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.2s ease";
  toast.style.pointerEvents = "none";
  toast.id = "toast";
  document.body.appendChild(toast);

  // Create loading spinner element
  const spinner = document.createElement("span");
  spinner.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 6px;">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
  </svg>`;
  spinner.style.display = "none";

  // Add spinner animation style
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .loading-state {
      opacity: 0.7;
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleEl);

  enterButton?.addEventListener("click", () => {
    onEnterWorld?.();
  });

  audioToggle?.addEventListener("click", () => {
    const enabled = onToggleAudio?.();
    if (enabled === null || typeof enabled === "undefined") return;
    audioToggle.textContent = enabled ? "Pausar musica" : "Activar musica";
  });

  hudToggle?.addEventListener("click", () => {
    const collapsed = hudCard?.classList.toggle("collapsed");
    hudToggle.textContent = collapsed ? "Mostrar panel" : "Minimizar";
  });

  promptForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isLoading) return;
    const value = promptInput?.value?.trim();
    if (!value) return;
    onPrompt?.(value);
  });

  document.querySelectorAll(".suggestions span").forEach((span) => {
    span.style.cursor = "pointer";
    span.addEventListener("click", () => {
      if (promptInput && !isLoading) {
        promptInput.value = span.textContent || "";
        promptInput.focus();
      }
    });
  });

  daySelect?.addEventListener("change", () => {
    onDayChange?.(daySelect.value);
  });

  let panelCollapsed = panel?.classList.contains("collapsed") || false;

  function updatePanelState(collapsed, { silent } = {}) {
    if (!panel) return;
    panelCollapsed = !!collapsed;
    panel.classList.toggle("collapsed", panelCollapsed);
    const toggleLabel = panelCollapsed ? "Mostrar tags" : "Ocultar tags";
    if (panelToggle) {
      panelToggle.textContent = toggleLabel;
    }
    if (panelFab) {
      panelFab.textContent = panelCollapsed ? "Mostrar tags" : "Ocultar tags";
      panelFab.setAttribute("aria-expanded", (!panelCollapsed).toString());
    }
    if (!silent) {
      onTogglePanel?.(panelCollapsed);
    }
  }

  panelToggle?.addEventListener("click", () => {
    updatePanelState(!panelCollapsed);
  });

  panelFab?.addEventListener("click", () => {
    updatePanelState(!panelCollapsed);
  });

  const mobileQuery = window.matchMedia("(max-width: 768px)");
  const handleMediaChange = (event) => {
    updatePanelState(event.matches, { silent: true });
  };
  if (mobileQuery.matches) {
    updatePanelState(true, { silent: true });
  }
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleMediaChange);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(handleMediaChange);
  }

  updatePanelState(panelCollapsed, { silent: true });

  fileOverlayButton?.addEventListener("click", () => {
    onRequestLocalServerHelp?.();
    hideFileOverlay();
  });

  errorOverlayButton?.addEventListener("click", () => window.location.reload());

  function markPointerLock(locked) {
    if (!lockHint) return;
    lockHint.textContent = locked
      ? "Modo exploracion — usa WASD y el mouse"
      : "Cursor libre";
  }

  function setEnterButtonState(label, disabled) {
    if (!enterButton) return;
    if (enterButtonLabel) {
      enterButtonLabel.textContent = label;
    } else {
      enterButton.textContent = label;
    }
    enterButton.disabled = disabled;
    enterButton.style.opacity = disabled ? "0.7" : "1";
  }

  function pushPromptLog(prompt, summary) {
    if (!promptLog) return;
    const li = document.createElement("li");
    const main = document.createElement("span");
    main.textContent = prompt;
    const meta = document.createElement("small");
    meta.textContent = summary || "Accion generada";
    li.appendChild(main);
    li.appendChild(meta);
    promptLog.prepend(li);
    while (promptLog.children.length > MAX_LOG_ITEMS) {
      promptLog.removeChild(promptLog.lastChild);
    }
  }

  function showFileOverlay() {
    fileOverlay?.classList.add("active");
  }

  function hideFileOverlay() {
    fileOverlay?.classList.remove("active");
  }

  function showError(message) {
    if (errorOverlay) {
      const msg = document.getElementById("error-message");
      if (msg) msg.textContent = message;
      errorOverlay.classList.add("active");
    }
  }

  function hideError() {
    errorOverlay?.classList.remove("active");
  }

  let toastTimeout;
  function notify(message, duration = TOAST_DURATION_MS) {
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
    }, duration);
  }

  function setStatus(message) {
    if (!statusPill) return;
    statusPill.textContent = message;
  }

  function clearPromptInput() {
    if (promptInput) {
      promptInput.value = "";
      promptInput.focus();
    }
  }

  function setLoading(loading) {
    isLoading = loading;

    if (promptInput) {
      promptInput.disabled = loading;
      promptInput.classList.toggle("loading-state", loading);
    }

    if (submitButton) {
      submitButton.disabled = loading;
      if (loading) {
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 6px;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
        </svg>Generando...`;
        submitButton.style.opacity = "0.7";
      } else {
        submitButton.textContent = submitButton.dataset.originalText || "Invocar paisaje";
        submitButton.style.opacity = "1";
      }
    }
  }

  return {
    markPointerLock,
    setEnterButtonState,
    pushPromptLog,
    showFileOverlay,
    hideFileOverlay,
    showError,
    hideError,
    notify,
    setStatus,
    clearPromptInput,
    setLoading,
  };
}
