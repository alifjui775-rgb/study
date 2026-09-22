-- Allow multiple exam dates per unit per batch
-- Old constraint: UNIQUE(batch_id, unit_id) — only one row per unit
-- New constraint: UNIQUE(batch_id, unit_id, exam_datetime) — multiple dates, no exact duplicates

ALTER TABLE public.exam_schedules
  DROP CONSTRAINT IF EXISTS exam_schedules_batch_id_unit_id_key;

ALTER TABLE public.exam_schedules
  ADD CONSTRAINT exam_schedules_batch_id_unit_id_exam_datetime_key
  UNIQUE (batch_id, unit_id, exam_datetime);
