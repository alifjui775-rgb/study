import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { VIRTUAL_STANDARDS } from "@/lib/constants/practice";
import { cn } from "@/lib/utils";
import { BookOpen, Check } from "lucide-react";
import GroupSelector from "./GroupSelector";
import PracticeSteps from "./PracticeSteps";
import PracticeTopicSelection from "./PracticeTopicSelection";
import type { PracticeExamPayload } from "./PracticeTopicSelection";

type Discipline = { id: string; name_bn: string; icon_url: string | null };

type SubCategory = { id: string; name_bn: string; short_code: string };

type StandardOption = { key: string; label: string; codes: string[]; virtual: boolean };

const EXCLUDED_SHORT_CODES = new Set(["islamic", "general", "special", "engineering"]);

/** Only the Science group shows the "Standard" filter. */
const SCIENCE_GROUP_ID = "2803200a-4794-4c82-9e7c-548b05c9b429";

interface Props {
  selectedGroupId: string | null;
  onGroupIdChange: (id: string) => void;
  selectedDisciplines: Set<string>;
  onDisciplinesChange: (disciplines: Set<string>) => void;
  selectedIndividualCodes: Set<string>;
  onIndividualCodesChange: (codes: Set<string>) => void;
  selectedVirtualKeys: Set<string>;
  onVirtualKeysChange: (virtuals: Set<string>) => void;
  payload: PracticeExamPayload;
  onUpdatePayload: (updater: (prev: PracticeExamPayload) => PracticeExamPayload) => void;
  onReset: () => void;
  onStartExam: () => void;
  isStarting: boolean;
}

export default function PracticeSubjectTab({
  selectedGroupId,
  onGroupIdChange,
  selectedDisciplines,
  onDisciplinesChange,
  selectedIndividualCodes,
  onIndividualCodesChange,
  selectedVirtualKeys,
  onVirtualKeysChange,
  payload,
  onUpdatePayload,
  onStartExam,
  isStarting,
}: Props) {
  const [showTopicSelection, setShowTopicSelection] = useState(false);

  const { data: allSubCategories = [], isLoading: subCategoriesLoading } = useQuery({
    queryKey: ["institution-sub-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_sub_categories")
        .select("id, name_bn, short_code");
      if (error) throw error;
      return (data || []) as SubCategory[];
    },
  });

  const standardOptions = useMemo<StandardOption[]>(() => {
    const individual: StandardOption[] = allSubCategories
      .filter((c) => !EXCLUDED_SHORT_CODES.has(c.short_code))
      .map((c) => ({ key: c.id, label: c.name_bn, codes: [c.id], virtual: false }));
    const virtual: StandardOption[] = VIRTUAL_STANDARDS.map((v) => ({
      key: `virtual:${v.label}`,
      label: v.label,
      codes: v.codes,
      virtual: true,
    }));
    return [...individual, ...virtual].sort((a, b) => a.label.localeCompare(b.label, "bn"));
  }, [allSubCategories]);

  // Keep payload.standardCodes continuously updated with resolved sub-category UUIDs
  useMemo(() => {
    if (allSubCategories.length === 0) return;
    const categoryIds = new Set<string>();
    for (const item of selectedIndividualCodes) {
      const match = allSubCategories.find((c) => c.id === item || c.short_code === item);
      if (match) categoryIds.add(match.id);
    }
    for (const vKey of selectedVirtualKeys) {
      const matchVirtual = VIRTUAL_STANDARDS.find((v) => `virtual:${v.label}` === vKey);
      if (matchVirtual) {
        const codeSet = new Set(matchVirtual.codes);
        allSubCategories.forEach((cat) => {
          if (codeSet.has(cat.short_code)) categoryIds.add(cat.id);
        });
      }
    }
    const resolvedUuids = Array.from(categoryIds);
    if (JSON.stringify(payload.standardCodes) !== JSON.stringify(resolvedUuids)) {
      onUpdatePayload((prev) => ({ ...prev, standardCodes: resolvedUuids }));
    }
  }, [
    selectedIndividualCodes,
    selectedVirtualKeys,
    allSubCategories,
    payload.standardCodes,
    onUpdatePayload,
  ]);

  const { data: disciplines = [], isLoading: disciplinesLoading } = useQuery({
    queryKey: ["subject-groups", selectedGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_groups")
        .select("subject_id, study_disciplines(id, name_bn, icon_url)")
        .eq("group_id", selectedGroupId!);
      if (error) throw error;
      return (data || [])
        .map((row) => {
          const d = (row as Record<string, unknown>).study_disciplines;
          return Array.isArray(d) ? d[0] : d;
        })
        .filter((d): d is Discipline => Boolean(d))
        .sort((a, b) => a.name_bn.localeCompare(b.name_bn, "bn"));
    },
    enabled: !!selectedGroupId,
  });

  const toggleDiscipline = (id: string) => {
    const next = new Set(selectedDisciplines);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onDisciplinesChange(next);
  };

  const toggleStandard = (option: StandardOption) => {
    if (option.virtual) {
      const next = new Set(selectedVirtualKeys);
      if (next.has(option.key)) next.delete(option.key);
      else next.add(option.key);
      onVirtualKeysChange(next);
    } else {
      const next = new Set(selectedIndividualCodes);
      const id = option.codes[0];
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onIndividualCodesChange(next);
    }
  };

  if (showTopicSelection) {
    return (
      <PracticeTopicSelection
        disciplineIds={Array.from(selectedDisciplines)}
        disciplineNames={Object.fromEntries(disciplines.map((d) => [d.id, d.name_bn]))}
        onBack={() => setShowTopicSelection(false)}
        payload={payload}
        onUpdatePayload={onUpdatePayload}
        onStartExam={onStartExam}
        isStarting={isStarting}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PracticeSteps current={1} />

      <GroupSelector value={selectedGroupId} onChange={onGroupIdChange} />

      {selectedGroupId === SCIENCE_GROUP_ID && standardOptions.length > 0 && (
        <div className="space-y-2.5">
          <label className="text-sm font-bold text-foreground">প্রশ্নের স্ট্যান্ডার্ড</label>
          {subCategoriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {standardOptions.map((option) => {
                const isSelected = option.virtual
                  ? selectedVirtualKeys.has(option.key)
                  : selectedIndividualCodes.has(option.codes[0]);
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleStandard(option)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-colors cursor-pointer text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-accent/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded shrink-0 border-2 transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-muted-foreground/30 bg-transparent",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="text-sm font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedGroupId && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">বিষয় সিলেক্ট করুন</h3>
          {disciplinesLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : disciplines.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {disciplines.map((d) => {
                  const isSelected = selectedDisciplines.has(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggleDiscipline(d.id)}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-colors cursor-pointer text-left",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-accent/50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-5 h-5 rounded shrink-0 border-2 transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-white"
                            : "border-muted-foreground/30 bg-transparent",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      {d.icon_url ? (
                        <img
                          src={d.icon_url}
                          alt={d.name_bn}
                          className="w-6 h-6 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 shrink-0">
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <span className="text-sm font-semibold">{d.name_bn}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDisciplines.size > 0 && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTopicSelection(true)}
                    className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-md"
                  >
                    এগিয়ে যান
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              এই বিভাগে কোনো বিষয় পাওয়া যায়নি।
            </p>
          )}
        </div>
      )}
    </div>
  );
}
