import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import UnitSelector from "@/components/syllabus/UnitSelector";
import SyllabusDashboard from "@/components/syllabus/SyllabusDashboard";
import SyllabusFloatingDock from "@/components/syllabus/SyllabusFloatingDock";
import {
  getInstitutionBySlug,
  fetchAdmissionUnits,
  type AdmissionUnitItem,
} from "@/lib/syllabus-queries";
import { getFilters, onFiltersChange, GROUP_IDS, type GroupFilterState } from "@/lib/syllabus-filter-store";
import { resolveSelectedUnit } from "@/lib/unit-selection";
import { ArrowLeft, Building2, GraduationCap, Users, AlertTriangle, RotateCcw } from "lucide-react";

export default function InstitutionBySlugPage() {
  const { categoryOrInstitution: institutionSlug } = useParams<{ categoryOrInstitution: string }>();
  const [selectedUnit, setSelectedUnit] = useState<AdmissionUnitItem | null>(null);

  const { data: institution, isLoading: instLoading, isError: instError, refetch: refetchInst } = useQuery({
    queryKey: ["syllabus-institution-by-slug", institutionSlug],
    queryFn: () => getInstitutionBySlug(institutionSlug!),
    enabled: !!institutionSlug,
    staleTime: 10 * 60 * 1000,
  });

  const institutionId = institution?.id;

  const { data: units = [], isLoading: unitsLoading, isError: unitsError, refetch: refetchUnits } = useQuery({
    queryKey: ["syllabus-units", institutionId],
    queryFn: () => fetchAdmissionUnits(institutionId!),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  });

  // ---- Filter state (synced with SyllabusFloatingDock) ----
  const [filters, setFiltersState] = useState<GroupFilterState>(getFilters);

  useEffect(() => {
    return onFiltersChange(() => setFiltersState(getFilters()));
  }, []);

  // ---- Filter units based on active group filters ----
  const filteredUnits = useMemo(() => {
    const primaryChecks: Record<string, boolean> = {
      [GROUP_IDS.science]: !!filters[GROUP_IDS.science],
      [GROUP_IDS.arts]: !!filters[GROUP_IDS.arts],
      [GROUP_IDS.commerce]: !!filters[GROUP_IDS.commerce],
    };
    const unitChangeChecks: Record<string, boolean> = {
      [GROUP_IDS.science]: !!filters["ucS"],
      [GROUP_IDS.arts]: !!filters["ucA"],
      [GROUP_IDS.commerce]: !!filters["ucC"],
    };
    const isMixedChecked = !!filters["mixed"];

    const activePrimary = Object.entries(primaryChecks)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const activeUnitChange = Object.entries(unitChangeChecks)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const anyGroupFilterActive =
      activePrimary.length > 0 || activeUnitChange.length > 0 || isMixedChecked;

    if (!anyGroupFilterActive) return units;

    return units.filter((unit) => {
      // primary_group_id match (বিজ্ঞান / মানবিক / ব্যবসা)
      const matchesPrimary =
        activePrimary.length > 0 &&
        unit.primary_group_id != null &&
        primaryChecks[unit.primary_group_id];

      // allowed_group_ids match (ইউনিট চেঞ্জ)
      const matchesUnitChange =
        activeUnitChange.length > 0 &&
        (unit.allowed_group_ids || []).some((gid) => unitChangeChecks[gid]);

      // বিভাগ উন্মুক্ত (primary_group_id is null)
      const matchesMixed = isMixedChecked && unit.primary_group_id == null;

      return matchesPrimary || matchesUnitChange || matchesMixed;
    });
  }, [units, filters]);

  const hideUnitSelector = filteredUnits.some((u) => u.unit_slug === institutionSlug);

  // Remember the last valid selection so it can be restored if a filter
  // temporarily excludes it and it later comes back.
  const lastSelectedUnitIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedUnit) lastSelectedUnitIdRef.current = selectedUnit.id;
  }, [selectedUnit]);

  useEffect(() => {
    setSelectedUnit(null);
  }, [institutionSlug]);

  // Reconcile the selection with the filtered list. Runs whenever the list or
  // slug changes and, crucially, also when the filter excludes ALL units
  // (filteredUnits is empty) — clearing selectedUnit so the dashboard can
  // never render for a filtered-out unit underneath the "no units" empty
  // state. When units reappear, a valid one is auto-selected (preferring the
  // previously selected unit, then the slug match, then the first unit).
  useEffect(() => {
    setSelectedUnit((prev) =>
      resolveSelectedUnit(prev, filteredUnits, lastSelectedUnitIdRef.current, institutionSlug),
    );
  }, [filteredUnits, institutionSlug]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Link
          to="/syllabus-tracker"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 font-bengali"
        >
          <ArrowLeft className="h-4 w-4" />
          সব প্রতিষ্ঠান
        </Link>

        {/* Institution Header */}
        {instLoading ? (
          <div className="flex items-center gap-4 mb-6 animate-pulse">
            <div className="h-16 w-16 rounded-2xl bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 bg-muted rounded-lg" />
              <div className="h-3 w-32 bg-muted rounded-lg" />
            </div>
          </div>
        ) : instError ? (
          <div className="flex flex-col items-center gap-3 py-10 mb-6 text-center bg-card border border-border rounded-2xl">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground font-bengali">ডেটা লোড করতে সমস্যা হয়েছে।</p>
            <button
              onClick={() => refetchInst()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-bengali text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : institution ? (
          <div className="flex items-center gap-4 mb-6 bg-card border border-border rounded-2xl p-4">
            {institution.logo_url ? (
              <img
                src={institution.logo_url}
                alt={institution.short_name_en}
                className="h-14 w-14 sm:h-16 sm:w-16 object-contain rounded-xl bg-muted/50 p-1"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                {institution.type === "university" ? (
                  <GraduationCap className="h-7 w-7 text-muted-foreground" />
                ) : institution.type === "cluster" ? (
                  <Users className="h-7 w-7 text-muted-foreground" />
                ) : (
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold font-bengali text-foreground leading-tight truncate">
                {institution.name_bn}
              </h1>
              <p className="text-sm text-muted-foreground font-bengali mt-0.5">
                {institution.name_en}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground font-bengali">
            প্রতিষ্ঠান পাওয়া যায়নি।
          </div>
        )}

        {/* Unit selector (hidden when no units match so the empty state below
            is the only thing shown) */}
        {!hideUnitSelector && (instLoading || unitsLoading || filteredUnits.length > 0) && (
          <div className="mb-6">
            <UnitSelector
              units={filteredUnits}
              selectedUnitId={selectedUnit?.id ?? null}
              onSelect={setSelectedUnit}
              isLoading={unitsLoading}
              isParentLoading={instLoading}
            />
          </div>
        )}

        {/* Syllabus dashboard */}
        {selectedUnit ? (
          <SyllabusDashboard
            key={selectedUnit.id}
            unit={selectedUnit}
            institution={institution ?? undefined}
          />
        ) : instError || unitsError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center bg-card border border-border rounded-2xl">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground font-bengali">ইউনিট লোড করতে সমস্যা হয়েছে।</p>
            <button
              onClick={() => { if (instError) refetchInst(); if (unitsError) refetchUnits(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-bengali text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : instLoading || unitsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-bengali bg-card border border-border rounded-2xl">
            <p className="text-sm">এই প্রতিষ্ঠানে কোনো ইউনিট পাওয়া যায়নি।</p>
          </div>
        ) : null}
      </main>
      <Footer />
      <SyllabusFloatingDock />
    </div>
  );
}
