import { DEFAULT_PRESETS, SETTINGS_PRESETS, type ChapterTaskPreset } from "./chapter-task-presets";

const LS_PRESETS_KEY = "st_chapter_task_active_presets";
const LS_CUSTOM_KEY = "st_chapter_task_custom_presets";
const LS_SELECTIONS_KEY = "st_chapter_tasks";
const LS_SUBJECT_OVERRIDES_KEY = "st_subject_overrides";
const LS_SUBJECT_LOCAL_KEY = "st_subject_local_presets";

// --- Visible-presets resolution cache ---
// getVisiblePresetsForSubject is called per subject on every render pass and
// used to cost ~2N localStorage reads + JSON.parses per subject. The result
// only changes when preset CONFIG changes (activation, custom presets,
// per-subject overrides, subject-local presets), so it is cached per subject
// and invalidated exactly by those config mutations (and cross-tab storage
// events for their keys). Selection writes deliberately do NOT invalidate it.
const visiblePresetsCache = new Map<string, ChapterTaskPreset[]>();

// Monotonic counter bumped on every config invalidation. Stable primitive that
// consumers can use as a useMemo dependency to recompute derived values (e.g.
// overall progress) exactly when preset CONFIG changes — without recomputing
// on selection-only changes and without a new array/object reference per
// render. It is the render-observable counterpart of the cache invalidation.
let visiblePresetsConfigVersion = 0;

function invalidateVisiblePresetsCache() {
  visiblePresetsCache.clear();
  visiblePresetsConfigVersion++;
}

/** Returns the current preset-config version (changes only on config mutations). */
export function getVisiblePresetsConfigVersion(): number {
  return visiblePresetsConfigVersion;
}

// --- Active Presets (which presets are visible) ---

export function getActivePresetIds(): string[] {
  try {
    const raw = localStorage.getItem(LS_PRESETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_PRESETS.map((p) => p.id);
}

export function setActivePresetIds(ids: string[]) {
  localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(ids));
  invalidateVisiblePresetsCache();
  window.dispatchEvent(new CustomEvent("st-chapter-tasks-changed"));
}

// --- Custom Presets (user-created) ---

export function getCustomPresets(): ChapterTaskPreset[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function setCustomPresets(presets: ChapterTaskPreset[]) {
  localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(presets));
  invalidateVisiblePresetsCache();
  window.dispatchEvent(new CustomEvent("st-chapter-tasks-changed"));
}

export function addCustomPreset(label: string): ChapterTaskPreset {
  const presets = getCustomPresets();
  const newPreset: ChapterTaskPreset = {
    id: `custom_${Date.now()}`,
    label,
    isDefault: false,
  };
  presets.push(newPreset);
  setCustomPresets(presets);

  // Also activate it
  const active = getActivePresetIds();
  if (!active.includes(newPreset.id)) {
    active.push(newPreset.id);
    setActivePresetIds(active);
  }

  return newPreset;
}

export function removeCustomPreset(id: string) {
  const presets = getCustomPresets().filter((p) => p.id !== id);
  setCustomPresets(presets);

  // Also deactivate
  const active = getActivePresetIds().filter((pid) => pid !== id);
  setActivePresetIds(active);
}

export function renameCustomPreset(id: string, newLabel: string) {
  const presets = getCustomPresets().map((p) => (p.id === id ? { ...p, label: newLabel } : p));
  setCustomPresets(presets);
}

// --- All available presets (defaults + custom) ---

export function getAllPresets(): ChapterTaskPreset[] {
  return [...DEFAULT_PRESETS, ...SETTINGS_PRESETS, ...getCustomPresets()];
}

export function getActivePresets(): ChapterTaskPreset[] {
  const activeIds = new Set(getActivePresetIds());
  return getAllPresets().filter((p) => activeIds.has(p.id));
}

// --- Per-Chapter Selections ---
// scope: undefined = generic subject tab ("st_chapter_tasks"),
// institution slug = shared across that institution's units ("st_chapter_tasks_<slug>")
//
// Selections are cached per scope and the cache is written through on every
// set, so repeated reads between changes return the SAME object reference.
// Untouched chapter slices keep their identity across toggles (immutably
// updated), which lets React.memo bail out for sibling rows.

export type ChapterTaskSelections = Record<string, Record<string, boolean>>;

function selectionsKey(scope?: string): string {
  return scope ? `${LS_SELECTIONS_KEY}_${scope}` : LS_SELECTIONS_KEY;
}

const selectionsCache = new Map<string, ChapterTaskSelections>();

export function getChapterSelections(scope?: string): ChapterTaskSelections {
  try {
    const raw = localStorage.getItem(selectionsKey(scope));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

/** Cached variant: stable reference between changes (safe for React.memo). */
export function getChapterSelectionsCached(scope?: string): ChapterTaskSelections {
  const key = scope ?? "";
  let cached = selectionsCache.get(key);
  if (!cached) {
    cached = getChapterSelections(scope);
    selectionsCache.set(key, cached);
  }
  return cached;
}

export function setChapterSelections(selections: ChapterTaskSelections, scope?: string) {
  localStorage.setItem(selectionsKey(scope), JSON.stringify(selections));
  selectionsCache.set(scope ?? "", selections);
  window.dispatchEvent(new CustomEvent("st-chapter-tasks-changed"));
}

export function toggleChapterTask(
  chapterId: string,
  presetId: string,
  scope?: string,
): ChapterTaskSelections {
  const prev = getChapterSelectionsCached(scope);
  const chapter = { ...prev[chapterId] };
  chapter[presetId] = !chapter[presetId];
  const next = { ...prev, [chapterId]: chapter };
  setChapterSelections(next, scope);
  return next;
}

/** Bulk set/unset multiple presets for a single chapter */
export function setChapterTasks(
  chapterId: string,
  presetIds: string[],
  value: boolean,
  scope?: string,
): ChapterTaskSelections {
  const prev = getChapterSelectionsCached(scope);
  const chapter = { ...prev[chapterId] };
  for (const presetId of presetIds) {
    chapter[presetId] = value;
  }
  const next = { ...prev, [chapterId]: chapter };
  setChapterSelections(next, scope);
  return next;
}

// --- Per-Subject Preset Overrides ---
// { [subjectId]: { [presetId]: boolean } }
// undefined = inherit from global, true = force ON for subject, false = force OFF for subject

export function getSubjectOverrides(subjectId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_SUBJECT_OVERRIDES_KEY);
    if (raw) {
      const all = JSON.parse(raw) as Record<string, Record<string, boolean>>;
      return all[subjectId] ?? {};
    }
  } catch {
    // ignore
  }
  return {};
}

export function setSubjectOverrides(subjectId: string, overrides: Record<string, boolean>) {
  try {
    const raw = localStorage.getItem(LS_SUBJECT_OVERRIDES_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, boolean>>) : {};
    all[subjectId] = overrides;
    localStorage.setItem(LS_SUBJECT_OVERRIDES_KEY, JSON.stringify(all));
    invalidateVisiblePresetsCache();
    window.dispatchEvent(new CustomEvent("st-chapter-tasks-changed"));
  } catch {
    // ignore
  }
}

export function toggleSubjectOverride(subjectId: string, presetId: string): boolean {
  const overrides = getSubjectOverrides(subjectId);
  const current = overrides[presetId];
  if (current === undefined) {
    // No override yet. Resolve what the global state is, then set opposite.
    const isGlobalActive = getActivePresetIds().includes(presetId);
    overrides[presetId] = !isGlobalActive;
  } else if (current) {
    // Was force-ON → now force-OFF
    overrides[presetId] = false;
  } else {
    // Was force-OFF → delete override (revert to inherit)
    delete overrides[presetId];
  }
  setSubjectOverrides(subjectId, overrides);
  // Return whether preset is now active for this subject
  return overrides[presetId] !== undefined
    ? overrides[presetId]
    : getActivePresetIds().includes(presetId);
}

/** Resolve whether a preset is active for a specific subject */
export function getSubjectPresetState(subjectId: string, presetId: string): boolean {
  const overrides = getSubjectOverrides(subjectId);
  if (presetId in overrides) return overrides[presetId];
  return getActivePresetIds().includes(presetId);
}

// Backward-compat: getHiddenPresetIds returns presets force-OFF for a subject
export function getSubjectHiddenPresets(subjectId: string): string[] {
  const overrides = getSubjectOverrides(subjectId);
  return Object.entries(overrides)
    .filter(([, v]) => v === false)
    .map(([k]) => k);
}

// --- Subject-Local Custom Presets ---
// { [subjectId]: ChapterTaskPreset[] } — presets added only for this subject

export function getSubjectLocalPresets(subjectId: string): ChapterTaskPreset[] {
  try {
    const raw = localStorage.getItem(LS_SUBJECT_LOCAL_KEY);
    if (raw) {
      const all = JSON.parse(raw) as Record<string, ChapterTaskPreset[]>;
      return all[subjectId] ?? [];
    }
  } catch {
    // ignore
  }
  return [];
}

export function setSubjectLocalPresets(subjectId: string, presets: ChapterTaskPreset[]) {
  try {
    const raw = localStorage.getItem(LS_SUBJECT_LOCAL_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, ChapterTaskPreset[]>) : {};
    all[subjectId] = presets;
    localStorage.setItem(LS_SUBJECT_LOCAL_KEY, JSON.stringify(all));
    invalidateVisiblePresetsCache();
    window.dispatchEvent(new CustomEvent("st-chapter-tasks-changed"));
  } catch {
    // ignore
  }
}

export function addSubjectLocalPreset(subjectId: string, label: string): ChapterTaskPreset {
  const presets = getSubjectLocalPresets(subjectId);
  const newPreset: ChapterTaskPreset = {
    id: `subj_${subjectId}_${Date.now()}`,
    label,
    isDefault: false,
  };
  presets.push(newPreset);
  setSubjectLocalPresets(subjectId, presets);
  return newPreset;
}

export function removeSubjectLocalPreset(subjectId: string, presetId: string) {
  const presets = getSubjectLocalPresets(subjectId).filter((p) => p.id !== presetId);
  setSubjectLocalPresets(subjectId, presets);
  // also remove any override for this preset
  const overrides = getSubjectOverrides(subjectId);
  if (presetId in overrides) {
    delete overrides[presetId];
    setSubjectOverrides(subjectId, overrides);
  }
}

export function renameSubjectLocalPreset(subjectId: string, presetId: string, newLabel: string) {
  const presets = getSubjectLocalPresets(subjectId).map((p) =>
    p.id === presetId ? { ...p, label: newLabel } : p,
  );
  setSubjectLocalPresets(subjectId, presets);
}

// returns all presets resolved for this subject: global on/off + per-subject overrides + local presets
// Cached per subject; the cached ARRAY reference is stable until preset config changes.
export function getVisiblePresetsForSubject(subjectId: string): ChapterTaskPreset[] {
  const cached = visiblePresetsCache.get(subjectId);
  if (cached) return cached;
  const allPresets = getAllPresets();
  const localPresets = getSubjectLocalPresets(subjectId);
  const resolved = allPresets.filter((p) => getSubjectPresetState(subjectId, p.id));
  const result = [...resolved, ...localPresets];
  visiblePresetsCache.set(subjectId, result);
  return result;
}

// --- Event Listener ---

type Listener = () => void;
const listeners = new Set<Listener>();

export function onChapterTasksChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

window.addEventListener("storage", (e) => {
  if (
    e.key === LS_PRESETS_KEY ||
    e.key === LS_CUSTOM_KEY ||
    e.key === LS_SELECTIONS_KEY ||
    (e.key != null && e.key.startsWith(`${LS_SELECTIONS_KEY}_`)) ||
    e.key === LS_SUBJECT_OVERRIDES_KEY ||
    e.key === LS_SUBJECT_LOCAL_KEY
  ) {
    // Cross-tab change: drop in-memory caches so the next read re-parses the
    // freshly persisted values.
    if (
      e.key === LS_PRESETS_KEY ||
      e.key === LS_CUSTOM_KEY ||
      e.key === LS_SUBJECT_OVERRIDES_KEY ||
      e.key === LS_SUBJECT_LOCAL_KEY
    ) {
      invalidateVisiblePresetsCache();
    }
    if (e.key === LS_SELECTIONS_KEY || (e.key != null && e.key.startsWith(`${LS_SELECTIONS_KEY}_`))) {
      selectionsCache.clear();
    }
    listeners.forEach((cb) => cb());
  }
});

window.addEventListener("st-chapter-tasks-changed", () => {
  listeners.forEach((cb) => cb());
});
