// =============================================================================
// Admin CRUD — Supabase Queries & Mutations for Relational Tabs (Phase 2)
// Refactored for Exclusive Arc: supports University, College, and Cluster
// =============================================================================

import { supabase } from "@/lib/supabase";
import type { EntityType } from "@/lib/entity-types";
import { buildEntityPayload, getEntityColumn } from "@/lib/entity-types";
import type {
  UniversityUnitRow,
  UniversityUnitFormValues,
  UniversitySubjectRow,
  UniversitySubjectFormValues,
  MapLocationRow,
  MapLocationFormValues,
  UniversityLinkRow,
  UniversityLinkFormValues,
  GpaCalculationMethodRow,
  GpaCalculationMethodFormValues,
  UniversityGeneralInfoRow,
  UniversityGeneralInfoFormValues,
  DynamicNoteRow,
  DynamicNoteFormValues,
} from "@/lib/university-manage-types";

// ─── 1. Admission Units (was university_units) ───────────────────────────────

export const fetchUnitsByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<UniversityUnitRow[]> => {
  const { data, error } = await supabase
    .from("admission_units")
    .select("*")
    .is("deleted_at", null)
    .eq(getEntityColumn(entityType), entityId)
    .order("sort_order", { ascending: true })
    .order("unit_name_bn", { ascending: true });

  if (error) throw error;
  return (data || []) as UniversityUnitRow[];
};

/** @deprecated — alias for backward compatibility */
export const fetchUnitsByUniversity = (universityId: string) =>
  fetchUnitsByEntity(universityId, "university");

export const insertUnit = async (
  values: UniversityUnitFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<UniversityUnitRow> => {
  const { data, error } = await supabase
    .from("admission_units")
    .insert({ ...values, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (error) throw error;
  return data as UniversityUnitRow;
};

export const updateUnit = async (
  id: string,
  values: UniversityUnitFormValues,
): Promise<UniversityUnitRow> => {
  const { data, error } = await supabase
    .from("admission_units")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UniversityUnitRow;
};

export const deleteUnit = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("admission_units")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

// ─── 2. Institution Subjects (was university_subjects) ────────────────────────

export type JoinedUniversitySubjectRow = UniversitySubjectRow & {
  degree_program: { short_name: string; full_name_en: string } | null;
  unit: { unit_name_bn: string; unit_name_en: string | null } | null;
};

export const fetchSubjectsByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<JoinedUniversitySubjectRow[]> => {
  const { data, error } = await supabase
    .from("institution_subjects")
    .select(
      "*, degree_program:degree_programs(short_name, full_name_en), unit:admission_units(unit_name_bn, unit_name_en)",
    )
    .eq(getEntityColumn(entityType), entityId);

  if (error) throw error;
  return (data || []) as JoinedUniversitySubjectRow[];
};

/** @deprecated — alias for backward compatibility */
export const fetchSubjectsByUniversity = (universityId: string) =>
  fetchSubjectsByEntity(universityId, "university");

export const insertSubject = async (
  values: UniversitySubjectFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<UniversitySubjectRow> => {
  const { data, error } = await supabase
    .from("institution_subjects")
    .insert({ ...values, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (error) throw error;
  return data as UniversitySubjectRow;
};

/** @deprecated — alias for backward compatibility */
export const insertUniversitySubject = (
  values: UniversitySubjectFormValues & { university_id: string },
) => {
  const { university_id, ...rest } = values;
  return insertSubject(rest, university_id, "university");
};

export const updateSubject = async (
  id: string,
  values: UniversitySubjectFormValues,
): Promise<UniversitySubjectRow> => {
  const { data, error } = await supabase
    .from("institution_subjects")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UniversitySubjectRow;
};

/** @deprecated — alias for backward compatibility */
export const updateUniversitySubject = updateSubject;

export const deleteSubject = async (id: string): Promise<void> => {
  const { error } = await supabase.from("institution_subjects").delete().eq("id", id);

  if (error) throw error;
};

/** @deprecated — alias for backward compatibility */
export const deleteUniversitySubject = deleteSubject;

// ─── 3. Map Locations ────────────────────────────────────────────────────────

export const fetchLocationsByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<MapLocationRow[]> => {
  const { data, error } = await supabase
    .from("map_locations")
    .select("*")
    .is("deleted_at", null)
    .eq(getEntityColumn(entityType), entityId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as MapLocationRow[];
};

/** @deprecated — alias for backward compatibility */
export const fetchLocationsByUniversity = (universityId: string) =>
  fetchLocationsByEntity(universityId, "university");

export const insertLocation = async (
  values: MapLocationFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<MapLocationRow> => {
  const { data, error } = await supabase
    .from("map_locations")
    .insert({ ...values, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (error) throw error;
  return data as MapLocationRow;
};

export const updateLocation = async (
  id: string,
  values: MapLocationFormValues,
): Promise<MapLocationRow> => {
  const { data, error } = await supabase
    .from("map_locations")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MapLocationRow;
};

export const deleteLocation = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("map_locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

// ─── 4. Institution Links (was university_links) ──────────────────────────────

export const fetchLinksByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<UniversityLinkRow[]> => {
  const { data, error } = await supabase
    .from("institution_links")
    .select("*")
    .eq(getEntityColumn(entityType), entityId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw error;
  return (data || []) as UniversityLinkRow[];
};

/** @deprecated — alias for backward compatibility */
export const fetchLinksByUniversity = (universityId: string) =>
  fetchLinksByEntity(universityId, "university");

export const insertLink = async (
  values: UniversityLinkFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<UniversityLinkRow> => {
  const { data, error } = await supabase
    .from("institution_links")
    .insert({ ...values, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (error) throw error;
  return data as UniversityLinkRow;
};

export const updateLink = async (
  id: string,
  values: UniversityLinkFormValues,
): Promise<UniversityLinkRow> => {
  const { data, error } = await supabase
    .from("institution_links")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UniversityLinkRow;
};

export const deleteLink = async (id: string): Promise<void> => {
  const { error } = await supabase.from("institution_links").delete().eq("id", id);

  if (error) throw error;
};

// ─── 5. GPA Calculation Methods (table name unchanged) ────────────────────────

export const fetchGpaMethodsByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<GpaCalculationMethodRow[]> => {
  const { data, error } = await supabase
    .from("gpa_calculation_methods")
    .select("*")
    .eq(getEntityColumn(entityType), entityId);

  if (error) throw error;
  return (data || []) as GpaCalculationMethodRow[];
};

/** @deprecated — alias for backward compatibility */
export const fetchGpaMethodsByUniversity = (universityId: string) =>
  fetchGpaMethodsByEntity(universityId, "university");

export const insertGpaMethod = async (
  values: GpaCalculationMethodFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<GpaCalculationMethodRow> => {
  const { data, error } = await supabase
    .from("gpa_calculation_methods")
    .insert({ ...values, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (error) throw error;
  return data as GpaCalculationMethodRow;
};

export const updateGpaMethod = async (
  id: string,
  values: GpaCalculationMethodFormValues,
): Promise<GpaCalculationMethodRow> => {
  const { data, error } = await supabase
    .from("gpa_calculation_methods")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as GpaCalculationMethodRow;
};

export const deleteGpaMethod = async (id: string): Promise<void> => {
  const { error } = await supabase.from("gpa_calculation_methods").delete().eq("id", id);

  if (error) throw error;
};

// ─── 6. University General Info ───────────────────────────────────────────────

export type JoinedUniversityGeneralInfoRow = UniversityGeneralInfoRow & {
  unit: { unit_name_bn: string; unit_name_en: string | null } | null;
};

export const fetchGeneralInfoByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<JoinedUniversityGeneralInfoRow[]> => {
  const { data, error } = await supabase
    .from("institution_general_info")
    .select("*, unit:admission_units(unit_name_bn, unit_name_en)")
    .eq(getEntityColumn(entityType), entityId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as JoinedUniversityGeneralInfoRow[];
};

/** @deprecated — alias for backward compatibility */
export const fetchGeneralInfoByUniversity = (universityId: string) =>
  fetchGeneralInfoByEntity(universityId, "university");

export const insertGeneralInfo = async (
  values: UniversityGeneralInfoFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<UniversityGeneralInfoRow> => {
  const { data, error } = await supabase
    .from("institution_general_info")
    .insert({ ...values, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (error) throw error;
  return data as UniversityGeneralInfoRow;
};

export const updateGeneralInfo = async (
  id: string,
  values: UniversityGeneralInfoFormValues,
): Promise<UniversityGeneralInfoRow> => {
  const { data, error } = await supabase
    .from("institution_general_info")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UniversityGeneralInfoRow;
};

export const deleteGeneralInfo = async (id: string): Promise<void> => {
  const { error } = await supabase.from("institution_general_info").delete().eq("id", id);

  if (error) throw error;
};

// ─── 8. Entity General Fields (second_time, calculator_allowed, negative_mark etc.) ───

export const getEntityTable = (entityType: EntityType): string => {
  if (entityType === "university") return "universities";
  if (entityType === "college") return "colleges";
  if (entityType === "cluster") return "clusters";
  return "universities";
};

export type EntityGeneralFields = {
  second_time: boolean;
  second_time_condition: string | null;
  negative_mark: number | null;
};

export const fetchEntityGeneralFields = async (
  entityId: string,
  entityType: EntityType,
): Promise<EntityGeneralFields> => {
  const table = getEntityTable(entityType);
  const { data, error } = await supabase
    .from(table)
    .select("second_time, second_time_condition, negative_mark")
    .eq("id", entityId)
    .single();

  if (error) throw error;
  return data as EntityGeneralFields;
};

export const updateEntityGeneralFields = async (
  entityId: string,
  entityType: EntityType,
  values: EntityGeneralFields,
): Promise<void> => {
  const table = getEntityTable(entityType);
  const { error } = await supabase.from(table).update(values).eq("id", entityId);

  if (error) throw error;
};

// ─── 8b. Unit-level Calculator Fields ─────────────────────────────────────────

export const fetchUnitCalculator = async (
  unitId: string,
): Promise<{ calculator_allowed: boolean; calculator_link: string | null } | null> => {
  const { data, error } = await supabase
    .from("admission_units")
    .select("calculator_allowed, calculator_link")
    .is("deleted_at", null)
    .eq("id", unitId)
    .single();
  if (error) return null;
  return data as { calculator_allowed: boolean; calculator_link: string | null };
};

export const updateUnitCalculator = async (
  unitId: string,
  calculator_allowed: boolean,
  calculator_link: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from("admission_units")
    .update({ calculator_allowed, calculator_link })
    .eq("id", unitId);
  if (error) throw error;
};

// ─── 9. Dynamic Notes CRUD ───────────────────────────────────────────────────

export const fetchDynamicNotesByEntity = async (
  entityId: string,
  entityType: EntityType,
): Promise<DynamicNoteRow[]> => {
  const { data, error } = await supabase
    .from("dynamic_notes")
    .select("*, unit:admission_units(id, unit_name_bn, unit_name_en)")
    .is("deleted_at", null)
    .eq(getEntityColumn(entityType), entityId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as DynamicNoteRow[];
};

export const insertDynamicNote = async (
  values: DynamicNoteFormValues,
  entityId: string,
  entityType: EntityType,
): Promise<DynamicNoteRow> => {
  const { data, error } = await supabase
    .from("dynamic_notes")
    .insert({
      ...values,
      ...buildEntityPayload(entityId, entityType),
    })
    .select()
    .single();

  if (error) throw error;
  return data as DynamicNoteRow;
};

export const updateDynamicNote = async (
  id: string,
  values: DynamicNoteFormValues,
): Promise<DynamicNoteRow> => {
  const { data, error } = await supabase
    .from("dynamic_notes")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DynamicNoteRow;
};

export const deleteDynamicNote = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("dynamic_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};
