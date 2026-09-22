import { describe, it, expect } from "vite-plus/test";
import {
  loadAllProgress,
  PROGRESS_PREFIX,
  type ProgressCache,
  type ProgressStorage,
} from "./progress-cache";

class MockStorage implements ProgressStorage {
  private data = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(init)) this.data.set(k, v);
  }
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
}

const entry = (completed: number, total: number, updatedAt = 1): string =>
  JSON.stringify({ completed, total, updatedAt });

// Verbatim copy of the ORIGINAL buggy implementation, kept only to prove the
// root cause. Production code uses loadAllProgress from ./progress-cache.
function loadAllProgressLegacy(storage: ProgressStorage): Map<string, ProgressCache> {
  const map = new Map<string, ProgressCache>();
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith("st_progress_")) {
        const id = key.slice("st_progress_".length);
        const raw = storage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as ProgressCache;
          if (parsed && typeof parsed.completed === "number" && typeof parsed.total === "number") {
            map.set(id, parsed);
          }
        }
      }
    }
  } catch {}
  return map;
}

describe("F3 reproduction (legacy loader)", () => {
  it("drops ALL progress when st_progress_mode is scanned first", () => {
    const storage = new MockStorage({
      st_progress_mode: "mixed",
      st_progress_instA: entry(3, 10),
      st_progress_instB: entry(7, 20),
    });
    expect(loadAllProgressLegacy(storage).size).toBe(0);
  });

  it("only happens to work when st_progress_mode is scanned last", () => {
    const storage = new MockStorage({
      st_progress_instA: entry(3, 10),
      st_progress_instB: entry(7, 20),
      st_progress_mode: "mixed",
    });
    expect([...loadAllProgressLegacy(storage).keys()]).toEqual(["instA", "instB"]);
  });
});

describe("loadAllProgress (fixed)", () => {
  it("loads every entry regardless of st_progress_mode position", () => {
    const before = new MockStorage({
      st_progress_mode: "mixed",
      st_progress_instA: entry(3, 10),
      st_progress_instB: entry(7, 20),
    });
    const middle = new MockStorage({
      st_progress_instA: entry(3, 10),
      st_progress_mode: "mixed",
      st_progress_instB: entry(7, 20),
    });
    const after = new MockStorage({
      st_progress_instA: entry(3, 10),
      st_progress_instB: entry(7, 20),
      st_progress_mode: "mixed",
    });

    for (const storage of [before, middle, after]) {
      const result = loadAllProgress(storage);
      expect([...result.keys()]).toEqual(["instA", "instB"]);
      expect(result.get("instA")).toMatchObject({ completed: 3, total: 10 });
      expect(result.get("instB")).toMatchObject({ completed: 7, total: 20 });
    }
  });

  it("explicitly ignores st_progress_mode (never treated as an institution)", () => {
    const storage = new MockStorage({ st_progress_mode: "mixed" });
    expect(loadAllProgress(storage).size).toBe(0);
    expect([...loadAllProgress(storage).keys()]).not.toContain("mode");
  });

  it("skips one malformed key without aborting the rest of the scan", () => {
    const storage = new MockStorage({
      st_progress_bad: "{not valid json",
      st_progress_instA: entry(3, 10),
      st_progress_mode: "mixed",
      st_progress_instB: entry(7, 20),
    });
    const result = loadAllProgress(storage);
    expect([...result.keys()]).toEqual(["instA", "instB"]);
  });

  it("rejects non-object JSON values (string/array/number/null)", () => {
    const storage = new MockStorage({
      st_progress_a: '"just-a-string"',
      st_progress_b: "[1,2,3]",
      st_progress_c: "42",
      st_progress_d: "null",
      st_progress_e: "true",
      st_progress_ok: entry(1, 2),
    });
    const result = loadAllProgress(storage);
    expect([...result.keys()]).toEqual(["ok"]);
  });

  it("rejects objects with non-numeric completed/total", () => {
    const storage = new MockStorage({
      st_progress_a: JSON.stringify({ completed: "3", total: 10 }),
      st_progress_b: JSON.stringify({ total: 10 }),
      st_progress_ok: entry(1, 2),
    });
    expect([...loadAllProgress(storage).keys()]).toEqual(["ok"]);
  });

  it("ignores unrelated localStorage keys", () => {
    const storage = new MockStorage({
      st_fav_universities: "[]",
      st_group_filters: "{}",
      st_progress_mode: "mixed",
      st_topics: "[]",
      st_chapter_tasks: "{}",
      st_active_tab: "subject",
      st_progress_instA: entry(5, 8),
    });
    expect([...loadAllProgress(storage).keys()]).toEqual(["instA"]);
  });

  it("returns an empty map for a fresh user with no keys", () => {
    expect(loadAllProgress(new MockStorage()).size).toBe(0);
  });

  it("uses the st_progress_ prefix for institution keys", () => {
    expect(PROGRESS_PREFIX).toBe("st_progress_");
    expect([...loadAllProgress(new MockStorage({ st_progress_abc: entry(2, 4) })).keys()]).toEqual([
      "abc",
    ]);
  });

  it("does not crash if storage access throws", () => {
    const hostile: ProgressStorage = {
      get length(): number {
        throw new Error("denied");
      },
      key() {
        return null;
      },
      getItem() {
        return null;
      },
    };
    expect(loadAllProgress(hostile).size).toBe(0);
  });
});
