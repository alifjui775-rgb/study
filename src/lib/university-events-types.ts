// =============================================================================
// Admin CRUD — Types & Zod Schemas for Admission Events (Phase 3)
// =============================================================================

import { z } from "zod";

const optionalUrl = z
  .string()
  .url("সঠিক URL দিন")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : (v ?? null)));

const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : (v ?? null)));

const optionalYear = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().int().min(2010, "সঠিক সাল দিন").nullable().optional(),
);

const optionalGpa = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().min(0.0).max(5.0).nullable().optional(),
);

const optionalTotalGpa = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().min(0.0).max(10.0).nullable().optional(),
);

// ─── 1. Seats (subject_group_seats) ──────────────────────────────────────────

export type SubjectGroupSeatRow = {
  id: string;
  university_subject_id: string;
  group_id: string | null;
  seat_count: number;
  is_assumed: boolean;
};

export const subjectGroupSeatSchema = z.object({
  university_subject_id: z.string().uuid("সঠিক সাবজেক্ট নির্বাচন করুন"),
  group_seats: z
    .array(
      z.object({
        group_id: z.string().nullable(),
        seat_count: z.coerce.number().int().min(0, "আসন সংখ্যা অবশ্যই ধনাত্মক হতে হবে"),
      }),
    )
    .min(1, "অন্তত একটি গ্রুপ নির্বাচন করুন"),
  is_assumed: z.boolean().default(false),
});

export type SubjectGroupSeatFormValues = z.infer<typeof subjectGroupSeatSchema>;

// ─── 2. Requirements (unit_requirements) ──────────────────────────────────────

export type UnitRequirementRow = {
  id: string;
  university_id: string | null;
  cluster_id: string | null;
  college_id: string | null;
  unit_id: string;
  group_id: string;
  ssc_year_min: number | null;
  ssc_year_max: number | null;
  hsc_year_min: number | null;
  hsc_year_max: number | null;
  ssc_min_gpa: number;
  hsc_min_gpa: number;
  total_min_gpa: number;
  ssc_min_gpa_without_4th: number | null;
  hsc_min_gpa_without_4th: number | null;
  total_min_gpa_without_4th: number | null;
  requirement_text: string | null;
  subject_requirements: any;
  custom_checks: any;
};

export const unitRequirementSchema = z.object({
  unit_id: z.string().uuid("সঠিক ইউনিট নির্বাচন করুন"),
  group_ids: z.array(z.string().uuid()).min(1, "কমপক্ষে একটি গ্রুপ সিলেক্ট করুন"),
  ssc_year_min: optionalYear,
  ssc_year_max: optionalYear,
  hsc_year_min: optionalYear,
  hsc_year_max: optionalYear,
  ssc_min_gpa: z.coerce.number().min(0.0).max(5.0).default(0.0),
  hsc_min_gpa: z.coerce.number().min(0.0).max(5.0).default(0.0),
  total_min_gpa: z.coerce.number().min(0.0).max(10.0).default(0.0),
  ssc_min_gpa_without_4th: optionalGpa,
  hsc_min_gpa_without_4th: optionalGpa,
  total_min_gpa_without_4th: optionalTotalGpa,
  requirement_text: z.string().nullable().optional(),
  subject_requirements: z
    .array(
      z.object({
        subject: z.string().min(1, "বিষয় নির্বাচন করুন"),
        gpa: z.coerce.number().min(1.0).max(5.0, "জিপিএ ১ থেকে ৫ এর মধ্যে হতে হবে"),
      }),
    )
    .default([]),
  custom_checks: z
    .array(
      z.object({
        type: z.enum([
          "atLeastNSubjectsWithMinGPA",
          "remainingSubjectsWithMinGPA",
          "targetSubjectsTotalGPA",
        ]),
        subjects: z.array(z.string()).min(1, "কমপক্ষে একটি বিষয় নির্বাচন করুন"),
        count: z.coerce.number().int().min(1).optional().nullable(),
        gpa: z.coerce
          .number()
          .min(1.0)
          .max(5.0, "জিপিএ ১ থেকে ৫ এর মধ্যে হতে হবে")
          .optional()
          .nullable(),
        minTotalGPA: z.coerce.number().min(1.0).optional().nullable(),
      }),
    )
    .default([]),
  batch_ids: z.array(z.string()).min(1, "কমপক্ষে একটি ব্যাচ সিলেক্ট করুন"),
});

export type UnitRequirementFormValues = z.infer<typeof unitRequirementSchema>;

// ─── 3. Circulars (circulars) ────────────────────────────────────────────────

export type CircularRow = {
  id: string;
  university_id: string;
  batch_id: string;
  title: string;
  download_url: string | null;
  note: string | null;
};

export const circularSchema = z.object({
  title: z.string().min(1, "শিরোনাম আবশ্যক"),
  download_url: optionalUrl,
  note: optionalString,
  unit_ids: z.array(z.string().uuid()).min(1, "অন্তত একটি ইউনিট নির্বাচন করুন"),
});

export type CircularFormValues = z.infer<typeof circularSchema>;

// ─── 4. Application Details (application_details) ────────────────────────────

export type HelpfulLink = {
  label: string;
  url: string;
};

export type ApplicationPhaseRow = {
  id: string;
  application_id: string;
  phase_name: string;
  start_datetime: string;
  end_datetime: string;
  fee: number | null;
  fee_payment_method: string | null;
  apply_url: string | null;
  phase_links: HelpfulLink[] | null;
  sort_order: number;
};

export type ApplicationDetailRow = {
  id: string;
  university_id: string;
  batch_id: string;
  start_datetime: string | null;
  end_datetime: string | null;
  fee: number | null;
  fee_payment_method: string | null;
  apply_url: string | null;
  helpful_links: HelpfulLink[] | null;
  note: string | null;
};

const helpfulLinkSchema = z.object({
  label: z.string().min(1, "লিঙ্ক লেবেল আবশ্যক"),
  url: z.string().url("সঠিক URL দিন"),
});

const applicationPhaseSchema = z.object({
  phase_name: z.string().min(1, "ধাপের নাম আবশ্যক"),
  start_datetime: z.string().min(1, "শুরুর তারিখ আবশ্যক"),
  end_datetime: z.string().min(1, "শেষের তারিখ আবশ্যক"),
  fee: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .nullable()
    .transform((v) => v ?? null),
  fee_payment_method: optionalString,
  apply_url: optionalUrl,
  phase_links: z.array(helpfulLinkSchema).default([]),
  sort_order: z.coerce.number().int().default(0),
});

export type ApplicationPhaseFormValue = z.infer<typeof applicationPhaseSchema>;

export const applicationDetailSchema = z.object({
  start_datetime: optionalString,
  end_datetime: optionalString,
  fee: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .nullable()
    .transform((v) => v ?? null),
  fee_payment_method: optionalString,
  apply_url: optionalUrl,
  helpful_links: z.array(helpfulLinkSchema).default([]),
  note: optionalString,
  unit_ids: z.array(z.string().uuid()).default([]),
  phases: z.array(applicationPhaseSchema).default([]),
});

export type ApplicationDetailFormValues = z.infer<typeof applicationDetailSchema>;

// ─── 5. Exam Schedules (exam_schedules) ──────────────────────────────────────

export type ExamScheduleRow = {
  id: string;
  unit_id: string;
  batch_id: string;
  exam_datetime: string;
  is_tentative: boolean | null;
  note: string | null;
};

export const examScheduleSchema = z.object({
  unit_id: z.string().uuid("সঠিক ইউনিট নির্বাচন করুন"),
  exam_datetime: z.string().min(1, "পরীক্ষার তারিখ ও সময় আবশ্যক"),
  is_tentative: z.boolean().default(false),
  note: optionalString,
});

export type ExamScheduleFormValues = z.infer<typeof examScheduleSchema>;

// ─── 6. Admit Card Details (admit_card_details) ──────────────────────────────

export type AdmitCardDetailRow = {
  id: string;
  university_id: string;
  batch_id: string;
  download_start_datetime: string | null;
  download_end_datetime: string | null;
  admit_card_url: string | null;
  note: string | null;
};

export const admitCardDetailSchema = z.object({
  download_start_datetime: optionalString,
  download_end_datetime: optionalString,
  admit_card_url: optionalUrl,
  note: optionalString,
  unit_ids: z.array(z.string().uuid()).default([]),
});

export type AdmitCardDetailFormValues = z.infer<typeof admitCardDetailSchema>;

// ─── 7. Result Details (result_details) ──────────────────────────────────────

export type ResultDetailRow = {
  id: string;
  university_id: string;
  batch_id: string;
  result_datetime: string | null;
  result_url: string | null;
  others_links: HelpfulLink[] | null;
  note: string | null;
};

export const resultDetailSchema = z.object({
  result_datetime: optionalString,
  result_url: optionalUrl,
  others_links: z.array(helpfulLinkSchema).default([]),
  note: optionalString,
  unit_ids: z.array(z.string().uuid()).default([]),
});

export type ResultDetailFormValues = z.infer<typeof resultDetailSchema>;
