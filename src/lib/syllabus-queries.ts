import { supabase } from "@/lib/supabase";
import type { TargetGroupFormValues } from "@/lib/unit-marks-types";

// =============================================================================
// Types
// =============================================================================

export type InstitutionType = "university" | "cluster" | "college";

export type InstitutionItem = {
  id: string;
  name_bn: string;
  name_en: string;
  short_name_bn: string;
  short_name_en: string;
  slug: string;
  logo_url: string | null;
  type: InstitutionType;
  second_time: boolean;
  second_time_condition: string | null;
  unit_change: string | null;
  negative_mark: number | null;
  calculator_allowed: boolean;
  calculator_link: string | null;
  primary_group_ids: string[];
  allowed_group_ids: string[];
  has_open_unit: boolean;
};

export type AdmissionUnitItem = {
  id: string;
  university_id: string | null;
  unit_name_bn: string;
  unit_name_en: string | null;
  unit_slug: string;
  sort_order: number;
  allowed_group_ids: string[] | null;
  primary_group_id: string | null;
  calculator_allowed: boolean | null;
  calculator_link: string | null;
};

export type UnitMarksDistribution = {
  id: string;
  unit_id: string;
  total_marks: number | null;
  mcq_marks: number | null;
  written_marks: number | null;
  other_marks: number | null;
  other_marks_type: string | null;
  total_time: number | null;
  general_note: string | null;
  subject_selection_rules: TargetGroupFormValues[] | null;
};

export type SyllabusPaper = {
  id: string;
  name_en: string;
  name_bn: string | null;
  short_code: string | null;
  discipline_id: string | null;
  icon_url?: string | null;
  group_ids: string[];
  chapters: {
    id: string;
    paper_id: string;
    serial: number | null;
    name: string;
    short_code: string | null;
    topics: {
      id: string;
      paper_id: string;
      chapter_id: string;
      serial: number | null;
      name: string;
    }[];
  }[];
};

export type UnitSyllabusData = {
  papers: SyllabusPaper[];
  marksDistribution: UnitMarksDistribution | null;
};

// =============================================================================
// Home: Fetch all institutions (universities + clusters + colleges)
// =============================================================================

export async function fetchAllInstitutions(): Promise<InstitutionItem[]> {
  const [uniRes, clusterRes] = await Promise.all([
    supabase
      .from("universities")
      .select(
        "id, name_bn, name_en, short_name_bn, short_name_en, slug, logo_url, second_time, second_time_condition, negative_mark, calculator_allowed, calculator_link, unit_change",
      )
      .is("deleted_at", null)
      .neq("category", "private")
      .order("name_bn"),
    supabase
      .from("clusters")
      .select("id, name_bn, name_en, short_name_bn, short_name_en, slug, logo_url, second_time, second_time_condition, negative_mark, calculator_allowed, calculator_link")
      .is("deleted_at", null)
      .order("name_bn"),
  ]);

  if (uniRes.error) throw uniRes.error;
  if (clusterRes.error) throw clusterRes.error;

  const allUnis = uniRes.data || [];

  // Fetch admission_units (all columns needed for both cluster-check and group maps)
  // and cluster_universities in parallel
  const [admRes, cuRes] = await Promise.all([
    supabase
      .from("admission_units")
      .select("id, university_id, cluster_id, primary_group_id, allowed_group_ids")
      .is("deleted_at", null),
    supabase
      .from("cluster_universities")
      .select("university_id, unit_id"),
  ]);

  const allUnits = admRes.data || [];
  const clusterLinks = cuRes.data || [];

  // Hide universities whose ALL units are cluster-linked
  const clusteredUnitIds = new Set(
    clusterLinks.filter((l) => l.unit_id).map((l) => l.unit_id),
  );

  const uniUnitCounts = new Map<string, number>();
  for (const u of allUnits) {
    if (!u.university_id) continue;
    uniUnitCounts.set(u.university_id, (uniUnitCounts.get(u.university_id) || 0) + 1);
  }
  const uniClusteredCounts = new Map<string, number>();
  for (const unit of allUnits) {
    if (!unit.university_id) continue;
    if (clusteredUnitIds.has(unit.id)) {
      uniClusteredCounts.set(
        unit.university_id,
        (uniClusteredCounts.get(unit.university_id) || 0) + 1,
      );
    }
  }
  const allClusteredUniIds = new Set<string>();
  for (const [uid, total] of uniUnitCounts) {
    if (uniClusteredCounts.get(uid) === total) allClusteredUniIds.add(uid);
  }

  const visibleUnis = allUnis.filter((u) => !allClusteredUniIds.has(u.id));

  // Build primary & allowed group_ids per institution from the same admUnits data
  const instPrimaryMap = new Map<string, Set<string>>();
  const instAllowedMap = new Map<string, Set<string>>();
  const instHasOpenUnit = new Set<string>();

  for (const u of allUnits) {
    const instId = u.university_id || u.cluster_id;
    if (!instId) continue;

    if (u.primary_group_id) {
      if (!instPrimaryMap.has(instId)) instPrimaryMap.set(instId, new Set());
      instPrimaryMap.get(instId)!.add(u.primary_group_id);
    } else {
      instHasOpenUnit.add(instId);
    }

    if (!instAllowedMap.has(instId)) instAllowedMap.set(instId, new Set());
    for (const gid of u.allowed_group_ids || []) {
      instAllowedMap.get(instId)!.add(gid);
    }
  }

  const universities: InstitutionItem[] = visibleUnis.map((u) => ({
    ...u,
    type: "university" as const,
    primary_group_ids: [...(instPrimaryMap.get(u.id) || [])],
    allowed_group_ids: [...(instAllowedMap.get(u.id) || [])],
    has_open_unit: instHasOpenUnit.has(u.id),
  }));

  const clusters: InstitutionItem[] = (clusterRes.data || []).map((c) => ({
    ...c,
    type: "cluster" as const,
    unit_change: null,
    primary_group_ids: [...(instPrimaryMap.get(c.id) || [])],
    allowed_group_ids: [...(instAllowedMap.get(c.id) || [])],
    has_open_unit: instHasOpenUnit.has(c.id),
  }));

  return [...clusters, ...universities];
}

// =============================================================================
// Slug helpers
// =============================================================================

export async function getInstitutionBySlug(slug: string): Promise<InstitutionItem | null> {
  const columns =
    "id, name_bn, name_en, short_name_bn, short_name_en, slug, logo_url, second_time, second_time_condition, negative_mark, calculator_allowed, calculator_link";

  // Run both lookups concurrently. This preserves the exact resolution of the
  // old sequential loop: a university match wins over a cluster match, then a
  // cluster match, then no match (null). The old loop short-circuited (a
  // university match skipped the cluster query) purely as an optimisation; we
  // keep the precedence and, per the original error semantics, throw the LAST
  // lookup's error (clusters was checked second) when neither matched.
  const [uniRes, clusterRes] = await Promise.all([
    supabase
      .from("universities")
      .select(columns)
      .is("deleted_at", null)
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("clusters")
      .select(columns)
      .is("deleted_at", null)
      .eq("slug", slug)
      .maybeSingle(),
  ]);

  if (!uniRes.error && uniRes.data) {
    return { ...uniRes.data, type: "university" } as InstitutionItem;
  }
  if (!clusterRes.error && clusterRes.data) {
    return { ...clusterRes.data, type: "cluster" } as InstitutionItem;
  }

  if (clusterRes.error) throw clusterRes.error;
  if (uniRes.error) throw uniRes.error;
  return null;
}

// =============================================================================
// Institution Page: Fetch admission units for an institution
// =============================================================================

export async function fetchAdmissionUnits(institutionId: string): Promise<AdmissionUnitItem[]> {
  const queries = [
    supabase
      .from("admission_units")
      .select(
        "id, university_id, unit_name_bn, unit_name_en, unit_slug, sort_order, allowed_group_ids, primary_group_id, calculator_allowed, calculator_link",
      )
      .is("deleted_at", null)
      .eq("university_id", institutionId)
      .order("sort_order"),
    supabase
      .from("admission_units")
      .select(
        "id, university_id, unit_name_bn, unit_name_en, unit_slug, sort_order, allowed_group_ids, primary_group_id, calculator_allowed, calculator_link",
      )
      .is("deleted_at", null)
      .eq("college_id", institutionId)
      .order("sort_order"),
    supabase
      .from("admission_units")
      .select(
        "id, university_id, unit_name_bn, unit_name_en, unit_slug, sort_order, allowed_group_ids, primary_group_id, calculator_allowed, calculator_link",
      )
      .is("deleted_at", null)
      .eq("cluster_id", institutionId)
      .order("sort_order"),
  ];

  const results = await Promise.all(queries);

  for (const res of results) {
    if (res.error) throw res.error;
    if (res.data && res.data.length > 0) {
      return res.data as AdmissionUnitItem[];
    }
  }

  return [];
}

// =============================================================================
// Dashboard: Fetch syllabus papers filtered by unit's marks distribution
// =============================================================================

function extractSubjectNamesFromRules(rules: TargetGroupFormValues[] | null): string[] {
  if (!rules || rules.length === 0) return [];
  const names: string[] = [];
  for (const group of rules) {
    for (const rule of group.rules || []) {
      for (const sub of rule.subjects || []) {
        if (sub.name) names.push(sub.name.trim().toLowerCase());
      }
    }
  }
  return [...new Set(names)];
}

function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()（）[\]{}]/g, "")
    .replace(/[১২৩৪৫৬৭৮৯০123456789]/g, "")
    .replace(/first|second|third|fourth|1st|2nd|3rd|4th|প্রথম|দ্বিতীয়|তৃতীয়|চতুর্থ/g, "")
    .replace(/paper|পত্র/g, "")
    .trim();
}

function matchesSubject(
  ruleName: string,
  paper: { name_en: string; name_bn?: string | null; short_code?: string | null },
): boolean {
  const rn = normalize(ruleName);
  if (!rn) return false;

  const nameEn = normalize(paper.name_en || "");
  const nameBn = normalize(paper.name_bn || "");
  const shortCode = normalize(paper.short_code || "");

  if (nameEn.includes(rn) || rn.includes(nameEn)) return true;
  if (nameBn && (nameBn.includes(rn) || rn.includes(nameBn))) return true;
  if (shortCode && rn.includes(shortCode)) return true;

  const ruleWords = rn.split(/\s+/).filter(Boolean);
  if (ruleWords.length > 1) {
    const allWordsInPaper = ruleWords.every(
      (w) => nameEn.includes(w) || (nameBn && nameBn.includes(w)),
    );
    if (allWordsInPaper) return true;
  }

  const ruleFirst = ruleWords[0];
  const paperFirst = nameEn.split(/\s+/)[0];
  if (ruleFirst && paperFirst && ruleFirst === paperFirst) return true;

  return false;
}

export async function fetchSyllabusForUnit(
  unit: AdmissionUnitItem,
  groupId?: string,
): Promise<UnitSyllabusData> {
  // Step 1: fetch syllabus_unit_subjects + marks distribution in parallel
  const [susRes, distRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("syllabus_unit_subjects")
        .select("paper_id, is_mandatory, sort_order")
        .eq("unit_id", unit.id);
      if (groupId) q = q.eq("group_id", groupId);
      return q.order("sort_order", { ascending: true });
    })(),
    supabase
      .from("unit_marks_distributions")
      .select("*")
      .is("deleted_at", null)
      .eq("unit_id", unit.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (susRes.error) throw susRes.error;
  const filteredPaperIds = (susRes.data || []).map((s) => s.paper_id);
  const distData = distRes.data;

  if (filteredPaperIds.length === 0) {
    return { papers: [], marksDistribution: distData as UnitMarksDistribution | null };
  }

  // Step 2: fetch papers + chapters in parallel
  const [papersRes, chaptersRes] = await Promise.all([
    supabase
      .from("curriculum_papers")
      .select("*, study_disciplines(icon_url)")
      .in("id", filteredPaperIds)
      .order("name_bn"),
    supabase
      .from("paper_chapters")
      .select("*")
      .in("paper_id", filteredPaperIds)
      .order("serial", { ascending: true, nullsFirst: false }),
  ]);

  if (papersRes.error) throw papersRes.error;
  if (chaptersRes.error) throw chaptersRes.error;

  // Step 3: fetch topics
  const chapterIds = (chaptersRes.data || []).map((ch) => ch.id);
  const { data: topics, error: topicsErr } = await supabase
    .from("chapter_topics")
    .select("*")
    .in("chapter_id", chapterIds.length > 0 ? chapterIds : ["__none__"])
    .order("serial", { ascending: true, nullsFirst: false });
  if (topicsErr) throw topicsErr;

  const result: SyllabusPaper[] = (papersRes.data || []).map((paper) => ({
    ...paper,
    icon_url: paper.study_disciplines?.icon_url ?? null,
    group_ids: [groupId],
    chapters: (chaptersRes.data || [])
      .filter((ch) => ch.paper_id === paper.id)
      .map((chapter) => ({
        ...chapter,
        topics: (topics || []).filter((t) => t.chapter_id === chapter.id),
      })),
  }));

  return {
    papers: result,
    marksDistribution: distData as UnitMarksDistribution | null,
  };
}

// =============================================================================
// Exam schedule: next upcoming exam for a unit (current batch only)
// =============================================================================

export type ExamScheduleItem = {
  id: string;
  exam_datetime: string;
  note: string | null;
  is_tentative: boolean;
  batch_name: string;
};

export async function fetchNextExamSchedule(unitId: string): Promise<ExamScheduleItem | null> {
  const { data: batch, error: batchErr } = await supabase
    .from("batches")
    .select("id, name")
    .eq("is_current", true)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (batchErr || !batch) return null;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("exam_schedules")
    .select("id, exam_datetime, note, is_tentative")
    .eq("unit_id", unitId)
    .eq("batch_id", batch.id)
    .is("deleted_at", null)
    .gte("exam_datetime", now)
    .order("exam_datetime", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    batch_name: batch.name,
  };
}
