// =============================================================================
// Cluster Details — Type Definitions
// Maps 1-to-1 with the Supabase schema for clusters.
// =============================================================================

export type ClusterType = "university" | "college" | "mixed" | "affiliation";

export type Cluster = {
  id: string;
  slug: string;
  name_bn: string;
  short_name_bn: string;
  name_en: string;
  short_name_en: string;
  cluster_type: ClusterType;
  parent_university_id?: string | null;
  website_url?: string | null;
  admission_url?: string | null;
  logo_url?: string | null;
  history?: string | null;
  history_source?: { label: string; url: string }[] | null;
  description?: string | null;
  created_at?: string;
};

export type ClusterUniversity = {
  id: string;
  cluster_id: string;
  university_id: string;
  unit_id: string | null;
};

export type ClusterCollege = {
  id: string;
  cluster_id: string;
  college_id: string;
};
