import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAllInstitutions } from "@/lib/syllabus-queries";
import {
  getFilters,
  onFiltersChange,
  GROUP_IDS,
  type GroupFilterState,
} from "@/lib/syllabus-filter-store";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { loadAllProgress, type ProgressCache } from "@/lib/progress-cache";
import { Search, Heart, AlertTriangle, RotateCcw } from "lucide-react";

const FAV_KEY = "st_fav_universities";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(ids: Set<string>) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...ids]));
  } catch {}
}

export default function UniversityList() {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [progressMap] = useState<Map<string, ProgressCache>>(loadAllProgress);
  const [filters, setFiltersState] = useState<GroupFilterState>(getFilters);

  useEffect(() => {
    return onFiltersChange(() => setFiltersState(getFilters()));
  }, []);

  const {
    data: institutions = [],
    isLoading,
    isError,
    refetch: refetchInstitutions,
  } = useQuery({
    queryKey: ["syllabus-all-institutions"],
    queryFn: fetchAllInstitutions,
    staleTime: 10 * 60 * 1000,
  });

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = institutions;

    // ---- secondTime filter ----
    if (filters["secondTime"]) {
      list = list.filter((i) => i.second_time);
    }

    // ---- Group-based filtering ----
    const primaryChecks: Record<string, boolean> = {
      [GROUP_IDS.science]: !!filters[GROUP_IDS.science],
      [GROUP_IDS.arts]: !!filters[GROUP_IDS.arts],
      [GROUP_IDS.commerce]: !!filters[GROUP_IDS.commerce],
    };

    const unitChangeChecks: Record<string, boolean> = {
      [GROUP_IDS.science]: !!filters["ucS"],
      [GROUP_IDS.arts]: !!filters["ucA"],
      [GROUP_IDS.commerce]: !!filters["ucC"],
    };

    const isMixedChecked = !!filters["mixed"];

    const activePrimary = Object.entries(primaryChecks)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const activeUnitChange = Object.entries(unitChangeChecks)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const anyGroupFilterActive =
      activePrimary.length > 0 || activeUnitChange.length > 0 || isMixedChecked;

    if (anyGroupFilterActive) {
      list = list.filter((inst) => {
        // primary_group_id match (বিজ্ঞান / মানবিক / ব্যবসা)
        const matchesPrimary =
          activePrimary.length > 0 && inst.primary_group_ids.some((gid) => primaryChecks[gid]);

        // allowed_group_ids match (ইউনিট চেঞ্জ)
        const matchesUnitChange =
          activeUnitChange.length > 0 &&
          inst.allowed_group_ids.some((gid) => unitChangeChecks[gid]);

        // বিভাগ উন্মুক্ত (primary_group_id is null)
        const matchesMixed = isMixedChecked && inst.has_open_unit;

        return matchesPrimary || matchesUnitChange || matchesMixed;
      });
    }

    // ---- Search filter ----
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name_bn.toLowerCase().includes(q) ||
          i.name_en.toLowerCase().includes(q) ||
          i.short_name_en.toLowerCase().includes(q) ||
          i.short_name_bn?.toLowerCase().includes(q),
      );
    }

    // ---- Sort: favorites first ----
    return [...list].sort((a, b) => {
      const af = favorites.has(a.id) ? 0 : 1;
      const bf = favorites.has(b.id) ? 0 : 1;
      return af - bf;
    });
  }, [institutions, search, favorites, filters]);

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center bg-card border border-border rounded-2xl">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground font-bengali">ডেটা লোড করতে সমস্যা হয়েছে।</p>
        <button
          onClick={() => refetchInstitutions()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-bengali text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="প্রতিষ্ঠান খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 rounded-xl font-bengali"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground font-bengali">
          কোনো প্রতিষ্ঠান পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((inst) => {
            const isFav = favorites.has(inst.id);
            const progress = progressMap.get(inst.id);
            const hasProgress = progress && progress.total > 0;
            const pct = hasProgress ? Math.round((progress!.completed / progress!.total) * 100) : 0;

            return (
              <Link key={inst.id} to={`/syllabus-tracker/${inst.slug}`} className="group block">
                <div className="relative bg-card border border-border rounded-2xl p-4 h-36 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                  <button
                    onClick={(e) => toggleFavorite(inst.id, e)}
                    className="absolute top-2 right-2 p-1 rounded-full transition-colors hover:bg-muted"
                    aria-label={isFav ? "বাতিল করুন" : "পছন্দ করুন"}
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        isFav
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground/50 group-hover:text-muted-foreground"
                      }`}
                    />
                  </button>
                  {inst.logo_url ? (
                    <img
                      src={inst.logo_url}
                      alt={inst.short_name_en}
                      className="h-10 w-10 object-contain rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                      {inst.short_name_bn?.[0]}
                    </div>
                  )}
                  <p className="text-sm font-semibold font-bengali leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {inst.short_name_bn || inst.name_bn}
                  </p>
                  {hasProgress && (
                    <div className="w-full mt-1">
                      <Progress value={pct} className="h-1.5 rounded-full" />
                      <p className="text-[10px] text-muted-foreground font-bengali mt-0.5">
                        {pct}% সম্পন্ন
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground font-bengali mt-4">
        মোট {filtered.length} টি প্রতিষ্ঠান
      </p>
    </div>
  );
}
