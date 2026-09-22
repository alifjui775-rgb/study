import { createClient } from "https://esm.sh/@supabase/supabase-js@2?bundle";

// ─── Config ──────────────────────────────────────────────────────────────────
const BUCKET = "calendar-cache";
const DATA_FILE = "calendar-data.json";
const VERSION_FILE = "version.json";

// ─── Helpers (replicated from src/lib/calendar-queries.ts) ────────────────────

function groupNameToDepartment(nameEn: string | null): string {
  if (!nameEn) return "mixed";
  const lower = nameEn.toLowerCase();
  if (lower.includes("science") || lower.includes("বিজ্ঞান")) return "science";
  if (lower.includes("arts") || lower.includes("humanities") || lower.includes("মানবিক"))
    return "arts";
  if (
    lower.includes("commerce") ||
    lower.includes("business") ||
    lower.includes("bbs") ||
    lower.includes("bba") ||
    lower.includes("ব্যবসা") ||
    lower.includes("বাণিজ্য") ||
    lower.includes("ব্যবসায়")
  )
    return "commerce";
  return "mixed";
}

function resolveAllowedDepartments(
  allowedGroupIds: string[] | null | undefined,
  deptMap: Map<string, string>,
): string[] {
  if (!allowedGroupIds || allowedGroupIds.length === 0) return [];
  const depts = new Set<string>();
  for (const gid of allowedGroupIds) {
    const dept = deptMap.get(gid);
    if (dept) depts.add(dept);
  }
  return Array.from(depts);
}

type InstitutionRef = {
  name_bn: string | null;
  short_name_bn: string | null;
  slug: string | null;
  second_time: boolean | null;
  second_time_condition: string | null;
  negative_mark: number | null;
  calculator_allowed: boolean | null;
  calculator_link: string | null;
};

type UnitWithJoins = {
  id: string;
  unit_slug: string;
  unit_name_bn: string;
  allowed_group_ids: string[] | null;
  group: { name_en: string }[] | { name_en: string } | null;
  universities: InstitutionRef[] | InstitutionRef | null;
  clusters: InstitutionRef[] | InstitutionRef | null;
};

function resolveInstitution(unit: UnitWithJoins | null | undefined) {
  if (!unit) {
    return {
      institution_name_bn: "অজানা প্রতিষ্ঠান",
      institution_slug: "",
      institution_type: "university" as const,
      show_unit_slug: true,
      second_time: false,
    };
  }
  const uni = Array.isArray(unit.universities) ? unit.universities[0] : unit.universities;
  const cluster = Array.isArray(unit.clusters) ? unit.clusters[0] : unit.clusters;

  const institution = uni || cluster;
  const institution_type: "university" | "cluster" = uni ? "university" : "cluster";

  return {
    institution_name_bn: institution?.short_name_bn || institution?.name_bn || "অজানা প্রতিষ্ঠান",
    institution_slug: institution?.slug || "",
    institution_type,
    show_unit_slug:
      unit.unit_slug && institution?.slug
        ? unit.unit_slug.toLowerCase() !== institution.slug.toLowerCase()
        : true,
    second_time: Boolean(institution?.second_time),
  };
}

function resolveInfoInstitution(unit: {
  calculator_allowed: boolean | null;
  calculator_link: string | null;
  university: InstitutionRef[] | InstitutionRef | null;
  cluster: InstitutionRef[] | InstitutionRef | null;
}) {
  const uni = Array.isArray(unit.university) ? unit.university[0] : unit.university;
  const cluster = Array.isArray(unit.cluster) ? unit.cluster[0] : unit.cluster;

  const inst = uni || cluster;
  if (!inst) return null;

  const calcAllowed = unit.calculator_allowed ?? inst.calculator_allowed ?? false;
  const calcLink = unit.calculator_link ?? inst.calculator_link ?? null;

  return {
    name_bn: inst.short_name_bn,
    slug: inst.slug,
    type: (uni ? "university" : "cluster") as "university" | "cluster",
    second_time: inst.second_time ?? false,
    second_time_condition: inst.second_time_condition ?? null,
    negative_mark: inst.negative_mark ?? null,
    calculator_allowed: calcAllowed,
    calculator_link: calcLink,
  };
}

// ─── Batch Resolution ────────────────────────────────────────────────────────

async function fetchCurrentBatch(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<{ id: string; name: string; year: number; is_current: boolean } | null> {
  const { data, error } = await supabaseAdmin
    .from("batches")
    .select("*")
    .is("deleted_at", null)
    .eq("is_current", true)
    .limit(1);

  if (error) throw error;
  if (data && data.length > 0) return data[0];

  const { data: latestData, error: latestError } = await supabaseAdmin
    .from("batches")
    .select("*")
    .is("deleted_at", null)
    .order("year", { ascending: false })
    .limit(1);

  if (latestError) throw latestError;
  if (!latestData || latestData.length === 0) return null;
  return latestData[0];
}

async function fetchGroupsDeptMap(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from("groups").select("id, name_en");
  const map = new Map<string, string>();
  for (const g of data || []) {
    map.set(g.id, groupNameToDepartment(g.name_en));
  }
  return map;
}

// ─── Data Fetchers (exact replicas of calendar-queries.ts) ────────────────────

async function fetchExamSchedules(
  supabaseAdmin: ReturnType<typeof createClient>,
  batchId: string,
  deptMap: Map<string, string>,
) {
  const { data, error } = await supabaseAdmin
    .from("exam_schedules")
    .select(`
      id,
      exam_datetime,
      note,
      is_tentative,
      unit_id,
      unit:admission_units!inner(
        id,
        unit_slug,
        unit_name_bn,
        allowed_group_ids,
        group:groups(name_en),
        universities(name_bn, short_name_bn, slug, second_time),
        clusters(name_bn, short_name_bn, slug, second_time)
      )
    `)
    .eq("batch_id", batchId)
    .order("exam_datetime", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  return (data as any[])
    .map((row) => {
      const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit;
      const rawGroup = unit?.group;
      const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
      const resolved = resolveInstitution(unit);
      const primaryDept = groupNameToDepartment(group?.name_en ?? null);
      const allowedDepts = resolveAllowedDepartments(unit?.allowed_group_ids, deptMap);

      return {
        id: row.id,
        exam_datetime: row.exam_datetime,
        note: row.note,
        is_tentative: Boolean(row.is_tentative),
        unit_id: row.unit_id,
        unit_slug: unit?.unit_slug || "",
        unit_name_bn: unit?.unit_name_bn || "",
        institution_name_bn: resolved.institution_name_bn,
        institution_slug: resolved.institution_slug,
        institution_type: resolved.institution_type,
        show_unit_slug: resolved.show_unit_slug,
        department: primaryDept,
        allowed_departments: allowedDepts,
        second_time: resolved.second_time,
      };
    })
    .filter((item: any) => item.institution_name_bn !== "অজানা প্রতিষ্ঠান");
}

async function fetchResults(
  supabaseAdmin: ReturnType<typeof createClient>,
  batchId: string,
  deptMap: Map<string, string>,
) {
  const { data, error } = await supabaseAdmin
    .from("result_details")
    .select(`
      id,
      result_datetime,
      result_url,
      note,
      result_units(
        unit:admission_units(
          id,
          unit_slug,
          unit_name_bn,
          allowed_group_ids,
          group:groups(name_en),
          universities(name_bn, short_name_bn, slug, second_time),
          clusters(name_bn, short_name_bn, slug, second_time)
        )
      )
    `)
    .eq("batch_id", batchId)
    .order("result_datetime", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const results: any[] = [];
  for (const row of data as any[]) {
    const units = row.result_units || [];
    if (units.length === 0) {
      results.push({
        id: row.id,
        unit_id: "",
        result_datetime: row.result_datetime,
        result_url: row.result_url,
        note: row.note,
        institution_name_bn: "",
        unit_slug: "",
        unit_name_bn: "",
        institution_slug: "",
        show_unit_slug: true,
        department: "mixed",
        allowed_departments: [],
        second_time: false,
      });
    } else {
      for (const ru of units) {
        const unit = Array.isArray(ru.unit) ? ru.unit[0] : ru.unit;
        const rawGroup = unit?.group;
        const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
        const resolved = resolveInstitution(unit);
        const primaryDept = groupNameToDepartment(group?.name_en ?? null);
        const allowedDepts = resolveAllowedDepartments(unit?.allowed_group_ids, deptMap);

        results.push({
          id: `${row.id}-${unit?.unit_slug || ""}`,
          unit_id: unit?.id || "",
          result_datetime: row.result_datetime,
          result_url: row.result_url,
          note: row.note,
          institution_name_bn: resolved.institution_name_bn,
          unit_slug: unit?.unit_slug || "",
          unit_name_bn: unit?.unit_name_bn || "",
          institution_slug: resolved.institution_slug,
          institution_type: resolved.institution_type,
          show_unit_slug: resolved.show_unit_slug,
          department: primaryDept,
          allowed_departments: allowedDepts,
          second_time: resolved.second_time,
        });
      }
    }
  }
  return results.filter((item: any) => item.institution_name_bn !== "অজানা প্রতিষ্ঠান");
}

async function fetchAdmitCards(
  supabaseAdmin: ReturnType<typeof createClient>,
  batchId: string,
  deptMap: Map<string, string>,
) {
  const { data, error } = await supabaseAdmin
    .from("admit_card_details")
    .select(`
      id,
      download_start_datetime,
      download_end_datetime,
      admit_card_url,
      note,
      admit_card_units(
        unit:admission_units(
          id,
          unit_slug,
          unit_name_bn,
          allowed_group_ids,
          group:groups(name_en),
          universities(name_bn, short_name_bn, slug, second_time),
          clusters(name_bn, short_name_bn, slug, second_time)
        )
      )
    `)
    .eq("batch_id", batchId)
    .order("download_start_datetime", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const results: any[] = [];
  for (const row of data as any[]) {
    const units = row.admit_card_units || [];
    if (units.length === 0) {
      results.push({
        id: row.id,
        unit_id: "",
        download_start_datetime: row.download_start_datetime,
        download_end_datetime: row.download_end_datetime,
        admit_card_url: row.admit_card_url,
        note: row.note,
        institution_name_bn: "",
        unit_slug: "",
        unit_name_bn: "",
        institution_slug: "",
        show_unit_slug: true,
        department: "mixed",
        allowed_departments: [],
        second_time: false,
      });
    } else {
      for (const acu of units) {
        const unit = Array.isArray(acu.unit) ? acu.unit[0] : acu.unit;
        const rawGroup = unit?.group;
        const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
        const resolved = resolveInstitution(unit);
        const primaryDept = groupNameToDepartment(group?.name_en ?? null);
        const allowedDepts = resolveAllowedDepartments(unit?.allowed_group_ids, deptMap);

        results.push({
          id: `${row.id}-${unit?.unit_slug || ""}`,
          unit_id: unit?.id || "",
          download_start_datetime: row.download_start_datetime,
          download_end_datetime: row.download_end_datetime,
          admit_card_url: row.admit_card_url,
          note: row.note,
          institution_name_bn: resolved.institution_name_bn,
          unit_slug: unit?.unit_slug || "",
          unit_name_bn: unit?.unit_name_bn || "",
          institution_slug: resolved.institution_slug,
          institution_type: resolved.institution_type,
          show_unit_slug: resolved.show_unit_slug,
          department: primaryDept,
          allowed_departments: allowedDepts,
          second_time: resolved.second_time,
        });
      }
    }
  }
  return results.filter((item: any) => item.institution_name_bn !== "অজানা প্রতিষ্ঠান");
}

async function fetchApplications(
  supabaseAdmin: ReturnType<typeof createClient>,
  batchId: string,
  deptMap: Map<string, string>,
) {
  const { data, error } = await supabaseAdmin
    .from("application_details")
    .select(`
      id,
      start_datetime,
      end_datetime,
      fee,
      fee_payment_method,
      apply_url,
      note,
      application_units(
        unit:admission_units(
          id,
          unit_slug,
          unit_name_bn,
          allowed_group_ids,
          group:groups(name_en),
          universities(name_bn, short_name_bn, slug, second_time),
          clusters(name_bn, short_name_bn, slug, second_time)
        )
      )
    `)
    .eq("batch_id", batchId)
    .order("end_datetime", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const results: any[] = [];
  for (const row of data as any[]) {
    const units = row.application_units || [];
    if (units.length === 0) {
      results.push({
        id: row.id,
        unit_id: "",
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,
        fee: row.fee,
        fee_payment_method: row.fee_payment_method,
        apply_url: row.apply_url,
        note: row.note,
        institution_name_bn: "",
        institution_slug: "",
        unit_slug: "",
        unit_name_bn: "",
        show_unit_slug: true,
        department: "mixed",
        allowed_departments: [],
        second_time: false,
      });
    } else {
      for (const au of units) {
        const unit = Array.isArray(au.unit) ? au.unit[0] : au.unit;
        const rawGroup = unit?.group;
        const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
        const resolved = resolveInstitution(unit);
        const primaryDept = groupNameToDepartment(group?.name_en ?? null);
        const allowedDepts = resolveAllowedDepartments(unit?.allowed_group_ids, deptMap);

        results.push({
          id: `${row.id}-${unit?.unit_slug || ""}`,
          unit_id: unit?.id || "",
          start_datetime: row.start_datetime,
          end_datetime: row.end_datetime,
          fee: row.fee,
          fee_payment_method: row.fee_payment_method,
          apply_url: row.apply_url,
          note: row.note,
          institution_name_bn: resolved.institution_name_bn,
          institution_slug: resolved.institution_slug,
          institution_type: resolved.institution_type,
          unit_slug: unit?.unit_slug || "",
          unit_name_bn: unit?.unit_name_bn || "",
          show_unit_slug: resolved.show_unit_slug,
          department: primaryDept,
          allowed_departments: allowedDepts,
          second_time: resolved.second_time,
        });
      }
    }
  }
  return results.filter((item: any) => item.institution_name_bn !== "অজানা প্রতিষ্ঠান");
}

async function fetchInfo(
  supabaseAdmin: ReturnType<typeof createClient>,
  deptMap: Map<string, string>,
) {
  // Step 1: Fetch all admission_units with joins
  const { data: unitData, error: unitError } = await supabaseAdmin
    .from("admission_units")
    .select(`
      id,
      unit_slug,
      unit_name_bn,
      exam_center_note,
      university_id,
      cluster_id,
      allowed_group_ids,
      calculator_allowed,
      calculator_link,
      group:groups(name_en),
      university:universities(short_name_bn, slug, second_time, second_time_condition, negative_mark, calculator_allowed, calculator_link),
      cluster:clusters(short_name_bn, slug, second_time, second_time_condition, negative_mark, calculator_allowed, calculator_link)
    `)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (unitError) throw unitError;
  if (!unitData || unitData.length === 0) return [];

  const typedUnits = unitData as any[];

  // Collect IDs for marks and circulars lookups
  const unitIds = new Set<string>();
  const universityIds = new Set<string>();
  const clusterIds = new Set<string>();

  for (const row of typedUnits) {
    unitIds.add(row.id);
    if (row.university_id) universityIds.add(row.university_id);
    else if (row.cluster_id) clusterIds.add(row.cluster_id);
  }

  // Step 2: Fetch marks distributions and circulars in parallel
  const [marksResult, circularUniResult, circularClusterResult] = await Promise.all([
    unitIds.size > 0
      ? supabaseAdmin
          .from("unit_marks_distributions")
          .select(
            "unit_id, total_marks, total_time, mcq_marks, written_marks, other_marks, other_marks_type, subject_selection_rules",
          )
          .is("deleted_at", null)
          .in("unit_id", [...unitIds])
      : { data: [], error: null },
    universityIds.size > 0
      ? supabaseAdmin
          .from("circulars")
          .select("id, download_url, university_id, batch_id, batch:batches(id, is_current, year)")
          .is("deleted_at", null)
          .in("university_id", [...universityIds])
      : { data: [], error: null },
    clusterIds.size > 0
      ? supabaseAdmin
          .from("circulars")
          .select("id, download_url, university_id, batch_id, batch:batches(id, is_current, year)")
          .is("deleted_at", null)
          .in("university_id", [...clusterIds])
      : { data: [], error: null },
  ]);

  if (marksResult.error) throw marksResult.error;
  if (circularUniResult.error) throw circularUniResult.error;
  if (circularClusterResult.error) throw circularClusterResult.error;

  const marksList = marksResult.data || [];
  const allCirculars = [...(circularUniResult.data || []), ...(circularClusterResult.data || [])];

  // Build marks lookup: unit_id → marks data
  const marksMap = new Map<string, any>();
  for (const m of marksList) {
    marksMap.set(m.unit_id, m);
  }

  // Filter circulars: only current batch
  const filteredCirculars = allCirculars.filter((c: any) => {
    const batch = Array.isArray(c.batch) ? c.batch[0] : c.batch;
    return batch?.is_current === true;
  });

  // Build circular lookup: university_id → download_url
  const circularByInstMap = new Map<string, string>();
  for (const c of filteredCirculars) {
    const instId = c.university_id;
    if (instId && !circularByInstMap.has(instId)) {
      circularByInstMap.set(instId, c.download_url || "");
    }
  }

  // Step 3: Assemble results — one row per unit
  return typedUnits
    .map((row: any) => {
      const inst = resolveInfoInstitution(row);
      const instId = row.university_id || row.cluster_id;
      const marks = marksMap.get(row.id) || null;
      const circularUrl = instId ? circularByInstMap.get(instId) || null : null;

      const showUnitSlug = !!(inst?.slug && row.unit_slug !== inst.slug);

      const rawGroup = row.group;
      const group = Array.isArray(rawGroup) ? rawGroup[0] : rawGroup;
      const primaryDept = groupNameToDepartment(group?.name_en ?? null);
      const allowedDepts = resolveAllowedDepartments(row.allowed_group_ids, deptMap);

      return {
        id: row.id,
        unit_slug: row.unit_slug || "",
        unit_name_bn: row.unit_name_bn || "",
        institution_name_bn: inst?.name_bn || "",
        institution_slug: inst?.slug || "",
        institution_type: inst?.type || "university",
        show_unit_slug: showUnitSlug,
        department: primaryDept,
        allowed_departments: allowedDepts,
        exam_center_note: row.exam_center_note || null,
        second_time: inst?.second_time ?? false,
        second_time_condition: inst?.second_time_condition ?? null,
        negative_mark: inst?.negative_mark ?? null,
        calculator_allowed: inst?.calculator_allowed ?? false,
        calculator_link: inst?.calculator_link ?? null,
        marks: marks
          ? {
              total_marks: marks.total_marks,
              total_time: marks.total_time,
              mcq_marks: marks.mcq_marks,
              written_marks: marks.written_marks,
              other_marks: marks.other_marks,
              other_marks_type: marks.other_marks_type,
              subject_selection_rules: marks.subject_selection_rules,
            }
          : null,
        circular_download_url: circularUrl,
      };
    })
    .filter((item: any) => item.institution_name_bn !== "");
}

// ─── Main Handler ────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow GET (for manual trigger) and POST (from pg_net triggers)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("[generate-calendar-snapshot] Starting snapshot generation...");

    // 1. Resolve current batch
    const batch = await fetchCurrentBatch(supabaseAdmin);
    if (!batch) {
      console.error("[generate-calendar-snapshot] No active batch found");
      return new Response(JSON.stringify({ error: "No active batch found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[generate-calendar-snapshot] Active batch: ${batch.id} (${batch.year})`);

    // 2. Fetch groups dept map (shared across all queries)
    const deptMap = await fetchGroupsDeptMap(supabaseAdmin);

    // 3. Fetch ALL 5 categories — if ANY fails, abort without overwriting
    console.log("[generate-calendar-snapshot] Fetching exam schedules...");
    const examSchedules = await fetchExamSchedules(supabaseAdmin, batch.id, deptMap);

    console.log("[generate-calendar-snapshot] Fetching results...");
    const results = await fetchResults(supabaseAdmin, batch.id, deptMap);

    console.log("[generate-calendar-snapshot] Fetching admit cards...");
    const admitCards = await fetchAdmitCards(supabaseAdmin, batch.id, deptMap);

    console.log("[generate-calendar-snapshot] Fetching applications...");
    const applications = await fetchApplications(supabaseAdmin, batch.id, deptMap);

    console.log("[generate-calendar-snapshot] Fetching info...");
    const info = await fetchInfo(supabaseAdmin, deptMap);

    // 4. Assemble the snapshot
    const snapshot = {
      generatedAt: new Date().toISOString(),
      batchId: batch.id,
      examSchedules,
      results,
      admitCards,
      applications,
      info,
    };

    console.log(
      `[generate-calendar-snapshot] Snapshot assembled: ` +
        `${examSchedules.length} exams, ${results.length} results, ` +
        `${admitCards.length} admit cards, ${applications.length} applications, ` +
        `${info.length} info rows`,
    );

    // 5. Upload calendar-data.json (long cache — invalidation via version.json)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(DATA_FILE, JSON.stringify(snapshot), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });

    if (uploadError) throw uploadError;

    // 6. Upload version.json (no-cache — always fresh for version checks)
    const versionPayload = {
      updatedAt: new Date().toISOString(),
    };
    const { error: versionError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(VERSION_FILE, JSON.stringify(versionPayload), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "no-cache",
      });

    if (versionError) throw versionError;

    console.log("[generate-calendar-snapshot] Snapshot uploaded successfully");

    return new Response(
      JSON.stringify({
        success: true,
        generatedAt: snapshot.generatedAt,
        counts: {
          examSchedules: examSchedules.length,
          results: results.length,
          admitCards: admitCards.length,
          applications: applications.length,
          info: info.length,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("[generate-calendar-snapshot] Fatal error:", err);
    // Do NOT overwrite the existing snapshot — return error only
    return new Response(
      JSON.stringify({
        error: "Snapshot generation failed",
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
