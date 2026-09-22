import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Batch = {
  id: string;
  name: string;
  year: number;
  is_current: boolean;
};

export type BatchFetchContext = "all" | "recent_info" | "courses";

export const fetchBatches = async (context: BatchFetchContext): Promise<Batch[]> => {
  let query = supabase
    .from("batches")
    .select("*")
    .is("deleted_at", null)
    .order("year", { ascending: false });

  if (context === "recent_info") {
    query = query.gte("year", 2021);
  } else if (context === "courses") {
    const currentYear = new Date().getFullYear();
    query = query.or(`is_current.eq.true,year.gte.${currentYear - 1}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as Batch[];
};

export function useBatches(context: BatchFetchContext) {
  return useQuery({
    queryKey: ["batches", context],
    queryFn: () => fetchBatches(context),
  });
}
