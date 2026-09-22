-- ============================================================
-- 0. Practice Exam Sessions table (stores seen-question history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.practice_exam_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.study_user(id) ON DELETE CASCADE,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student
  ON public.practice_exam_sessions (student_id, created_at DESC);

-- ============================================================
-- 1. RPC: start_practice_exam
--
-- Drop old signature (without p_student_id) if it exists
-- ============================================================
DROP FUNCTION IF EXISTS public.start_practice_exam(
  uuid[], uuid[], uuid[], uuid[], int
);

-- ============================================================
-- 1. RPC: start_practice_exam
--
-- Selects random MCQ questions for the "Unlimited Practice"
-- feature with proportional distribution and repetition avoidance.
--
-- Parameters:
--   p_student_id  – uuid of the current user (from SSO localStorage)
--   p_topic_ids   – UUID[] of chapter_topics.id
--   p_chapter_ids – UUID[] of paper_chapters.id (no topics)
--   p_paper_ids   – UUID[] of curriculum_papers.id (no chapters)
--   p_standard_ids – UUID[] of institution_sub_categories.id
--                    (NULL = no standard filter → all sources)
--   p_limit       – int, max questions to return
--
-- Returns: JSONB array shaped for the exam runner UI.
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_practice_exam(
  p_student_id   uuid,
  p_topic_ids    uuid[] DEFAULT '{}',
  p_chapter_ids  uuid[] DEFAULT '{}',
  p_paper_ids    uuid[] DEFAULT '{}',
  p_standard_ids uuid[] DEFAULT NULL,
  p_limit        int    DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_limit    int  := LEAST(GREATEST(p_limit, 1), 200);
  v_result   jsonb;
BEGIN
  -- ── Auth guard (SSO: validate student_id from client) ──────
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: student_id is required';
  END IF;

  -- Verify the student exists in study_user
  SELECT id INTO v_user_id
  FROM   public.study_user
  WHERE  id = p_student_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: student not found';
  END IF;

  -- ── Validate at least one selection ────────────────────────
  IF array_length(p_topic_ids,   1) IS NULL
     AND array_length(p_chapter_ids, 1) IS NULL
     AND array_length(p_paper_ids,   1) IS NULL
  THEN
    RAISE EXCEPTION 'NO_SELECTION: provide at least one topic, chapter, or paper id';
  END IF;

  -- ==========================================================
  -- CTE: recent_batches
  -- Top 3 most recent non-deleted batches by year DESC.
  -- ==========================================================
  -- CTE: source_a_pool (Public QB)
  -- Questions from qb_files matching p_standard_ids (if given)
  -- and belonging to the 3 most recent batches.
  -- ==========================================================
  -- CTE: source_b_pool (Enrolled Courses)
  -- Questions linked to exams under courses the user is
  -- actively enrolled in.
  -- ==========================================================
  -- CTE: eligible_ids
  -- Union of both sources, deduplicated.
  -- ==========================================================
  -- CTE: candidate_questions
  -- Full question + option data for eligible questions,
  -- with a has_seen flag from past practice sessions.
  -- ==========================================================
  -- CTE: ranked
  -- Window-function round-robin across topics + has_seen priority.
  -- ==========================================================
  -- CTE: final_ids
  -- Top v_limit question IDs from the ranked set.
  -- ==========================================================
  WITH recent_batches AS (
    SELECT id
    FROM   public.batches
    WHERE  deleted_at IS NULL
    ORDER  BY year DESC, id DESC
    LIMIT  3
  ),

  source_a_pool AS (
    SELECT DISTINCT qm.id AS mcq_id
    FROM   public.questions_mcq qm
    JOIN   public.qb_files qb
           ON qb.id = qm.file_id
          AND qb.deleted_at IS NULL
    WHERE  qm.deleted_at IS NULL
      -- topic / chapter / paper filter
      AND (
             qm.topic_id   = ANY(p_topic_ids)
          OR qm.chapter_id = ANY(p_chapter_ids)
          OR (
               qm.paper_id = ANY(p_paper_ids)
               AND qm.chapter_id IS NULL
             )
      )
      -- standard filter (skip if NULL = no filter)
      AND (
             p_standard_ids IS NULL
          OR qb.category_id = ANY(p_standard_ids)
      )
      -- year filter (skip if NULL standard = all sources)
      AND (
             p_standard_ids IS NULL
          OR qb.year_id IN (SELECT id FROM recent_batches)
      )
  ),

  source_b_pool AS (
    SELECT DISTINCT eq.mcq_id
    FROM   public.exam_questions eq
    JOIN   public.exams e
           ON e.id = eq.exam_id
          AND e.deleted_at IS NULL
    JOIN   public.courses c
           ON c.id = e.course_id
          AND c.deleted_at IS NULL
    JOIN   public.enrollments en
           ON en.course_id = c.id
          AND en.student_id = v_user_id
          AND en.status = true
          AND en.deleted_at IS NULL
    WHERE  eq.mcq_id IS NOT NULL
  ),

  eligible_ids AS (
    SELECT mcq_id FROM source_a_pool
    UNION
    SELECT mcq_id FROM source_b_pool
  ),

  -- ── Seen history (all past session question IDs) ───────────
  past_seen AS (
    SELECT unnest(question_ids) AS qid
    FROM   public.practice_exam_sessions
    WHERE  student_id = v_user_id
  ),

  -- ── Candidate questions with full metadata ────────────────
  candidate_questions AS (
    SELECT
      qm.id,
      qm.question,
      qm.question_image,
      qm.explanation,
      qm.explanation_image,
      qm.paper_id,
      qm.chapter_id,
      qm.topic_id,
      cp.name_en  AS paper_name_en,
      cp.name_bn  AS paper_name_bn,
      pc.name     AS chapter_name,
      ct.name     AS topic_name,
      EXISTS (
        SELECT 1 FROM past_seen ps WHERE ps.qid = qm.id
      ) AS has_seen
    FROM   public.questions_mcq qm
    JOIN   eligible_ids ei ON ei.mcq_id = qm.id
    LEFT JOIN public.curriculum_papers cp ON cp.id = qm.paper_id
    LEFT JOIN public.paper_chapters pc    ON pc.id = qm.chapter_id
    LEFT JOIN public.chapter_topics ct    ON ct.id = qm.topic_id
    WHERE  qm.deleted_at IS NULL
  ),

  -- ── Round-robin ranking across topics + has_seen priority ──
  ranked AS (
    SELECT
      cq.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(cq.topic_id, cq.chapter_id, cq.paper_id)
        ORDER BY     cq.has_seen ASC, random()
      ) AS rn
    FROM   candidate_questions cq
  ),

  -- ── Final selected IDs ────────────────────────────────────
  final_ids AS (
    SELECT id FROM ranked
    ORDER  BY has_seen ASC, rn ASC
    LIMIT  v_limit
  )

  -- ==========================================================
  -- OUTPUT: Build JSONB array matching the exam runner shape.
  -- ==========================================================
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',               fi.id,
        'question',         cq.question,
        'question_image',   cq.question_image,
        'explanation',      cq.explanation,
        'explanation_image',cq.explanation_image,
        'paper_id',         cq.paper_id,
        'chapter_name',     cq.chapter_name,
        'topic_name',       cq.topic_name,
        'section',          cq.paper_name_en,
        'section_name',     cq.paper_name_bn,
        'options',          opts.opts
      )
      ORDER BY random()          -- shuffle final order
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM   final_ids fi
  JOIN   candidate_questions cq ON cq.id = fi.id
  CROSS JOIN LATERAL (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',          o.id,
          'text',        o.option_text,
          'image',       o.option_image,
          'is_correct',  o.is_correct
        )
        ORDER BY o.option_order
      ),
      '[]'::jsonb
    ) AS opts
    FROM   public.question_options o
    WHERE  o.question_id = fi.id
      AND  o.deleted_at IS NULL
  ) opts;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 2. Permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.start_practice_exam(
  uuid, uuid[], uuid[], uuid[], uuid[], int
) TO authenticated;

-- ============================================================
-- 3. Indexes for the candidate-question scan
-- (partial indexes exclude soft-deleted rows cheaply)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_qmcq_eligible_topic
  ON public.questions_mcq (topic_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qmcq_eligible_chapter
  ON public.questions_mcq (chapter_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qmcq_eligible_paper
  ON public.questions_mcq (paper_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qmcq_file_id
  ON public.questions_mcq (file_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qb_files_category_year
  ON public.qb_files (category_id, year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qb_files_year
  ON public.qb_files (year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_question_options_qid
  ON public.question_options (question_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_eq_mcq_id
  ON public.exam_questions (mcq_id)
  WHERE mcq_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_student_active
  ON public.enrollments (student_id, course_id)
  WHERE status = true AND deleted_at IS NULL;
