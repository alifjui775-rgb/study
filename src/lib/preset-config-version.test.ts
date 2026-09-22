import { describe, it, expect, vi } from "vite-plus/test";
import { DEFAULT_PRESETS } from "./chapter-task-presets";

type Store = typeof import("./chapter-task-store");

class MockStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

// The store registers window listeners at module scope and uses localStorage +
// CustomEvent in its mutators, so the globals must exist before it is imported.
async function loadFreshStore(): Promise<Store> {
  vi.resetModules();
  (globalThis as any).localStorage = new MockStorage();
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  return (await import("./chapter-task-store")) as Store;
}

// Faithful model of React's useMemo dependency comparison.
function createMemo() {
  let lastDeps: unknown[] | null = null;
  let lastValue: number | undefined;
  return (deps: unknown[], compute: () => number): number => {
    const changed =
      lastDeps === null ||
      deps.length !== lastDeps.length ||
      deps.some((d, i) => !Object.is(d, lastDeps![i]));
    if (changed) {
      lastValue = compute();
      lastDeps = deps;
    }
    return lastValue as number;
  };
}

type Chapter = { id: string; topics: { id: string }[] };
type Subject = { id: string; chapters: Chapter[] };

const subjects: Subject[] = [
  {
    id: "subj1",
    chapters: [
      { id: "c1", topics: [{ id: "t1" }, { id: "t2" }] },
      { id: "c2", topics: [{ id: "t3" }] },
    ],
  },
  { id: "subj2", chapters: [{ id: "c3", topics: [{ id: "t4" }] }] },
];

// Mirrors resolveChapterUnit in both components (mixed mode).
function resolveChapterUnit(
  chapter: Chapter,
  visiblePresets: { id: string }[],
  mode: "mixed" | "task" | "topic",
  doneTopics: Set<string>,
  doneChapters: Set<string>,
  selections: Record<string, Record<string, boolean>>,
) {
  if (mode !== "topic" && visiblePresets.length > 0) {
    const done = visiblePresets.filter((p) => !!selections[chapter.id]?.[p.id]).length;
    return { done, total: visiblePresets.length };
  }
  if (mode !== "task" && chapter.topics.length > 0) {
    const done = chapter.topics.filter((t) => doneTopics.has(t.id)).length;
    return { done, total: chapter.topics.length };
  }
  return { done: doneChapters.has(chapter.id) ? 1 : 0, total: 1 };
}

// Mirrors the components' overallProgress loop exactly.
function computeOverall(
  store: Store,
  selections: Record<string, Record<string, boolean>>,
  mode: "mixed" | "task" | "topic" = "mixed",
) {
  const doneTopics = new Set<string>();
  const doneChapters = new Set<string>();
  let done = 0;
  let total = 0;
  for (const subject of subjects) {
    const visiblePresets = store.getVisiblePresetsForSubject(subject.id);
    for (const ch of subject.chapters) {
      const u = resolveChapterUnit(ch, visiblePresets, mode, doneTopics, doneChapters, selections);
      done += u.done;
      total += u.total;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

const doneFour = {
  c1: {
    book_reading: true,
    exam_practice: true,
    question_bank: true,
    concept_clear: true,
  },
};

for (const scope of [undefined, "dhaka-university"] as const) {
  const label = scope ? `scoped:${scope} (SyllabusDashboard)` : "unscoped (SyllabusTrackerClient)";

  describe(`F5 overall-progress memo — ${label}`, () => {
    it("reproduces the stale overall value before the fix, and recomputes after", async () => {
      const store = await loadFreshStore();
      store.setChapterSelections(doneFour, scope);

      const emptyTopics = new Set<string>();
      const emptyChapters = new Set<string>();
      const mode = "mixed" as const;

      const selectionsBefore = store.getChapterSelectionsCached(scope);

      // Deps the OLD code used (no config signal).
      const depsOld = () => [subjects, emptyTopics, emptyChapters, selectionsBefore, mode];
      // Deps the FIXED code uses (same refs + config version).
      const depsNew = () => [
        subjects,
        emptyTopics,
        emptyChapters,
        selectionsBefore,
        mode,
        store.getVisiblePresetsConfigVersion(),
      ];

      const memoOld = createMemo();
      const memoNew = createMemo();
      const compute = () => computeOverall(store, selectionsBefore, mode);

      expect(memoOld(depsOld(), compute)).toBe(33);
      expect(memoNew(depsNew(), compute)).toBe(33);

      // Config-only change: enable "কনসেপ্ট বুক" globally (a SETTINGS preset).
      store.setActivePresetIds([...store.getActivePresetIds(), "concept_book"]);

      // Same selections reference (config edit does not touch selections)…
      expect(store.getChapterSelectionsCached(scope)).toBe(selectionsBefore);
      // …but all subjects now resolve one extra visible preset (5 instead of 4).
      expect(store.getVisiblePresetsForSubject("subj1")).toHaveLength(5);

      const fresh = computeOverall(store, selectionsBefore, mode);
      const stale = memoOld(depsOld(), compute);
      const fixed = memoNew(depsNew(), compute);

      // Before the fix the top-level value stayed at 33 while the real value moved.
      expect(fresh).toBe(27);
      expect(stale).toBe(33);
      expect(stale).not.toBe(fresh);

      // After the fix the memo recomputes to the correct value immediately.
      expect(fixed).toBe(27);
      expect(fixed).toBe(fresh);
    });

    it("recomputes only when a relevant dependency actually changes", async () => {
      const store = await loadFreshStore();
      store.setChapterSelections(doneFour, scope);

      const emptyTopics = new Set<string>();
      const emptyChapters = new Set<string>();
      const mode = "mixed" as const;
      let selections = store.getChapterSelectionsCached(scope);
      let computeCount = 0;

      const memo = createMemo();
      const render = () =>
        memo(
          [
            subjects,
            emptyTopics,
            emptyChapters,
            selections,
            mode,
            store.getVisiblePresetsConfigVersion(),
          ],
          () => {
            computeCount++;
            return computeOverall(store, selections, mode);
          },
        );

      expect(render()).toBe(33);
      expect(computeCount).toBe(1);

      // Unrelated re-render with identical deps (e.g. a filter event): no recompute.
      expect(render()).toBe(33);
      expect(computeCount).toBe(1);

      // Config change: exactly one recompute.
      store.setActivePresetIds([...store.getActivePresetIds(), "concept_book"]);
      expect(render()).toBe(27);
      expect(computeCount).toBe(2);

      // Another unrelated re-render: still no recompute.
      expect(render()).toBe(27);
      expect(computeCount).toBe(2);

      // Selection toggle: one necessary recompute via selections identity.
      selections = store.toggleChapterTask("c2", "book_reading", scope);
      expect(render()).toBe(33); // (4 + 1) / (5 * 3)
      expect(computeCount).toBe(3);
    });

    it("does not treat selection-only toggles as a config change (no cascade)", async () => {
      const store = await loadFreshStore();
      store.setChapterSelections(doneFour, scope);

      const versionBefore = store.getVisiblePresetsConfigVersion();
      const presetsBefore = store.getVisiblePresetsForSubject("subj1");
      const selectionsBefore = store.getChapterSelectionsCached(scope);

      // Toggle one unrelated checkbox.
      const selectionsAfter = store.toggleChapterTask("c2", "book_reading", scope);

      // Config signal must NOT move, and the preset cache must NOT be invalidated.
      expect(store.getVisiblePresetsConfigVersion()).toBe(versionBefore);
      expect(store.getVisiblePresetsForSubject("subj1")).toBe(presetsBefore);

      // But selections identity changes, so the overall memo recomputes exactly
      // once via that (necessary) dependency.
      expect(selectionsAfter).not.toBe(selectionsBefore);
      expect(computeOverall(store, selectionsAfter)).toBe(42); // (4 + 1) / 12
    });
  });
}

describe("preset-config version semantics", () => {
  it("increments only on preset-config mutations", async () => {
    const store = await loadFreshStore();
    const v0 = store.getVisiblePresetsConfigVersion();

    store.getActivePresetIds();
    store.getVisiblePresetsForSubject("subj1");
    store.getChapterSelectionsCached("x");
    expect(store.getVisiblePresetsConfigVersion()).toBe(v0);

    store.setActivePresetIds(DEFAULT_PRESETS.map((p) => p.id));
    const v1 = store.getVisiblePresetsConfigVersion();
    expect(v1).toBeGreaterThan(v0);

    store.setCustomPresets([{ id: "custom_1", label: "X", isDefault: false }]);
    expect(store.getVisiblePresetsConfigVersion()).toBeGreaterThan(v1);

    store.setSubjectOverrides("subj1", { book_reading: false });
    expect(store.getVisiblePresetsConfigVersion()).toBeGreaterThan(v1);

    store.setSubjectLocalPresets("subj1", [{ id: "subj_1", label: "Y", isDefault: false }]);
    expect(store.getVisiblePresetsConfigVersion()).toBeGreaterThan(v1);

    const vSel = store.getVisiblePresetsConfigVersion();
    store.setChapterSelections({ c1: { book_reading: true } }, "x");
    store.toggleChapterTask("c1", "book_reading", "x");
    expect(store.getVisiblePresetsConfigVersion()).toBe(vSel);
  });

  it("getVisiblePresetsForSubject returns a new array only after a config change", async () => {
    const store = await loadFreshStore();
    const first = store.getVisiblePresetsForSubject("subj1");

    store.setChapterSelections({ c1: { book_reading: true } });
    expect(store.getVisiblePresetsForSubject("subj1")).toBe(first);

    store.setActivePresetIds([...store.getActivePresetIds(), "concept_book"]);
    const second = store.getVisiblePresetsForSubject("subj1");
    expect(second).not.toBe(first);
    expect(second).toHaveLength(first.length + 1);
  });
});
