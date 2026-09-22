# Calendar Snapshot Architecture

## Overview

The `/calendar` page now reads from a pre-computed static JSON snapshot instead of querying Supabase tables directly. This eliminates ~95% of database reads for the calendar page.

**How it works:**

1. A Supabase Edge Function (`generate-calendar-snapshot`) queries all calendar data, pre-resolves department info, and uploads it to Supabase Storage
2. Database triggers automatically invoke the Edge Function whenever relevant data changes
3. The client fetches the static JSON from Storage's public URL and uses a version-check mechanism for cache invalidation

## Manual Setup Instructions

### Step 1: Create the Storage Bucket

1. Go to **Supabase Dashboard → Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name:** `calendar-cache`
   - **Public:** ✅ (toggle on — the JSON must be publicly accessible)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** `application/json`
4. Click **"Create bucket"**

### Step 2: Enable the `pg_net` Extension

1. Go to **Supabase Dashboard → Database → Extensions**
2. Search for `pg_net`
3. Click **"Enable"** (if not already enabled)

> `pg_net` allows PostgreSQL triggers to make HTTP requests. It's required for the database triggers to call the Edge Function.

### Step 3: Configure the SQL Migration

1. Open `supabase/migrations/20260820000000_calendar_snapshot_triggers.sql`
2. Replace these two placeholders:

```sql
-- Replace with your project ref (e.g., "abcdefghij")
edge_function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-calendar-snapshot';

-- Replace with your service role key (found in Dashboard → Settings → API)
service_role_key := 'YOUR_SERVICE_ROLE_KEY';
```

> **Security note:** The service role key bypasses RLS. For production, consider storing it in [Supabase Vault](https://supabase.com/docs/guides/database/vault) and reading it from there (see the commented-out Option B in the migration file).

3. Run the migration via **SQL Editor** in the Supabase Dashboard:
   - Go to **SQL Editor**
   - Paste the migration contents
   - Click **"Run"**

### Step 4: Deploy the Edge Function

```bash
# Login to Supabase CLI (if not already)
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy generate-calendar-snapshot --no-verify-jwt
```

> The `--no-verify-jwt` flag is needed because the function is called by database triggers (which don't carry a JWT) and also accepts manual GET requests.

### Step 5: Generate the Initial Snapshot

After deploying, manually trigger the Edge Function to create the first snapshot:

**Option A: Via curl**

```bash
curl -X GET \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-calendar-snapshot" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Option B: Via Supabase Dashboard**

1. Go to **Edge Functions → generate-calendar-snapshot**
2. Click **"Invoke"**
3. Select method: `GET`
4. Click **"Send"**

**Option C: Via SQL (after triggers are set up)**

```sql
-- Insert and immediately delete a dummy row to fire the trigger
INSERT INTO exam_schedules (batch_id, exam_datetime, is_tentative, unit_id)
SELECT id, now(), false, (SELECT id FROM admission_units LIMIT 1)
FROM batches WHERE is_current = true LIMIT 1;

DELETE FROM exam_schedules
WHERE exam_datetime = now() AND is_tentative = false;
```

### Step 6: Verify

1. Check the Edge Function logs: **Edge Functions → generate-calendar-snapshot → Logs**
2. Verify the files exist: **Storage → calendar-cache** (should contain `calendar-data.json` and `version.json`)
3. Test the public URL: Visit `https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/calendar-cache/version.json` — it should return `{ "updatedAt": "..." }`
4. Open your app's `/calendar` page — it should load data from the static JSON

## Trigger Tables (14 total)

The following tables have `AFTER INSERT OR UPDATE OR DELETE` triggers that fire the Edge Function:

| #   | Table                      | Category                |
| --- | -------------------------- | ----------------------- |
| 1   | `exam_schedules`           | Exam schedules          |
| 2   | `result_details`           | Results                 |
| 3   | `result_units`             | Results (junction)      |
| 4   | `admit_card_details`       | Admit cards             |
| 5   | `admit_card_units`         | Admit cards (junction)  |
| 6   | `application_details`      | Applications            |
| 7   | `application_units`        | Applications (junction) |
| 8   | `admission_units`          | Info + all categories   |
| 9   | `universities`             | Info + all categories   |
| 10  | `clusters`                 | Info + all categories   |
| 11  | `groups`                   | Department resolution   |
| 12  | `batches`                  | Batch scoping           |
| 13  | `unit_marks_distributions` | Info tab marks          |
| 14  | `circulars`                | Info tab circulars      |

## Cache Invalidation Strategy

- **`calendar-data.json`**: Served with `Cache-Control: public, max-age=31536000` (1 year)
- **`version.json`**: Served with `Cache-Control: no-cache` (always fresh)
- **Client**: On mount, fetches `version.json`. If `updatedAt` differs from `localStorage`, refetches `calendar-data.json`
- **Database triggers**: Any change to the 14 tables fires the Edge Function, which regenerates both files

## Debouncing

The trigger function uses a 2-second debounce window (tracked in `calendar_snapshot_debounce` table). If multiple SQL statements fire within 2 seconds (e.g., bulk imports), only the first one triggers the Edge Function. The `FOR EACH STATEMENT` trigger timing also ensures a single multi-row INSERT fires only once.

## Troubleshooting

### "No active batch found"

Ensure the `batches` table has a row with `is_current = true` and `deleted_at IS NULL`.

### Snapshot is empty

Check Edge Function logs. Common causes:

- `SUPABASE_SERVICE_ROLE_KEY` is incorrect or missing
- Storage bucket `calendar-cache` doesn't exist or isn't public
- `pg_net` extension is not enabled

### Client shows stale data

- Open DevTools → Application → Local Storage → check `calendarSnapshotVersion`
- Delete the key and refresh to force a refetch
- Verify `version.json` is being uploaded: `curl https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/calendar-cache/version.json`

### Manually regenerating

Run the GET request from Step 5 anytime to force a fresh snapshot.
