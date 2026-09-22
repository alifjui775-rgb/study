import { supabase } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────

export type StudyLevel = { id: number; name: string; code: string };
export type StudyDiscipline = { id: string; name: string; level_id: number };
export type CurriculumPaper = { id: string; name: string; discipline_id: string };
export type PaperChapter = { id: string; name: string; serial: number | null; paper_id: string };
export type ChapterTopic = {
  id: string;
  name: string;
  serial: number | null;
  paper_id: string;
  chapter_id: string;
};
export type DegreeProgram = { id: string; name: string };
export type PaperGroup = { id: string; paper_id: string; group_id: string };
export type Group = { id: string; name_en: string; name_bn: string };

// ─── FETCHERS ─────────────────────────────────────────────────────

export const fetchStudyLevels = async (): Promise<StudyLevel[]> => {
  const { data, error } = await supabase.from("study_levels").select("*").order("id");
  if (error) throw error;
  return data;
};

export const fetchStudyDisciplines = async (levelId?: number): Promise<StudyDiscipline[]> => {
  let query = supabase.from("study_disciplines").select("*").is("deleted_at", null).order("name");
  if (levelId !== undefined) {
    query = query.eq("level_id", levelId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchCurriculumPapers = async (disciplineId?: string): Promise<CurriculumPaper[]> => {
  let query = supabase.from("curriculum_papers").select("*").order("name");
  if (disciplineId) {
    query = query.eq("discipline_id", disciplineId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchPaperChapters = async (paperId?: string): Promise<PaperChapter[]> => {
  let query = supabase
    .from("paper_chapters")
    .select("*")
    .order("serial", { ascending: true, nullsFirst: false });
  if (paperId) {
    query = query.eq("paper_id", paperId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchChapterTopics = async (chapterId?: string): Promise<ChapterTopic[]> => {
  let query = supabase
    .from("chapter_topics")
    .select("*")
    .order("serial", { ascending: true, nullsFirst: false });
  if (chapterId) {
    query = query.eq("chapter_id", chapterId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchDegreePrograms = async (): Promise<DegreeProgram[]> => {
  const { data, error } = await supabase.from("degree_programs").select("*").order("name");
  if (error) throw error;
  return data;
};

export const fetchGroups = async (): Promise<Group[]> => {
  const { data, error } = await supabase.from("groups").select("*").order("name_en");
  if (error) throw error;
  return data;
};

export const fetchPaperGroups = async (paperId?: string): Promise<PaperGroup[]> => {
  let query = supabase.from("paper_groups").select("*");
  if (paperId) query = query.eq("paper_id", paperId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ─── MUTATIONS ────────────────────────────────────────────────────

// Study Disciplines
export const insertDiscipline = async (val: Omit<StudyDiscipline, "id">) => {
  const { data, error } = await supabase.from("study_disciplines").insert(val).select().single();
  if (error) throw error;
  return data;
};
export const updateDiscipline = async (id: string, val: Partial<StudyDiscipline>) => {
  const { data, error } = await supabase
    .from("study_disciplines")
    .update(val)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
export const deleteDiscipline = async (id: string) => {
  const { error } = await supabase
    .from("study_disciplines")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// Curriculum Papers
export const insertPaper = async (val: Omit<CurriculumPaper, "id">) => {
  const { data, error } = await supabase.from("curriculum_papers").insert(val).select().single();
  if (error) throw error;
  return data;
};
export const updatePaper = async (id: string, val: Partial<CurriculumPaper>) => {
  const { data, error } = await supabase
    .from("curriculum_papers")
    .update(val)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
export const deletePaper = async (id: string) => {
  const { error } = await supabase.from("curriculum_papers").delete().eq("id", id);
  if (error) throw error;
};

// Paper Chapters
export const insertChapter = async (val: Omit<PaperChapter, "id">) => {
  const { data, error } = await supabase.from("paper_chapters").insert(val).select().single();
  if (error) throw error;
  return data;
};
export const updateChapter = async (id: string, val: Partial<PaperChapter>) => {
  const { data, error } = await supabase
    .from("paper_chapters")
    .update(val)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
export const deleteChapter = async (id: string) => {
  const { error } = await supabase.from("paper_chapters").delete().eq("id", id);
  if (error) throw error;
};

// Chapter Topics
export const insertTopic = async (val: Omit<ChapterTopic, "id">) => {
  const { data, error } = await supabase.from("chapter_topics").insert(val).select().single();
  if (error) throw error;
  return data;
};
export const updateTopic = async (id: string, val: Partial<ChapterTopic>) => {
  const { data, error } = await supabase
    .from("chapter_topics")
    .update(val)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
export const deleteTopic = async (id: string) => {
  const { error } = await supabase.from("chapter_topics").delete().eq("id", id);
  if (error) throw error;
};

// Degree Programs
export const insertDegreeProgram = async (val: Omit<DegreeProgram, "id">) => {
  const { data, error } = await supabase.from("degree_programs").insert(val).select().single();
  if (error) throw error;
  return data;
};
export const updateDegreeProgram = async (id: string, val: Partial<DegreeProgram>) => {
  const { data, error } = await supabase
    .from("degree_programs")
    .update(val)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
export const deleteDegreeProgram = async (id: string) => {
  const { error } = await supabase
    .from("degree_programs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// Paper Groups
export const setPaperGroups = async (paperId: string, groupIds: string[]) => {
  const { error: delErr } = await supabase.from("paper_groups").delete().eq("paper_id", paperId);
  if (delErr) throw delErr;

  if (groupIds.length > 0) {
    const rows = groupIds.map((gId) => ({ paper_id: paperId, group_id: gId }));
    const { error: insErr } = await supabase.from("paper_groups").insert(rows);
    if (insErr) throw insErr;
  }
};
