-- ============================================================
-- Fix: Update submit_practice_exam RPC types (uuid[])
-- ============================================================

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
