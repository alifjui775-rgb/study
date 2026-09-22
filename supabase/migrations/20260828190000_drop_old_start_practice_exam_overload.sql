-- ============================================================
-- Migration: Drop old overloaded 6-parameter start_practice_exam
-- ============================================================

DROP FUNCTION IF EXISTS public.start_practice_exam(uuid, uuid[], uuid[], uuid[], uuid[], int);
