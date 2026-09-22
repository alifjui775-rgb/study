// =============================================================================
// Admin Cluster CRUD — Supabase Query & Mutation Functions
// =============================================================================

import { supabase } from "@/lib/supabase";
import type { ClusterRow, ClusterFormValues } from "@/lib/cluster-admin-types";
import type { Database } from "@/lib/database.types";

/** Fetch clusters with server-side pagination */
export const fetchClustersPaginated = async (
  page: number,
  pageSize: number = 20,
): Promise<{ data: ClusterRow[]; count: number }> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("clusters")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("name_bn", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return {
    data: (data || []) as ClusterRow[],
    count: count || 0,
  };
};

/** Fetch linked university mappings (with unit_id) for a cluster */
export const fetchClusterUniversities = async (
  clusterId: string,
): Promise<{ university_id: string; unit_id: string | null }[]> => {
  const { data, error } = await supabase
    .from("cluster_universities")
    .select("university_id, unit_id")
    .eq("cluster_id", clusterId);

  if (error) throw error;
  return (data || []).map((row) => ({
    university_id: row.university_id,
    unit_id: row.unit_id,
  }));
};

/** Fetch linked college IDs for a cluster */
export const fetchClusterColleges = async (clusterId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("cluster_colleges")
    .select("college_id")
    .eq("cluster_id", clusterId);

  if (error) throw error;
  return (data || []).map((row) => row.college_id);
};

/** Fetch minimal list of universities (id, name, logo) for checkbox options */
export const fetchAllUniversitiesMinimal = async () => {
  const { data, error } = await supabase
    .from("universities")
    .select("id, name_bn, name_en, logo_url")
    .is("deleted_at", null)
    .order("name_bn", { ascending: true });

  if (error) throw error;
  return data || [];
};

/** Fetch minimal list of colleges (id, name, logo) for checkbox options */
export const fetchAllCollegesMinimal = async () => {
  const { data, error } = await supabase
    .from("colleges")
    .select("id, name_bn, name_en, logo_url")
    .is("deleted_at", null)
    .order("name_bn", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const fetchClusterById = async (id: string): Promise<ClusterRow> => {
  const { data, error } = await supabase
    .from("clusters")
    .select("*")
    .is("deleted_at", null)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ClusterRow;
};

export const fetchClusterBySlug = async (slug: string): Promise<ClusterRow> => {
  const { data, error } = await supabase
    .from("clusters")
    .select("*")
    .is("deleted_at", null)
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data as ClusterRow;
};

/** Sync cluster institutions in junction tables */
export const syncClusterInstitutions = async (
  clusterId: string,
  institutionIds: string[],
  isUni: boolean,
): Promise<void> => {
  if (isUni) {
    const { error: delErr } = await supabase
      .from("cluster_universities")
      .delete()
      .eq("cluster_id", clusterId);
    if (delErr) throw delErr;

    if (institutionIds.length > 0) {
      const payload = institutionIds.map((id) => ({
        cluster_id: clusterId,
        university_id: id,
      }));
      const { error: insErr } = await supabase.from("cluster_universities").insert(payload);
      if (insErr) throw insErr;
    }
  } else {
    const { error: delErr } = await supabase
      .from("cluster_colleges")
      .delete()
      .eq("cluster_id", clusterId);
    if (delErr) throw delErr;

    if (institutionIds.length > 0) {
      const payload = institutionIds.map((id) => ({
        cluster_id: clusterId,
        college_id: id,
      }));
      const { error: insErr } = await supabase.from("cluster_colleges").insert(payload);
      if (insErr) throw insErr;
    }
  }
};

/** Sync all university-to-unit mappings for a cluster in one shot */
export const syncClusterUniversityMappings = async (
  clusterId: string,
  mappings: Record<string, string | null>,
): Promise<void> => {
  // Delete ALL existing mappings for this cluster
  const { error: delErr } = await supabase
    .from("cluster_universities")
    .delete()
    .eq("cluster_id", clusterId);
  if (delErr) throw delErr;

  // Insert every entry in the map
  const entries = Object.entries(mappings);
  if (entries.length > 0) {
    const payload = entries.map(([university_id, unit_id]) => ({
      cluster_id: clusterId,
      university_id,
      unit_id: unit_id || null,
    }));
    const { error: insErr } = await supabase.from("cluster_universities").insert(payload);
    if (insErr) throw insErr;
  }
};

/** Fetch admission units belonging to a cluster */
export const fetchClusterAdmissionUnits = async (
  clusterId: string,
): Promise<{ id: string; unit_name_bn: string; unit_slug: string }[]> => {
  const { data, error } = await supabase
    .from("admission_units")
    .select("id, unit_name_bn, unit_slug")
    .is("deleted_at", null)
    .eq("cluster_id", clusterId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as { id: string; unit_name_bn: string; unit_slug: string }[];
};

/** Fetch admission units belonging to a university */
export const fetchUniversityAdmissionUnits = async (
  universityId: string,
): Promise<{ id: string; unit_name_bn: string; unit_slug: string }[]> => {
  const { data, error } = await supabase
    .from("admission_units")
    .select("id, unit_name_bn, unit_slug")
    .is("deleted_at", null)
    .eq("university_id", universityId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as { id: string; unit_name_bn: string; unit_slug: string }[];
};

/** Insert a new cluster with its junction records */
export const insertCluster = async (values: ClusterFormValues): Promise<ClusterRow> => {
  const { institution_ids, ...clusterValues } = values;

  // 1. Insert base cluster details
  const { data: cluster, error: clusterErr } = await supabase
    .from("clusters")
    .insert(clusterValues)
    .select()
    .single();

  if (clusterErr) throw clusterErr;

  const clusterId = cluster.id;
  const isUni = values.cluster_type === "university" || values.cluster_type === "mixed";

  // 2. Insert junction records for the selected institutions
  if (institution_ids && institution_ids.length > 0) {
    if (isUni) {
      const payload = institution_ids.map((uniId) => ({
        cluster_id: clusterId,
        university_id: uniId,
      }));
      const { error: juncErr } = await supabase.from("cluster_universities").insert(payload);
      if (juncErr) throw juncErr;
    } else {
      const payload = institution_ids.map((collId) => ({
        cluster_id: clusterId,
        college_id: collId,
      }));
      const { error: juncErr } = await supabase.from("cluster_colleges").insert(payload);
      if (juncErr) throw juncErr;
    }
  }

  return cluster as ClusterRow;
};

/** Update an existing cluster with its junction records */
export const updateCluster = async (id: string, values: ClusterFormValues): Promise<ClusterRow> => {
  const { institution_ids, ...clusterValues } = values;

  // 1. Update base cluster details
  const { data: cluster, error: clusterErr } = await supabase
    .from("clusters")
    .update(clusterValues)
    .eq("id", id)
    .select()
    .single();

  if (clusterErr) throw clusterErr;

  // 2. Clear out any existing junction mappings to prevent duplicates/leftovers
  await supabase.from("cluster_universities").delete().eq("cluster_id", id);
  await supabase.from("cluster_colleges").delete().eq("cluster_id", id);

  // 3. Insert newly selected junction mappings
  if (institution_ids && institution_ids.length > 0) {
    const isUni = values.cluster_type === "university" || values.cluster_type === "mixed";
    if (isUni) {
      const payload = institution_ids.map((uniId) => ({
        cluster_id: id,
        university_id: uniId,
      }));
      const { error: juncErr } = await supabase.from("cluster_universities").insert(payload);
      if (juncErr) throw juncErr;
    } else {
      const payload = institution_ids.map((collId) => ({
        cluster_id: id,
        college_id: collId,
      }));
      const { error: juncErr } = await supabase.from("cluster_colleges").insert(payload);
      if (juncErr) throw juncErr;
    }
  }

  return cluster as ClusterRow;
};

/** Delete a cluster and cascade delete from junctions */
export const deleteCluster = async (id: string): Promise<void> => {
  // Manual junction cleaning before delete for safety
  await supabase.from("cluster_universities").delete().eq("cluster_id", id);
  await supabase.from("cluster_colleges").delete().eq("cluster_id", id);

  const { error } = await supabase
    .from("clusters")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};
