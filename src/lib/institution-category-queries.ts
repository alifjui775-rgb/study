import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type InstitutionSubCategory = {
  id: string;
  name_bn: string;
  name_en: string;
  short_code: string;
};

export async function fetchInstitutionSubCategories(): Promise<InstitutionSubCategory[]> {
  const { data, error } = await supabase
    .from("institution_sub_categories")
    .select("id, name_bn, name_en, short_code");

  if (error) throw error;
  return data || [];
}

export type SubCategoryMap = Record<
  string,
  { name_bn: string; name_en: string; short_code: string }
>;

export function buildSubCategoryMap(categories: InstitutionSubCategory[]): SubCategoryMap {
  const map: SubCategoryMap = {};
  for (const cat of categories) {
    map[cat.id] = { name_bn: cat.name_bn, name_en: cat.name_en, short_code: cat.short_code };
  }
  return map;
}

export function useSubCategoryMap(): SubCategoryMap {
  const { data } = useQuery({
    queryKey: ["institution-sub-categories"],
    queryFn: fetchInstitutionSubCategories,
    staleTime: 10 * 60 * 1000,
  });
  return buildSubCategoryMap(data || []);
}
