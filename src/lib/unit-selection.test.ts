import { describe, it, expect } from "vitest";
import { resolveSelectedUnit, type SelectableUnit } from "./unit-selection";

type Unit = SelectableUnit;
const A: Unit = { id: "a", unit_slug: "a-unit" };
const B: Unit = { id: "b", unit_slug: "b-unit" };
const C: Unit = { id: "c", unit_slug: "c-unit" };
const ALL = [A, B, C];

// Model of the OLD, buggy selection logic (two effects, reset guarded by
// filteredUnits.length > 0). Kept to demonstrate the bug that F4 fixes.
function resolveSelectedUnitLegacy(
  selected: Unit | null,
  filteredUnits: Unit[],
  institutionSlug: string | undefined,
): Unit | null {
  let s = selected;
  if (s && filteredUnits.length > 0 && !filteredUnits.some((u) => u.id === s.id)) {
    s = null;
  }
  if (filteredUnits.length > 0 && !s) {
    const slugMatch = institutionSlug
      ? filteredUnits.find((u) => u.unit_slug === institutionSlug)
      : undefined;
    s = slugMatch ?? filteredUnits[0];
  }
  return s;
}

// Mirrors the JSX gating in u/page.tsx:
//   dashboard:  selectedUnit ? <SyllabusDashboard/>
//   empty:      ... : filteredUnits.length === 0 ? <empty/>
//   selector:   !hideUnitSelector && (loading || filteredUnits.length > 0)
function viewState(
  selected: Unit | null,
  filteredUnits: Unit[],
  opts: { slug?: string; error?: boolean; loading?: boolean; legacySelector?: boolean } = {},
) {
  const { slug, error = false, loading = false, legacySelector = false } = opts;
  const hideUnitSelector = filteredUnits.some((u) => u.unit_slug === slug);
  return {
    dashboard: !!selected,
    empty: !selected && !error && !loading && filteredUnits.length === 0,
    // original code rendered the UnitSelector whenever !hideUnitSelector (so it
    // showed its own "no units" card); the fixed code hides it when empty.
    unitSelector: legacySelector
      ? !hideUnitSelector
      : !hideUnitSelector && (loading || filteredUnits.length > 0),
  };
}

describe("resolveSelectedUnit", () => {
  it("keeps the current selection when it is still in the list", () => {
    expect(resolveSelectedUnit(A, ALL, "a", undefined)).toBe(A);
  });

  it("clears the selection when the filter excludes everything", () => {
    expect(resolveSelectedUnit(A, [], "a", undefined)).toBeNull();
  });

  it("falls back to the first unit when the selected one is excluded", () => {
    expect(resolveSelectedUnit(A, [B, C], "a", undefined)).toBe(B);
  });

  it("restores the previously selected unit when it comes back", () => {
    expect(resolveSelectedUnit(null, ALL, "b", undefined)).toBe(B);
  });

  it("falls back to the first unit when the previous one is absent", () => {
    expect(resolveSelectedUnit(null, [A, C], "b", undefined)).toBe(A);
  });

  it("prefers the slug-matched unit when the selector is hidden", () => {
    expect(resolveSelectedUnit(null, [A, B], null, "b-unit")).toBe(B);
    expect(resolveSelectedUnit(null, [A, B], "a", "b-unit")).toBe(B);
  });

  it("excludes all -> restores original selection when the filter is removed", () => {
    let selected = resolveSelectedUnit(A, ALL, null, undefined); // initial auto-select? A already valid
    expect(selected).toBe(A);
    // filter excludes everything
    selected = resolveSelectedUnit(selected, [], selected?.id ?? null, undefined);
    expect(selected).toBeNull();
    // filter removed -> prefer last selected (A)
    selected = resolveSelectedUnit(selected, ALL, "a", undefined);
    expect(selected).toBe(A);
  });

  it("reverse order: exclusion settles on a valid unit from each new subset", () => {
    let lastId: string | null = null;
    let selected: Unit | null = resolveSelectedUnit(A, ALL, lastId, undefined); // A
    expect(selected).toBe(A);
    lastId = selected!.id;

    // filter to a subset that excludes A
    selected = resolveSelectedUnit(selected, [B, C], lastId, undefined);
    expect(selected).toBe(B);
    lastId = selected!.id;

    // filter to a different subset that excludes A and B
    selected = resolveSelectedUnit(selected, [C], lastId, undefined);
    expect(selected).toBe(C);

    // and back to a subset containing A: keeps the now-valid C
    selected = resolveSelectedUnit(selected, [A, C], lastId, undefined);
    expect(selected).toBe(C);
  });
});

describe("F4 scenario: filter excludes all units (both files' host page)", () => {
  it("legacy logic renders the dashboard AND the empty state at once", () => {
    const legacySelected = resolveSelectedUnitLegacy(A, [], undefined);
    const v = viewState(legacySelected, [], { slug: undefined, legacySelector: true });
    expect(legacySelected).toBe(A);
    // The stale dashboard renders alongside the unit selector's own "no units"
    // card; the main empty branch stays suppressed because selectedUnit != null.
    expect(v).toEqual({ dashboard: true, empty: false, unitSelector: true });
  });

  it("fixed logic renders only the empty state", () => {
    const selected = resolveSelectedUnit(A, [], "a", undefined);
    const v = viewState(selected, [], { slug: undefined });
    expect(selected).toBeNull();
    expect(v).toEqual({ dashboard: false, empty: true, unitSelector: false });
  });

  it("removing the filter restores a valid selection and re-renders the dashboard", () => {
    // empty -> null
    let selected = resolveSelectedUnit(A, [], "a", undefined);
    expect(viewState(selected, []).dashboard).toBe(false);

    // filter removed
    selected = resolveSelectedUnit(selected, ALL, "a", undefined);
    expect(selected).toBe(A);
    expect(viewState(selected, ALL).dashboard).toBe(true);
    expect(viewState(selected, ALL).empty).toBe(false);
  });
});

describe("F4 scenario: reverse order (exclude selection, then a different subset)", () => {
  it("settles on a valid unit from the new subset, never the stale one", () => {
    let selected: Unit | null = A;
    let lastId: string | null = "a";

    // subset excluding A
    selected = resolveSelectedUnit(selected, [B, C], lastId, undefined);
    expect(selected).toBe(B);
    expect(viewState(selected, [B, C]).dashboard).toBe(true);
    lastId = selected!.id;

    // different subset excluding A and B
    selected = resolveSelectedUnit(selected, [C], lastId, undefined);
    expect(selected).toBe(C);
    expect(viewState(selected, [C]).dashboard).toBe(true);
    expect(selected).not.toBe(A);
    lastId = selected!.id; // component ref syncs to the settled selection

    // subset excluding the current selection C but containing A/B -> first valid
    selected = resolveSelectedUnit(selected, [A, B], lastId, undefined);
    expect(selected).toBe(A);
  });
});
