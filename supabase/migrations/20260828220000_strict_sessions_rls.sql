-- ============================================================
-- Migration: Revoke Direct Client Write Policies on practice_exam_sessions
-- ============================================================

-- Drop client write policies (all writes MUST go through start_practice_exam SECURITY DEFINER RPC)
DROP POLICY IF EXISTS practice_sessions_insert_own ON public.practice_exam_sessions;
DROP POLICY IF EXISTS practice_sessions_update_own ON public.practice_exam_sessions;
DROP POLICY IF EXISTS practice_sessions_delete_own ON public.practice_exam_sessions;
