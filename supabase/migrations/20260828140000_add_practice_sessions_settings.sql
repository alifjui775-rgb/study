-- ============================================================
-- Migration: Add duration_minutes & negative_marks to practice_exam_sessions
-- ============================================================

ALTER TABLE public.practice_exam_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS negative_marks numeric DEFAULT 0.25;
