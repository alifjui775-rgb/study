// =============================================================================
// Public — Master Question Bank: chapter questions via unified RPC
//
// The Postgres RPC `get_master_qb_questions` resolves allowed units from
// master_qb_units, filters the 4 most recent batches from qb_files, and returns
// joined question data (with source_info) for MCQ or Written.
// =============================================================================

import { supabase } from "@/lib/supabase";

export const MASTER_QB_PAGE_SIZE = 10;

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBnDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// ─── Context types ────────────────────────────────────────────────────────────

export interface MasterQbStreamRow {
  id: number;
  slug: string;
  name_bn: string;
  short_name_bn: string | null;
  description: string | null;
  icon_url: string | null;
  paper_ids: string[];
}

export interface MasterQbPaperRow {
  id: string;
  name_bn: string | null;
  name_en: string;
  short_code: string | null;
  discipline_id: string | null;
  study_disciplines: { name_bn: string | null; icon_url: string | null } | null;
}

export interface MasterQbChapterRow {
  id: string;
  paper_id: string;
  name: string;
  serial: number | null;
  short_code: string | null;
}

export interface MasterQbTopic {
  id: string;
  name: string;
  serial: number | null;
}

export interface MasterQbChapterContext {
  stream: MasterQbStreamRow | null;
  paper: MasterQbPaperRow | null;
  chapter: MasterQbChapterRow | null;
}

// ─── RPC output types ─────────────────────────────────────────────────────────

export interface MasterQuestionSourceInfo {
  unit_name_bn: string | null;
  batch_name?: string | null;
  batch_year: number | string | null;
  university_name: string | null;
  cluster_name: string | null;
}

export interface MasterQuestionOption {
  id?: string;
  option_text: string | null;
  option_image?: string[] | null;
  is_correct: boolean;
  option_order?: number | null;
}

export interface MasterQuestionItem {
  id: string;
  question: string | null;
  question_image?: string[] | null;
  explanation?: string | null;
  explanation_image?: string[] | null;
  answer?: string | null;
  answer_image?: string[] | null;
  topic_id: string | null;
  topic_name?: string | null;
  chapter_name?: string | null;
  paper_name?: string | null;
  type_name?: string | null;
  sequence_order?: number | null;
  question_options?: MasterQuestionOption[] | null;
  options?: MasterQuestionOption[] | null;
  source_info?: MasterQuestionSourceInfo | null;
}

export type MasterQuestionType = "mcq" | "written";

// ─── Context resolution (stream → paper → chapter) ────────────────────────────

export async function fetchMasterQbStreamBySlug(
  slug: string,
): Promise<MasterQbStreamRow | null> {
  const { data, error } = await supabase
    .from("master_qb_streams")
    .select("id, slug, name_bn, short_name_bn, description, icon_url, paper_ids")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as MasterQbStreamRow) ?? null;
}

export async function fetchMasterQbPaperByShortCode(
  shortCode: string,
): Promise<MasterQbPaperRow | null> {
  const { data, error } = await supabase
    .from("curriculum_papers")
    .select(
      "id, name_bn, name_en, short_code, discipline_id, study_disciplines(name_bn, icon_url)",
    )
    .eq("short_code", shortCode)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as unknown as MasterQbPaperRow) : null;
}

export async function fetchMasterQbChapter(
  paperId: string,
  chapterParam: string,
): Promise<MasterQbChapterRow | null> {
  const columns = "id, paper_id, name, serial, short_code";

  const byShortCode = await supabase
    .from("paper_chapters")
    .select(columns)
    .eq("paper_id", paperId)
    .eq("short_code", chapterParam)
    .maybeSingle();
  if (byShortCode.error) throw byShortCode.error;
  if (byShortCode.data) return byShortCode.data as MasterQbChapterRow;

  const byId = await supabase
    .from("paper_chapters")
    .select(columns)
    .eq("paper_id", paperId)
    .eq("id", chapterParam)
    .maybeSingle();
  if (byId.error) throw byId.error;
  return (byId.data as MasterQbChapterRow) ?? null;
}

export async function fetchMasterQbChapterContext(params: {
  streamSlug: string;
  paperShortCode: string;
  chapterShortCode: string;
}): Promise<MasterQbChapterContext> {
  const { streamSlug, paperShortCode, chapterShortCode } = params;

  const stream = await fetchMasterQbStreamBySlug(streamSlug);
  if (!stream) return { stream: null, paper: null, chapter: null };

  const paper = await fetchMasterQbPaperByShortCode(paperShortCode);
  if (!paper) return { stream, paper: null, chapter: null };

  const chapter = await fetchMasterQbChapter(paper.id, chapterShortCode);
  return { stream, paper, chapter };
}

export async function fetchMasterQbTopics(chapterId: string): Promise<MasterQbTopic[]> {
  const { data, error } = await supabase
    .from("chapter_topics")
    .select("id, name, serial")
    .eq("chapter_id", chapterId)
    .order("serial", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as MasterQbTopic[];
}

// ─── Unified question fetch (RPC) ─────────────────────────────────────────────

export interface FetchMasterQuestionsParams {
  streamSlug: string;
  chapterId: string;
  questionType: MasterQuestionType;
  topicId?: string | null;
  limit?: number;
  offset?: number;
}

export async function fetchMasterQuestions({
  streamSlug,
  chapterId,
  questionType,
  topicId = null,
  limit = MASTER_QB_PAGE_SIZE,
  offset = 0,
}: FetchMasterQuestionsParams): Promise<MasterQuestionItem[]> {
  const { data, error } = await supabase.rpc("get_master_qb_questions", {
    p_stream_slug: streamSlug,
    p_chapter_id: chapterId,
    p_question_type: questionType,
    p_topic_id: topicId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return (data ?? []) as MasterQuestionItem[];
}
