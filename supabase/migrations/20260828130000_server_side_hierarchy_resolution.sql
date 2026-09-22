-- ============================================================
-- Migration: Server-Side Hierarchy Resolution for Practice Exam
--
-- Enables start_practice_exam to accept top-level chapter_ids
-- or paper_ids and resolve all child topics / chapters directly
-- in PostgreSQL via subquery joins.
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

  WITH recent_batches AS (
    SELECT id
    FROM   public.batches
    WHERE  deleted_at IS NULL
    ORDER  BY year DESC, id DESC
    LIMIT  3
  ),

  -- ── Source A: Public QB (topic/chapter/paper hierarchy + standard & year filter) ──
  source_a_pool AS (
    SELECT DISTINCT qm.id AS mcq_id
    FROM   public.questions_mcq qm
    JOIN   public.qb_files qb
           ON qb.id = qm.file_id
          AND qb.deleted_at IS NULL
    WHERE  qm.deleted_at IS NULL
      AND (
             -- 1. Direct Topic match
             qm.topic_id = ANY(p_topic_ids)

             -- 2. Chapter match (direct chapter_id match OR topic belongs to selected chapter)
          OR qm.chapter_id = ANY(p_chapter_ids)
          OR qm.topic_id IN (
               SELECT id FROM public.chapter_topics
               WHERE  chapter_id = ANY(p_chapter_ids)
             )

             -- 3. Paper match (direct paper_id match OR chapter/topic belongs to selected paper)
          OR qm.paper_id = ANY(p_paper_ids)
          OR qm.chapter_id IN (
               SELECT id FROM public.paper_chapters
               WHERE  paper_id = ANY(p_paper_ids)
             )
          OR qm.topic_id IN (
               SELECT ct.id
               FROM   public.chapter_topics ct
               JOIN   public.paper_chapters pc ON pc.id = ct.chapter_id
               WHERE  pc.paper_id = ANY(p_paper_ids)
             )
      )
      AND (
             p_standard_ids IS NULL
          OR qb.category_id = ANY(p_standard_ids)
      )
      AND (
             p_standard_ids IS NULL
          OR qb.year_id IN (SELECT id FROM recent_batches)
      )
  ),

  -- ── Source B: Enrolled Courses (topic/chapter/paper hierarchy + standard filter) ──
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
    JOIN   public.questions_mcq qm
           ON qm.id = eq.mcq_id
          AND qm.deleted_at IS NULL
    LEFT JOIN public.qb_files qb
           ON qb.id = qm.file_id
          AND qb.deleted_at IS NULL
    WHERE  eq.mcq_id IS NOT NULL
      AND (
             -- 1. Direct Topic match
             qm.topic_id = ANY(p_topic_ids)

             -- 2. Chapter match
          OR qm.chapter_id = ANY(p_chapter_ids)
          OR qm.topic_id IN (
               SELECT id FROM public.chapter_topics
               WHERE  chapter_id = ANY(p_chapter_ids)
             )

             -- 3. Paper match
          OR qm.paper_id = ANY(p_paper_ids)
          OR qm.chapter_id IN (
               SELECT id FROM public.paper_chapters
               WHERE  paper_id = ANY(p_paper_ids)
             )
          OR qm.topic_id IN (
               SELECT ct.id
               FROM   public.chapter_topics ct
               JOIN   public.paper_chapters pc ON pc.id = ct.chapter_id
               WHERE  pc.paper_id = ANY(p_paper_ids)
             )
      )
      AND (
             p_standard_ids IS NULL
          OR qb.category_id = ANY(p_standard_ids)
          OR c.category_ids && p_standard_ids
      )
  ),

  eligible_ids AS (
    SELECT mcq_id FROM source_a_pool
    UNION
    SELECT mcq_id FROM source_b_pool
  ),

  past_seen AS (
    SELECT unnest(question_ids) AS qid
    FROM   public.practice_exam_sessions
    WHERE  student_id = v_user_id
  ),

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

  ranked AS (
    SELECT
      cq.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(cq.topic_id, cq.chapter_id, cq.paper_id)
        ORDER BY     cq.has_seen ASC, random()
      ) AS rn
    FROM   candidate_questions cq
  ),

  final_ids AS (
    SELECT id FROM ranked
    ORDER  BY has_seen ASC, rn ASC
    LIMIT  v_limit
  )

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
      ORDER BY random()
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

GRANT EXECUTE ON FUNCTION public.start_practice_exam(
  uuid, uuid[], uuid[], uuid[], uuid[], int
) TO authenticated;
