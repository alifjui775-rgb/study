import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchGroups } from "@/lib/admin-crud-queries";
import {
  fetchSyllabusUnitSubjects,
  saveSyllabusUnitSubjects,
} from "@/lib/syllabus-unit-subjects-queries";
import { fetchAdmissionUnits } from "@/lib/syllabus-queries";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, BookMarked } from "lucide-react";

type InstitutionOption = { id: string; name_bn: string; name_en: string; type: string };

interface ManageSyllabusSubjectsProps {
  entityId?: string;
  entityType?: "university" | "college" | "cluster";
}

export default function ManageSyllabusSubjects({
  entityId,
  entityType,
}: ManageSyllabusSubjectsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const presetType = entityType || "";
  const presetId = entityId || "";

  const [instType, setInstType] = useState<string>(presetType);
  const [institutionId, setInstitutionId] = useState<string>(presetId);
  const [unitId, setUnitId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [checkedPapers, setCheckedPapers] = useState<Record<string, { is_mandatory: boolean }>>({});

  const isLocked = !!presetId;

  // --- Fetch institutions by type ---
  const { data: institutions = [], isLoading: instLoading } = useQuery({
    queryKey: ["admin-institutions-list", instType],
    queryFn: async (): Promise<InstitutionOption[]> => {
      if (!instType) return [];
      const table =
        instType === "university"
          ? "universities"
          : instType === "college"
            ? "colleges"
            : "clusters";
      const { data, error } = await supabase
        .from(table)
        .select("id, name_bn, name_en")
        .order("name_bn");
      if (error) throw error;
      return (data || []).map((i: any) => ({ ...i, type: instType }));
    },
    enabled: !!instType,
  });

  // --- Fetch groups ---
  const { data: groups = [] } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroups,
  });

  // --- Fetch units ---
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["syllabus-units-manage", institutionId],
    queryFn: () => fetchAdmissionUnits(institutionId),
    enabled: !!institutionId,
  });

  // --- Fetch papers from curriculum_papers ---
  const { data: papers = [] } = useQuery({
    queryKey: ["admin-curriculum-papers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curriculum_papers")
        .select("id, name_en, name_bn, short_code")
        .order("name_bn");
      if (error) throw error;
      return data || [];
    },
  });

  // --- Fetch existing subjects ---
  const { data: existingSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["syllabus-unit-subjects", unitId, groupId],
    queryFn: () => fetchSyllabusUnitSubjects(unitId, groupId),
    enabled: !!unitId && !!groupId,
  });

  // Sync existing to checked
  const [syncedKey, setSyncedKey] = useState("");
  const currentKey = `${unitId}-${groupId}`;
  if (unitId && groupId && syncedKey !== currentKey && !subjectsLoading) {
    const map: Record<string, { is_mandatory: boolean }> = {};
    existingSubjects.forEach((s) => {
      map[s.paper_id] = { is_mandatory: s.is_mandatory };
    });
    setCheckedPapers(map);
    setSyncedKey(currentKey);
  }

  // --- Save mutation ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!unitId || !groupId) return;
      const subjects = Object.entries(checkedPapers).map(([paper_id, { is_mandatory }], idx) => ({
        paper_id,
        is_mandatory,
        sort_order: idx,
      }));
      await saveSyllabusUnitSubjects(unitId, groupId, subjects);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-unit-subjects"] });
      toast({ title: "✅ সাবজেক্ট সেভ হয়েছে" });
    },
    onError: (e: any) => {
      toast({ title: "❌ সেভ করতে সমস্যা", description: e?.message, variant: "destructive" });
    },
  });

  const togglePaper = (paperId: string) => {
    setCheckedPapers((prev) => {
      const next = { ...prev };
      if (next[paperId]) {
        delete next[paperId];
      } else {
        next[paperId] = { is_mandatory: false };
      }
      return next;
    });
  };

  const toggleMandatory = (paperId: string) => {
    setCheckedPapers((prev) => {
      if (!prev[paperId]) return prev;
      return { ...prev, [paperId]: { is_mandatory: !prev[paperId].is_mandatory } };
    });
  };

  const selectedGroupName = groups.find((g) => g.id === groupId)?.name_bn || "";

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Institution Type */}
        {!isLocked && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold font-bengali text-muted-foreground">ধরন</label>
            <Select
              value={instType}
              onValueChange={(v) => {
                setInstType(v);
                setInstitutionId("");
                setUnitId("");
                setGroupId("");
                setCheckedPapers({});
                setSyncedKey("");
              }}
            >
              <SelectTrigger className="font-bengali h-9">
                <SelectValue placeholder="ধরন বাছাই" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="university" className="font-bengali">
                  বিশ্ববিদ্যালয়
                </SelectItem>
                <SelectItem value="college" className="font-bengali">
                  কলেজ
                </SelectItem>
                <SelectItem value="cluster" className="font-bengali">
                  গুচ্ছ
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Institution */}
        {!isLocked && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold font-bengali text-muted-foreground">
              প্রতিষ্ঠান
            </label>
            <Select
              value={institutionId}
              onValueChange={(v) => {
                setInstitutionId(v);
                setUnitId("");
                setGroupId("");
                setCheckedPapers({});
                setSyncedKey("");
              }}
              disabled={!instType || instLoading}
            >
              <SelectTrigger className="font-bengali h-9">
                <SelectValue placeholder="প্রতিষ্ঠান বাছাই" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="font-bengali">
                    {i.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Unit */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold font-bengali text-muted-foreground">ইউনিট</label>
          <Select
            value={unitId}
            onValueChange={(v) => {
              setUnitId(v);
              setGroupId("");
              setCheckedPapers({});
              setSyncedKey("");
            }}
            disabled={!institutionId || unitsLoading}
          >
            <SelectTrigger className="font-bengali h-9">
              <SelectValue placeholder="ইউনিট বাছাই" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id} className="font-bengali">
                  {u.unit_name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Group */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold font-bengali text-muted-foreground">গ্রুপ</label>
          <Select
            value={groupId}
            onValueChange={(v) => {
              setGroupId(v);
              setCheckedPapers({});
              setSyncedKey("");
            }}
            disabled={!unitId}
          >
            <SelectTrigger className="font-bengali h-9">
              <SelectValue placeholder="গ্রুপ বাছাই" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id} className="font-bengali">
                  {g.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Papers checklist */}
      {unitId && groupId ? (
        subjectsLoading ? (
          <LoadingSpinner message="লোড হচ্ছে..." />
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-bengali flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-primary" />
                {selectedGroupName} গ্রুপের সাবজেক্ট
                <Badge variant="secondary" className="text-[10px]">
                  {Object.keys(checkedPapers).length} সিলেক্টেড
                </Badge>
              </h3>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                size="sm"
                className="gap-1.5 font-bengali h-8"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                সেভ
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {papers.map((paper) => {
                const isChecked = !!checkedPapers[paper.id];
                const isMandatory = checkedPapers[paper.id]?.is_mandatory ?? false;
                return (
                  <div
                    key={paper.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                      isChecked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                    onClick={() => togglePaper(paper.id)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => togglePaper(paper.id)}
                      className="shrink-0"
                    />
                    <span className="flex-1 truncate font-bengali">
                      {paper.name_bn || paper.name_en}
                    </span>
                    {isChecked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMandatory(paper.id);
                        }}
                        className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          isMandatory
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isMandatory ? "বাধ্যতামূলক" : "ঐচ্ছিক"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <p className="text-xs text-muted-foreground font-bengali text-center py-8">
          {isLocked ? "ইউনিট এবং গ্রুপ সিলেক্ট করুন।" : "উপরে ধরন, প্রতিষ্ঠান, ইউনিট এবং গ্রুপ সিলেক্ট করুন।"}
        </p>
      )}
    </div>
  );
}
