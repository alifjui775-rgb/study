// =============================================================================
// Admin University CRUD — Supabase Query & Mutation Functions
// =============================================================================

import { supabase } from "@/lib/supabase";
import type { UniversityRow, UniversityFormValues } from "@/lib/university-admin-types";

/** Fetch universities with server-side pagination, category filter, and search */
export const fetchUniversitiesPaginated = async (
  page: number,
  pageSize: number = 50,
  category?: string,
  searchTerm?: string,
): Promise<{ data: UniversityRow[]; count: number }> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("universities")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("name_bn", { ascending: true })
    .range(from, to);

  if (category) {
    query = query.eq("category", category);
  }

  if (searchTerm) {
    query = query.or(
      `name_bn.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%,short_name_bn.ilike.%${searchTerm}%,short_name_en.ilike.%${searchTerm}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    data: (data || []) as UniversityRow[],
    count: count || 0,
  };
};

/** Insert a new university */
export const insertUniversity = async (values: UniversityFormValues): Promise<UniversityRow> => {
  const { data, error } = await supabase.from("universities").insert(values).select().single();

  if (error) throw error;
  return data as UniversityRow;
};

/** Update an existing university by ID */
export const updateUniversity = async (
  id: string,
  values: UniversityFormValues,
): Promise<UniversityRow> => {
  const { data, error } = await supabase
    .from("universities")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UniversityRow;
};

/** Delete a university by ID */
export const deleteUniversity = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("universities")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

/** Fetch a single university by ID */
export const fetchUniversityById = async (id: string): Promise<UniversityRow> => {
  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .is("deleted_at", null)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as UniversityRow;
};

/** Fetch a single university by slug */
export const fetchUniversityBySlug = async (slug: string): Promise<UniversityRow> => {
  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .is("deleted_at", null)
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data as UniversityRow;
};
