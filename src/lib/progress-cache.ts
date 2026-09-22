export const PROGRESS_PREFIX = "st_progress_";

export type ProgressCache = { completed: number; total: number; updatedAt: number };

/**
 * Keys that share `PROGRESS_PREFIX` but are NOT institution progress entries.
 * `st_progress_mode` (from progress-mode-store) holds a plain string such as
 * "mixed", so JSON.parse on it throws. Excluding it here is one layer of
 * defence; the per-key try/catch + shape validation below is the second.
 */
const NON_PROGRESS_KEYS = new Set<string>(["st_progress_mode"]);

export interface ProgressStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

/**
 * Load every per-institution progress entry from storage.
 *
 * Defensive by design: a single corrupt, unexpected, or non-progress key must
 * never abort the scan of the remaining keys (the previous implementation
 * wrapped the whole loop in one try/catch, so `st_progress_mode` — which
 * matches the prefix but is not valid JSON — silently wiped out every
 * institution's progress depending on key iteration order).
 */
export function loadAllProgress(
  storage: ProgressStorage = localStorage,
): Map<string, ProgressCache> {
  const map = new Map<string, ProgressCache>();

  let length: number;
  try {
    length = storage.length;
  } catch {
    return map;
  }

  for (let i = 0; i < length; i++) {
    try {
      const key = storage.key(i);
      if (!key || !key.startsWith(PROGRESS_PREFIX)) continue;
      if (NON_PROGRESS_KEYS.has(key)) continue;

      const raw = storage.getItem(key);
      if (!raw) continue;

      const parsed: unknown = JSON.parse(raw);
      // Only accept a plain object that actually looks like a progress entry.
      // Strings, arrays, numbers, booleans and null are skipped.
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        typeof (parsed as ProgressCache).completed !== "number" ||
        typeof (parsed as ProgressCache).total !== "number"
      ) {
        continue;
      }

      map.set(key.slice(PROGRESS_PREFIX.length), parsed as ProgressCache);
    } catch (err) {
      // Skip this key only; keep scanning the rest.
      console.warn(`[progress-cache] skipping unreadable key at index ${i}`, err);
    }
  }

  return map;
}
