import { z } from "zod";

export const UNIVERSITY_CATEGORIES = ["public", "private", "international"] as const;
export type UniversityCategory = (typeof UNIVERSITY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<UniversityCategory, string> = {
  public: "পাবলিক",
  private: "প্রাইভেট",
  international: "আন্তর্জাতিক",
};

export type UniversityRow = {
  id: string;
  slug: string;
  name_bn: string;
  short_name_bn: string;
  name_en: string;
  short_name_en: string;
  category: UniversityCategory;
  sub_category: string[] | null;
  second_time: boolean;
  unit_change: string | null;
  website_url: string | null;
  admission_url: string | null;
  logo_url: string | null;
  history: string | null;
  history_source: { label: string; url: string }[] | null;
  description: string | null;
  created_at: string;
};

const optionalUrl = z
  .string()
  .url("সঠিক URL দিন")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === null ? null : v));

export const universityFormSchema = z.object({
  slug: z
    .string()
    .min(2, "স্লাগ কমপক্ষে ২ অক্ষরের হতে হবে")
    .regex(/^[a-z0-9-]+$/, "শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  name_bn: z.string().min(2, "নাম (বাংলা) আবশ্যক"),
  short_name_bn: z.string().min(1, "সংক্ষিপ্ত নাম (বাংলা) আবশ্যক"),
  name_en: z.string().min(2, "Name (English) is required"),
  short_name_en: z.string().min(1, "Short Name (English) is required"),
  category: z.enum(UNIVERSITY_CATEGORIES, {
    message: "ক্যাটাগরি নির্বাচন করুন",
  }),
  sub_category: z.array(z.string()).nullable().optional().default([]),
  second_time: z.boolean().default(false),
  unit_change: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
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
});

export type UniversityFormValues = z.infer<typeof universityFormSchema>;
