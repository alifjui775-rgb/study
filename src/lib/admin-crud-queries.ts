// =============================================================================
// Admin CRUD — Supabase Query & Mutation Functions for Batches, Groups, Subjects
// =============================================================================

import { supabase } from "@/lib/supabase";
import type {
  BatchRow,
  BatchFormValues,
  GroupRow,
  GroupFormValues,
  DegreeProgramRow,
  DegreeProgramFormValues,
  StudyLevelRow,
  StudyLevelFormValues,
  StudyDisciplineRow,
  StudyDisciplineFormValues,
  CurriculumPaperRow,
  CurriculumPaperFormValues,
  FacultyRow,
  FacultyFormValues,
} from "@/lib/admin-crud-types";

// ─── Batches ────────────────────────────────────────────────────────────────

export const fetchBatches = async (): Promise<BatchRow[]> => {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .is("deleted_at", null)
    .order("year", { ascending: false });
  if (error) throw error;
  return (data || []) as BatchRow[];
};

export const insertBatch = async (values: BatchFormValues): Promise<BatchRow> => {
  const { data, error } = await supabase.from("batches").insert(values).select().single();
  if (error) throw error;
  return data as BatchRow;
};

export const updateBatch = async (id: string, values: BatchFormValues): Promise<BatchRow> => {
  const { data, error } = await supabase
    .from("batches")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as BatchRow;
};

export const deleteBatch = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ─── Groups ─────────────────────────────────────────────────────────────────

export const fetchGroups = async (): Promise<GroupRow[]> => {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("name_en", { ascending: true });
  if (error) throw error;
  return (data || []) as GroupRow[];
};

export const insertGroup = async (values: GroupFormValues): Promise<GroupRow> => {
  const { data, error } = await supabase.from("groups").insert(values).select().single();
  if (error) throw error;
  return data as GroupRow;
};

export const updateGroup = async (id: string, values: GroupFormValues): Promise<GroupRow> => {
  const { data, error } = await supabase
    .from("groups")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as GroupRow;
};

export const deleteGroup = async (id: string): Promise<void> => {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
};

// ─── Degree Programs (was Subjects) ───────────────────────────────────────────

export interface FetchDegreeProgramsOverload {
  (): Promise<DegreeProgramRow[]>;
  (
    page: number,
    pageSize?: number,
    search?: string,
  ): Promise<{ data: DegreeProgramRow[]; count: number }>;
}

export const fetchDegreePrograms: FetchDegreeProgramsOverload = async (
  page?: number,
  pageSize: number = 20,
  search?: string,
): Promise<any> => {
  if (page === undefined) {
    const { data, error } = await supabase
      .from("degree_programs")
      .select("*, faculties(id, name_bn, name_en)")
      .is("deleted_at", null)
      .order("full_name_en", { ascending: true });
    if (error) throw error;
    return (data || []) as DegreeProgramRow[];
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("degree_programs")
    .select("*, faculties(id, name_bn, name_en)", { count: "exact" })
    .is("deleted_at", null);

  if (search && search.trim() !== "") {
    const trimmed = search.trim();
    query = query.or(
      `full_name_en.ilike.%${trimmed}%,full_name_bn.ilike.%${trimmed}%,short_name.ilike.%${trimmed}%,slug.ilike.%${trimmed}%`,
    );
  }

  const { data, error, count } = await query
    .order("full_name_en", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return {
    data: (data || []) as DegreeProgramRow[],
    count: count || 0,
  };
};

export const insertDegreeProgram = async (
  values: DegreeProgramFormValues,
): Promise<DegreeProgramRow> => {
  const { data, error } = await supabase.from("degree_programs").insert(values).select().single();
  if (error) throw error;
  return data as DegreeProgramRow;
};

export const updateDegreeProgram = async (
  id: string,
  values: DegreeProgramFormValues,
): Promise<DegreeProgramRow> => {
  const { data, error } = await supabase
    .from("degree_programs")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DegreeProgramRow;
};

export const deleteDegreeProgram = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("degree_programs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// Public: fetch a single degree program by slug (for the review page)
export const fetchDegreeProgramBySlug = async (slug: string): Promise<DegreeProgramRow | null> => {
  const { data, error } = await supabase
    .from("degree_programs")
    .select("*, faculties(id, name_bn, name_en)")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as DegreeProgramRow | null;
};

export interface StudyDisciplineMasterRow {
  id: string;
  name_en: string;
  name_bn: string;
  short_code: string;
}

export const fetchStudyDisciplinesList = async (): Promise<StudyDisciplineMasterRow[]> => {
  const { data, error } = await supabase
    .from("study_disciplines")
    .select("id, name_en, name_bn, short_code")
    .is("deleted_at", null)
    .order("name_bn");
  if (error) throw error;
  return (data || []) as StudyDisciplineMasterRow[];
};

// ─── Study Levels CRUD (study_levels table) ─────────────────────────────────────────

export const fetchStudyLevels = async (): Promise<StudyLevelRow[]> => {
  const { data, error } = await supabase.from("study_levels").select("*").order("id");
  if (error) throw error;
  return (data || []) as StudyLevelRow[];
};

export const insertStudyLevel = async (values: StudyLevelFormValues): Promise<StudyLevelRow> => {
  const { data, error } = await supabase.from("study_levels").insert(values).select().single();
  if (error) throw error;
  return data as StudyLevelRow;
};

export const updateStudyLevel = async (
  id: number,
  values: StudyLevelFormValues,
): Promise<StudyLevelRow> => {
  const { data, error } = await supabase
    .from("study_levels")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as StudyLevelRow;
};

export const deleteStudyLevel = async (id: number): Promise<void> => {
  const { error } = await supabase.from("study_levels").delete().eq("id", id);
  if (error) throw error;
};

// ─── Admission Subjects CRUD (study_disciplines table) ──────────────────────────────

export const fetchStudyDisciplines = async (): Promise<StudyDisciplineRow[]> => {
  const { data, error } = await supabase
    .from("study_disciplines")
    .select("*, subject_groups(group_id)")
    .is("deleted_at", null)
    .order("name_bn");
  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    group_ids: s.subject_groups?.map((g: any) => g.group_id) || [],
  })) as StudyDisciplineRow[];
};

export const insertStudyDiscipline = async (
  values: StudyDisciplineFormValues,
): Promise<StudyDisciplineRow> => {
  const { group_ids, ...rawValues } = values;
  const { data: mainData, error: mainError } = await supabase
    .from("study_disciplines")
    .insert(rawValues)
    .select()
    .single();
  if (mainError) throw mainError;

  const savedId = mainData.id;
  if (group_ids && group_ids.length > 0) {
    const groupRows = group_ids.map((gid) => ({
      subject_id: savedId,
      group_id: gid,
    }));
    const { error: groupError } = await supabase.from("subject_groups").insert(groupRows);
    if (groupError) throw groupError;
  }

  return { ...mainData, group_ids } as StudyDisciplineRow;
};

export const updateStudyDiscipline = async (
  id: string,
  values: StudyDisciplineFormValues,
): Promise<StudyDisciplineRow> => {
  const { group_ids, ...rawValues } = values;
  const { data: mainData, error: mainError } = await supabase
    .from("study_disciplines")
    .update(rawValues)
    .eq("id", id)
    .select()
    .single();
  if (mainError) throw mainError;

  // Sync groups: Delete existing, insert new
  const { error: deleteError } = await supabase
    .from("subject_groups")
    .delete()
    .eq("subject_id", id);
  if (deleteError) throw deleteError;

  if (group_ids && group_ids.length > 0) {
    const groupRows = group_ids.map((gid) => ({
      subject_id: id,
      group_id: gid,
    }));
    const { error: groupError } = await supabase.from("subject_groups").insert(groupRows);
    if (groupError) throw groupError;
  }

  return { ...mainData, group_ids } as StudyDisciplineRow;
};

export const deleteStudyDiscipline = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("study_disciplines")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ─── Curriculum Papers CRUD (curriculum_papers table) ────────────────────────────────

export const fetchCurriculumPapers = async (): Promise<CurriculumPaperRow[]> => {
  const { data, error } = await supabase
    .from("curriculum_papers")
    .select("*, paper_groups(group_id)")
    .order("name_en");
  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    group_ids: s.paper_groups?.map((g: any) => g.group_id) || [],
  })) as CurriculumPaperRow[];
};

export const insertCurriculumPaper = async (
  values: CurriculumPaperFormValues,
): Promise<CurriculumPaperRow> => {
  const { group_ids, ...rawValues } = values;
  const { data: mainData, error: mainError } = await supabase
    .from("curriculum_papers")
    .insert(rawValues)
    .select()
    .single();
  if (mainError) throw mainError;

  const savedId = mainData.id;
  if (group_ids && group_ids.length > 0) {
    const groupRows = group_ids.map((gid) => ({
      paper_id: savedId,
      group_id: gid,
    }));
    const { error: groupError } = await supabase.from("paper_groups").insert(groupRows);
    if (groupError) throw groupError;
  }

  return { ...mainData, group_ids } as CurriculumPaperRow;
};

export const updateCurriculumPaper = async (
  id: string,
  values: CurriculumPaperFormValues,
): Promise<CurriculumPaperRow> => {
  const { group_ids, ...rawValues } = values;
  const { data: mainData, error: mainError } = await supabase
    .from("curriculum_papers")
    .update(rawValues)
    .eq("id", id)
    .select()
    .single();
  if (mainError) throw mainError;

  // Sync groups: Delete existing, insert new
  const { error: deleteError } = await supabase.from("paper_groups").delete().eq("paper_id", id);
  if (deleteError) throw deleteError;

  if (group_ids && group_ids.length > 0) {
    const groupRows = group_ids.map((gid) => ({
      paper_id: id,
      group_id: gid,
    }));
    const { error: groupError } = await supabase.from("paper_groups").insert(groupRows);
    if (groupError) throw groupError;
  }

  return { ...mainData, group_ids } as CurriculumPaperRow;
};

export const deleteCurriculumPaper = async (id: string): Promise<void> => {
  const { error } = await supabase.from("curriculum_papers").delete().eq("id", id);
  if (error) throw error;
};

// ─── Faculties CRUD (faculties table) ────────────────────────────────────────

export const fetchFaculties = async (): Promise<FacultyRow[]> => {
  const { data, error } = await supabase
    .from("faculties")
    .select("*")
    .is("deleted_at", null)
    .order("name_en", { ascending: true });
  if (error) throw error;
  return (data || []) as FacultyRow[];
};

export const insertFaculty = async (values: FacultyFormValues): Promise<FacultyRow> => {
  const { data, error } = await supabase.from("faculties").insert(values).select().single();
  if (error) throw error;
  return data as FacultyRow;
};

export const updateFaculty = async (id: number, values: FacultyFormValues): Promise<FacultyRow> => {
  const { data, error } = await supabase
    .from("faculties")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FacultyRow;
};

export const deleteFaculty = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("faculties")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export type AuditLogRow = {
  id: string;
  table_name: string;
  action: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  user_name: string | null;
};

export type AuditLogFilters = {
  tableName?: string;
  userId?: string;
  date?: Date;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const fetchAuditLogs = async (
  adminUuid: string,
  actionFilter: string = "ALL",
  filters: AuditLogFilters = {},
  page: number = 1,
  itemsPerPage: number = 50,
): Promise<{ data: AuditLogRow[]; count: number }> => {
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  let query = supabase.rpc(
    "get_audit_logs",
    {
      admin_uuid: adminUuid,
      filter_action: actionFilter,
    },
    { count: "exact" },
  );

  if (filters.tableName && filters.tableName !== "ALL") {
    query = query.eq("table_name", filters.tableName);
  }

  const userId = filters.userId?.trim() ?? "";
  if (userId && UUID_PATTERN.test(userId)) {
    query = query.eq("user_id", userId);
  }

  if (filters.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);
    query = query
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Supabase Audit Log RPC Error:", error);
    throw error;
  }

  return {
    data: (data || []) as AuditLogRow[],
    count: count || 0,
  };
};
