import { z } from "zod";

export const COLLEGE_CATEGORIES = ["public", "private"] as const;
export type CollegeCategory = (typeof COLLEGE_CATEGORIES)[number];

export const COLLEGE_CATEGORY_LABELS: Record<CollegeCategory, string> = {
  public: "সরকারি",
  private: "বেসরকারি",
};

export type CollegeRow = {
  id: string;
  slug: string;
  eiin: string | null;
  name_bn: string;
  short_name_bn: string;
  name_en: string;
  short_name_en: string;
  category: CollegeCategory;
  sub_category: string[] | null;
  type: string[] | null;
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
  .url("সটীক URL দিন")
  .or(z.literal(""))
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : (v ?? null)));

export const collegeFormSchema = z.object({
  slug: z
    .string()
    .min(2, "স্লাগ কমপক্ষে ২ অক্ষরের হতে হবে")
    .regex(/^[a-z0-9-]+$/, "শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন"),
  eiin: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  name_bn: z.string().min(2, "নাম (বাংলা) আবশ্যক"),
  short_name_bn: z.string().min(1, "সংক্ষিপ্ত নাম (বাংলা) আবশ্যক"),
  name_en: z.string().min(2, "Name (English) is required"),
  short_name_en: z.string().min(1, "Short Name (English) is required"),
  category: z.enum(COLLEGE_CATEGORIES, {
    message: "ক্যাটাগরি নির্বাচন করুন",
  }),
  sub_category: z.array(z.string()).nullable().optional().default([]),
  type: z.array(z.string()).nullable().optional().default([]),
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

export type CollegeFormValues = z.infer<typeof collegeFormSchema>;
