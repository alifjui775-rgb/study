// =============================================================================
// College Details — Type Definitions
// Maps 1-to-1 with the normalized Supabase PostgreSQL schema.
// =============================================================================

export type College = {
  id: string;
  slug: string;
  eiin?: string | null;
  name_bn: string;
  short_name_bn: string;
  name_en: string;
  short_name_en: string;
  category: string;
  sub_category?: string[] | null;
  type?: string[] | null;
  website_url?: string | null;
  admission_url?: string | null;
  logo_url?: string | null;
  history?: string | null;
  description?: string | null;
  history_source?: { label: string; url: string }[] | null;
  created_at: string;
};
