// =============================================================================
// Admin College CRUD — Supabase Query & Mutation Functions
// =============================================================================

import { supabase } from "@/lib/supabase";
import type { CollegeRow, CollegeFormValues } from "@/lib/college-admin-types";

/** Fetch colleges with server-side pagination */
export const fetchCollegesPaginated = async (
  page: number,
  pageSize: number = 20,
): Promise<{ data: CollegeRow[]; count: number }> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("colleges")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("name_bn", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return {
    data: (data || []) as CollegeRow[],
    count: count || 0,
  };
};

/** Insert a new college */
export const insertCollege = async (values: CollegeFormValues): Promise<CollegeRow> => {
  const { data, error } = await supabase.from("colleges").insert(values).select().single();

  if (error) throw error;
  return data as CollegeRow;
};

/** Update an existing college by ID */
export const updateCollege = async (id: string, values: CollegeFormValues): Promise<CollegeRow> => {
  const { data, error } = await supabase
    .from("colleges")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as CollegeRow;
};

/** Delete a college by ID */
export const deleteCollege = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("colleges")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

/** Fetch a single college by ID */
export const fetchCollegeById = async (id: string): Promise<CollegeRow> => {
  const { data, error } = await supabase
    .from("colleges")
    .select("*")
    .is("deleted_at", null)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CollegeRow;
};
