import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { fetchGroups, fetchCurriculumPapers } from "@/lib/admin-crud-queries";
import {
  fetchSyllabusUnitSubjects,
  saveSyllabusUnitSubjects,
  type SyllabusUnitSubject,
} from "@/lib/syllabus-unit-subjects-queries";
import { fetchAdmissionUnits, type AdmissionUnitItem } from "@/lib/syllabus-queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { BookMarked, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function AdminSyllabusSubjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [checkedPapers, setCheckedPapers] = useState<Record<string, { is_mandatory: boolean }>>({});

  // --- Data ---
  const { data: groups = [] } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroups,
  });

  const { data: papers = [] } = useQuery({
    queryKey: ["admin-curriculum-papers"],
    queryFn: fetchCurriculumPapers,
  });

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["syllabus-units-admin", selectedInstitution],
    queryFn: () => fetchAdmissionUnits(selectedInstitution),
    enabled: !!selectedInstitution,
  });

  // Fetch existing subjects when unit + group selected
  const { data: existingSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["syllabus-unit-subjects", selectedUnit, selectedGroup],
    queryFn: () => fetchSyllabusUnitSubjects(selectedUnit, selectedGroup),
    enabled: !!selectedUnit && !!selectedGroup,
  });

  // Sync existing subjects to checked state
  const syncChecked = (existing: SyllabusUnitSubject[]) => {
    const map: Record<string, { is_mandatory: boolean }> = {};
    existing.forEach((s) => {
      map[s.paper_id] = { is_mandatory: s.is_mandatory };
    });
    setCheckedPapers(map);
  };

  // When existingSubjects change, sync
  const [syncedKey, setSyncedKey] = useState("");
  const currentKey = `${selectedUnit}-${selectedGroup}`;
  if (existingSubjects.length > 0 && syncedKey !== currentKey) {
    syncChecked(existingSubjects);
    setSyncedKey(currentKey);
  } else if (existingSubjects.length === 0 && syncedKey !== currentKey && !subjectsLoading) {
    setCheckedPapers({});
    setSyncedKey(currentKey);
  }

  // --- Mutations ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUnit || !selectedGroup) return;
      const subjects = Object.entries(checkedPapers).map(([paper_id, { is_mandatory }], idx) => ({
        paper_id,
        is_mandatory,
        sort_order: idx,
      }));
      await saveSyllabusUnitSubjects(selectedUnit, selectedGroup, subjects);
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
      return {
        ...prev,
        [paperId]: { is_mandatory: !prev[paperId].is_mandatory },
      };
    });
  };

  const selectedGroupName = groups.find((g) => g.id === selectedGroup)?.name_bn || "";

  return (
    <>
      <Helmet>
        <title>সিলেবাস ট্র্যাকার — অ্যাডমিন</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-bengali flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" />
            সিলেবাস ট্র্যাকার — সাবজেক্ট সেটিং
          </h1>
          <p className="text-sm text-muted-foreground font-bengali mt-1">
            প্রতি ইউনিট ও গ্রুপ অনুযায়ী সাবজেক্ট নির্ধারণ করুন।
          </p>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card border border-border rounded-2xl p-4">
          {/* Institution */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold font-bengali text-muted-foreground">
              প্রতিষ্ঠান সিলেক্ট করুন
            </label>
            <Select
              value={selectedInstitution}
              onValueChange={(v) => {
                setSelectedInstitution(v);
                setSelectedUnit("");
                setSelectedGroup("");
                setCheckedPapers({});
                setSyncedKey("");
              }}
            >
              <SelectTrigger className="font-bengali h-10">
                <SelectValue placeholder="প্রতিষ্ঠান বাছাই করুন" />
              </SelectTrigger>
              <SelectContent>
                {/* Will show institutions here - for now just show the selector */}
                <SelectItem value="placeholder" disabled>
                  প্রতিষ্ঠান বাছাই করুন
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold font-bengali text-muted-foreground">
              ইউনিট সিলেক্ট করুন
            </label>
            <Select
              value={selectedUnit}
              onValueChange={(v) => {
                setSelectedUnit(v);
                setSelectedGroup("");
                setCheckedPapers({});
                setSyncedKey("");
              }}
              disabled={!selectedInstitution || unitsLoading}
            >
              <SelectTrigger className="font-bengali h-10">
                <SelectValue placeholder="ইউনিট বাছাই করুন" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="font-bengali">
                    {u.unit_name_bn} ({u.unit_name_en})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold font-bengali text-muted-foreground">
              গ্রুপ সিলেক্ট করুন
            </label>
            <Select
              value={selectedGroup}
              onValueChange={(v) => {
                setSelectedGroup(v);
                setCheckedPapers({});
                setSyncedKey("");
              }}
              disabled={!selectedUnit}
            >
              <SelectTrigger className="font-bengali h-10">
                <SelectValue placeholder="গ্রুপ বাছাই করুন" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="font-bengali">
                    {g.name_bn} ({g.name_en})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Papers checklist */}
        {selectedUnit && selectedGroup ? (
          subjectsLoading ? (
            <LoadingSpinner message="সাবজেক্ট লোড হচ্ছে..." />
          ) : (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-bengali">
                  {selectedGroupName} গ্রুপের সাবজেক্ট
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {Object.keys(checkedPapers).length} সিলেক্টেড
                  </Badge>
                </h2>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-2 font-bengali"
                  size="sm"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  সেভ করুন
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {papers.map((paper) => {
                  const isChecked = !!checkedPapers[paper.id];
                  const isMandatory = checkedPapers[paper.id]?.is_mandatory ?? false;

                  return (
                    <div
                      key={paper.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background hover:bg-muted/30"
                      }`}
                      onClick={() => togglePaper(paper.id)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePaper(paper.id)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bengali font-medium truncate">
                          {paper.name_bn || paper.name_en}
                        </p>
                        {paper.short_code && (
                          <p className="text-[10px] text-muted-foreground">{paper.short_code}</p>
                        )}
                      </div>
                      {isChecked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMandatory(paper.id);
                          }}
                          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
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
          <div className="text-center py-16 text-muted-foreground font-bengali bg-card border border-border rounded-2xl">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">উপরে প্রতিষ্ঠান, ইউনিট এবং গ্রুপ সিলেক্ট করুন।</p>
          </div>
        )}
      </div>
    </>
  );
}
