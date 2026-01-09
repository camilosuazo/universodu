const MAX_LOG_ITEMS = 6;

export function initUI({
  onEnterWorld,
  onPrompt,
  onToggleAI,
  onRequestLocalServerHelp,
}) {
  const enterButton = document.getElementById("enter-button");
  const promptForm = document.getElementById("prompt-form");
  const promptInput = document.getElementById("prompt-input");
  const promptLog = document.getElementById("prompt-log");
  const lockHint = document.getElementById("lock-hint");
  const aiToggle = document.getElementById("ai-toggle");
  const aiStatus = document.getElementById("ai-status");
  const fileOverlay = document.getElementById("file-overlay");
  const fileOverlayButton = document.getElementById("file-overlay-button");
  const errorOverlay = document.getElementById("error-overlay");
  const errorOverlayButton = document.getElementById("error-overlay-button");

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

  enterButton?.addEventListener("click", () => {
    onEnterWorld?.();
  });

  promptForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = promptInput?.value?.trim();
    if (!value) return;
    onPrompt?.(value);
  });

  const suggestionSpans = document.querySelectorAll(".suggestions span");
  suggestionSpans.forEach((span) => {
    span.style.cursor = "pointer";
    span.addEventListener("click", () => {
      if (promptInput) {
        promptInput.value = span.textContent || "";
        promptInput.focus();
      }
    });
  });

  aiToggle?.addEventListener("change", () => {
    onToggleAI?.(!!aiToggle.checked);
  });

  fileOverlayButton?.addEventListener("click", () => {
    onRequestLocalServerHelp?.();
    hideFileOverlay();
  });

  errorOverlayButton?.addEventListener("click", () => {
    window.location.reload();
  });

  function markPointerLock(locked) {
    if (!lockHint) return;
    lockHint.textContent = locked
      ? "Modo exploración — usa WASD y el mouse"
      : "Cursor libre";
  }

  function setEnterButtonState(label, disabled) {
    if (!enterButton) return;
    enterButton.textContent = label;
    enterButton.disabled = disabled;
    enterButton.style.opacity = disabled ? "0.7" : "1";
  }

  function pushPromptLog(prompt, summary) {
    if (!promptLog) return;
    const li = document.createElement("li");
    const main = document.createElement("span");
    main.textContent = prompt;
    const meta = document.createElement("small");
    meta.textContent = summary || "Acción generada";
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
  function notify(message, duration = 2600) {
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
    }, duration);
  }

  function setAIStatus(message) {
    if (!aiStatus) return;
    aiStatus.textContent = message;
  }

  function clearPromptInput() {
    if (promptInput) {
      promptInput.value = "";
      promptInput.focus();
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
    setAIStatus,
    clearPromptInput,
  };
}
