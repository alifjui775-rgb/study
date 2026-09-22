// =============================================================================
// Admin — Master QB: Unit Mapping tab (master_qb_units)
// Maps admission_units of universities/clusters to a selected master stream.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMasterQbStreams,
  fetchInstitutionsWithUnits,
  fetchAssignedUnitIds,
  assignUnitToStream,
  unassignUnitFromStream,
  QUERY_KEY_MASTER_QB_UNITS,
  QUERY_KEY_MASTER_QB_INSTITUTIONS,
} from "@/lib/master-qb-admin-queries";
import type { QbInstitution } from "@/lib/master-qb-admin-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Search, Building2, Boxes, Layers } from "lucide-react";

const STREAMS_KEY = "admin-master-qb-streams";
const UNITS_KEY = QUERY_KEY_MASTER_QB_UNITS;

function StreamIcon({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <BookOpen className="h-4 w-4 text-primary/50" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailed(true)}
      className="h-9 w-9 rounded-lg object-contain bg-muted p-1 shrink-0"
    />
  );
}

function InstitutionIcon({ inst }: { inst: QbInstitution }) {
  if (inst.logo_url) {
    return (
      <img
        src={inst.logo_url}
        alt={inst.name_bn}
        className="h-8 w-8 rounded-md object-contain bg-muted/50 p-0.5 shrink-0"
      />
    );
  }
  const Icon = inst.type === "cluster" ? Boxes : Building2;
  return (
    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary/60" />
    </div>
  );
}

export default function UnitMappingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- Streams ---
  const {
    data: streams = [],
    isLoading: streamsLoading,
    isError: streamsError,
  } = useQuery({
    queryKey: [STREAMS_KEY],
    queryFn: fetchMasterQbStreams,
    staleTime: 2 * 60 * 1000,
  });

  // Auto-select the first stream by default
  useEffect(() => {
    if (streams.length === 0) return;
    if (selectedStreamId === null || !streams.some((s) => s.id === selectedStreamId)) {
      setSelectedStreamId(streams[0].id);
    }
  }, [streams, selectedStreamId]);

  const activeStream = useMemo(
    () => streams.find((s) => s.id === selectedStreamId) ?? null,
    [streams, selectedStreamId],
  );

  // --- Assigned unit ids for the selected stream ---
  const { data: assignedIds = [], isLoading: assignedLoading } = useQuery({
    queryKey: [UNITS_KEY, selectedStreamId],
    queryFn: () => fetchAssignedUnitIds(selectedStreamId as number),
    enabled: selectedStreamId !== null,
    staleTime: 2 * 60 * 1000,
  });

  const assignedSet = useMemo(() => new Set(assignedIds), [assignedIds]);

  // --- Institutions with units ---
  const {
    data: institutions = [],
    isLoading: institutionsLoading,
    isError: institutionsError,
  } = useQuery({
    queryKey: [QUERY_KEY_MASTER_QB_INSTITUTIONS],
    queryFn: fetchInstitutionsWithUnits,
    staleTime: 5 * 60 * 1000,
  });

  // --- Optimistic single-unit toggle ---
  const toggleMutation = useMutation({
    mutationFn: async ({ unitId, assign }: { unitId: string; assign: boolean }) => {
      if (selectedStreamId === null) return;
      if (assign) await assignUnitToStream({ streamId: selectedStreamId, unitId });
      else await unassignUnitFromStream({ streamId: selectedStreamId, unitId });
    },
    onMutate: async ({ unitId, assign }) => {
      const key = [UNITS_KEY, selectedStreamId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (old = []) => {
        const set = new Set(old);
        if (assign) set.add(unitId);
        else set.delete(unitId);
        return Array.from(set);
      });
      return { previous, key };
    },
    onError: (err: any, _vars, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      toast({
        title: "❌ আপডেট করতে সমস্যা হয়েছে",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [UNITS_KEY, selectedStreamId] });
    },
  });

  const toggleUnit = (unitId: string) => {
    if (selectedStreamId === null) return;
    toggleMutation.mutate({ unitId, assign: !assignedSet.has(unitId) });
  };

  // --- Search filtering ---
  const filteredInstitutions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return institutions;

    return institutions
      .map((inst) => {
        const nameMatches = [inst.name_bn, inst.name_en, inst.short_name_bn]
          .filter(Boolean)
          .some((n) => n!.toLowerCase().includes(term));

        // If the institution name matches, keep all of its units.
        if (nameMatches) return inst;

        // Otherwise keep only units whose names match.
        const matchedUnits = inst.units.filter((u) =>
          [u.unit_name_bn, u.unit_name_en, u.unit_slug]
            .filter(Boolean)
            .some((n) => n!.toLowerCase().includes(term)),
        );

        return matchedUnits.length > 0 ? { ...inst, units: matchedUnits } : null;
      })
      .filter((inst): inst is QbInstitution => inst !== null);
  }, [institutions, searchTerm]);

  // --- Early states ---
  if (streamsLoading) return <LoadingSpinner message="স্ট্রিম লোড হচ্ছে..." />;

  if (streamsError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">স্ট্রিম আনতে সমস্যা হয়েছে।</p>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-bengali">
          কোনো স্ট্রিম নেই। প্রথমে “স্ট্রিম ব্যবস্থাপনা” ট্যাব থেকে একটি স্ট্রিম তৈরি করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* --- Top Bar: stream selector + active stream info --- */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <StreamIcon url={activeStream?.icon_url ?? null} name={activeStream?.name_bn ?? ""} />
          <div className="min-w-0">
            <p className="font-bold font-bengali text-foreground truncate">
              {activeStream?.name_bn ?? "স্ট্রিম নির্বাচন করুন"}
            </p>
            <p className="text-xs text-muted-foreground font-bengali">
              {assignedLoading ? "লোড হচ্ছে..." : `${assignedIds.length} টি ইউনিট ম্যাপ করা হয়েছে`}
            </p>
          </div>
        </div>

        <div className="sm:w-72 shrink-0">
          <Select
            value={selectedStreamId !== null ? String(selectedStreamId) : undefined}
            onValueChange={(val) => setSelectedStreamId(Number(val))}
          >
            <SelectTrigger className="font-bengali">
              <SelectValue placeholder="স্ট্রিম নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {streams.map((stream) => (
                <SelectItem key={stream.id} value={String(stream.id)} className="font-bengali">
                  {stream.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- Search --- */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="বিশ্ববিদ্যালয় বা ইউনিট খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 font-bengali h-10"
        />
      </div>

      {/* --- Institution + unit list --- */}
      {institutionsLoading ? (
        <LoadingSpinner message="প্রতিষ্ঠান ও ইউনিট লোড হচ্ছে..." />
      ) : institutionsError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">প্রতিষ্ঠান ও ইউনিট আনতে সমস্যা হয়েছে।</p>
        </div>
      ) : filteredInstitutions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">
            কোনো প্রতিষ্ঠান বা ইউনিট পাওয়া যায়নি।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInstitutions.map((inst) => {
            const assignedCount = inst.units.filter((u) => assignedSet.has(u.id)).length;

            return (
              <div
                key={inst.id}
                className="w-full min-w-0 rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-start gap-3 p-3 sm:p-4">
                  <InstitutionIcon inst={inst} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm font-bengali text-foreground break-words leading-snug">
                      {inst.name_bn}
                    </p>
                    <p className="text-xs text-muted-foreground break-words leading-snug">
                      {inst.name_en}
                    </p>
                  </div>
                  <Badge
                    variant={assignedCount > 0 ? "default" : "secondary"}
                    className="text-[10px] shrink-0 font-bengali mt-0.5"
                  >
                    {assignedCount}/{inst.units.length}
                  </Badge>
                </div>

                {/* Units */}
                <div className="border-t border-border/60 bg-muted/10 p-2 sm:p-3">
                  {inst.units.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-bengali text-center py-3">
                      এই প্রতিষ্ঠানের কোনো ইউনিট নেই।
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                      {inst.units.map((unit) => (
                        <label
                          key={unit.id}
                          className="flex items-start gap-2.5 min-w-0 rounded-lg hover:bg-muted/50 p-2 cursor-pointer select-none transition-colors"
                        >
                          <Checkbox
                            className="mt-0.5 shrink-0"
                            checked={assignedSet.has(unit.id)}
                            disabled={selectedStreamId === null}
                            onCheckedChange={() => toggleUnit(unit.id)}
                          />
                          <span className="text-sm font-medium font-bengali text-foreground/90 flex-1 min-w-0 break-words leading-snug">
                            {unit.unit_name_bn}{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              ({unit.unit_slug})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- Summary footer --- */}
      {!institutionsLoading && !institutionsError && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-bengali pt-1">
          <Layers className="h-3.5 w-3.5" />
          {filteredInstitutions.length} টি প্রতিষ্ঠান দেখানো হচ্ছে
        </div>
      )}
    </div>
  );
}
