-- ============================================================
-- Enable Row Level Security on practice_exam_sessions
--
-- Problem:  auth.uid() is always NULL under our custom SSO.
--           Without RLS, any client can read/write all rows
--           via the PostgREST API.
--
-- Solution: Use current_setting('request.headers') to read
--           the x-user-id header injected by our Supabase
--           fetch wrapper (src/lib/supabase.ts).  PostgREST
--           makes HTTP request headers available as a JSON
--           string in this GUC.
-- ============================================================

ALTER TABLE public.practice_exam_sessions ENABLE ROW LEVEL SECURITY;

-- ── Helper: extract SSO user id from the request header ─────
-- Returns NULL when the header is absent (e.g. server-side
-- calls or misconfigured requests), which causes every
-- policy to evaluate to FALSE → safe default.

-- ── SELECT: users can only read their own sessions ──────────
DROP POLICY IF EXISTS practice_sessions_select_own ON public.practice_exam_sessions;
CREATE POLICY practice_sessions_select_own
  ON public.practice_exam_sessions
  FOR SELECT
  USING (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  );

-- ── INSERT: users can only create sessions for themselves ───
DROP POLICY IF EXISTS practice_sessions_insert_own ON public.practice_exam_sessions;
CREATE POLICY practice_sessions_insert_own
  ON public.practice_exam_sessions
  FOR INSERT
  WITH CHECK (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  );

-- ── UPDATE: users can only update their own sessions ────────
DROP POLICY IF EXISTS practice_sessions_update_own ON public.practice_exam_sessions;
CREATE POLICY practice_sessions_update_own
  ON public.practice_exam_sessions
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

-- ── DELETE: users can only delete their own sessions ────────
DROP POLICY IF EXISTS practice_sessions_delete_own ON public.practice_exam_sessions;
CREATE POLICY practice_sessions_delete_own
  ON public.practice_exam_sessions
  FOR DELETE
  USING (
    student_id::text = (
      current_setting('request.headers', true)::json ->> 'x-user-id'
    )
  );
