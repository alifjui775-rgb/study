// =============================================================================
// Admin CRUD — Types & Zod Schemas for University Management Tabs (Phase 2)
// =============================================================================

import { z } from "zod";

// Helper for optional URLs
const optionalUrl = z
  .string()
  .url("সঠিক URL দিন")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : (v ?? null)));

// ─── 1. University Units ──────────────────────────────────────────────────────

export type UniversityUnitRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  unit_name_bn: string;
  unit_name_en: string | null;
  unit_slug: string;
  primary_group_id: string | null;
  allowed_group_ids: string[] | null;
  exam_center_note: string | null;
  sort_order: number;
};

export const universityUnitSchema = z.object({
  unit_name_bn: z.string().min(1, "ইউনিটের বাংলা নাম আবশ্যক"),
  unit_name_en: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  unit_slug: z
    .string()
    .min(1, "ইউনিট স্লাগ আবশ্যক")
    .regex(/^[a-z0-9-]+$/, "শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  primary_group_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  allowed_group_ids: z.array(z.string()).default([]),
  exam_center_note: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  sort_order: z.coerce.number().int().default(0),
});

export type UniversityUnitFormValues = z.infer<typeof universityUnitSchema>;

// ─── 2. University Subjects ───────────────────────────────────────────────────

export type UniversitySubjectRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  degree_program_id: string;
  unit_id: string | null;
  custom_review_url: string | null;
};

export const universitySubjectSchema = z.object({
  degree_program_id: z.string().uuid("সঠিক সাবজেক্ট নির্বাচন করুন"),
  unit_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  custom_review_url: optionalUrl,
});

export type UniversitySubjectFormValues = z.infer<typeof universitySubjectSchema>;

// ─── 3. Map Locations ────────────────────────────────────────────────────────

export type MapLocationRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  category: string;
  name: string;
  google_maps_url: string;
  lat: number | null;
  lng: number | null;
  tooltip: string | null;
  sort_order: number;
};

export const mapLocationSchema = z.object({
  category: z.string().min(1, "ক্যাটাগরি আবশ্যক"),
  name: z.string().min(1, "নাম আবশ্যক"),
  google_maps_url: z.string().url("সঠিক URL দিন"),
  lat: z.coerce
    .number()
    .optional()
    .nullable()
    .transform((v) => (v === 0 ? null : v)),
  lng: z.coerce
    .number()
    .optional()
    .nullable()
    .transform((v) => (v === 0 ? null : v)),
  tooltip: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  sort_order: z.coerce.number().int().default(0),
});

export type MapLocationFormValues = z.infer<typeof mapLocationSchema>;

// ─── 4. University Links ──────────────────────────────────────────────────────

export type UniversityLinkRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  label: string;
  url: string;
  is_external: boolean;
  col_span: number;
  row_group: number;
  sort_order: number;
};

export const universityLinkSchema = z.object({
  label: z.enum([
    "সার্কুলার",
    "প্রশ্নব্যাংক",
    "ভর্তি ওয়েবসাইট",
    "মূল ওয়েবসাইট",
    "আবেদন",
    "প্রবেশপত্র",
    "ফলাফল",
    "আবেদন | প্রবেশপত্র | ফলাফল",
    "অধিভুক্ত কলেজ ভর্তি",
  ]),
  url: z
    .string()
    .min(1, "ইউআরএল আবশ্যক")
    .refine(
      (val) => {
        if (val.startsWith("/")) return true;
        if (val.startsWith("#")) return true;
        try {
          new URL(val);
          return true;
        } catch (_) {
          return false;
        }
      },
      { message: "সঠিক URL, অথবা / বা # দিয়ে শুরু হওয়া লিঙ্ক দিন" },
    ),
  is_external: z.boolean().default(true),
  col_span: z.coerce.number().int().min(1).default(1),
  row_group: z.coerce.number().int(),
  sort_order: z.coerce.number().int().default(0),
});

export type UniversityLinkFormValues = z.infer<typeof universityLinkSchema>;

// ─── 5. GPA Calculation Methods ───────────────────────────────────────────────

export type GpaCalculationMethodRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  method: string;
  max_gpa: number | null;
  ssc_max_marks: number | null;
  hsc_max_marks: number | null;
  ssc_weight: number;
  hsc_weight: number;
  total_score: number;
  notes: string | null;
};

export const gpaCalculationMethodSchema = z.object({
  method: z.enum(["gpa", "marks"]),
  max_gpa: z.coerce.number().min(0).nullable().optional(),
  ssc_max_marks: z.coerce
    .number()
    .optional()
    .nullable()
    .transform((v) => (v === 0 ? null : v)),
  hsc_max_marks: z.coerce
    .number()
    .optional()
    .nullable()
    .transform((v) => (v === 0 ? null : v)),
  ssc_weight: z.coerce.number().min(0, "০ বা তার বড় হতে হবে"),
  hsc_weight: z.coerce.number().min(0, "০ বা তার বড় হতে হবে"),
  total_score: z.coerce.number().min(0, "০ বা তার বড় হতে হবে"),
  notes: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
});

export type GpaCalculationMethodFormValues = z.infer<typeof gpaCalculationMethodSchema>;

// ─── 6. University General Info ───────────────────────────────────────────────

export type UniversityGeneralInfoRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  unit_id: string | null;
  label: string;
  value: string;
  sort_order: number;
};

export const universityGeneralInfoSchema = z.object({
  unit_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  label: z.string().min(1, "লেবেল আবশ্যক"),
  value: z.string().min(1, "মান আবশ্যক"),
  sort_order: z.coerce.number().int().default(0),
});

export type UniversityGeneralInfoFormValues = z.infer<typeof universityGeneralInfoSchema>;

// ─── 7. Dynamic Notes ────────────────────────────────────────────────────────

export type DynamicNoteRow = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  unit_id: string | null;
  display_section: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  unit?: {
    id: string;
    unit_name_bn: string;
    unit_name_en: string | null;
  } | null;
};

export const dynamicNoteSchema = z.object({
  unit_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "none" || v === "" ? null : (v ?? null))),
  display_section: z.string().min(1, "প্রদর্শনের স্থান/সেকশন আবশ্যক"),
  title: z.string().min(1, "টাইটেল আবশ্যক"),
  content: z.string().min(1, "বিস্তারিত কন্টেন্ট আবশ্যক"),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export type DynamicNoteFormValues = z.infer<typeof dynamicNoteSchema>;
