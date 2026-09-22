// =============================================================================
// University/Institution Details Page — Supabase Query Functions
// Supports University, College, and Cluster using Exclusive Arc pattern
// =============================================================================

import { supabase } from "@/lib/supabase";
import type { EntityType } from "./entity-types";
import type {
  University,
  UniversityUnit,
  UniversitySubject,
  SubjectGroupSeat,
  ExamSchedule,
  Circular,
  UniversityLink,
  UniversityGeneralInfo,
  MapLocation,
  UnitRequirement,
  UnitWithDetails,
  UniversityPageData,
  DynamicNote,
} from "@/lib/university-types";

/**
 * Fetch the complete university by slug.
 */
export const getUniversityBySlug = async (slug: string): Promise<University | null> => {
  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Error fetching university by slug:", error);
    return null;
  }
  return data as University;
};

/**
 * Fetch ALL data needed for the institution details page in parallel.
 * Supports University, College, and Cluster types.
 */
export const getEntityPageData = async (
  slug: string,
  entityType: EntityType,
): Promise<UniversityPageData | null> => {
  // 1. Fetch base entity row
  const table =
    entityType === "university"
      ? "universities"
      : entityType === "college"
        ? "colleges"
        : "clusters";

  const { data: entityRow, error: entityError } = await supabase
    .from(table)
    .select("*")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();

  if (entityError || !entityRow) {
    console.error(`Error fetching ${entityType} by slug:`, entityError);
    return null;
  }

  const entityId = entityRow.id;
  const fkColumn = `${entityType}_id`;

  // 2. For universities, check if they belong to a cluster (for data inheritance)
  let clusterId: string | null = null;
  let clusterRow: any = null;
  if (entityType === "university") {
    const { data: clusterLink } = await supabase
      .from("cluster_universities")
      .select("cluster_id")
      .eq("university_id", entityId)
      .limit(1)
      .maybeSingle();
    clusterId = clusterLink?.cluster_id || null;
    if (clusterId) {
      const { data } = await supabase
        .from("clusters")
        .select(
          "second_time, second_time_condition, negative_mark, calculator_allowed, calculator_link",
        )
        .is("deleted_at", null)
        .eq("id", clusterId)
        .maybeSingle();
      clusterRow = data;
    }
  }

  // 3. Prepare queries based on entity type
  const isUniversity = entityType === "university";

  // Helper: fetch data for a given entity
  const fetchEntityData = async (targetId: string, targetFkColumn: string) => {
    const [
      unitsRes,
      subjectsRes,
      seatsRes,
      _examSchedulesPlaceholder,
      applicationDetailsRes,
      admitCardDetailsRes,
      resultDetailsRes,
      circularsRes,
      linksRes,
      generalInfoRes,
      mapLocationsRes,
      unitRequirementsRes,
      dynamicNotesRes,
    ] = await Promise.all([
      supabase
        .from("admission_units")
        .select("*")
        .is("deleted_at", null)
        .eq(targetFkColumn, targetId)
        .order("sort_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("institution_subjects")
        .select("*, degree_program:degree_programs(*)")
        .eq(targetFkColumn, targetId),
      supabase
        .from("subject_group_seats")
        .select(`*, institution_subjects!inner(${targetFkColumn})` as any)
        .eq(`institution_subjects.${targetFkColumn}`, targetId),
      // Fetch exam_schedules after we know the unit IDs
      Promise.resolve({ data: null, error: null }),
      supabase
        .from("application_details")
        .select("*, application_units(unit_id), batch:batches(*)")
        .eq(targetFkColumn, targetId),
      supabase
        .from("admit_card_details")
        .select("*, admit_card_units(unit_id), batch:batches(*)")
        .eq(targetFkColumn, targetId),
      supabase
        .from("result_details")
        .select("*, result_units(unit_id), batch:batches(*)")
        .eq(targetFkColumn, targetId),
      supabase
        .from("circulars")
        .select("*, circular_units(unit_id), batch:batches(*)")
        .is("deleted_at", null)
        .eq(targetFkColumn, targetId),
      supabase
        .from("institution_links")
        .select("*")
        .eq(targetFkColumn, targetId)
        .order("sort_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("institution_general_info")
        .select("*")
        .eq(targetFkColumn, targetId)
        .order("sort_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("map_locations")
        .select("*")
        .is("deleted_at", null)
        .eq(targetFkColumn, targetId)
        .order("sort_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("unit_requirements")
        .select(
          "*, group:groups(name_bn, name_en), unit_requirement_batches(batch_id, batch:batches(*))",
        )
        .is("deleted_at", null)
        .eq(targetFkColumn, targetId),
      supabase
        .from("dynamic_notes")
        .select("*")
        .is("deleted_at", null)
        .eq(targetFkColumn, targetId)
        .order("sort_order", { ascending: true, nullsFirst: false }),
    ]);

    // Fetch exam_schedules separately using unit IDs
    const unitIds = (unitsRes.data || []).map((u: any) => u.id);
    let examSchedulesData: any[] = [];
    if (unitIds.length > 0) {
      const { data: schedData } = await supabase
        .from("exam_schedules")
        .select("*, batch:batches(*)")
        .in("unit_id", unitIds)
        .order("exam_datetime", { ascending: true });
      examSchedulesData = schedData || [];
    }

    return {
      units: (unitsRes.data || []) as UniversityUnit[],
      subjects: (subjectsRes.data || []) as (UniversitySubject & { degree_program: any })[],
      seats: (seatsRes.data || []) as unknown as SubjectGroupSeat[],
      examSchedules: examSchedulesData as unknown as ExamSchedule[],
      rawApplicationDetails: (applicationDetailsRes.data || []) as any[],
      rawAdmitCardDetails: (admitCardDetailsRes.data || []) as any[],
      rawResultDetails: (resultDetailsRes.data || []) as any[],
      rawCirculars: (circularsRes.data || []) as any[],
      links: (linksRes.data || []) as UniversityLink[],
      generalInfo: (generalInfoRes.data || []) as UniversityGeneralInfo[],
      mapLocations: (mapLocationsRes.data || []) as MapLocation[],
      rawUnitRequirements: (unitRequirementsRes.data || []) as UnitRequirement[],
      dynamicNotes: (dynamicNotesRes.data || []) as DynamicNote[],
    };
  };

  // 4. Fetch entity data (and cluster data if university belongs to a cluster)
  const entityData = await fetchEntityData(entityId, fkColumn);
  const clusterData = clusterId ? await fetchEntityData(clusterId, "cluster_id") : null;

  // 5. Merge cluster data with university data (university takes priority)
  const mergeArrays = <T extends { id: string }>(uniArr: T[], clusterArr: T[] | null): T[] => {
    if (!clusterArr || clusterArr.length === 0) return uniArr;
    const uniIds = new Set(uniArr.map((item) => item.id));
    const clusterOnly = clusterArr.filter((item) => !uniIds.has(item.id));
    return [...uniArr, ...clusterOnly];
  };

  if (clusterData) {
    entityData.units = mergeArrays(entityData.units, clusterData.units);
    entityData.subjects = mergeArrays(entityData.subjects, clusterData.subjects);
    entityData.seats = mergeArrays(entityData.seats, clusterData.seats);
    entityData.examSchedules = mergeArrays(entityData.examSchedules, clusterData.examSchedules);
    entityData.rawApplicationDetails = mergeArrays(
      entityData.rawApplicationDetails,
      clusterData.rawApplicationDetails,
    );
    entityData.rawAdmitCardDetails = mergeArrays(
      entityData.rawAdmitCardDetails,
      clusterData.rawAdmitCardDetails,
    );
    entityData.rawResultDetails = mergeArrays(
      entityData.rawResultDetails,
      clusterData.rawResultDetails,
    );
    entityData.rawCirculars = mergeArrays(entityData.rawCirculars, clusterData.rawCirculars);
    entityData.links = mergeArrays(entityData.links, clusterData.links);
    entityData.generalInfo = mergeArrays(entityData.generalInfo, clusterData.generalInfo);
    entityData.mapLocations = mergeArrays(entityData.mapLocations, clusterData.mapLocations);
    entityData.rawUnitRequirements = mergeArrays(
      entityData.rawUnitRequirements,
      clusterData.rawUnitRequirements,
    );
    entityData.dynamicNotes = mergeArrays(entityData.dynamicNotes, clusterData.dynamicNotes);
  }

  // 6. Extract and process data
  const {
    units,
    subjects,
    seats,
    examSchedules,
    rawApplicationDetails,
    rawAdmitCardDetails,
    rawResultDetails = [],
    rawCirculars,
    links,
    generalInfo,
    mapLocations,
    rawUnitRequirements,
    dynamicNotes,
  } = entityData;

  const sortedRawApplicationDetails = [...rawApplicationDetails].sort((a, b) => {
    const isCurrentA = a.batch?.is_current ? 1 : 0;
    const isCurrentB = b.batch?.is_current ? 1 : 0;
    if (isCurrentA !== isCurrentB) return isCurrentB - isCurrentA;
    const yearA = a.batch?.year || 0;
    const yearB = b.batch?.year || 0;
    return yearB - yearA;
  });
  const sortedRawResultDetails = [...(rawResultDetails || [])].sort((a, b) => {
    const isCurrentA = a.batch?.is_current ? 1 : 0;
    const isCurrentB = b.batch?.is_current ? 1 : 0;
    if (isCurrentA !== isCurrentB) return isCurrentB - isCurrentA;
    const yearA = a.batch?.year || 0;
    const yearB = b.batch?.year || 0;
    return yearB - yearA;
  });
  const admitCardDetails = filterByPreferredBatch(rawAdmitCardDetails);
  const circulars = filterByPreferredBatch(rawCirculars);
  const unitRequirements = filterRequirementsByPreferredBatch(rawUnitRequirements);

  // Assemble the nested UnitWithDetails for each unit
  const unitsWithDetails: UnitWithDetails[] = units.map((unit) => {
    const unitSubjects = subjects
      .filter((s) => s.unit_id === unit.id)
      .map((s) => ({
        ...s,
        degree_program: s.degree_program,
        seats: seats.filter((seat) => seat.university_subject_id === s.id),
      }));

    const reqs = unitRequirements
      .filter((r) => r.unit_id === unit.id)
      .map((r) => ({
        ...r,
        group_name: r.group?.name_bn || r.group_name,
      }));
    const now = new Date();
    const unitSchedules = examSchedules.filter((e) => e.unit_id === unit.id);
    const futureSchedule = unitSchedules.find((e) => new Date(e.exam_datetime) > now);
    const schedule = futureSchedule || unitSchedules[unitSchedules.length - 1] || null;

    const appDetails = sortedRawApplicationDetails.filter(
      (a) =>
        a.application_units?.length === 0 ||
        a.application_units?.some((au: any) => au.unit_id === unit.id),
    );

    const admitDetails = admitCardDetails.filter(
      (a) =>
        a.admit_card_units?.length === 0 ||
        a.admit_card_units?.some((au: any) => au.unit_id === unit.id),
    );

    const resDetails = sortedRawResultDetails.filter(
      (r) =>
        r.result_units?.length === 0 || r.result_units?.some((ru: any) => ru.unit_id === unit.id),
    );

    return {
      ...unit,
      subjects: unitSubjects,
      requirements: reqs,
      exam_schedule: schedule,
      application_details: appDetails,
      admit_card_details: admitDetails,
      result_details: resDetails,
    };
  });

  const totalSeats = seats.reduce((sum, s) => sum + (s.seat_count || 0), 0);

  // For clusters, fetch linked university count from cluster_universities
  let parentUniversityName: string | null = null;
  let parentUniversityCount: number | null = null;
  if (entityType === "cluster") {
    const { data: linkedUnis } = await supabase
      .from("cluster_universities")
      .select("university_id")
      .eq("cluster_id", entityId);
    if (linkedUnis && linkedUnis.length > 0) {
      parentUniversityCount = linkedUnis.length;
      const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      const banglaCount = linkedUnis.length
        .toString()
        .replace(/\d/g, (d) => banglaDigits[parseInt(d)]);
      parentUniversityName = `${banglaCount}টি`;
    }
  }

  // Normalize base entity row to match University schema expected by frontend components
  // For universities: cluster scalar fields always override (second_time, negative_mark, calculator)
  const normalizedEntity: University = {
    id: entityRow.id,
    slug: entityRow.slug,
    name_bn: entityRow.name_bn,
    name_en: entityRow.name_en || null,
    short_name: entityRow.short_name || entityRow.short_name_en || entityRow.short_name_bn || null,
    logo_url: entityRow.logo_url || null,
    cover_url: entityRow.cover_url || null,
    description: entityRow.description || null,
    history: entityRow.history || null,
    website_url: entityRow.website_url || null,
    established_year: entityRow.established_year || null,
    location: entityRow.location || null,
    history_source: entityRow.history_source || null,
    category: entityRow.category || entityRow.cluster_type || "public",
    sub_category: entityRow.sub_category || null,
    second_time: clusterRow ? clusterRow.second_time : entityRow.second_time,
    second_time_condition: clusterRow
      ? (clusterRow.second_time_condition ?? null)
      : (entityRow.second_time_condition ?? null),
    negative_mark: clusterRow
      ? (clusterRow.negative_mark ?? null)
      : (entityRow.negative_mark ?? null),
    calculator_allowed: clusterRow
      ? (clusterRow.calculator_allowed ?? null)
      : (entityRow.calculator_allowed ?? null),
    calculator_link: clusterRow
      ? (clusterRow.calculator_link ?? null)
      : (entityRow.calculator_link ?? null),
    parent_university_name: parentUniversityName,
    parent_university_count: parentUniversityCount,
    created_at: entityRow.created_at,
  };

  // Collect all batches across details
  const batchesMap = new Map<string, any>();
  const collectBatch = (b: any) => {
    if (b && b.id && !batchesMap.has(b.id)) {
      batchesMap.set(b.id, {
        id: b.id,
        name: b.name || b.name_bn || b.name_en || "",
        name_bn: b.name_bn || null,
        name_en: b.name_en || null,
        year: b.year || 0,
        is_current: Boolean(b.is_current),
      });
    }
  };

  rawApplicationDetails.forEach((a) => collectBatch(a.batch));
  rawAdmitCardDetails.forEach((a) => collectBatch(a.batch));
  sortedRawResultDetails.forEach((r) => collectBatch(r.batch));
  rawCirculars.forEach((c) => collectBatch(c.batch));
  rawUnitRequirements.forEach((r) => {
    r.unit_requirement_batches?.forEach((b) => collectBatch(b.batch));
  });

  const availableBatches = Array.from(batchesMap.values()).sort((a, b) => {
    const isCurrentA = a.is_current ? 1 : 0;
    const isCurrentB = b.is_current ? 1 : 0;
    if (isCurrentA !== isCurrentB) return isCurrentB - isCurrentA;
    return b.year - a.year;
  });

  return {
    university: normalizedEntity,
    units: unitsWithDetails,
    circulars,
    links,
    general_info: generalInfo,
    map_locations: mapLocations,
    dynamic_notes: dynamicNotes,
    available_batches: availableBatches,
    total_seats: totalSeats,
    total_units: units.length,
  };
};

/**
 * Fetch ALL data needed for the university details page in parallel (Legacy wrapper).
 */
export const getUniversityPageData = async (slug: string): Promise<UniversityPageData | null> => {
  return getEntityPageData(slug, "university");
};

/**
 * Helper to prioritize records linked to the current batch (is_current === true).
 * If no records exist for the current batch, falls back to records from the batch
 * with the highest year among available records.
 */
export function filterByPreferredBatch<
  T extends { batch?: { id: string; year?: number; is_current?: boolean } | null },
>(items: T[]): T[] {
  if (!items || items.length === 0) return [];

  const itemsWithBatch = items.filter((item) => item.batch != null);
  if (itemsWithBatch.length === 0) return items;

  // 1. Priority: check if any item belongs to a batch with is_current === true
  const currentBatchItems = items.filter((item) => item.batch?.is_current === true);
  if (currentBatchItems.length > 0) {
    return currentBatchItems;
  }

  // 2. Fallback: Find the maximum year among items that have batch info
  const maxYear = Math.max(...itemsWithBatch.map((item) => item.batch?.year || 0));
  if (maxYear > 0) {
    const highestYearItems = items.filter((item) => !item.batch || item.batch.year === maxYear);
    if (highestYearItems.length > 0) {
      return highestYearItems;
    }
  }

  return items;
}

/**
 * Helper to filter UnitRequirement items by batch preference.
 * Checks unit_requirement_batches junction list for is_current === true first,
 * falling back to the highest year available.
 */
export function filterRequirementsByPreferredBatch(
  requirements: UnitRequirement[],
): UnitRequirement[] {
  if (!requirements || requirements.length === 0) return [];

  const reqsWithBatches = requirements.filter(
    (r) => r.unit_requirement_batches && r.unit_requirement_batches.length > 0,
  );

  if (reqsWithBatches.length === 0) return requirements;

  // 1. Priority: check if any requirement is linked to a batch with is_current === true
  const hasCurrentBatch = reqsWithBatches.some((r) =>
    r.unit_requirement_batches?.some((b) => b.batch?.is_current === true),
  );

  if (hasCurrentBatch) {
    return requirements.filter((r) => {
      if (!r.unit_requirement_batches || r.unit_requirement_batches.length === 0) return true;
      return r.unit_requirement_batches.some((b) => b.batch?.is_current === true);
    });
  }

  // 2. Fallback: Find the maximum year among all requirement batch junctions
  const allYears = reqsWithBatches.flatMap((r) =>
    (r.unit_requirement_batches || []).map((b) => b.batch?.year || 0),
  );
  const maxYear = Math.max(...allYears, 0);

  if (maxYear > 0) {
    return requirements.filter((r) => {
      if (!r.unit_requirement_batches || r.unit_requirement_batches.length === 0) return true;
      return r.unit_requirement_batches.some((b) => (b.batch?.year || 0) === maxYear);
    });
  }

  return requirements;
}

/**
 * Fetch universities linked to a cluster.
 */
export async function fetchClusterUniversities(clusterId: string) {
  const { data, error } = await supabase
    .from("cluster_universities")
    .select("universities!inner(*)")
    .eq("cluster_id", clusterId);
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.universities.id,
    name_bn: r.universities.name_bn,
    name_en: r.universities.name_en || "",
    short_name: r.universities.short_name || r.universities.name_bn,
    slug: r.universities.slug,
    logo_url: r.universities.logo_url || null,
    location: r.universities.location || null,
  }));
}
