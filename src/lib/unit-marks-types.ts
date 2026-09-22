// =============================================================================
// Types & Zod Schemas for unit_marks_distributions (including nested JSONB)
// =============================================================================

import { z } from "zod";

// ─── JSONB Nested Types ───────────────────────────────────────────────────────

export const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  mcq: z.coerce.number().optional().nullable(),
  written: z.coerce.number().optional().nullable(),
  total_marks: z.coerce.number().optional().nullable(),
  pass_marks: z.coerce.number().optional().nullable(),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

export const ruleSchema = z.object({
  type: z.enum(["mandatory", "selective", "alternative"]),
  title: z.string().min(1, "Title is required"),
  note: z.string().optional().nullable(),
  subjects: z.array(subjectSchema).default([]),
});

export type RuleFormValues = z.infer<typeof ruleSchema>;

export const targetGroupSchema = z.object({
  target_group: z.string().min(1, "Target group name is required"),
  group_ids: z.array(z.string()).default([]),
  total_subjects_to_answer: z.coerce.number().int().min(1),
  rules: z.array(ruleSchema).default([]),
});

export type TargetGroupFormValues = z.infer<typeof targetGroupSchema>;

// ─── Flat + JSONB combined form schema ───────────────────────────────────────

export const unitMarksDistributionSchema = z.object({
  unit_id: z.string().uuid("A valid unit UUID is required"),
  total_marks: z.coerce.number().optional().nullable(),
  mcq_marks: z.coerce.number().optional().nullable(),
  written_marks: z.coerce.number().optional().nullable(),
  other_marks: z.coerce.number().optional().nullable(),
  other_marks_type: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  total_time: z.coerce.number().optional().nullable(),
  general_note: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  subject_selection_rules: z.array(targetGroupSchema).default([]),
});

export type UnitMarksDistributionFormValues = z.infer<typeof unitMarksDistributionSchema>;

// ─── DB Row type ──────────────────────────────────────────────────────────────

export type UnitMarksDistributionRow = {
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
