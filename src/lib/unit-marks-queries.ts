// =============================================================================
// Supabase Queries & Mutations for unit_marks_distributions
// =============================================================================

import { supabase } from "@/lib/supabase";
import type {
  UnitMarksDistributionRow,
  UnitMarksDistributionFormValues,
} from "@/lib/unit-marks-types";

// ─── Fetch all distributions for a given unit ─────────────────────────────────

export const fetchMarkDistributionsByUnit = async (
  unitId: string,
): Promise<UnitMarksDistributionRow[]> => {
  const { data, error } = await supabase
    .from("unit_marks_distributions")
    .select("*")
    .is("deleted_at", null)
    .eq("unit_id", unitId)
    .order("id", { ascending: true });

  if (error) throw error;
  return (data || []) as UnitMarksDistributionRow[];
};

// ─── Fetch a single distribution by id ───────────────────────────────────────

export const fetchMarkDistributionById = async (id: string): Promise<UnitMarksDistributionRow> => {
  const { data, error } = await supabase
    .from("unit_marks_distributions")
    .select("*")
    .is("deleted_at", null)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as UnitMarksDistributionRow;
};

// ─── Insert ───────────────────────────────────────────────────────────────────

export const insertMarkDistribution = async (
  values: UnitMarksDistributionFormValues,
): Promise<UnitMarksDistributionRow> => {
  const { data, error } = await supabase
    .from("unit_marks_distributions")
    .insert({
      ...values,
      subject_selection_rules: values.subject_selection_rules || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as UnitMarksDistributionRow;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateMarkDistribution = async (
  id: string,
  values: UnitMarksDistributionFormValues,
): Promise<UnitMarksDistributionRow> => {
  const { data, error } = await supabase
    .from("unit_marks_distributions")
    .update({
      ...values,
      subject_selection_rules: values.subject_selection_rules || [],
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UnitMarksDistributionRow;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteMarkDistribution = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("unit_marks_distributions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};
