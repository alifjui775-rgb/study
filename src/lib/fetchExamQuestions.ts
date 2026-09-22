/**
 * Supabase-based exam question fetcher.
 * Replaces the old CSV API-based fetchQuestions.
 *
 * Fetches questions through the exam_questions junction table,
 * joining questions_mcq, question_options, and curriculum_papers,
 * then transforms the relational data into the flat Question shape
 * the existing exam UI expects.
 */

import { supabase } from "@/lib/supabase";

// ─── Raw relational shapes from Supabase ───────────────────────────────

interface RawOption {
  id: string;
  option_text: string | null;
  option_image: string[] | null;
  is_correct: boolean;
  option_order: number;
}

interface RawNameEntity {
  name_en: string | null;
  name_bn: string | null;
}

interface RawCurriculumPaper {
  name_en: string | null;
  name_bn: string | null;
  discipline_id: string | null;
  study_disciplines?: { name_bn: string | null; icon_url?: string | null } | null;
}

interface RawSimpleNameEntity {
  name: string;
}

interface RawMcq {
  id: string;
  question: string | null;
  question_image: string[] | null;
  explanation: string | null;
  explanation_image: string[] | null;
  paper_id: string | null;
  curriculum_papers: RawCurriculumPaper | null;
  paper_chapters: RawSimpleNameEntity | null;
  chapter_topics: RawSimpleNameEntity | null;
  question_types: RawSimpleNameEntity | null;
  question_options: RawOption[];
}

interface RawExamQuestion {
  sequence_order: number;
  questions_mcq: RawMcq | null;
}

// ─── Output shape (matches what the old UI expects) ────────────────────

export interface AdaptedOption {
  text: string | null;
  image: string[] | null;
}

export interface AdaptedQuestion {
  id: string;
  question: string;
  question_image?: string[] | null;
  options: any[]; // Can be string[] (legacy) or AdaptedOption[]
  /** Parallel array to `options`: the UUID of each option from question_options.id */
  option_ids: string[];
  answer: number; // 0-based index of the correct option
  explanation: string;
  explanation_image?: string[] | null;
  type: string | null;
  section: string | null; // paper_id UUID – used for subject filtering
  section_name?: string | null; // human-readable name for display
  chapter_name?: string | null;
  topic_name?: string | null;
  type_name?: string | null;
}

// ─── Subject map (paper_id → display info) ─────────────────────────────

export interface SubjectInfo {
  paper_id: string;
  name_en: string;
  name_bn: string;
  discipline_id?: string;
  discipline_name_bn?: string;
  icon_url?: string | null;
}

// ─── Fetch + adapt ─────────────────────────────────────────────────────

export async function fetchExamQuestions(
  examId: string,
): Promise<{ questions: AdaptedQuestion[]; subjectMap: Map<string, SubjectInfo> }> {
  const { data, error } = await supabase
    .from("exam_questions")
    .select(`
      sequence_order,
      questions_mcq (
        id, question, question_image, explanation, explanation_image, paper_id,
        curriculum_papers (name_en, name_bn, discipline_id, study_disciplines (name_bn, icon_url)),
        paper_chapters (name),
        chapter_topics (name),
        question_types (name),
        question_options (id, option_text, option_image, is_correct, option_order)
      )
    `)
    .eq("exam_id", examId)
    .order("sequence_order", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch exam questions: " + error.message);
  }

  const rows = (data || []) as unknown as RawExamQuestion[];
  const subjectMap = new Map<string, SubjectInfo>();
  const questions: AdaptedQuestion[] = [];

  for (const row of rows) {
    const mcq = row.questions_mcq;
    if (!mcq) continue;

    // Sort options by option_order
    const sortedOptions = [...(mcq.question_options || [])].sort(
      (a, b) => (a.option_order ?? 0) - (b.option_order ?? 0),
    );

    // Build the options array
    const adaptedOptions = sortedOptions.map((o) => ({
      text: o.option_text,
      image: o.option_image,
    }));

    // Find the 0-based index where is_correct === true
    const correctIndex = sortedOptions.findIndex((o) => o.is_correct);

    // Build subject info
    const paperId = mcq.paper_id;
    if (paperId && mcq.curriculum_papers && !subjectMap.has(paperId)) {
      subjectMap.set(paperId, {
        paper_id: paperId,
        name_en: mcq.curriculum_papers.name_en || paperId,
        name_bn: mcq.curriculum_papers.name_bn || mcq.curriculum_papers.name_en || paperId,
        discipline_id: mcq.curriculum_papers.discipline_id || undefined,
        discipline_name_bn: mcq.curriculum_papers.study_disciplines?.name_bn || undefined,
        icon_url: mcq.curriculum_papers.study_disciplines?.icon_url || undefined,
      });
    }

    questions.push({
      id: mcq.id,
      question: mcq.question || "",
      question_image: mcq.question_image,
      options: adaptedOptions,
      option_ids: sortedOptions.map((o) => o.id),
      answer: correctIndex >= 0 ? correctIndex : -1,
      explanation: mcq.explanation || "",
      explanation_image: mcq.explanation_image,
      type: mcq.question_types?.name || null,
      section: paperId, // paper_id UUID for filtering
      section_name: mcq.curriculum_papers?.name_bn || mcq.curriculum_papers?.name_en || null,
      chapter_name: mcq.paper_chapters?.name || null,
      topic_name: mcq.chapter_topics?.name || null,
      type_name: mcq.question_types?.name || null,
    });
  }

  return { questions, subjectMap };
}
