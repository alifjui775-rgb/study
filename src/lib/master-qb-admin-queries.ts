// =============================================================================
// Admin — Master Question Bank Supabase Queries & Mutations
// =============================================================================

import { supabase } from "@/lib/supabase";
import type {
  MasterQbStreamRow,
  MasterQbStreamFormValues,
  CurriculumPaperOption,
  InstitutionUnit,
  QbInstitution,
} from "@/lib/master-qb-admin-types";

const STREAM_COLUMNS =
  "id, slug, name_bn, short_name_bn, description, icon_url, sort_order, paper_ids";

// ─── Streams (master_qb_streams) ───────────────────────────────────────────────

export const fetchMasterQbStreams = async (): Promise<MasterQbStreamRow[]> => {
  const { data, error } = await supabase
    .from("master_qb_streams")
    .select(STREAM_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MasterQbStreamRow[];
};

export const insertMasterQbStream = async (
  values: MasterQbStreamFormValues,
): Promise<MasterQbStreamRow> => {
  const { data, error } = await supabase
    .from("master_qb_streams")
    .insert(values)
    .select(STREAM_COLUMNS)
    .single();
  if (error) throw error;
  return data as MasterQbStreamRow;
};

export const updateMasterQbStream = async (
  id: number,
  values: MasterQbStreamFormValues,
): Promise<MasterQbStreamRow> => {
  const { data, error } = await supabase
    .from("master_qb_streams")
    .update(values)
    .eq("id", id)
    .select(STREAM_COLUMNS)
    .single();
  if (error) throw error;
  return data as MasterQbStreamRow;
};

export const deleteMasterQbStream = async (id: number): Promise<void> => {
  const { error } = await supabase.from("master_qb_streams").delete().eq("id", id);
  if (error) throw error;
};

export const updateMasterQbStreamSortOrder = async (
  id: number,
  sort_order: number,
): Promise<void> => {
  const { error } = await supabase.from("master_qb_streams").update({ sort_order }).eq("id", id);
  if (error) throw error;
};

// ─── Curriculum Papers (curriculum_papers + study_disciplines) ─────────────────

export const fetchCurriculumPaperOptions = async (): Promise<CurriculumPaperOption[]> => {
  const { data, error } = await supabase
    .from("curriculum_papers")
    .select(
      "id, name_en, name_bn, short_code, discipline_id, study_disciplines(id, name_bn, name_en)",
    )
    .order("name_en");
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    name_en: p.name_en,
    name_bn: p.name_bn,
    short_code: p.short_code,
    discipline_id: p.discipline_id,
    discipline_name_bn: p.study_disciplines?.name_bn ?? null,
    discipline_name_en: p.study_disciplines?.name_en ?? null,
  })) as CurriculumPaperOption[];
};

// ─── master_qb_units (stream ↔ unit mapping) ───────────────────────────────────

export const QUERY_KEY_MASTER_QB_UNITS = "admin-master-qb-units";

export const fetchAssignedUnitIds = async (streamId: number): Promise<string[]> => {
  const { data, error } = await supabase
    .from("master_qb_units")
    .select("unit_id")
    .eq("stream_id", streamId);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.unit_id as string);
};

export const assignUnitsToStream = async ({
  streamId,
  unitIds,
}: {
  streamId: number;
  unitIds: string[];
}): Promise<void> => {
  if (unitIds.length === 0) return;
  const rows = unitIds.map((unitId) => ({ stream_id: streamId, unit_id: unitId }));
  const { error } = await supabase.from("master_qb_units").insert(rows);
  if (error) throw error;
};

export const unassignUnitsFromStream = async ({
  streamId,
  unitIds,
}: {
  streamId: number;
  unitIds: string[];
}): Promise<void> => {
  if (unitIds.length === 0) return;
  const { error } = await supabase
    .from("master_qb_units")
    .delete()
    .eq("stream_id", streamId)
    .in("unit_id", unitIds);
  if (error) throw error;
};

export const assignUnitToStream = ({
  streamId,
  unitId,
}: {
  streamId: number;
  unitId: string;
}): Promise<void> => assignUnitsToStream({ streamId, unitIds: [unitId] });

export const unassignUnitFromStream = ({
  streamId,
  unitId,
}: {
  streamId: number;
  unitId: string;
}): Promise<void> => unassignUnitsFromStream({ streamId, unitIds: [unitId] });

// ─── Institutions with units (universities + clusters) ────────────────────────

export const QUERY_KEY_MASTER_QB_INSTITUTIONS = "admin-master-qb-institutions";

export const fetchInstitutionsWithUnits = async (): Promise<QbInstitution[]> => {
  const [uniRes, clusterRes, unitsRes] = await Promise.all([
    supabase
      .from("universities")
      .select("id, name_bn, name_en, short_name_bn, logo_url")
      .is("deleted_at", null)
      .order("name_bn", { ascending: true }),
    supabase
      .from("clusters")
      .select("id, name_bn, name_en, short_name_bn, logo_url")
      .is("deleted_at", null)
      .order("name_bn", { ascending: true }),
    supabase
      .from("admission_units")
      .select(
        "id, university_id, cluster_id, unit_name_bn, unit_name_en, unit_slug, sort_order, calculator_allowed",
      )
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  if (uniRes.error) throw uniRes.error;
  if (clusterRes.error) throw clusterRes.error;
  if (unitsRes.error) throw unitsRes.error;

  const toUnit = (u: any): InstitutionUnit => ({
    id: u.id,
    unit_name_bn: u.unit_name_bn,
    unit_name_en: u.unit_name_en ?? null,
    unit_slug: u.unit_slug,
    sort_order: u.sort_order ?? 0,
    calculator_allowed: u.calculator_allowed ?? null,
  });

  const unitsByUniversity = new Map<string, InstitutionUnit[]>();
  const unitsByCluster = new Map<string, InstitutionUnit[]>();

  (unitsRes.data ?? []).forEach((u: any) => {
    const key = u.university_id || u.cluster_id;
    if (!key) return;
    const target = u.university_id ? unitsByUniversity : unitsByCluster;
    if (!target.has(key)) target.set(key, []);
    target.get(key)!.push(toUnit(u));
  });

  const universities: QbInstitution[] = (uniRes.data ?? []).map((uni: any) => ({
    id: uni.id,
    type: "university" as const,
    name_bn: uni.name_bn,
    name_en: uni.name_en ?? "",
    short_name_bn: uni.short_name_bn ?? null,
    logo_url: uni.logo_url ?? null,
    units: unitsByUniversity.get(uni.id) ?? [],
  }));

  const clusters: QbInstitution[] = (clusterRes.data ?? []).map((c: any) => ({
    id: c.id,
    type: "cluster" as const,
    name_bn: c.name_bn,
    name_en: c.name_en ?? "",
    short_name_bn: c.short_name_bn ?? null,
    logo_url: c.logo_url ?? null,
    units: unitsByCluster.get(c.id) ?? [],
  }));

  return [...universities, ...clusters];
};
