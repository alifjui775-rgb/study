// =============================================================================
// Admin CRUD — Supabase Queries & Mutations for Phase 3 Events
// =============================================================================

import { supabase } from "@/lib/supabase";
import { getEntityColumn, buildEntityPayload, type EntityType } from "@/lib/entity-types";
import type {
  SubjectGroupSeatRow,
  SubjectGroupSeatFormValues,
  UnitRequirementRow,
  UnitRequirementFormValues,
  CircularRow,
  CircularFormValues,
  ApplicationDetailRow,
  ApplicationDetailFormValues,
  ApplicationPhaseFormValue,
  ExamScheduleRow,
  ExamScheduleFormValues,
  AdmitCardDetailRow,
  AdmitCardDetailFormValues,
  ResultDetailRow,
  ResultDetailFormValues,
} from "@/lib/university-events-types";

// ─── Batches Fetch ───────────────────────────────────────────────────────────

export const fetchBatches = async () => {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .is("deleted_at", null)
    .order("year", { ascending: false });

  if (error) throw error;
  return data || [];
};

// ─── 1. Seats (subject_group_seats) ──────────────────────────────────────────

export type JoinedSubjectGroupSeatRow = SubjectGroupSeatRow & {
  institution_subjects: {
    unit_id: string | null;
    degree_program: { short_name: string; full_name_en: string } | null;
    unit: { unit_name_bn: string; unit_name_en: string | null } | null;
  } | null;
  group: { name_bn: string; name_en: string } | null;
};

export const fetchSeatsByUniversity = async (
  universityId: string,
): Promise<JoinedSubjectGroupSeatRow[]> => {
  const { data, error } = await supabase
    .from("subject_group_seats")
    .select(`
      *,
      institution_subjects!inner(
        unit_id,
        degree_program:degree_programs(short_name, full_name_en),
        unit:admission_units(unit_name_bn, unit_name_en)
      ),
      group:groups(name_bn, name_en)
    `)
    .eq("institution_subjects.university_id", universityId);

  if (error) throw error;
  return (data || []) as JoinedSubjectGroupSeatRow[];
};

export const insertSeats = async (
  values: SubjectGroupSeatFormValues,
): Promise<SubjectGroupSeatRow[]> => {
  const rows = values.group_seats
    .filter((gs) => gs.seat_count > 0)
    .map((gs) => ({
      university_subject_id: values.university_subject_id,
      group_id: gs.group_id,
      seat_count: gs.seat_count,
      is_assumed: values.is_assumed ?? false,
    }));

  if (rows.length === 0) return [];

  const { data, error } = await supabase.from("subject_group_seats").insert(rows).select();

  if (error) throw error;
  return (data || []) as SubjectGroupSeatRow[];
};

export const updateSeats = async (
  university_subject_id: string,
  values: SubjectGroupSeatFormValues,
): Promise<SubjectGroupSeatRow[]> => {
  // Step A: Delete all existing rows for this subject
  const { error: delError } = await supabase
    .from("subject_group_seats")
    .delete()
    .eq("university_subject_id", university_subject_id);

  if (delError) throw delError;

  // Step B: Bulk insert the new rows
  const rows = values.group_seats
    .filter((gs) => gs.seat_count > 0)
    .map((gs) => ({
      university_subject_id: values.university_subject_id,
      group_id: gs.group_id,
      seat_count: gs.seat_count,
      is_assumed: values.is_assumed ?? false,
    }));

  if (rows.length === 0) return [];

  const { data, error: insError } = await supabase
    .from("subject_group_seats")
    .insert(rows)
    .select();

  if (insError) throw insError;
  return (data || []) as SubjectGroupSeatRow[];
};

export const deleteSeatsBySubject = async (university_subject_id: string): Promise<void> => {
  const { error } = await supabase
    .from("subject_group_seats")
    .delete()
    .eq("university_subject_id", university_subject_id);

  if (error) throw error;
};

// ─── 2. Requirements (unit_requirements) ──────────────────────────────────────

export type JoinedUnitRequirementRow = UnitRequirementRow & {
  unit: { unit_name_bn: string; unit_name_en: string | null } | null;
  group: { name_bn: string; name_en: string } | null;
  unit_requirement_batches?: { batch_id: string }[];
};

export const fetchRequirementsByEntity = async (
  entityId: string,
  entityType: "university" | "college" | "cluster",
): Promise<JoinedUnitRequirementRow[]> => {
  const column =
    entityType === "university"
      ? "university_id"
      : entityType === "college"
        ? "college_id"
        : "cluster_id";

  const { data, error } = await supabase
    .from("unit_requirements")
    .select(
      "*, unit:admission_units(unit_name_bn, unit_name_en), group:groups(name_bn, name_en), unit_requirement_batches(batch_id)",
    )
    .eq(column, entityId)
    .is("deleted_at", null);

  if (error) throw error;
  return (data || []) as JoinedUnitRequirementRow[];
};

export const insertRequirement = async (values: any): Promise<UnitRequirementRow> => {
  const { batch_ids, ...payload } = values;
  const { data, error } = await supabase
    .from("unit_requirements")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as UnitRequirementRow;
};

export const updateRequirement = async (id: string, values: any): Promise<UnitRequirementRow> => {
  const { batch_ids, ...payload } = values;
  const { data, error } = await supabase
    .from("unit_requirements")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UnitRequirementRow;
};

export const deleteRequirement = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("unit_requirements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

// ─── 3. Circulars & Junction Table ───────────────────────────────────────────

export type JoinedCircularRow = CircularRow & {
  circular_units: { unit_id: string }[];
};

export const fetchCircularsByUniversity = async (
  entityId: string,
  batchId: string,
  entityType: EntityType = "university",
): Promise<JoinedCircularRow[]> => {
  const { data, error } = await supabase
    .from("circulars")
    .select("*, circular_units(unit_id)")
    .is("deleted_at", null)
    .eq(getEntityColumn(entityType), entityId)
    .eq("batch_id", batchId)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data || []) as JoinedCircularRow[];
};

export const insertCircularWithJunction = async (
  values: CircularFormValues & { entityId: string; entityType?: EntityType; batch_id: string },
): Promise<CircularRow> => {
  const { unit_ids, entityId, entityType = "university", ...rest } = values;

  // 1. Insert main circular row
  const { data: circular, error: cErr } = await supabase
    .from("circulars")
    .insert({ ...rest, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (cErr) throw cErr;

  // 2. Insert junction records
  if (unit_ids.length > 0) {
    const junctionRows = unit_ids.map((uId) => ({
      circular_id: circular.id,
      unit_id: uId,
    }));

    const { error: jErr } = await supabase.from("circular_units").insert(junctionRows);

    if (jErr) {
      // Rollback main circular row on error
      await supabase
        .from("circulars")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", circular.id);
      throw jErr;
    }
  }

  return circular as CircularRow;
};

export const updateCircularWithJunction = async (
  id: string,
  values: CircularFormValues,
): Promise<CircularRow> => {
  const { unit_ids, ...rest } = values;

  // 1. Update main circular row
  const { data: circular, error: cErr } = await supabase
    .from("circulars")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (cErr) throw cErr;

  // 2. Delete old junction mappings
  const { error: dErr } = await supabase.from("circular_units").delete().eq("circular_id", id);

  if (dErr) throw dErr;

  // 3. Insert new junction mappings
  if (unit_ids.length > 0) {
    const junctionRows = unit_ids.map((uId) => ({
      circular_id: id,
      unit_id: uId,
    }));

    const { error: jErr } = await supabase.from("circular_units").insert(junctionRows);

    if (jErr) throw jErr;
  }

  return circular as CircularRow;
};

export const deleteCircular = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("circulars")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

// ─── 4. Application Details & Junction & Phases ──────────────────────────────

export type JoinedApplicationDetailRow = ApplicationDetailRow & {
  application_units: { unit_id: string }[];
  application_phases: {
    id: string;
    phase_name: string;
    start_datetime: string;
    end_datetime: string;
    fee: number | null;
    fee_payment_method: string | null;
    apply_url: string | null;
    phase_links: { label: string; url: string }[] | null;
    sort_order: number;
  }[];
};

export const fetchApplicationsByUniversity = async (
  entityId: string,
  batchId: string,
  entityType: EntityType = "university",
): Promise<JoinedApplicationDetailRow[]> => {
  const { data, error } = await supabase
    .from("application_details")
    .select("*, application_units(unit_id), application_phases(*)")
    .eq(getEntityColumn(entityType), entityId)
    .eq("batch_id", batchId)
    .order("start_datetime", { ascending: false });

  if (error) throw error;
  return (data || []) as JoinedApplicationDetailRow[];
};

export const insertApplicationWithJunction = async (
  values: ApplicationDetailFormValues & {
    entityId: string;
    entityType?: EntityType;
    batch_id: string;
  },
): Promise<ApplicationDetailRow> => {
  const { unit_ids, phases, entityId, entityType = "university", ...rest } = values;

  const { data: app, error: aErr } = await supabase
    .from("application_details")
    .insert({ ...rest, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (aErr) throw aErr;

  // Junction
  if (unit_ids.length > 0) {
    const jRows = unit_ids.map((uId) => ({ application_id: app.id, unit_id: uId }));
    const { error: jErr } = await supabase.from("application_units").insert(jRows);
    if (jErr) {
      await supabase.from("application_details").delete().eq("id", app.id);
      throw jErr;
    }
  }

  // Phases
  if (phases.length > 0) {
    const phaseRows = phases.map((p: ApplicationPhaseFormValue, idx: number) => ({
      application_id: app.id,
      phase_name: p.phase_name,
      start_datetime: p.start_datetime,
      end_datetime: p.end_datetime,
      fee: p.fee,
      fee_payment_method: p.fee_payment_method,
      apply_url: p.apply_url,
      phase_links: p.phase_links && p.phase_links.length > 0 ? p.phase_links : null,
      sort_order: p.sort_order ?? idx,
    }));
    const { error: pErr } = await supabase.from("application_phases").insert(phaseRows);
    if (pErr) throw pErr;
  }

  return app as ApplicationDetailRow;
};

export const updateApplicationWithJunction = async (
  id: string,
  values: ApplicationDetailFormValues,
): Promise<ApplicationDetailRow> => {
  const { unit_ids, phases, ...rest } = values;

  const { data: app, error: aErr } = await supabase
    .from("application_details")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (aErr) throw aErr;

  // Re-sync junction
  await supabase.from("application_units").delete().eq("application_id", id);
  if (unit_ids.length > 0) {
    const jRows = unit_ids.map((uId) => ({ application_id: id, unit_id: uId }));
    const { error: jErr } = await supabase.from("application_units").insert(jRows);
    if (jErr) throw jErr;
  }

  // Re-sync phases
  await supabase.from("application_phases").delete().eq("application_id", id);
  if (phases.length > 0) {
    const phaseRows = phases.map((p: ApplicationPhaseFormValue, idx: number) => ({
      application_id: id,
      phase_name: p.phase_name,
      start_datetime: p.start_datetime,
      end_datetime: p.end_datetime,
      fee: p.fee,
      fee_payment_method: p.fee_payment_method,
      apply_url: p.apply_url,
      phase_links: p.phase_links && p.phase_links.length > 0 ? p.phase_links : null,
      sort_order: p.sort_order ?? idx,
    }));
    const { error: pErr } = await supabase.from("application_phases").insert(phaseRows);
    if (pErr) throw pErr;
  }

  return app as ApplicationDetailRow;
};

export const deleteApplication = async (id: string): Promise<void> => {
  const { error } = await supabase.from("application_details").delete().eq("id", id);
  if (error) throw error;
};

// ─── 5. Exam Schedules ──────────────────────────────────────────────────────

export type JoinedExamScheduleRow = ExamScheduleRow & {
  unit: { unit_name_bn: string; unit_name_en: string | null } | null;
};

export const fetchExamSchedulesByUniversity = async (
  entityId: string,
  batchId: string,
  entityType: EntityType = "university",
): Promise<JoinedExamScheduleRow[]> => {
  const entityCol = getEntityColumn(entityType);
  const selectStr =
    `*, unit:admission_units!inner(unit_name_bn, unit_name_en, ${entityCol})` as string;
  const { data, error } = await (supabase.from("exam_schedules").select(selectStr) as any)
    .eq(`unit.${entityCol}`, entityId)
    .eq("batch_id", batchId)
    .order("exam_datetime", { ascending: true });

  if (error) throw error;
  return (data || []) as JoinedExamScheduleRow[];
};

export const insertExamSchedule = async (
  values: ExamScheduleFormValues & { batch_id: string },
): Promise<ExamScheduleRow> => {
  const { data, error } = await supabase.from("exam_schedules").insert(values).select().single();

  if (error) throw error;
  return data as ExamScheduleRow;
};

export const updateExamSchedule = async (
  id: string,
  values: ExamScheduleFormValues,
): Promise<ExamScheduleRow> => {
  const { data, error } = await supabase
    .from("exam_schedules")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ExamScheduleRow;
};

export const deleteExamSchedule = async (id: string): Promise<void> => {
  const { error } = await supabase.from("exam_schedules").delete().eq("id", id);
  if (error) throw error;
};

// ─── 6. Admit Card Details & Junction ────────────────────────────────────────

export type JoinedAdmitCardDetailRow = AdmitCardDetailRow & {
  admit_card_units: { unit_id: string }[];
};

export const fetchAdmitCardsByUniversity = async (
  entityId: string,
  batchId: string,
  entityType: EntityType = "university",
): Promise<JoinedAdmitCardDetailRow[]> => {
  const { data, error } = await supabase
    .from("admit_card_details")
    .select("*, admit_card_units(unit_id)")
    .eq(getEntityColumn(entityType), entityId)
    .eq("batch_id", batchId)
    .order("download_start_datetime", { ascending: false });

  if (error) throw error;
  return (data || []) as JoinedAdmitCardDetailRow[];
};

export const insertAdmitCardWithJunction = async (
  values: AdmitCardDetailFormValues & {
    entityId: string;
    entityType?: EntityType;
    batch_id: string;
  },
): Promise<AdmitCardDetailRow> => {
  const { unit_ids, entityId, entityType = "university", ...rest } = values;

  const { data: ac, error: aErr } = await supabase
    .from("admit_card_details")
    .insert({ ...rest, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (aErr) throw aErr;

  if (unit_ids.length > 0) {
    const jRows = unit_ids.map((uId) => ({ admit_card_id: ac.id, unit_id: uId }));
    const { error: jErr } = await supabase.from("admit_card_units").insert(jRows);
    if (jErr) {
      await supabase.from("admit_card_details").delete().eq("id", ac.id);
      throw jErr;
    }
  }

  return ac as AdmitCardDetailRow;
};

export const updateAdmitCardWithJunction = async (
  id: string,
  values: AdmitCardDetailFormValues,
): Promise<AdmitCardDetailRow> => {
  const { unit_ids, ...rest } = values;

  const { data: ac, error: aErr } = await supabase
    .from("admit_card_details")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (aErr) throw aErr;

  await supabase.from("admit_card_units").delete().eq("admit_card_id", id);
  if (unit_ids.length > 0) {
    const jRows = unit_ids.map((uId) => ({ admit_card_id: id, unit_id: uId }));
    const { error: jErr } = await supabase.from("admit_card_units").insert(jRows);
    if (jErr) throw jErr;
  }

  return ac as AdmitCardDetailRow;
};

export const deleteAdmitCard = async (id: string): Promise<void> => {
  const { error } = await supabase.from("admit_card_details").delete().eq("id", id);
  if (error) throw error;
};

// ─── 7. Result Details & Junction ────────────────────────────────────────────

export type JoinedResultDetailRow = ResultDetailRow & {
  result_units: { unit_id: string }[];
};

export const fetchResultsByUniversity = async (
  entityId: string,
  batchId: string,
  entityType: EntityType = "university",
): Promise<JoinedResultDetailRow[]> => {
  const { data, error } = await supabase
    .from("result_details")
    .select("*, result_units(unit_id)")
    .eq(getEntityColumn(entityType), entityId)
    .eq("batch_id", batchId)
    .order("result_datetime", { ascending: false });

  if (error) throw error;
  return (data || []) as JoinedResultDetailRow[];
};

export const insertResultWithJunction = async (
  values: ResultDetailFormValues & { entityId: string; entityType?: EntityType; batch_id: string },
): Promise<ResultDetailRow> => {
  const { unit_ids, entityId, entityType = "university", ...rest } = values;

  const { data: result, error: rErr } = await supabase
    .from("result_details")
    .insert({ ...rest, ...buildEntityPayload(entityId, entityType) })
    .select()
    .single();

  if (rErr) throw rErr;

  if (unit_ids.length > 0) {
    const jRows = unit_ids.map((uId) => ({ result_id: result.id, unit_id: uId }));
    const { error: jErr } = await supabase.from("result_units").insert(jRows);
    if (jErr) {
      await supabase.from("result_details").delete().eq("id", result.id);
      throw jErr;
    }
  }

  return result as ResultDetailRow;
};

export const updateResultWithJunction = async (
  id: string,
  values: ResultDetailFormValues,
): Promise<ResultDetailRow> => {
  const { unit_ids, ...rest } = values;

  const { data: result, error: rErr } = await supabase
    .from("result_details")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (rErr) throw rErr;

  await supabase.from("result_units").delete().eq("result_id", id);
  if (unit_ids.length > 0) {
    const jRows = unit_ids.map((uId) => ({ result_id: id, unit_id: uId }));
    const { error: jErr } = await supabase.from("result_units").insert(jRows);
    if (jErr) throw jErr;
  }

  return result as ResultDetailRow;
};

export const deleteResult = async (id: string): Promise<void> => {
  const { error } = await supabase.from("result_details").delete().eq("id", id);
  if (error) throw error;
};

// ─── Fetch Latest Events for Prefilling ──────────────────────────────────────

export const fetchLatestCircularByEntity = async (
  entityId: string,
  entityType: EntityType = "university",
): Promise<JoinedCircularRow | null> => {
  const { data, error } = await supabase
    .from("circulars")
    .select("*, circular_units(unit_id)")
    .is("deleted_at", null)
    .eq(getEntityColumn(entityType), entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as JoinedCircularRow | null;
};

export const fetchLatestApplicationByEntity = async (
  entityId: string,
  entityType: EntityType = "university",
): Promise<JoinedApplicationDetailRow | null> => {
  const { data, error } = await supabase
    .from("application_details")
    .select("*, application_units(unit_id), application_phases(*)")
    .eq(getEntityColumn(entityType), entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as JoinedApplicationDetailRow | null;
};

export const fetchLatestExamScheduleByEntity = async (
  entityId: string,
  entityType: EntityType = "university",
): Promise<JoinedExamScheduleRow | null> => {
  const entityCol = getEntityColumn(entityType);
  const selectStr =
    `*, unit:admission_units!inner(unit_name_bn, unit_name_en, ${entityCol})` as string;
  const { data, error } = await (supabase.from("exam_schedules").select(selectStr) as any)
    .eq(`unit.${entityCol}`, entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as JoinedExamScheduleRow | null;
};

export const fetchLatestAdmitCardByEntity = async (
  entityId: string,
  entityType: EntityType = "university",
): Promise<JoinedAdmitCardDetailRow | null> => {
  const { data, error } = await supabase
    .from("admit_card_details")
    .select("*, admit_card_units(unit_id)")
    .eq(getEntityColumn(entityType), entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as JoinedAdmitCardDetailRow | null;
};

export const fetchLatestResultByEntity = async (
  entityId: string,
  entityType: EntityType = "university",
): Promise<JoinedResultDetailRow | null> => {
  const { data, error } = await supabase
    .from("result_details")
    .select("*, result_units(unit_id)")
    .eq(getEntityColumn(entityType), entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as JoinedResultDetailRow | null;
};
