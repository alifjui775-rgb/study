-- ============================================================
-- Migration: Practice Exam Results Persistence & Schema Setup
-- ============================================================

-- 1) Create student_practice_exams table
CREATE TABLE IF NOT EXISTS public.student_practice_exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ongoing'::text,

  score numeric NULL,
  correct_answers integer NULL DEFAULT 0,
  wrong_answers integer NULL DEFAULT 0,
  unattempted integer NULL DEFAULT 0,
  total_questions integer NOT NULL,

  started_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone NULL,
  time_minutes integer NULL,
  negative_mark numeric NULL,

  CONSTRAINT student_practice_exams_pkey PRIMARY KEY (id),
  CONSTRAINT student_practice_exams_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.study_user (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_practice_exams_student_id
  ON public.student_practice_exams USING btree (student_id);

CREATE INDEX IF NOT EXISTS idx_student_practice_exams_student_submitted
  ON public.student_practice_exams USING btree (student_id, submitted_at);


-- 2) Update student_exam_answers table for practice exam support
ALTER TABLE public.student_exam_answers
  ALTER COLUMN student_exam_id DROP NOT NULL;

ALTER TABLE public.student_exam_answers
  ADD COLUMN IF NOT EXISTS practice_exam_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_exam_answers_practice_exam_id_fkey'
  ) THEN
    ALTER TABLE public.student_exam_answers
      ADD CONSTRAINT student_exam_answers_practice_exam_id_fkey
      FOREIGN KEY (practice_exam_id) REFERENCES public.student_practice_exams (id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_exam_answers_check_single_parent'
  ) THEN
    ALTER TABLE public.student_exam_answers
      ADD CONSTRAINT student_exam_answers_check_single_parent
      CHECK (num_nonnulls(student_exam_id, practice_exam_id) = 1);
  END IF;
END $$;

-- Drop old unique constraint if present
ALTER TABLE public.student_exam_answers
  DROP CONSTRAINT IF EXISTS unique_mcq_answer;

CREATE UNIQUE INDEX IF NOT EXISTS unique_mcq_answer_course_exam
  ON public.student_exam_answers (student_exam_id, mcq_id)
  WHERE student_exam_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_mcq_answer_practice_exam
  ON public.student_exam_answers (practice_exam_id, mcq_id)
  WHERE practice_exam_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sea_practice_exam_id
  ON public.student_exam_answers USING btree (practice_exam_id)
  WHERE (practice_exam_id IS NOT NULL);


-- 3) Add practice_exam_id to practice_exam_sessions table
ALTER TABLE public.practice_exam_sessions
  ADD COLUMN IF NOT EXISTS practice_exam_id uuid NULL REFERENCES public.student_practice_exams(id) ON DELETE CASCADE;


-- 4) RLS Policies for student_practice_exams and student_exam_answers
ALTER TABLE public.student_practice_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_practice_exams_select_own ON public.student_practice_exams;
CREATE POLICY student_practice_exams_select_own
  ON public.student_practice_exams
  FOR SELECT
  USING (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  );

DROP POLICY IF EXISTS student_practice_exams_insert_own ON public.student_practice_exams;
CREATE POLICY student_practice_exams_insert_own
  ON public.student_practice_exams
  FOR INSERT
  WITH CHECK (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  );

DROP POLICY IF EXISTS student_practice_exams_update_own ON public.student_practice_exams;
CREATE POLICY student_practice_exams_update_own
  ON public.student_practice_exams
  FOR UPDATE
  USING (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  )
  WITH CHECK (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  );


-- 5) RPC Function: submit_practice_exam (with uuid[] types for options)
CREATE OR REPLACE FUNCTION public.submit_practice_exam(
  p_student_id       uuid,
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
  -- ── Auth Guard ──────────────────────────────────────────────
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: student_id is required';
  END IF;

  SELECT id INTO v_user_id
  FROM public.study_user
  WHERE id = p_student_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: student not found';
  END IF;

  -- ── Fetch Practice Exam Record ──────────────────────────────
  SELECT * INTO v_exam
  FROM public.student_practice_exams
  WHERE id = p_practice_exam_id
    AND student_id = v_user_id;

  IF v_exam.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: practice exam not found';
  END IF;

  -- ── Idempotency Check: if already completed, return existing results ──
  IF v_exam.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status',           v_exam.status,
      'score',            v_exam.score,
      'correct_answers',  v_exam.correct_answers,
      'wrong_answers',    v_exam.wrong_answers,
      'unattempted',      v_exam.unattempted,
      'total_questions',  v_exam.total_questions,
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

GRANT EXECUTE ON FUNCTION public.submit_practice_exam(uuid, uuid, jsonb) TO authenticated;
