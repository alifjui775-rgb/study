// ─── Calendar Queries (Static JSON Snapshot) ─────────────────────────────────
// All data is pre-computed by the generate-calendar-snapshot Edge Function
// and served from Supabase Storage as static JSON. Client-side filtering/
// sorting/grouping remains unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import type { Json } from "./database.types";

// ─── Static JSON Configuration ───────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "calendar-cache";
const DATA_FILE = "calendar-data.json";
const VERSION_FILE = "version.json";
const VERSION_STORAGE_KEY = "calendarSnapshotVersion";

const CALENDAR_DATA_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DATA_FILE}`;
const CALENDAR_VERSION_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${VERSION_FILE}`;

// ─── Snapshot Types ──────────────────────────────────────────────────────────

interface CalendarSnapshot {
  generatedAt: string;
  batchId: string;
  examSchedules: CalendarExamSchedule[];
  results: CalendarResult[];
  admitCards: CalendarAdmitCard[];
  applications: CalendarApplication[];
  info: CalendarInfoRow[];
}

// ─── Row shapes (unchanged from original) ────────────────────────────────────

type JoinedOrArray<T> = T | T[] | null;

type InstitutionRef = {
  name_bn: string | null;
  short_name_bn: string | null;
  slug: string | null;
  second_time: boolean | null;
  second_time_condition: string | null;
  negative_mark: number | null;
  calculator_allowed: boolean | null;
  calculator_link: string | null;
};

export type UnitWithInstitution = {
  id?: string | null;
  unit_slug?: string | null;
  unit_name_bn?: string | null;
  allowed_group_ids?: string[] | null;
  group?: JoinedOrArray<{ name_en: string | null }>;
  universities?: JoinedOrArray<InstitutionRef>;
  clusters?: JoinedOrArray<InstitutionRef>;
};

export type ResolvedInstitution = {
  institution_name_bn: string;
  institution_slug: string;
  institution_type: "university" | "cluster";
  show_unit_slug: boolean;
  second_time: boolean;
};

// ─── Exported row types (consumed by table components) ───────────────────────

export type CalendarExamSchedule = {
  id: string;
  exam_datetime: string;
  note: string | null;
  is_tentative: boolean;
  unit_id: string;
  unit_slug: string;
  unit_name_bn: string;
  institution_name_bn: string;
  institution_slug: string;
  institution_type?: "university" | "cluster";
  show_unit_slug: boolean;
  department: string;
  allowed_departments?: string[];
  second_time?: boolean;
};

export type CalendarResult = {
  id: string;
  unit_id: string;
  result_datetime: string | null;
  result_url: string | null;
  note: string | null;
  institution_name_bn: string;
  unit_slug: string;
  unit_name_bn: string;
  institution_slug: string;
  institution_type?: "university" | "cluster";
  show_unit_slug: boolean;
  department?: string;
  allowed_departments?: string[];
  second_time?: boolean;
};

export type CalendarAdmitCard = {
  id: string;
  unit_id: string;
  download_start_datetime: string | null;
  download_end_datetime: string | null;
  admit_card_url: string | null;
  note: string | null;
  institution_name_bn: string;
  unit_slug: string;
  unit_name_bn: string;
  institution_slug: string;
  institution_type?: "university" | "cluster";
  show_unit_slug: boolean;
  department?: string;
  allowed_departments?: string[];
  second_time?: boolean;
};

export type CalendarApplication = {
  id: string;
  unit_id: string;
  start_datetime: string | null;
  end_datetime: string | null;
  fee: number | null;
  fee_payment_method: string | null;
  apply_url: string | null;
  note: string | null;
  institution_name_bn: string;
  institution_slug: string;
  institution_type?: "university" | "cluster";
  unit_slug: string;
  unit_name_bn: string;
  show_unit_slug: boolean;
  department?: string;
  allowed_departments?: string[];
  second_time?: boolean;
};

export type CalendarInfoRow = {
  id: string;
  unit_slug: string;
  unit_name_bn: string;
  institution_name_bn: string;
  institution_slug: string;
  institution_type: "university" | "cluster";
  show_unit_slug: boolean;
  department: string;
  allowed_departments: string[];
  exam_center_note: string | null;
  second_time: boolean;
  second_time_condition: string | null;
  negative_mark: number | null;
  calculator_allowed: boolean;
  calculator_link: string | null;
  marks: {
    total_marks: number | null;
    total_time: number | null;
    mcq_marks: number | null;
    written_marks: number | null;
    other_marks: number | null;
    other_marks_type: string | null;
    subject_selection_rules: Json | null;
  } | null;
  circular_download_url: string | null;
};

// ─── Utility functions (retained — used by clients) ──────────────────────────

export function resolveInstitution(
  unit: UnitWithInstitution | null | undefined,
): ResolvedInstitution {
  const university = Array.isArray(unit?.universities) ? unit.universities[0] : unit?.universities;
  const cluster = Array.isArray(unit?.clusters) ? unit.clusters[0] : unit?.clusters;

  const institution = university || cluster;
  let institution_type: "university" | "cluster" = "university";
  if (university) {
    institution_type = "university";
  } else if (cluster) {
    institution_type = "cluster";
  }

  return {
    institution_name_bn: institution?.short_name_bn || institution?.name_bn || "অজানা প্রতিষ্ঠান",
    institution_slug: institution?.slug || "",
    institution_type,
    show_unit_slug:
      unit?.unit_slug && institution?.slug
        ? unit.unit_slug.toLowerCase() !== institution.slug.toLowerCase()
        : true,
    second_time: Boolean(institution?.second_time),
  };
}

export const groupNameToDepartment = (nameEn: string | null): string => {
  if (!nameEn) return "mixed";
  const lower = nameEn.toLowerCase();
  if (lower.includes("science") || lower.includes("বিজ্ঞান")) return "science";
  if (lower.includes("arts") || lower.includes("humanities") || lower.includes("মানবিক"))
    return "arts";
  if (
    lower.includes("commerce") ||
    lower.includes("business") ||
    lower.includes("bbs") ||
    lower.includes("bba") ||
    lower.includes("ব্যবসা") ||
    lower.includes("বাণিজ্য") ||
    lower.includes("ব্যবসায়")
  )
    return "commerce";
  return "mixed";
};

export const resolveAllowedDepartments = (
  allowedGroupIds: string[] | null | undefined,
  deptMap: Map<string, string>,
): string[] => {
  if (!allowedGroupIds || allowedGroupIds.length === 0) return [];
  const depts = new Set<string>();
  allowedGroupIds.forEach((gid) => {
    const dept = deptMap.get(gid);
    if (dept) depts.add(dept);
  });
  return Array.from(depts);
};

/**
 * Evaluates whether a calendar schedule row should be visible based on
 * strict Unit Change & Second Time rules.
 */
export function isRowVisible<
  T extends {
    department?: string;
    allowed_departments?: string[];
    second_time?: boolean;
  },
>(row: T, filters?: { [key: string]: boolean }): boolean {
  if (!filters) return true;

  const secondTimeFilterActive = Boolean(filters.secondTime || filters.secondTimeOnly);
  if (secondTimeFilterActive && !row.second_time) {
    return false;
  }

  const { science, arts, commerce, mixed, ucS, ucA, ucC } = filters;

  const noDeptFilter = !science && !arts && !commerce && !mixed && !ucS && !ucA && !ucC;
  if (noDeptFilter) return true;

  const dept = row.department || "mixed";
  const allowed = row.allowed_departments || [];

  const isPrimaryMatch =
    (science && dept === "science") ||
    (arts && dept === "arts") ||
    (commerce && dept === "commerce") ||
    (mixed && dept === "mixed");

  if (isPrimaryMatch) return true;

  const isUnitChangeMatch =
    (ucS && allowed.includes("science")) ||
    (ucA && allowed.includes("arts")) ||
    (ucC && allowed.includes("commerce"));

  if (isUnitChangeMatch) return true;

  const anyUnitChangeActive = Boolean(ucS || ucA || ucC);
  if (anyUnitChangeActive && dept === "mixed") return true;

  return false;
}

// ─── Snapshot Cache & Version Check ──────────────────────────────────────────

let cachedSnapshot: CalendarSnapshot | null = null;
let snapshotPromise: Promise<CalendarSnapshot> | null = null;

/**
 * Fetch version.json (Cache-Control: no-cache → always fresh).
 * Compare against localStorage. If different, refetch calendar-data.json.
 * Returns the (possibly cached) snapshot.
 */
async function getSnapshot(): Promise<CalendarSnapshot> {
  // If we already have it in memory, return immediately
  if (cachedSnapshot) return cachedSnapshot;

  // Deduplicate concurrent calls
  if (snapshotPromise) return snapshotPromise;

  snapshotPromise = (async () => {
    try {
      // 1. Fetch version.json (Cache-Control: no-cache → always fresh).
      //    Compare against localStorage to decide if we need new data.
      const lastKnownVersion = localStorage.getItem(VERSION_STORAGE_KEY);
      let currentVersion: string | null = null;
      let needsRefetch = true;

      try {
        const versionRes = await fetch(CALENDAR_VERSION_URL, {
          cache: "no-store",
        });
        if (versionRes.ok) {
          const versionData = await versionRes.json();
          currentVersion = versionData.updatedAt;
          if (currentVersion === lastKnownVersion) {
            needsRefetch = false;
          }
        }
      } catch {
        // Version fetch failed — if we have a cached snapshot, use it;
        // otherwise we must refetch
        if (cachedSnapshot) return cachedSnapshot;
        needsRefetch = true;
      }

      // 2. If version mismatch (or first load), fetch the data.
      //    Append ?v=<updatedAt> so the versioned URL bypasses the CDN/browser
      //    cache of the old immutable calendar-data.json.
      if (needsRefetch || !cachedSnapshot) {
        const versionParam = currentVersion ? `?v=${encodeURIComponent(currentVersion)}` : "";
        const dataRes = await fetch(`${CALENDAR_DATA_URL}${versionParam}`);
        if (!dataRes.ok) {
          throw new Error(`Failed to fetch calendar data: ${dataRes.status} ${dataRes.statusText}`);
        }
        const snapshot: CalendarSnapshot = await dataRes.json();
        cachedSnapshot = snapshot;

        // 3. Persist the version so subsequent loads skip the refetch
        //    until version.json changes again.
        if (currentVersion) {
          localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
        }
      }

      return cachedSnapshot!;
    } finally {
      snapshotPromise = null;
    }
  })();

  return snapshotPromise;
}

/**
 * Invalidate the in-memory cache. Called when version changes are detected
 * or can be called manually to force a refetch on next access.
 */
export function invalidateSnapshotCache(): void {
  cachedSnapshot = null;
}

// ─── Fetcher functions (drop-in replacements for old Supabase queries) ───────
// Each function now reads its slice from the static snapshot.
// The return types are identical to the old implementations.

export const fetchCalendarExamSchedules = async (): Promise<CalendarExamSchedule[]> => {
  const snapshot = await getSnapshot();
  return snapshot.examSchedules;
};

export const fetchCalendarResults = async (): Promise<CalendarResult[]> => {
  const snapshot = await getSnapshot();
  return snapshot.results;
};

export const fetchCalendarAdmitCards = async (): Promise<CalendarAdmitCard[]> => {
  const snapshot = await getSnapshot();
  return snapshot.admitCards;
};

export const fetchCalendarApplications = async (): Promise<CalendarApplication[]> => {
  const snapshot = await getSnapshot();
  return snapshot.applications;
};

export const fetchCalendarInfo = async (): Promise<CalendarInfoRow[]> => {
  const snapshot = await getSnapshot();
  return snapshot.info;
};
