// =============================================================================
// Admin CRUD — Types & Zod Schemas for Batches, Groups, Subjects
// =============================================================================

import { z } from "zod";

// ─── Batches ────────────────────────────────────────────────────────────────

export type BatchRow = {
  id: string;
  name: string;
  year: number;
  is_current: boolean;
};

export const batchFormSchema = z.object({
  name: z.string().min(1, "ব্যাচের নাম আবশ্যক"),
  year: z.coerce.number().int().min(2020, "সাল ২০২০ বা তার পরে হতে হবে"),
  is_current: z.boolean().default(false),
});

export type BatchFormValues = z.infer<typeof batchFormSchema>;

// ─── Groups ─────────────────────────────────────────────────────────────────

export type GroupRow = {
  id: string;
  name_bn: string;
  name_en: string;
};

export const groupFormSchema = z.object({
  name_bn: z.string().min(1, "বাংলা নাম আবশ্যক"),
  name_en: z.string().min(1, "English name is required"),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;

// ─── Degree Programs (degree_programs) ────────────────────────────────────────

export type ReviewSource = {
  title: string;
  url: string;
};

export type DegreeProgramRow = {
  id: string;
  slug: string;
  short_name: string;
  full_name_en: string;
  full_name_bn: string | null;
  description: string | null;
  review: string | null;
  review_sources: ReviewSource[] | null;
  faculty_id: number | null;
  faculties?: { id: number; name_bn: string; name_en: string } | null;
  lucide_icon_name?: string | null;
};

const optionalUrl = z
  .string()
  .url("সঠিক URL দিন")
  .or(z.literal(""))
  .optional()
  .transform((v) => (v === "" ? null : v));

export const degreeProgramFormSchema = z.object({
  slug: z
    .string()
    .min(1, "স্লাগ আবশ্যক")
    .regex(/^[a-z0-9-]+$/, "শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  short_name: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  full_name_en: z.string().min(2, "Full name (English) is required"),
  full_name_bn: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  review: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  review_sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      }),
    )
    .optional()
    .nullable()
    .default([]),
  faculty_id: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      return typeof v === "string" ? parseInt(v, 10) : v;
    }),
  lucide_icon_name: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
});

export type DegreeProgramFormValues = z.infer<typeof degreeProgramFormSchema>;

// ─── Study Levels (study_levels table) ──────────────────────────────────────

export type StudyLevelRow = {
  id: number;
  name: string;
  code: string;
};

export const studyLevelFormSchema = z.object({
  id: z.coerce.number().int().min(1, "আইডি আবশ্যক ও পজিটিভ হতে হবে"),
  name: z.string().min(1, "নাম আবশ্যক"),
  code: z.string().min(1, "কোড আবশ্যক"),
});

export type StudyLevelFormValues = z.infer<typeof studyLevelFormSchema>;

// ─── Admission Subjects (study_disciplines table) ───────────────────────────

export type StudyDisciplineRow = {
  id: string;
  name_en: string;
  name_bn: string;
  short_code: string;
  level_id: number | null;
  group_ids?: string[];
};

export const studyDisciplineSchema = z.object({
  name_en: z.string().min(2, "English name is required"),
  name_bn: z.string().min(1, "বাংলা নাম আবশ্যক"),
  short_code: z.string().min(1, "সংক্ষিপ্ত কোড আবশ্যক"),
  level_id: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      return typeof v === "string" ? parseInt(v, 10) : v;
    }),
  group_ids: z.array(z.string()).optional().default([]),
});

export type StudyDisciplineFormValues = z.infer<typeof studyDisciplineSchema>;

// ─── HSC Subjects (curriculum_papers table) ────────────────────────────────────

export type CurriculumPaperRow = {
  id: string;
  name_en: string;
  name_bn: string | null;
  short_code: string | null;
  discipline_id: string | null;
  group_ids?: string[];
};

export const curriculumPaperSchema = z.object({
  name_en: z.string().min(2, "English name is required"),
  name_bn: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  short_code: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  discipline_id: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  group_ids: z.array(z.string()).optional().default([]),
});

export type CurriculumPaperFormValues = z.infer<typeof curriculumPaperSchema>;

// ─── Faculties (faculties table) ─────────────────────────────────────────────

export type FacultyRow = {
  id: number;
  name_en: string;
  name_bn: string;
  deleted_at: string | null;
};

export const facultyFormSchema = z.object({
  name_en: z.string().min(2, "English name is required"),
  name_bn: z.string().min(1, "বাংলা নাম আবশ্যক"),
});

export type FacultyFormValues = z.infer<typeof facultyFormSchema>;
