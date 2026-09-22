// =============================================================================
// Admin Cluster CRUD — Types & Zod Schemas
// Matches the exact DB schema for clusters and junction tables.
// =============================================================================

import { z } from "zod";
import type { ClusterType } from "./cluster-types";

// --- Enums ---
export const CLUSTER_TYPES = ["university", "college", "mixed", "affiliation"] as const;

// --- Display labels (Bangla) ---
export const CLUSTER_TYPE_LABELS: Record<ClusterType, string> = {
  university: "বিশ্ববিদ্যালয় (University)",
  college: "কলেজ (College)",
  mixed: "মিশ্র গুচ্ছ (Mixed)",
  affiliation: "অধিভুক্ত কলেজ (Affiliated Colleges)",
};

// --- DB Row Type ---
export type ClusterRow = {
  id: string;
  slug: string;
  name_bn: string;
  short_name_bn: string;
  name_en: string;
  short_name_en: string;
  cluster_type: ClusterType;
  parent_university_id: string | null;
  website_url: string | null;
  admission_url: string | null;
  logo_url: string | null;
  history: string | null;
  history_source: { label: string; url: string }[] | null;
  description: string | null;
  created_at?: string;
};

// --- Zod Form Schema ---
const optionalUrl = z
  .string()
  .url("সঠিক URL দিন")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === null ? null : v));

export const clusterFormSchema = z.object({
  slug: z
    .string()
    .min(2, "স্লাগ কমপক্ষে ২ অক্ষরের হতে হবে")
    .regex(/^[a-z0-9-]+$/, "শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  name_bn: z.string().min(2, "নাম (বাংলা) আবশ্যক"),
  short_name_bn: z.string().min(1, "সংক্ষিপ্ত নাম (বাংলা) আবশ্যক"),
  name_en: z.string().min(2, "Name (English) is required"),
  short_name_en: z.string().min(1, "Short Name (English) is required"),
  cluster_type: z.enum(CLUSTER_TYPES, {
    message: "ক্লাস্টার টাইপ নির্বাচন করুন",
  }),
  website_url: optionalUrl,
  admission_url: optionalUrl,
  logo_url: optionalUrl,
  history: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  history_source: z
    .array(
      z.object({
        label: z.string().min(1, "সোর্স লেবেল আবশ্যক"),
        url: z.string().url("সঠিক URL দিন").or(z.literal("")),
      }),
    )
    .nullable()
    .optional()
    .default([]),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  parent_university_id: z
    .string()
    .uuid("সঠিক UUID দিন")
    .or(z.literal(""))
    .nullable()
    .optional()
    .default(null)
    .transform((v) => (v === "" || v === undefined ? null : v)),
  institution_ids: z.array(z.string()).default([]),
});

export type ClusterFormValues = z.infer<typeof clusterFormSchema>;
