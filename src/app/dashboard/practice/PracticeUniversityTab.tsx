import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Check, GraduationCap, Search } from "lucide-react";
import GroupSelector from "./GroupSelector";

type UnitOwner = { id: string; short_name_bn: string; logo_url: string | null };

type AdmissionUnit = {
  id: string;
  unit_slug: string;
  unit_name_bn: string;
  university: UnitOwner | UnitOwner[] | null;
  cluster: UnitOwner | UnitOwner[] | null;
  college: UnitOwner | UnitOwner[] | null;
};

type UnitDisplay = {
  id: string;
  name: string;
  logoUrl: string | null;
  slug: string;
};

const asOwner = (v: UnitOwner | UnitOwner[] | null): UnitOwner | null => {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
};

export default function PracticeUniversityTab() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [includeAllowed, setIncludeAllowed] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIncludeAllowed(false);
    setSearch("");
  }, [selectedGroupId]);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["admission-units", selectedGroupId, includeAllowed],
    queryFn: async () => {
      let query = supabase
        .from("admission_units")
        .select(
          `id, unit_slug, unit_name_bn,
           university:universities(id, short_name_bn, logo_url),
           cluster:clusters(id, short_name_bn, logo_url),
           college:colleges(id, short_name_bn, logo_url)`,
        )
        .is("deleted_at", null)
        .order("sort_order", { ascending: true, nullsFirst: false });
      query = includeAllowed
        ? query.or(
            `primary_group_id.eq.${selectedGroupId},allowed_group_ids.cs.{${selectedGroupId}}`,
          )
        : query.eq("primary_group_id", selectedGroupId!);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AdmissionUnit[];
    },
    enabled: !!selectedGroupId,
  });

  const displayUnits = useMemo<UnitDisplay[]>(
    () =>
      units.map((u) => {
        const owner = asOwner(u.university) || asOwner(u.cluster) || asOwner(u.college);
        return {
          id: u.id,
          name: owner?.short_name_bn || u.unit_name_bn,
          logoUrl: owner?.logo_url || null,
          slug: u.unit_slug.toUpperCase(),
        };
      }),
    [units],
  );

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayUnits;
    return displayUnits.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.slug.toLowerCase().includes(q) ||
        units
          .find((unit) => unit.id === u.id)
          ?.unit_name_bn.toLowerCase()
          .includes(q),
    );
  }, [displayUnits, units, search]);

  return (
    <div className="space-y-6">
      <GroupSelector value={selectedGroupId} onChange={setSelectedGroupId} />

      {selectedGroupId && (
        <button
          type="button"
          onClick={() => setIncludeAllowed(!includeAllowed)}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-colors cursor-pointer text-left",
            includeAllowed
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-accent/50",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded shrink-0 border-2 transition-colors",
              includeAllowed
                ? "bg-primary border-primary text-white"
                : "border-muted-foreground/30 bg-transparent",
            )}
          >
            {includeAllowed && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
          <span className="text-sm font-semibold">ইউনিট চেঞ্জ</span>
        </button>
      )}

      {selectedGroupId && (
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ইউনিট খুঁজুন..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredUnits.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredUnits.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-border bg-card"
                >
                  {u.logoUrl ? (
                    <img
                      src={u.logoUrl}
                      alt={u.name}
                      className="w-8 h-8 rounded object-contain shrink-0"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 shrink-0">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <span className="text-sm font-semibold truncate">
                    {u.name} <span className="text-muted-foreground">({u.slug})</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "কিছু পাওয়া যায়নি।" : "এই বিভাগে কোনো ইউনিট পাওয়া যায়নি।"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
