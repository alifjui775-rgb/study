#!/usr/bin/env bash
# ─── Calendar Snapshot Diagnostic Script ──────────────────────────────────────
# Usage: ./calendar-diagnose.sh [search-term]
#
# search-term: optional string to filter rows (university name, unit slug, etc.)
#              If omitted, shows summary counts and the most recent exam.
#
# Prerequisites:
#   - psql (with DATABASE_URL set or passed via --db-url)
#   - curl, jq
#   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (or passed via flags)
#
# Example:
#   ./calendar-diagnose.sh "ঢাকা বিশ্ববিদ্যালয়"
#   ./calendar-diagnose.sh --search "DU" --db-url "postgresql://..." --project-ref nqhnnxgstarjiogjcbno
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Argument Parsing ────────────────────────────────────────────────────────

SEARCH_TERM=""
DB_URL=""
PROJECT_REF=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --search|-s)  SEARCH_TERM="$2"; shift 2 ;;
    --db-url|-d)  DB_URL="$2"; shift 2 ;;
    --project-ref|-p) PROJECT_REF="$2"; shift 2 ;;
    --supabase-url|-u) SUPABASE_URL="$2"; shift 2 ;;
    --anon-key|-k) SUPABASE_ANON_KEY="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [search-term] [--db-url URL] [--project-ref REF] [--supabase-url URL] [--anon-key KEY]"
      echo ""
      echo "Options:"
      echo "  search-term          String to filter rows (university name, unit slug, etc.)"
      echo "  --db-url, -d         PostgreSQL connection URL (or set DATABASE_URL)"
      echo "  --project-ref, -p    Supabase project ref (e.g., nqhnnxgstarjiogjcbno)"
      echo "  --supabase-url, -u   Supabase URL (or read from .env.local)"
      echo "  --anon-key, -k       Supabase anon key (or read from .env.local)"
      echo ""
      echo "Examples:"
      echo "  $0 \"ঢাকা বিশ্ববিদ্যালয়\""
      echo "  $0 --search DU"
      echo "  $0 -d postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres -p nqhnnxgstarjiogjcbno"
      exit 0
      ;;
    *)            SEARCH_TERM="$1"; shift ;;
  esac
done

# ─── Load .env.local if not all vars provided ────────────────────────────────

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  ENV_FILE=".env.local"
  if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value; do
      key=$(echo "$key" | xargs)
      value=$(echo "$value" | xargs | sed 's/^"//;s/"$//')
      case "$key" in
        VITE_SUPABASE_URL)      SUPABASE_URL="${SUPABASE_URL:-$value}" ;;
        VITE_SUPABASE_ANON_KEY) SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$value}" ;;
      esac
    done < <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
  fi
fi

if [[ -z "$DB_URL" ]]; then
  DB_URL="${DATABASE_URL:-}"
fi

if [[ -z "$PROJECT_REF" && -n "$SUPABASE_URL" ]]; then
  # Extract project ref from URL: https://xxx.supabase.co → xxx
  PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https?://([a-z0-9]+)\.supabase\.co.*|\1|')
fi

# ─── Validation ──────────────────────────────────────────────────────────────

if [[ -z "$SUPABASE_URL" ]]; then
  echo -e "${RED}ERROR: No Supabase URL. Pass --supabase-url or set VITE_SUPABASE_URL in .env.local${NC}"
  exit 1
fi

if [[ -z "$SUPABASE_ANON_KEY" ]]; then
  echo -e "${RED}ERROR: No anon key. Pass --anon-key or set VITE_SUPABASE_ANON_KEY in .env.local${NC}"
  exit 1
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo -e "${RED}ERROR: Could not determine project ref. Pass --project-ref explicitly.${NC}"
  exit 1
fi

STORAGE_BASE="${SUPABASE_URL}/storage/v1/object/public/calendar-cache"
VERSION_URL="${STORAGE_BASE}/version.json"
DATA_URL="${STORAGE_BASE}/calendar-data.json"

# ─── Header ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          Calendar Snapshot Diagnostic Report                 ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Project:${NC}       $PROJECT_REF"
echo -e "${CYAN}Supabase URL:${NC}  $SUPABASE_URL"
echo -e "${CYAN}Search term:${NC}   ${SEARCH_TERM:-<none — showing summary>}"
echo -e "${CYAN}Timestamp:${NC}     $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# ─── Helper ──────────────────────────────────────────────────────────────────

section() {
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

has_psql() {
  command -v psql &>/dev/null && [[ -n "$DB_URL" ]]
}

# ─── Step 1: Direct DB Query ────────────────────────────────────────────────

section "STEP 1: Direct Database Query"

if has_psql; then
  echo -e "${GREEN}✓${NC} psql available, querying database directly..."
  echo ""

  # 1a. Current batch
  echo -e "${CYAN}── Current Batch ──${NC}"
  psql "$DB_URL" -c "
    SELECT id, name, year, is_current
    FROM batches
    WHERE deleted_at IS NULL
    ORDER BY is_current DESC, year DESC
    LIMIT 3;
  " 2>/dev/null || echo -e "${RED}Query failed${NC}"
  echo ""

  # 1b. Exam schedules count
  echo -e "${CYAN}── Exam Schedules (current batch) ──${NC}"
  psql "$DB_URL" -c "
    SELECT COUNT(*) AS total,
           COUNT(CASE WHEN is_tentative THEN 1 END) AS tentative,
           MIN(exam_datetime) AS earliest,
           MAX(exam_datetime) AS latest
    FROM exam_schedules
    WHERE batch_id = (SELECT id FROM batches WHERE is_current = true AND deleted_at IS NULL LIMIT 1)
      AND deleted_at IS NULL;
  " 2>/dev/null || echo -e "${RED}Query failed${NC}"
  echo ""

  # 1c. Search for specific rows if search term provided
  if [[ -n "$SEARCH_TERM" ]]; then
    echo -e "${CYAN}── Searching DB for: \"${SEARCH_TERM}\" ──${NC}"
    psql "$DB_URL" -c "
      SELECT
        es.id,
        es.exam_datetime,
        es.is_tentative,
        es.unit_id,
        au.unit_slug,
        au.unit_name_bn,
        COALESCE(un.name_bn, cl.name_bn, '???') AS institution_name,
        COALESCE(un.slug, cl.slug, '???') AS institution_slug
      FROM exam_schedules es
      JOIN admission_units au ON au.id = es.unit_id
      LEFT JOIN universities un ON un.id = au.university_id
      LEFT JOIN clusters cl ON cl.id = au.cluster_id
      WHERE es.batch_id = (SELECT id FROM batches WHERE is_current = true AND deleted_at IS NULL LIMIT 1)
        AND es.deleted_at IS NULL
        AND (
          un.name_bn ILIKE '%${SEARCH_TERM}%'
          OR cl.name_bn ILIKE '%${SEARCH_TERM}%'
          OR au.unit_slug ILIKE '%${SEARCH_TERM}%'
          OR au.unit_name_bn ILIKE '%${SEARCH_TERM}%'
          OR un.short_name_bn ILIKE '%${SEARCH_TERM}%'
          OR cl.short_name_bn ILIKE '%${SEARCH_TERM}%'
        )
      ORDER BY es.exam_datetime ASC;
    " 2>/dev/null || echo -e "${RED}Query failed${NC}"
    echo ""

    # 1d. Results for the same search
    echo -e "${CYAN}── Results for: \"${SEARCH_TERM}\" ──${NC}"
    psql "$DB_URL" -c "
      SELECT
        rd.id,
        rd.result_datetime,
        rd.result_url,
        au.unit_slug,
        COALESCE(un.name_bn, cl.name_bn, '???') AS institution_name
      FROM result_details rd
      JOIN result_units ru ON ru.result_id = rd.id
      JOIN admission_units au ON au.id = ru.unit_id
      LEFT JOIN universities un ON un.id = au.university_id
      LEFT JOIN clusters cl ON cl.id = au.cluster_id
      WHERE rd.batch_id = (SELECT id FROM batches WHERE is_current = true AND deleted_at IS NULL LIMIT 1)
        AND (
          un.name_bn ILIKE '%${SEARCH_TERM}%'
          OR cl.name_bn ILIKE '%${SEARCH_TERM}%'
          OR au.unit_slug ILIKE '%${SEARCH_TERM}%'
        )
      ORDER BY rd.result_datetime DESC;
    " 2>/dev/null || echo -e "${RED}Query failed${NC}"
    echo ""

    # 1e. Applications for the same search
    echo -e "${CYAN}── Applications for: \"${SEARCH_TERM}\" ──${NC}"
    psql "$DB_URL" -c "
      SELECT
        ad.id,
        ad.start_datetime,
        ad.end_datetime,
        ad.fee,
        ad.apply_url,
        au.unit_slug,
        COALESCE(un.name_bn, cl.name_bn, '???') AS institution_name
      FROM application_details ad
      JOIN application_units au2 ON au2.application_id = ad.id
      JOIN admission_units au ON au.id = au2.unit_id
      LEFT JOIN universities un ON un.id = au.university_id
      LEFT JOIN clusters cl ON cl.id = au.cluster_id
      WHERE ad.batch_id = (SELECT id FROM batches WHERE is_current = true AND deleted_at IS NULL LIMIT 1)
        AND (
          un.name_bn ILIKE '%${SEARCH_TERM}%'
          OR cl.name_bn ILIKE '%${SEARCH_TERM}%'
          OR au.unit_slug ILIKE '%${SEARCH_TERM}%'
        )
      ORDER BY ad.end_datetime DESC;
    " 2>/dev/null || echo -e "${RED}Query failed${NC}"
  else
    echo -e "${YELLOW}No search term — showing 5 most recent exams:${NC}"
    psql "$DB_URL" -c "
      SELECT
        es.exam_datetime,
        es.is_tentative,
        au.unit_slug,
        COALESCE(un.name_bn, cl.name_bn, '???') AS institution_name
      FROM exam_schedules es
      JOIN admission_units au ON au.id = es.unit_id
      LEFT JOIN universities un ON un.id = au.university_id
      LEFT JOIN clusters cl ON cl.id = au.cluster_id
      WHERE es.batch_id = (SELECT id FROM batches WHERE is_current = true AND deleted_at IS NULL LIMIT 1)
        AND es.deleted_at IS NULL
      ORDER BY es.exam_datetime DESC
      LIMIT 5;
    " 2>/dev/null || echo -e "${RED}Query failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠ psql not available or DB_URL not set — skipping direct DB queries.${NC}"
  echo -e "  Set DATABASE_URL or pass --db-url to enable this step."
  echo -e "  Example: export DATABASE_URL='postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres'"
fi

# ─── Step 2: Fetch version.json ──────────────────────────────────────────────

section "STEP 2: Fetch version.json"

echo -e "${CYAN}URL:${NC} $VERSION_URL"
echo ""

# Fetch with cache-bust
VERSION_RESPONSE=$(curl -sS -w "\n%{http_code}" \
  -H "Cache-Control: no-cache, no-store, must-revalidate" \
  -H "Pragma: no-cache" \
  "${VERSION_URL}?nocache=$(date +%s)" 2>&1)

HTTP_CODE=$(echo "$VERSION_RESPONSE" | tail -1)
BODY=$(echo "$VERSION_RESPONSE" | head -n -1)

echo -e "${CYAN}HTTP Status:${NC}   $HTTP_CODE"
echo -e "${CYAN}Response Body:${NC}"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

# Extract updatedAt
UPDATED_AT=$(echo "$BODY" | jq -r '.updatedAt // empty' 2>/dev/null)

if [[ -z "$UPDATED_AT" ]]; then
  echo -e "${RED}✗ Could not extract 'updatedAt' from version.json${NC}"
  echo -e "  This means version.json is empty, malformed, or the fetch failed."
  echo ""
  VERSION_ENCODED=""
else
  echo -e "${GREEN}✓ updatedAt:${NC} $UPDATED_AT"
  # URL-encode for the data fetch
  VERSION_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$UPDATED_AT', safe=''))" 2>/dev/null \
    || echo "$UPDATED_AT" | sed 's/:/%3A/g; s/+/%2B/g')
fi

# ─── Step 3: Fetch calendar-data.json?v=<version> ────────────────────────────

section "STEP 3: Fetch calendar-data.json (versioned URL)"

if [[ -z "$VERSION_ENCODED" ]]; then
  echo -e "${YELLOW}⚠ No version available — fetching bare URL for comparison:${NC}"
  DATA_URL_FETCH="$DATA_URL"
else
  echo -e "${CYAN}Versioned URL:${NC} ${DATA_URL}?v=${VERSION_ENCODED}"
  DATA_URL_FETCH="${DATA_URL}?v=${VERSION_ENCODED}"
fi
echo ""

DATA_RESPONSE=$(curl -sS -w "\n%{http_code}" "$DATA_URL_FETCH" 2>&1)

HTTP_CODE=$(echo "$DATA_RESPONSE" | tail -1)
DATA_BODY=$(echo "$DATA_RESPONSE" | head -n -1)

echo -e "${CYAN}HTTP Status:${NC}   $HTTP_CODE"
echo ""

# Check if valid JSON
if echo "$DATA_BODY" | jq . >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Valid JSON response${NC}"
  echo ""

  # Summary counts
  echo -e "${CYAN}── Snapshot Summary ──${NC}"
  echo -e "  generatedAt:     $(echo "$DATA_BODY" | jq -r '.generatedAt')"
  echo -e "  batchId:         $(echo "$DATA_BODY" | jq -r '.batchId')"
  echo -e "  examSchedules:   $(echo "$DATA_BODY" | jq '.examSchedules | length') rows"
  echo -e "  results:         $(echo "$DATA_BODY" | jq '.results | length') rows"
  echo -e "  admitCards:      $(echo "$DATA_BODY" | jq '.admitCards | length') rows"
  echo -e "  applications:    $(echo "$DATA_BODY" | jq '.applications | length') rows"
  echo -e "  info:            $(echo "$DATA_BODY" | jq '.info | length') rows"
  echo ""

  # 3a. Search for specific rows in examSchedules
  if [[ -n "$SEARCH_TERM" ]]; then
    echo -e "${CYAN}── Searching examSchedules for: \"${SEARCH_TERM}\" ──${NC}"
    MATCHES=$(echo "$DATA_BODY" | jq --arg s "$SEARCH_TERM" '
      [.examSchedules[] |
        select(
          .institution_name_bn // "" | ascii_downcase | contains($s | ascii_downcase) or
          .unit_slug // "" | ascii_downcase | contains($s | ascii_downcase) or
          .institution_slug // "" | ascii_downcase | contains($s | ascii_downcase)
        )
      ]')
    MATCH_COUNT=$(echo "$MATCHES" | jq 'length')
    echo -e "  Found: ${GREEN}${MATCH_COUNT}${NC} match(es)"
    echo ""
    if [[ "$MATCH_COUNT" -gt 0 ]]; then
      echo "$MATCHES" | jq -r '.[] |
        "  ┌─────────────────────────────────────────────────────┐\n" +
        "  │ id:              \(.id)\n" +
        "  │ institution:     \(.institution_name_bn)\n" +
        "  │ slug:            \(.institution_slug)\n" +
        "  │ unit:            \(.unit_slug // "N/A") (\(.unit_name_bn))\n" +
        "  │ exam_datetime:   \(.exam_datetime)\n" +
        "  │ is_tentative:    \(.is_tentative)\n" +
        "  │ department:      \(.department)\n" +
        "  │ second_time:     \(.second_time)\n" +
        "  └─────────────────────────────────────────────────────┘"'
    fi
    echo ""

    # 3b. Search results
    echo -e "${CYAN}── Searching results for: \"${SEARCH_TERM}\" ──${NC}"
    echo "$DATA_BODY" | jq --arg s "$SEARCH_TERM" '
      [.results[] |
        select(
          .institution_name_bn // "" | ascii_downcase | contains($s | ascii_downcase) or
          .unit_slug // "" | ascii_downcase | contains($s | ascii_downcase)
        )
      ] | length as $count |
      "  Found: \($count) match(es)"'
    echo ""

    # 3c. Search applications
    echo -e "${CYAN}── Searching applications for: \"${SEARCH_TERM}\" ──${NC}"
    echo "$DATA_BODY" | jq --arg s "$SEARCH_TERM" '
      [.applications[] |
        select(
          .institution_name_bn // "" | ascii_downcase | contains($s | ascii_downcase) or
          .unit_slug // "" | ascii_downcase | contains($s | ascii_downcase)
        )
      ] | length as $count |
      "  Found: \($count) match(es)"'
    echo ""

    # 3d. Search info
    echo -e "${CYAN}── Searching info for: \"${SEARCH_TERM}\" ──${NC}"
    echo "$DATA_BODY" | jq --arg s "$SEARCH_TERM" '
      [.info[] |
        select(
          .institution_name_bn // "" | ascii_downcase | contains($s | ascii_downcase) or
          .unit_slug // "" | ascii_downcase | contains($s | ascii_downcase)
        )
      ] | length as $count |
      "  Found: \($count) match(es)"'
    echo ""

    # 3e. Show the raw JSON for matched exam schedules (for comparison with DB)
    echo -e "${CYAN}── Raw JSON for matched exam schedules ──${NC}"
    echo "$DATA_BODY" | jq --arg s "$SEARCH_TERM" '
      [.examSchedules[] |
        select(
          .institution_name_bn // "" | ascii_downcase | contains($s | ascii_downcase) or
          .unit_slug // "" | ascii_downcase | contains($s | ascii_downcase)
        )
      ]'
  else
    # No search term — show the most recent 3 exams
    echo -e "${CYAN}── 3 Most Recent Exam Schedules in Snapshot ──${NC}"
    echo "$DATA_BODY" | jq '.examSchedules[-3:] | .[] |
      "  \(.exam_datetime) | \(.institution_name_bn) | \(.unit_slug) | tentative=\(.is_tentative)"'
  fi
else
  echo -e "${RED}✗ Invalid JSON response. Raw body:${NC}"
  echo "$DATA_BODY" | head -c 2000
fi

# ─── Step 4: Comparison Summary ──────────────────────────────────────────────

section "STEP 4: Quick Comparison Checklist"

echo -e "  ${BOLD}Compare the outputs above:${NC}"
echo ""
echo -e "  ${CYAN}□ DB row exists but NOT in snapshot?${NC}"
echo -e "    → Edge Function query missed it, or filter excluded it."
echo -e "    → Check: is the row in the current batch? (batch_id matches?)"
echo ""
echo -e "  ${CYAN}□ DB row has different data than snapshot?${NC}"
echo -e "    → Edge Function may have stale join logic."
echo -e "    → Check: is the row in the snapshot but with old values?"
echo ""
echo -e "  ${CYAN}□ Snapshot is correct but client shows wrong data?${NC}"
echo -e "    → Client-side filtering issue (isRowVisible, department resolution)."
echo -e "    → Check: browser DevTools → Network → which URL was actually fetched?"
echo -e "    → Check: does the fetched URL include ?v=<version> or is it bare?"
echo ""
echo -e "  ${CYAN}□ version.json is stale (old updatedAt)?${NC}"
echo -e "    → Edge Function hasn't run since the last data change."
echo -e "    → Check: did the pg_net trigger fire? (Supabase Dashboard → Edge Functions → Logs)"
echo ""
echo -e "  ${CYAN}□ version.json changed but calendar-data.json is old?${NC}"
echo -e "    → CDN/browser caching issue."
echo -e "    → Check: is the request URL using ?v=<version> or bare?"
echo -e "    → Check: manually curl the versioned URL to bypass cache."
echo ""

echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Diagnostic complete. Paste this output to diagnose the issue.${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
