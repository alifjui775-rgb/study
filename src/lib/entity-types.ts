// =============================================================================
// Shared Entity Types — Exclusive Arc Pattern
// Used by all admin CRUD components to support University, College, and Cluster
// =============================================================================

/** The three institution types that share the same relational tables */
export type EntityType = "university" | "college" | "cluster";

/** Build the exclusive arc payload — only one FK column is non-null */
export const buildEntityPayload = (entityId: string, entityType: EntityType) => ({
  university_id: entityType === "university" ? entityId : null,
  college_id: entityType === "college" ? entityId : null,
  cluster_id: entityType === "cluster" ? entityId : null,
});

/** The Supabase column name for the entity type */
export const getEntityColumn = (entityType: EntityType): string => `${entityType}_id`;

/** Bangla display labels per entity type */
export const ENTITY_LABELS: Record<EntityType, { bn: string; en: string }> = {
  university: { bn: "বিশ্ববিদ্যালয়", en: "University" },
  college: { bn: "কলেজ", en: "College" },
  cluster: { bn: "গুচ্ছ", en: "Cluster" },
};
