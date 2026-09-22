-- Migration: Add cluster_id and college_id to institution_exam_centers
-- Run this on Supabase SQL Editor

-- 1. Add cluster_id and college_id columns
ALTER TABLE public.institution_exam_centers ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
ALTER TABLE public.institution_exam_centers ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_institution_exam_centers_cluster_id ON public.institution_exam_centers(cluster_id);
CREATE INDEX IF NOT EXISTS idx_institution_exam_centers_college_id ON public.institution_exam_centers(college_id);

-- 2. Make university_id nullable (exclusive arc: university_id OR cluster_id OR college_id)
ALTER TABLE public.institution_exam_centers ALTER COLUMN university_id DROP NOT NULL;
