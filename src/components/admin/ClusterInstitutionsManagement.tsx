import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Search, Save, Building2, School, Loader2 } from "lucide-react";
import {
  fetchAllUniversitiesMinimal,
  fetchAllCollegesMinimal,
  fetchClusterUniversities,
  fetchClusterColleges,
  fetchUniversityAdmissionUnits,
  syncClusterUniversityMappings,
  syncClusterInstitutions,
} from "@/lib/cluster-admin-queries";

interface ClusterInstitutionsManagementProps {
  clusterId: string;
  clusterType: string;
}

const QUERY_KEY_ALL_UNIS = "admin-all-unis-minimal";
const QUERY_KEY_ALL_COLLEGES = "admin-all-colleges-minimal";
const QUERY_KEY_CLUSTER_UNIS = "admin-cluster-unis";
const QUERY_KEY_CLUSTER_COLLEGES = "admin-cluster-colleges";
const QUERY_KEY_UNI_UNITS = "admin-uni-units";

/** Fetches and renders the unit dropdown for a single university card */
function UniUnitSelect({
  universityId,
  value,
  onChange,
}: {
  universityId: string;
  value: string | null;
  onChange: (unitId: string) => void;
}) {
  const { data: units = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY_UNI_UNITS, universityId],
    queryFn: () => fetchUniversityAdmissionUnits(universityId),
    enabled: !!universityId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="px-4 pb-4 pt-0">
      {isLoading ? (
        <div className="h-9 rounded-md bg-muted animate-pulse" />
      ) : units.length === 0 ? (
        <p className="text-xs text-muted-foreground font-bengali py-1">কোনো ইউনিট পাওয়া যায়নি</p>
      ) : (
        <Select
          value={value ?? "__none__"}
          onValueChange={(val) => onChange(val === "__none__" ? "" : val)}
        >
          <SelectTrigger className="w-full font-bengali text-xs h-9">
            <SelectValue placeholder="ইউনিট নির্বাচন করুন (ঐচ্ছিক)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="font-bengali text-xs">
              — কোনো ইউনিট নয় —
            </SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id} className="font-bengali text-xs">
                {unit.unit_name_bn}{" "}
                <span className="text-muted-foreground">({unit.unit_slug})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default function ClusterInstitutionsManagement({
  clusterId,
  clusterType,
}: ClusterInstitutionsManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // university_id → unit_id (null means checked but no unit assigned)
  const [selectedMap, setSelectedMap] = useState<Record<string, string | null>>({});
  // college-only: simple array of IDs
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);

  const isUniCluster =
    clusterType === "university" || clusterType === "mixed" || clusterType === "affiliation";

  // 1. Fetch ALL available Institutions
  const {
    data: allInstitutions = [],
    isLoading: loadingAll,
    isError: errorAll,
  } = useQuery({
    queryKey: [isUniCluster ? QUERY_KEY_ALL_UNIS : QUERY_KEY_ALL_COLLEGES],
    queryFn: isUniCluster ? fetchAllUniversitiesMinimal : fetchAllCollegesMinimal,
  });

  // 2. Fetch already linked data
  const {
    data: linkedUniMappings = [],
    isLoading: loadingLinkedUni,
    isError: errorLinkedUni,
  } = useQuery({
    queryKey: [QUERY_KEY_CLUSTER_UNIS, clusterId],
    queryFn: () => fetchClusterUniversities(clusterId),
    enabled: !!clusterId && isUniCluster,
  });

  const {
    data: collegeLinkedIds = [],
    isLoading: loadingLinkedCollege,
    isError: errorLinkedCollege,
  } = useQuery({
    queryKey: [QUERY_KEY_CLUSTER_COLLEGES, clusterId],
    queryFn: () => fetchClusterColleges(clusterId),
    enabled: !!clusterId && !isUniCluster,
  });

  // Hydrate selectedMap from DB on load
  useEffect(() => {
    if (isUniCluster && linkedUniMappings.length > 0) {
      const map: Record<string, string | null> = {};
      for (const m of linkedUniMappings) {
        map[m.university_id] = m.unit_id;
      }
      setSelectedMap(map);
    }
  }, [linkedUniMappings, isUniCluster]);

  // Hydrate college IDs from DB on load
  useEffect(() => {
    if (!isUniCluster && collegeLinkedIds.length > 0) {
      setSelectedCollegeIds(collegeLinkedIds);
    }
  }, [collegeLinkedIds, isUniCluster]);

  // --- Mutations ---
  const saveUniMutation = useMutation({
    mutationFn: () => syncClusterUniversityMappings(clusterId, selectedMap),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_CLUSTER_UNIS, clusterId],
      });
      toast({
        title: "✅ প্রতিষ্ঠানসমূহ সংরক্ষিত",
        description: "প্রতিষ্ঠানসমূহের তালিকা সফলভাবে আপডেট করা হয়েছে।",
      });
    },
    onError: (err: any) => {
      toast({
        title: "❌ সংরক্ষণ করতে সমস্যা",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const saveCollegeMutation = useMutation({
    mutationFn: () => syncClusterInstitutions(clusterId, selectedCollegeIds, false),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_CLUSTER_COLLEGES, clusterId],
      });
      toast({
        title: "✅ প্রতিষ্ঠানসমূহ সংরক্ষিত",
        description: "প্রতিষ্ঠানসমূহের তালিকা সফলভাবে আপডেট করা হয়েছে।",
      });
    },
    onError: (err: any) => {
      toast({
        title: "❌ সংরক্ষণ করতে সমস্যা",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  // --- Handlers ---
  const filteredInstitutions = allInstitutions.filter((inst: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return inst.name_bn.toLowerCase().includes(term) || inst.name_en.toLowerCase().includes(term);
  });

  const handleUniCheckboxChange = (uniId: string, checked: boolean) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (checked) {
        next[uniId] = null; // checked, no unit yet
      } else {
        delete next[uniId];
      }
      return next;
    });
  };

  const handleUniUnitChange = (uniId: string, unitId: string) => {
    setSelectedMap((prev) => ({ ...prev, [uniId]: unitId }));
  };

  const handleCollegeCheckboxChange = (id: string, checked: boolean) => {
    setSelectedCollegeIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleSelectAll = () => {
    if (isUniCluster) {
      setSelectedMap((prev) => {
        const next = { ...prev };
        for (const inst of filteredInstitutions) {
          if (!(inst.id in next)) {
            next[inst.id] = null;
          }
        }
        return next;
      });
    } else {
      const filteredIds = filteredInstitutions.map((x: any) => x.id);
      setSelectedCollegeIds((prev) => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeselectAll = () => {
    if (isUniCluster) {
      const filteredSet = new Set(filteredInstitutions.map((x: any) => x.id));
      setSelectedMap((prev) => {
        const next = { ...prev };
        for (const id of filteredSet) {
          delete next[id];
        }
        return next;
      });
    } else {
      const filteredIds = new Set(filteredInstitutions.map((x: any) => x.id));
      setSelectedCollegeIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    }
  };

  const isLoading = loadingAll || (isUniCluster ? loadingLinkedUni : loadingLinkedCollege);
  const isError = errorAll || (isUniCluster ? errorLinkedUni : errorLinkedCollege);

  if (isLoading) {
    return <LoadingSpinner message="প্রতিষ্ঠানসমূহ লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">
          প্রতিষ্ঠানসমূহের তথ্য আনতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
        </p>
      </div>
    );
  }

  const selectedCount = isUniCluster ? Object.keys(selectedMap).length : selectedCollegeIds.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="নাম দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 font-bengali"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-bengali hidden sm:inline">
            নির্বাচিত: {selectedCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="font-bengali text-xs"
          >
            সব সিলেক্ট করুন
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            className="font-bengali text-xs"
          >
            সব আনসিলেক্ট করুন
          </Button>
        </div>
      </div>

      {/* Grid of Institution Cards */}
      {filteredInstitutions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground font-bengali">কোনো প্রতিষ্ঠান খুঁজে পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredInstitutions.map((inst: any) => {
            const isChecked = isUniCluster
              ? inst.id in selectedMap
              : selectedCollegeIds.includes(inst.id);
            const assignedUnit = isUniCluster ? (selectedMap[inst.id] ?? null) : null;

            return (
              <div
                key={inst.id}
                className={`rounded-xl border transition-all bg-card ${
                  isChecked
                    ? "border-primary/50 ring-1 ring-primary/20 bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                {/* Top row: checkbox + logo + name */}
                <label className="flex items-center gap-3.5 p-4 cursor-pointer select-none">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      isUniCluster
                        ? handleUniCheckboxChange(inst.id, !!checked)
                        : handleCollegeCheckboxChange(inst.id, !!checked)
                    }
                    className="rounded-md"
                  />
                  <div className="h-9 w-9 rounded-md bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                    {inst.logo_url ? (
                      <img
                        src={inst.logo_url}
                        alt={inst.name_bn}
                        className="w-full h-full object-contain"
                      />
                    ) : isUniCluster ? (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <School className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground font-bengali truncate leading-snug">
                      {inst.name_bn}
                    </p>
                    <p className="text-xs text-muted-foreground truncate leading-normal">
                      {inst.name_en}
                    </p>
                  </div>
                </label>

                {/* Per-card unit selector (only for university clusters, only when checked) */}
                {isUniCluster && isChecked && (
                  <UniUnitSelect
                    universityId={inst.id}
                    value={assignedUnit}
                    onChange={(unitId) => handleUniUnitChange(inst.id, unitId)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button Row */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={() => (isUniCluster ? saveUniMutation.mutate() : saveCollegeMutation.mutate())}
          disabled={isUniCluster ? saveUniMutation.isPending : saveCollegeMutation.isPending}
          className="gap-2 font-bengali"
        >
          {(isUniCluster ? saveUniMutation.isPending : saveCollegeMutation.isPending) ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {(isUniCluster ? saveUniMutation.isPending : saveCollegeMutation.isPending)
            ? "সংরক্ষণ করা হচ্ছে..."
            : "পরিবর্তন সংরক্ষণ করুন"}
        </Button>
      </div>
    </div>
  );
}
