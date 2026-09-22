const STORAGE_KEY = "st_group_filters";

export const GROUP_IDS = {
  science: "2803200a-4794-4c82-9e7c-548b05c9b429",
  arts: "dcfd4b49-3557-49af-aa77-47a89ac12a3d",
  commerce: "c151111f-f0cb-480e-8fd0-b80731f1ce88",
} as const;

export type GroupFilterState = Record<string, boolean>;

function getDefaultFilters(): GroupFilterState {
  return {
    [GROUP_IDS.science]: true,
    [GROUP_IDS.arts]: true,
    [GROUP_IDS.commerce]: true,
    ucS: false,
    ucA: false,
    ucC: false,
    mixed: true,
    secondTime: false,
  };
}

export function getFilters(): GroupFilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...getDefaultFilters(), ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return getDefaultFilters();
}

export function setFilters(filters: GroupFilterState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  window.dispatchEvent(new CustomEvent("st-filters-changed"));
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function onFiltersChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    listeners.forEach((cb) => cb());
  }
});

window.addEventListener("st-filters-changed", () => {
  listeners.forEach((cb) => cb());
});
