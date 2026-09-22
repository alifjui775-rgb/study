export type ProgressMode = "mixed" | "task" | "topic";

const STORAGE_KEY = "st_progress_mode";

const VALID_MODES: ProgressMode[] = ["mixed", "task", "topic"];

export function getProgressMode(): ProgressMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && VALID_MODES.includes(raw as ProgressMode)) {
      return raw as ProgressMode;
    }
  } catch {
    // ignore
  }
  return "mixed";
}

export function setProgressMode(mode: ProgressMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent("st-progress-mode-changed"));
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function onProgressModeChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    listeners.forEach((cb) => cb());
  }
});

window.addEventListener("st-progress-mode-changed", () => {
  listeners.forEach((cb) => cb());
});
