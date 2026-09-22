// =============================================================================
// Admin — Master Question Bank Types & Zod Schemas
// Tables: master_qb_streams, master_qb_units
// =============================================================================

import { z } from "zod";

// ─── master_qb_streams ────────────────────────────────────────────────────────

export type MasterQbStreamRow = {
  id: number;
  slug: string;
  name_bn: string;
  short_name_bn: string | null;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  paper_ids: string[];
};

export const masterQbStreamFormSchema = z.object({
  name_bn: z.string().min(1, "বাংলা নাম আবশ্যক"),
  short_name_bn: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  slug: z
    .string()
    .min(1, "স্লাগ আবশ্যক")
    .regex(/^[a-z0-9-]+$/, "শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  icon_url: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  sort_order: z.coerce.number().int().default(0),
  paper_ids: z.array(z.string()).optional().default([]),
});

export type MasterQbStreamFormValues = z.infer<typeof masterQbStreamFormSchema>;

// ─── master_qb_units (composite PK: stream_id + unit_id) ───────────────────────

export type MasterQbUnitRow = {
  stream_id: number;
  unit_id: string;
};

// ─── Institution tree (universities / clusters + admission_units) ─────────────

export type InstitutionUnit = {
  id: string;
  unit_name_bn: string;
  unit_name_en: string | null;
  unit_slug: string;
  sort_order: number;
  calculator_allowed: boolean | null;
};

export type QbInstitution = {
  id: string;
  type: "university" | "cluster";
  name_bn: string;
  name_en: string;
  short_name_bn: string | null;
  logo_url: string | null;
  units: InstitutionUnit[];
};

// ─── curriculum_papers (multi-select source) ───────────────────────────────────

export type CurriculumPaperOption = {
  id: string;
  name_en: string;
  name_bn: string | null;
  short_code: string | null;
  discipline_id: string | null;
  discipline_name_bn: string | null;
  discipline_name_en: string | null;
};
