-- Combined Migration Script
-- Run this on Supabase SQL Editor

-- 1. Add cluster_id and college_id to event tables
ALTER TABLE public.circulars ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
ALTER TABLE public.circulars ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_circulars_cluster_id ON public.circulars(cluster_id);
CREATE INDEX IF NOT EXISTS idx_circulars_college_id ON public.circulars(college_id);

ALTER TABLE public.application_details ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
ALTER TABLE public.application_details ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_application_details_cluster_id ON public.application_details(cluster_id);
CREATE INDEX IF NOT EXISTS idx_application_details_college_id ON public.application_details(college_id);

ALTER TABLE public.admit_card_details ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
ALTER TABLE public.admit_card_details ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_admit_card_details_cluster_id ON public.admit_card_details(cluster_id);
CREATE INDEX IF NOT EXISTS idx_admit_card_details_college_id ON public.admit_card_details(college_id);

ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_exam_schedules_cluster_id ON public.exam_schedules(cluster_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_college_id ON public.exam_schedules(college_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'result_details') THEN
    ALTER TABLE public.result_details ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
    ALTER TABLE public.result_details ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_result_details_cluster_id ON public.result_details(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_result_details_college_id ON public.result_details(college_id);
  END IF;
END $$;


-- 2. Make university_id nullable in event tables (exclusive arc)
ALTER TABLE public.application_details ALTER COLUMN university_id DROP NOT NULL;
ALTER TABLE public.admit_card_details ALTER COLUMN university_id DROP NOT NULL;
ALTER TABLE public.circulars ALTER COLUMN university_id DROP NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'result_details' AND column_name = 'university_id') THEN
    ALTER TABLE public.result_details ALTER COLUMN university_id DROP NOT NULL;
  END IF;
END $$;


-- 3. Add calculator fields to admission_units for per-unit calculator policy
ALTER TABLE public.admission_units
  ADD COLUMN IF NOT EXISTS calculator_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS calculator_link text DEFAULT null;
