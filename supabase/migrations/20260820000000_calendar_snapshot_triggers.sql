-- ============================================================================
-- Calendar Snapshot Triggers Migration
-- ============================================================================
-- This migration:
--   1. Enables the pg_net extension for HTTP requests from triggers
--   2. Creates a debounce table to prevent redundant Edge Function calls
--   3. Creates a trigger function that calls the Edge Function via HTTP POST
--   4. Attaches the trigger to all 14 tables that feed the calendar snapshot
--
-- IMPORTANT: Before running this migration:
--   - Replace 'YOUR_PROJECT_REF' with your actual Supabase project ref
--   - Replace 'YOUR_SERVICE_ROLE_KEY' with your service role key
--     (or store it in vault and reference it below)
-- ============================================================================

-- Step 1: Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Debounce table — prevents redundant calls during bulk operations
CREATE TABLE IF NOT EXISTS public.calendar_snapshot_debounce (
  id          int primary key default 1,  -- single-row table
  last_fire   timestamptz not null default '1970-01-01'::timestamptz
);

INSERT INTO public.calendar_snapshot_debounce (id, last_fire)
VALUES (1, '1970-01-01'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_calendar_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
  payload jsonb;
  debounce_interval constant interval := '2 seconds';
  last_fire_time timestamptz;
BEGIN
  -- ──── CONFIGURATION ──────────────────────────────────────────────────
  -- Option A: Hardcode here (less secure, simpler)
  edge_function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-calendar-snapshot';
  service_role_key := 'YOUR_SERVICE_ROLE_KEY';

  -- Option B: Read from vault (more secure — set up secrets via Supabase Dashboard)
  -- edge_function_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'calendar_snapshot_edge_url' LIMIT 1);
  -- service_role_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1);
  -- ─────────────────────────────────────────────────────────────────────

  -- Debounce: skip if triggered within the last 2 seconds
  SELECT last_fire INTO last_fire_time
  FROM public.calendar_snapshot_debounce
  WHERE id = 1;

  IF now() - last_fire_time < debounce_interval THEN
    RAISE NOTICE 'Calendar snapshot trigger debounced (last fire: %) — skipping', last_fire_time;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update the debounce timestamp
  UPDATE public.calendar_snapshot_debounce
  SET last_fire = now()
  WHERE id = 1;

  -- Build the HTTP request payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'timestamp', now()::text
  );

  -- Fire the HTTP POST via pg_net (non-blocking, runs in background)
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload::jsonb
  );

  RAISE NOTICE 'Calendar snapshot triggered by %.% (%)', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Step 4: Attach triggers to all 14 tables
-- Using FOR EACH STATEMENT (fires once per SQL statement, not per row)
-- ============================================================================

DROP TRIGGER IF EXISTS calendar_snapshot_on_exam_schedules ON public.exam_schedules;
CREATE TRIGGER calendar_snapshot_on_exam_schedules
  AFTER INSERT OR UPDATE OR DELETE ON public.exam_schedules
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_result_details ON public.result_details;
CREATE TRIGGER calendar_snapshot_on_result_details
  AFTER INSERT OR UPDATE OR DELETE ON public.result_details
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_result_units ON public.result_units;
CREATE TRIGGER calendar_snapshot_on_result_units
  AFTER INSERT OR UPDATE OR DELETE ON public.result_units
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_admit_card_details ON public.admit_card_details;
CREATE TRIGGER calendar_snapshot_on_admit_card_details
  AFTER INSERT OR UPDATE OR DELETE ON public.admit_card_details
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_admit_card_units ON public.admit_card_units;
CREATE TRIGGER calendar_snapshot_on_admit_card_units
  AFTER INSERT OR UPDATE OR DELETE ON public.admit_card_units
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_application_details ON public.application_details;
CREATE TRIGGER calendar_snapshot_on_application_details
  AFTER INSERT OR UPDATE OR DELETE ON public.application_details
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_application_units ON public.application_units;
CREATE TRIGGER calendar_snapshot_on_application_units
  AFTER INSERT OR UPDATE OR DELETE ON public.application_units
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_admission_units ON public.admission_units;
CREATE TRIGGER calendar_snapshot_on_admission_units
  AFTER INSERT OR UPDATE OR DELETE ON public.admission_units
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_universities ON public.universities;
CREATE TRIGGER calendar_snapshot_on_universities
  AFTER INSERT OR UPDATE OR DELETE ON public.universities
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_clusters ON public.clusters;
CREATE TRIGGER calendar_snapshot_on_clusters
  AFTER INSERT OR UPDATE OR DELETE ON public.clusters
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_groups ON public.groups;
CREATE TRIGGER calendar_snapshot_on_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.groups
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_batches ON public.batches;
CREATE TRIGGER calendar_snapshot_on_batches
  AFTER INSERT OR UPDATE OR DELETE ON public.batches
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_unit_marks_distributions ON public.unit_marks_distributions;
CREATE TRIGGER calendar_snapshot_on_unit_marks_distributions
  AFTER INSERT OR UPDATE OR DELETE ON public.unit_marks_distributions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

DROP TRIGGER IF EXISTS calendar_snapshot_on_circulars ON public.circulars;
CREATE TRIGGER calendar_snapshot_on_circulars
  AFTER INSERT OR UPDATE OR DELETE ON public.circulars
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_calendar_snapshot();

-- ============================================================================
-- Rollback reference (if needed):
--   DROP TRIGGER IF EXISTS calendar_snapshot_on_* ON public.*;
--   DROP FUNCTION IF EXISTS public.trigger_calendar_snapshot();
--   DROP TABLE IF EXISTS public.calendar_snapshot_debounce;
-- ============================================================================
