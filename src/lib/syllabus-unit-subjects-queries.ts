import { supabase } from "@/lib/supabase";

// =============================================================================
// Types
// =============================================================================

export type SyllabusUnitSubject = {
  id: string;
  unit_id: string;
  group_id: string;
  paper_id: string;
  is_mandatory: boolean;
  sort_order: number;
  created_at: string;
  // Joined fields
  paper_name_en?: string;
  paper_name_bn?: string;
  paper_short_code?: string;
  group_name_en?: string;
  group_name_bn?: string;
};

// =============================================================================
// Fetch subjects for a unit + group combination
// =============================================================================

export async function fetchSyllabusUnitSubjects(
  unitId: string,
  groupId: string,
): Promise<SyllabusUnitSubject[]> {
  const { data, error } = await supabase
    .from("syllabus_unit_subjects")
    .select(`
      id, unit_id, group_id, paper_id, is_mandatory, sort_order, created_at,
      paper:curriculum_papers(id, name_en, name_bn, short_code),
      group:groups(id, name_en, name_bn)
    `)
    .eq("unit_id", unitId)
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    unit_id: row.unit_id,
    group_id: row.group_id,
    paper_id: row.paper_id,
    is_mandatory: row.is_mandatory,
    sort_order: row.sort_order,
    created_at: row.created_at,
    paper_name_en: row.paper?.name_en,
    paper_name_bn: row.paper?.name_bn,
    paper_short_code: row.paper?.short_code,
    group_name_en: row.group?.name_en,
    group_name_bn: row.group?.name_bn,
  }));
}

// =============================================================================
// Fetch all subjects for a unit (all groups)
// =============================================================================

export async function fetchAllSyllabusUnitSubjects(unitId: string): Promise<SyllabusUnitSubject[]> {
  const { data, error } = await supabase
    .from("syllabus_unit_subjects")
    .select(`
      id, unit_id, group_id, paper_id, is_mandatory, sort_order, created_at,
      paper:curriculum_papers(id, name_en, name_bn, short_code),
      group:groups(id, name_en, name_bn)
    `)
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    unit_id: row.unit_id,
    group_id: row.group_id,
    paper_id: row.paper_id,
    is_mandatory: row.is_mandatory,
    sort_order: row.sort_order,
    created_at: row.created_at,
    paper_name_en: row.paper?.name_en,
    paper_name_bn: row.paper?.name_bn,
    paper_short_code: row.paper?.short_code,
    group_name_en: row.group?.name_en,
    group_name_bn: row.group?.name_bn,
  }));
}

// =============================================================================
// Upsert: Save subjects for a unit + group (replace all)
// =============================================================================

export async function saveSyllabusUnitSubjects(
  unitId: string,
  groupId: string,
  subjects: { paper_id: string; is_mandatory: boolean; sort_order: number }[],
): Promise<void> {
  // Delete existing for this unit + group
  const { error: delErr } = await supabase
    .from("syllabus_unit_subjects")
    .delete()
    .eq("unit_id", unitId)
    .eq("group_id", groupId);
  if (delErr) throw delErr;

  // Insert new
  if (subjects.length > 0) {
    const rows = subjects.map((s) => ({
      unit_id: unitId,
      group_id: groupId,
      paper_id: s.paper_id,
      is_mandatory: s.is_mandatory,
      sort_order: s.sort_order,
    }));

    const { error: insErr } = await supabase.from("syllabus_unit_subjects").insert(rows);
    if (insErr) throw insErr;
  }
}

// =============================================================================
// Delete a single subject
// =============================================================================

export async function deleteSyllabusUnitSubject(id: string): Promise<void> {
  const { error } = await supabase.from("syllabus_unit_subjects").delete().eq("id", id);
  if (error) throw error;
}
