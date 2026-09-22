export type SelectableUnit = { id: string; unit_slug: string };

/**
 * Compute the unit that should be selected for the current filtered list.
 *
 * Rules, in order:
 *   1. Keep the current selection if it is still present in `filteredUnits`.
 *   2. If the list is empty (a filter excluded everything), select nothing.
 *   3. Prefer the slug-matched unit (single-unit institutions where the unit
 *      selector is hidden), keeping the existing behaviour.
 *   4. Prefer the most recently selected unit if it is back in the list,
 *      otherwise fall back to the first available unit.
 *
 * Pure and deterministic so it can be unit-tested directly.
 */
export function resolveSelectedUnit<T extends SelectableUnit>(
  selected: T | null,
  filteredUnits: T[],
  lastSelectedUnitId: string | null,
  institutionSlug: string | undefined,
): T | null {
  if (selected && filteredUnits.some((u) => u.id === selected.id)) {
    return selected;
  }

  if (filteredUnits.length === 0) {
    return null;
  }

  const slugMatch = institutionSlug
    ? filteredUnits.find((u) => u.unit_slug === institutionSlug)
    : undefined;
  if (slugMatch) return slugMatch;

  const preferred = lastSelectedUnitId
    ? filteredUnits.find((u) => u.id === lastSelectedUnitId)
    : undefined;
  return preferred ?? filteredUnits[0];
}
