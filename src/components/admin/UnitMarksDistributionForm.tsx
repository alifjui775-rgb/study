import {
  useForm,
  useFieldArray,
  Controller,
  FormProvider,
  useFormContext,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStudyDisciplinesList, fetchGroups } from "@/lib/admin-crud-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  unitMarksDistributionSchema,
  type UnitMarksDistributionFormValues,
} from "@/lib/unit-marks-types";
import { cn } from "@/lib/utils";

function CreatableCombobox({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: { name_bn: string; name_en: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with outer value
  useEffect(() => {
    setSearch(value);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filtered =
    search.trim() === ""
      ? suggestions
      : suggestions.filter(
          (item) =>
            item.name_bn.toLowerCase().includes(search.toLowerCase()) ||
            item.name_en.toLowerCase().includes(search.toLowerCase()),
        );

  const showCreateOption =
    search.trim() !== "" &&
    !suggestions.some((item) => item.name_bn.toLowerCase() === search.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          onChange(val);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-10 text-sm bg-white pr-8 font-sans"
      />
      {open && (
        <div className="absolute z-60 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden text-sm font-sans">
          {showCreateOption && (
            <button
              type="button"
              onClick={() => {
                onChange(search.trim());
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 font-medium border-b border-slate-100"
            >
              Create &quot;{search}&quot;
            </button>
          )}
          {filtered.length === 0 && !showCreateOption ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No subjects found</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(item.name_bn);
                  setSearch(item.name_bn);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 transition-colors text-slate-750 truncate"
              >
                {item.name_bn}{" "}
                <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                  ({item.name_en})
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const RULE_TYPE_LABELS = {
  mandatory: "Mandatory (All)",
  selective: "Selective (Choose)",
  alternative: "Alternative (Backup)",
} as const;

// ─── Rule Card (Level 2) ──────────────────────────────────────────────────────

interface RuleCardProps {
  groupIdx: number;
  ruleIdx: number;
  onRemove: () => void;
}

function RuleCard({ groupIdx, ruleIdx, onRemove }: RuleCardProps) {
  const { register, control, watch, getValues } = useFormContext<UnitMarksDistributionFormValues>();
  const ruleTitle = watch(`subject_selection_rules.${groupIdx}.rules.${ruleIdx}.title`);
  const ruleType = watch(`subject_selection_rules.${groupIdx}.rules.${ruleIdx}.type`);

  const [collapsed, setCollapsed] = useState(() => {
    const val = getValues(`subject_selection_rules.${groupIdx}.rules.${ruleIdx}.title`);
    return !!val;
  });

  const [editorSubject, setEditorSubject] = useState<{
    index: number;
    name: string;
    mcq: string;
    written: string;
    total_marks: string;
    pass_marks: string;
  } | null>(null);

  const {
    fields: subjects,
    append: appendSubject,
    remove: removeSubject,
    update: updateSubject,
  } = useFieldArray({
    control,
    name: `subject_selection_rules.${groupIdx}.rules.${ruleIdx}.subjects`,
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ["study-disciplines-list"],
    queryFn: fetchStudyDisciplinesList,
  });

  return (
    <div className="border border-slate-200 border-l-2 md:border-l-4 border-l-indigo-500 rounded-xl bg-slate-50/50 md:bg-slate-50/30 overflow-hidden ml-0 md:ml-6">
      {/* Header */}
      <div className="flex flex-col gap-2 px-3 py-2.5 bg-slate-100/80 border-b border-slate-200/50">
        {/* Top Row: Chevron + Title */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-slate-500 hover:text-slate-700 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <span className="text-sm font-bold text-slate-800 truncate flex-1 font-bengali">
            {ruleTitle || `Rule #${ruleIdx + 1}`}
          </span>
        </div>

        {/* Bottom Row: Badges on left, Delete button on right */}
        <div className="flex items-center justify-between pl-6">
          <div className="flex items-center gap-1.5">
            {ruleType && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 capitalize shrink-0 bg-white/70 border-slate-300"
              >
                {RULE_TYPE_LABELS[ruleType as keyof typeof RULE_TYPE_LABELS] || ruleType}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 shrink-0 bg-slate-200 text-slate-700 font-medium"
            >
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 text-red-500 hover:text-red-650 hover:bg-red-50 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 md:p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-medium">Type *</Label>
              <Controller
                control={control}
                name={`subject_selection_rules.${groupIdx}.rules.${ruleIdx}.type`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 text-sm bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["mandatory", "selective", "alternative"] as const).map((t) => (
                        <SelectItem key={t} value={t}>
                          {RULE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-medium">Title *</Label>
              <Input
                {...register(`subject_selection_rules.${groupIdx}.rules.${ruleIdx}.title`)}
                placeholder="e.g. Mandatory Subjects"
                className="h-10 text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 font-medium">
                Note <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                {...register(`subject_selection_rules.${groupIdx}.rules.${ruleIdx}.note`)}
                placeholder="Short note…"
                className="h-10 text-sm bg-white"
              />
            </div>
          </div>

          {/* Subjects (Level 3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">
                Subjects{" "}
                <span className="ml-1 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full">
                  {subjects.length}
                </span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditorSubject({
                    index: -1,
                    name: "",
                    mcq: "",
                    written: "",
                    total_marks: "",
                    pass_marks: "",
                  })
                }
                className="h-8 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-100 bg-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Subject
              </Button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-lg bg-white/40">
                No subjects yet — click &quot;Add Subject&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {subjects.map((sub, si) => {
                  const parts: string[] = [];
                  if (sub.mcq != null) parts.push(`MCQ: ${sub.mcq}`);
                  if (sub.written != null) parts.push(`Written: ${sub.written}`);
                  if (sub.total_marks != null) parts.push(`Total: ${sub.total_marks}`);
                  if (sub.pass_marks != null) parts.push(`Pass: ${sub.pass_marks}`);

                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {sub.name || "Unnamed Subject"}
                        </p>
                        {parts.length > 0 && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {parts.join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditorSubject({
                              index: si,
                              name: sub.name || "",
                              mcq: sub.mcq != null ? String(sub.mcq) : "",
                              written: sub.written != null ? String(sub.written) : "",
                              total_marks: sub.total_marks != null ? String(sub.total_marks) : "",
                              pass_marks: sub.pass_marks != null ? String(sub.pass_marks) : "",
                            });
                          }}
                          className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubject(si)}
                          className="h-7 w-7 text-red-500 hover:text-red-650 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog for Add/Edit Subject */}
      <Dialog
        open={editorSubject !== null}
        onOpenChange={(open) => {
          if (!open) setEditorSubject(null);
        }}
      >
        <DialogContent className="max-w-md w-[calc(100%-2rem)] p-5 rounded-xl border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editorSubject?.index === -1 ? "Add Subject" : "Edit Subject"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter subject name and marks details.
            </DialogDescription>
          </DialogHeader>

          {editorSubject && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Subject Name *</Label>
                <CreatableCombobox
                  value={editorSubject.name}
                  onChange={(val) => setEditorSubject({ ...editorSubject, name: val })}
                  suggestions={disciplines}
                  placeholder="সাবজেক্ট খুঁজুন অথবা টাইপ করুন..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">MCQ Marks</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editorSubject.mcq}
                    onChange={(e) => setEditorSubject({ ...editorSubject, mcq: e.target.value })}
                    placeholder="—"
                    className="h-10 text-sm bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Written Marks</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editorSubject.written}
                    onChange={(e) =>
                      setEditorSubject({ ...editorSubject, written: e.target.value })
                    }
                    placeholder="—"
                    className="h-10 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Total Marks</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editorSubject.total_marks}
                    onChange={(e) =>
                      setEditorSubject({ ...editorSubject, total_marks: e.target.value })
                    }
                    placeholder="—"
                    className="h-10 text-sm bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Pass Marks</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editorSubject.pass_marks}
                    onChange={(e) =>
                      setEditorSubject({ ...editorSubject, pass_marks: e.target.value })
                    }
                    placeholder="—"
                    className="h-10 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorSubject(null)}
              className="h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editorSubject) return;
                if (!editorSubject.name.trim()) return;
                const parsed = {
                  name: editorSubject.name.trim(),
                  mcq: editorSubject.mcq !== "" ? parseFloat(editorSubject.mcq) : null,
                  written: editorSubject.written !== "" ? parseFloat(editorSubject.written) : null,
                  total_marks:
                    editorSubject.total_marks !== "" ? parseFloat(editorSubject.total_marks) : null,
                  pass_marks:
                    editorSubject.pass_marks !== "" ? parseFloat(editorSubject.pass_marks) : null,
                };
                if (editorSubject.index === -1) {
                  appendSubject(parsed);
                } else {
                  updateSubject(editorSubject.index, parsed);
                }
                setEditorSubject(null);
              }}
              disabled={!editorSubject?.name.trim()}
              className="h-9 text-sm bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Save Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Target Group Card (Level 1) ──────────────────────────────────────────────

interface TargetGroupCardProps {
  groupIdx: number;
  onRemove: () => void;
}

function TargetGroupCard({ groupIdx, onRemove }: TargetGroupCardProps) {
  const { register, control, watch, getValues, setValue } =
    useFormContext<UnitMarksDistributionFormValues>();
  const targetGroupName = watch(`subject_selection_rules.${groupIdx}.target_group`);
  const groupIds = watch(`subject_selection_rules.${groupIdx}.group_ids`) || [];

  const { data: groups = [] } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroups,
  });

  const [collapsed, setCollapsed] = useState(() => {
    const val = getValues(`subject_selection_rules.${groupIdx}.target_group`);
    return !!val;
  });

  const {
    fields: rules,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control,
    name: `subject_selection_rules.${groupIdx}.rules`,
  });

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-5 md:py-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-slate-500 hover:text-slate-700 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-800 truncate">
              {targetGroupName || `Group ${groupIdx + 1}`}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {rules.length} rule{rules.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-red-500 hover:text-red-650 hover:bg-red-50 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {!collapsed && (
        <div className="p-3 md:p-5 space-y-4 md:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700 font-semibold">Target Group Name *</Label>
              <Input
                {...register(`subject_selection_rules.${groupIdx}.target_group`)}
                placeholder="e.g. Science Students"
                className="bg-white h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700 font-semibold">
                Total Subjects to Answer *
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                {...register(`subject_selection_rules.${groupIdx}.total_subjects_to_answer`)}
                placeholder="e.g. 4"
                className="bg-white h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700 font-semibold">এই মানবণ্টন কোন গ্রুপের জন্য?</Label>
            <div className="flex flex-wrap gap-3">
              {groups.map((g) => {
                const checked = groupIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all font-bengali ${
                      checked
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border hover:bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => {
                        const next = checked
                          ? groupIds.filter((id: string) => id !== g.id)
                          : [...groupIds, g.id];
                        setValue(`subject_selection_rules.${groupIdx}.group_ids`, next, {
                          shouldDirty: true,
                        });
                      }}
                    />
                    {g.name_bn}
                  </label>
                );
              })}
            </div>
            {groupIds.length === 0 && (
              <p className="text-[11px] text-amber-600 font-bengali">
                কোনো গ্রুপ সিলেক্ট করা হয়নি — সব গ্রুপে দেখাবে।
              </p>
            )}
          </div>

          {/* Rules (Level 2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                Rules{" "}
                <span className="ml-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                  {rules.length}
                </span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  appendRule({
                    type: "mandatory",
                    title: "",
                    note: null,
                    subjects: [],
                  })
                }
                className="h-8 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </Button>
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                No rules yet — click &quot;Add Rule&quot;.
              </p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, ri) => (
                  <RuleCard
                    key={rule.id}
                    groupIdx={groupIdx}
                    ruleIdx={ri}
                    onRemove={() => removeRule(ri)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface UnitMarksDistributionFormProps {
  unitId: string;
  defaultValues?: Partial<UnitMarksDistributionFormValues>;
  onSubmit: (data: UnitMarksDistributionFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function UnitMarksDistributionForm({
  unitId,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
}: UnitMarksDistributionFormProps) {
  const methods = useForm<UnitMarksDistributionFormValues>({
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(unitMarksDistributionSchema) as any,
    defaultValues: {
      unit_id: unitId,
      total_marks: null,
      mcq_marks: null,
      written_marks: null,
      other_marks: null,
      other_marks_type: null,
      total_time: null,
      general_note: null,
      subject_selection_rules: [],
      ...defaultValues,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = methods;

  const {
    fields: groups,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({ control, name: "subject_selection_rules" });

  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit: SubmitHandler<any> = (data) =>
    onSubmit(data as UnitMarksDistributionFormValues);

  const flatFields = ["total_marks", "mcq_marks", "written_marks", "other_marks"] as const;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* ── Section 1: Flat Fields ── */}
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 md:py-4 px-4 md:px-6">
            <CardTitle className="text-base font-semibold text-slate-800">
              Section 1 — Basic Marks &amp; Time
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Flat numeric fields for this unit&apos;s marks distribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {flatFields.map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-sm text-slate-700 font-semibold capitalize">
                    {field.replace(/_/g, " ")}
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    {...register(field)}
                    placeholder="—"
                    className={cn("h-10", errors[field] && "border-red-500")}
                  />
                  {errors[field] && (
                    <p className="text-xs text-red-500 font-medium">
                      {errors[field]?.message as string}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700 font-semibold">Other Marks Type</Label>
                <Input
                  {...register("other_marks_type")}
                  placeholder='e.g. "Drawing", "Viva"'
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700 font-semibold">Total Time</Label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    step="0.01"
                    {...register("total_time")}
                    placeholder="e.g. 1.5"
                    className="h-10 pr-14 bg-white"
                  />
                  <span className="absolute right-3 text-xs font-semibold text-slate-500 font-bengali pointer-events-none select-none">
                    ঘণ্টা
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700 font-semibold">General Note</Label>
              <Textarea
                {...register("general_note")}
                placeholder="Any general note about this distribution…"
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: JSONB Subject Selection Rules ── */}
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 md:py-4 px-4 md:px-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Section 2 — Subject Selection Rules
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Stored as JSONB. Define Target Groups → Rules → Subjects.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() =>
                  appendGroup({
                    target_group: "",
                    group_ids: [],
                    total_subjects_to_answer: 1,
                    rules: [],
                  })
                }
                variant="outline"
                className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 h-9 text-sm"
              >
                <Plus className="h-4 w-4" /> Add Target Group
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-3 md:p-6">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                <div className="p-3 rounded-full bg-slate-100">
                  <Plus className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm max-w-xs font-medium">
                  No target groups yet. Click &quot;Add Target Group&quot; to define subject
                  selection rules.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group, gi) => (
                  <TargetGroupCard key={group.id} groupIdx={gi} onRemove={() => removeGroup(gi)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        <div className="flex justify-end gap-3 pb-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8 h-10 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
