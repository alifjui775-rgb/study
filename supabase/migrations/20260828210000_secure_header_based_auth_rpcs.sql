-- ============================================================
-- Migration: Secure Header-Based Auth for Practice Exam RPCs
-- Remove p_student_id parameter & derive caller from x-user-id header
-- ============================================================

-- 1) Drop old RPC function signatures
DROP FUNCTION IF EXISTS public.start_practice_exam(uuid, uuid[], uuid[], uuid[], uuid[], int, int, numeric);
DROP FUNCTION IF EXISTS public.start_practice_exam(uuid, uuid[], uuid[], uuid[], uuid[], int);
DROP FUNCTION IF EXISTS public.submit_practice_exam(uuid, uuid, jsonb);


-- 2) Re-create start_practice_exam RPC (No p_student_id parameter)
CREATE OR REPLACE FUNCTION public.start_practice_exam(
  p_topic_ids      uuid[]  DEFAULT '{}',
  p_chapter_ids    uuid[]  DEFAULT '{}',
  p_paper_ids      uuid[]  DEFAULT '{}',
  p_standard_ids   uuid[]  DEFAULT NULL,
  p_limit          int     DEFAULT 25,
  p_time_minutes   int     DEFAULT 30,
  p_negative_mark  numeric DEFAULT 0.25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id             uuid;
  v_header_user_id      text;
  v_limit               int := LEAST(GREATEST(p_limit, 1), 200);
  v_result              jsonb;
  v_final_question_ids  uuid[];
  v_exam_name           text;
  v_practice_exam_id    uuid;
  v_session_id          uuid;
  v_total_questions     int;
BEGIN
  -- ── Auth guard: derive user_id strictly from x-user-id request header ──
  BEGIN
    v_header_user_id := current_setting('request.headers', true)::json ->> 'x-user-id';
  EXCEPTION WHEN OTHERS THEN
    v_header_user_id := NULL;
  END;

  IF v_header_user_id IS NULL OR v_header_user_id = '' THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: missing or invalid x-user-id request header';
  END IF;

  BEGIN
    v_user_id := v_header_user_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: x-user-id header must be a valid UUID';
  END;

  SELECT id INTO v_user_id
  FROM   public.study_user
  WHERE  id = v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: student not found in study_user';
  END IF;

  -- ── Validate at least one selection ────────────────────────
  IF array_length(p_topic_ids,   1) IS NULL
     AND array_length(p_chapter_ids, 1) IS NULL
     AND array_length(p_paper_ids,   1) IS NULL
  THEN
    RAISE EXCEPTION 'NO_SELECTION: provide at least one topic, chapter, or paper id';
  END IF;

  CREATE TEMP TABLE temp_candidate_questions ON COMMIT DROP AS
  WITH recent_batches AS (
    SELECT id
    FROM   public.batches
    WHERE  deleted_at IS NULL
    ORDER  BY year DESC, id DESC
    LIMIT  3
  ),

  -- ── Source A: Public QB ──
  source_a_pool AS (
    SELECT DISTINCT qm.id AS mcq_id
    FROM   public.questions_mcq qm
    JOIN   public.qb_files qb
           ON qb.id = qm.file_id
          AND qb.deleted_at IS NULL
    WHERE  qm.deleted_at IS NULL
      AND (
             qm.topic_id = ANY(p_topic_ids)
          OR qm.chapter_id = ANY(p_chapter_ids)
          OR qm.topic_id IN (
               SELECT id FROM public.chapter_topics
               WHERE  chapter_id = ANY(p_chapter_ids)
             )
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

  -- ── Source B: Enrolled Courses ──
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
             qm.topic_id = ANY(p_topic_ids)
          OR qm.chapter_id = ANY(p_chapter_ids)
          OR qm.topic_id IN (
               SELECT id FROM public.chapter_topics
               WHERE  chapter_id = ANY(p_chapter_ids)
             )
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
  )
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
  WHERE  qm.deleted_at IS NULL;

  WITH ranked AS (
    SELECT
      cq.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(cq.topic_id, cq.chapter_id, cq.paper_id)
        ORDER BY     cq.has_seen ASC, random()
      ) AS rn
    FROM   temp_candidate_questions cq
  ),
  final_ids AS (
    SELECT id FROM ranked
    ORDER  BY has_seen ASC, rn ASC
    LIMIT  v_limit
  )
  SELECT array_agg(id) INTO v_final_question_ids FROM final_ids;

  IF v_final_question_ids IS NULL OR array_length(v_final_question_ids, 1) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  v_total_questions := array_length(v_final_question_ids, 1);

  -- ── Auto-generate formatted exam name ──────────────────────
  WITH subject_names AS (
    SELECT DISTINCT coalesce(cp.name_bn, cp.name_en) AS sname
    FROM public.curriculum_papers cp
    WHERE cp.id = ANY(p_paper_ids)
    UNION
    SELECT DISTINCT coalesce(cp.name_bn, cp.name_en) AS sname
    FROM public.paper_chapters pc
    JOIN public.curriculum_papers cp ON cp.id = pc.paper_id
    WHERE pc.id = ANY(p_chapter_ids)
    UNION
    SELECT DISTINCT coalesce(cp.name_bn, cp.name_en) AS sname
    FROM public.chapter_topics ct
    JOIN public.paper_chapters pc ON pc.id = ct.chapter_id
    JOIN public.curriculum_papers cp ON cp.id = pc.paper_id
    WHERE ct.id = ANY(p_topic_ids)
  ),
  s_list AS (
    SELECT sname, row_number() OVER (ORDER BY sname) AS rn, count(*) OVER () AS total_cnt
    FROM subject_names
  ),
  formatted AS (
    SELECT
      CASE
        WHEN total_cnt = 1 THEN sname || ' প্র্যাকটিস পরীক্ষা'
        WHEN rn = total_cnt THEN 'এবং ' || sname || ' প্র্যাকটিস পরীক্ষা'
        WHEN rn = total_cnt - 1 THEN sname || ' '
        ELSE sname || ', '
      END AS piece,
      rn
    FROM s_list
  )
  SELECT coalesce(string_agg(piece, '' ORDER BY rn), 'প্র্যাকটিস পরীক্ষা')
  INTO v_exam_name
  FROM formatted;

  -- ── Create student_practice_exams record ────────────────────
  INSERT INTO public.student_practice_exams (
    name,
    student_id,
    status,
    total_questions,
    time_minutes,
    negative_mark,
    started_at
  ) VALUES (
    v_exam_name,
    v_user_id,
    'ongoing',
    v_total_questions,
    p_time_minutes,
    p_negative_mark,
    now()
  )
  RETURNING id INTO v_practice_exam_id;

  -- ── Create practice_exam_sessions record ────────────────────
  INSERT INTO public.practice_exam_sessions (
    student_id,
    question_ids,
    duration_minutes,
    negative_marks,
    practice_exam_id
  ) VALUES (
    v_user_id,
    v_final_question_ids,
    p_time_minutes,
    p_negative_mark,
    v_practice_exam_id
  )
  RETURNING id INTO v_session_id;

  -- ── Build questions JSON result with embedded session_id & practice_exam_id ──
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
        'options',          opts.opts,
        'session_id',       v_session_id,
        'practice_exam_id', v_practice_exam_id
      )
      ORDER BY random()
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM   unnest(v_final_question_ids) WITH ORDINALITY AS fi(id, ord)
  JOIN   temp_candidate_questions cq ON cq.id = fi.id
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


-- 3) Re-create submit_practice_exam RPC (No p_student_id parameter)
CREATE OR REPLACE FUNCTION public.submit_practice_exam(
  p_practice_exam_id uuid,
  p_answers          jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_header_user_id text;
  v_exam           record;
  v_correct        int := 0;
  v_wrong          int := 0;
  v_unattempted    int := 0;
  v_total          int := 0;
  v_score          numeric := 0;
  v_neg_mark       numeric := 0.25;
  v_mcq_id         uuid;
  v_submitted_opts uuid[];
  v_correct_opts   uuid[];
  v_is_correct     boolean;
  v_marks          numeric;
  v_session_q_ids  uuid[];
  v_rec            record;
BEGIN
  -- ── Auth guard: derive user_id strictly from x-user-id request header ──
  BEGIN
    v_header_user_id := current_setting('request.headers', true)::json ->> 'x-user-id';
  EXCEPTION WHEN OTHERS THEN
    v_header_user_id := NULL;
  END;

  IF v_header_user_id IS NULL OR v_header_user_id = '' THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: missing or invalid x-user-id request header';
  END IF;

  BEGIN
    v_user_id := v_header_user_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: x-user-id header must be a valid UUID';
  END;

  SELECT id INTO v_user_id
  FROM public.study_user
  WHERE id = v_user_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: student not found in study_user';
  END IF;

  -- ── Fetch Practice Exam Record (Must belong to caller v_user_id) ──
  SELECT * INTO v_exam
  FROM public.student_practice_exams
  WHERE id = p_practice_exam_id
    AND student_id = v_user_id;

  IF v_exam.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: practice exam not found or access denied';
  END IF;

  -- ── Idempotency Check: if already completed, return existing results ──
  IF v_exam.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status',           v_exam.status,
      'score',            v_exam.score,
      'correct_answers',  v_exam.correct_answers,
      'wrong_answers',    v_exam.wrong_answers,
      'unattempted',      v_exam.unattempted,
      'total_questions',  v_total,
      'submitted_at',     v_exam.submitted_at,
      'already_completed', true
    );
  END IF;

  v_neg_mark := coalesce(v_exam.negative_mark, 0.25);
  v_total    := v_exam.total_questions;

  -- Get original question_ids from practice_exam_sessions
  SELECT question_ids INTO v_session_q_ids
  FROM public.practice_exam_sessions
  WHERE practice_exam_id = p_practice_exam_id
    AND student_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Evaluate each question in the exam
  FOR v_rec IN
    SELECT qm.id AS mcq_id
    FROM public.questions_mcq qm
    WHERE qm.id = ANY(v_session_q_ids)
      AND qm.deleted_at IS NULL
  LOOP
    v_mcq_id := v_rec.mcq_id;

    -- Extract submitted options for this mcq_id from p_answers as uuid[]
    IF jsonb_typeof(p_answers) = 'object' AND p_answers ? v_mcq_id::text THEN
      SELECT ARRAY(
        SELECT (jsonb_array_elements_text(p_answers -> v_mcq_id::text))::uuid
      )
      INTO v_submitted_opts;
    ELSE
      v_submitted_opts := '{}';
    END IF;

    -- Get correct options from question_options table as uuid[]
    SELECT ARRAY(
      SELECT id
      FROM public.question_options
      WHERE question_id = v_mcq_id
        AND is_correct = true
        AND deleted_at IS NULL
      ORDER BY option_order
    ) INTO v_correct_opts;

    IF array_length(v_submitted_opts, 1) IS NULL OR array_length(v_submitted_opts, 1) = 0 THEN
      -- Unanswered question
      v_unattempted := v_unattempted + 1;
      v_is_correct := NULL;
      v_marks := 0;

      INSERT INTO public.student_exam_answers (
        practice_exam_id,
        student_id,
        mcq_id,
        selected_options,
        is_correct,
        marks_obtained
      ) VALUES (
        p_practice_exam_id,
        v_user_id,
        v_mcq_id,
        NULL,
        NULL,
        0
      )
      ON CONFLICT (practice_exam_id, mcq_id) WHERE practice_exam_id IS NOT NULL
      DO UPDATE SET
        selected_options = EXCLUDED.selected_options,
        is_correct = EXCLUDED.is_correct,
        marks_obtained = EXCLUDED.marks_obtained;

    ELSE
      -- Answered question: compare submitted_opts with correct_opts
      IF (SELECT ARRAY(SELECT unnest(v_submitted_opts) ORDER BY 1)) =
         (SELECT ARRAY(SELECT unnest(v_correct_opts) ORDER BY 1))
      THEN
        v_correct := v_correct + 1;
        v_is_correct := true;
        v_marks := 1.0;
      ELSE
        v_wrong := v_wrong + 1;
        v_is_correct := false;
        v_marks := -v_neg_mark;
      END IF;

      v_score := v_score + v_marks;

      INSERT INTO public.student_exam_answers (
        practice_exam_id,
        student_id,
        mcq_id,
        selected_options,
        is_correct,
        marks_obtained
      ) VALUES (
        p_practice_exam_id,
        v_user_id,
        v_mcq_id,
        v_submitted_opts,
        v_is_correct,
        v_marks
      )
      ON CONFLICT (practice_exam_id, mcq_id) WHERE practice_exam_id IS NOT NULL
      DO UPDATE SET
        selected_options = EXCLUDED.selected_options,
        is_correct = EXCLUDED.is_correct,
        marks_obtained = EXCLUDED.marks_obtained;

    END IF;
  END LOOP;

  -- ── Update student_practice_exams record ───────────────────────
  UPDATE public.student_practice_exams
  SET status          = 'completed',
      score           = v_score,
      correct_answers = v_correct,
      wrong_answers   = v_wrong,
      unattempted     = v_unattempted,
      submitted_at    = now()
  WHERE id = p_practice_exam_id
    AND student_id = v_user_id;

  RETURN jsonb_build_object(
    'status',           'completed',
    'score',            v_score,
    'correct_answers',  v_correct,
    'wrong_answers',    v_wrong,
    'unattempted',      v_unattempted,
    'total_questions',  v_total,
    'submitted_at',     now(),
    'already_completed', false
  );
END;
$$;


-- 4) Grant EXECUTE to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.start_practice_exam(
  uuid[], uuid[], uuid[], uuid[], int, int, numeric
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_practice_exam(
  uuid, jsonb
) TO anon, authenticated;
