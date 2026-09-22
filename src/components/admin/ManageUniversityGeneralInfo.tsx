// =============================================================================
// Admin — University General Info Refactored Tab Component (Phase 2 & 3)
// Refactored to support two sub-tabs: General Info Fields and Dynamic Notes
// =============================================================================

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchEntityGeneralFields,
  updateEntityGeneralFields,
  fetchDynamicNotesByEntity,
  insertDynamicNote,
  updateDynamicNote,
  deleteDynamicNote,
  fetchUnitsByEntity,
  fetchUnitCalculator,
  updateUnitCalculator,
} from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import type { DynamicNoteRow } from "@/lib/university-manage-types";
import { dynamicNoteSchema } from "@/lib/university-manage-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Info, Loader2, HelpCircle, FileText, Plus, Pencil, Trash2 } from "lucide-react";

interface ManageUniversityGeneralInfoProps {
  universityId?: string;
  entityId?: string;
  entityType?: EntityType;
}

const SECTION_OPTIONS = [
  { value: "Apply", label: "আবেদন (Apply)" },
  { value: "AdmitCard", label: "প্রবেশপত্র (AdmitCard)" },
  { value: "ExamDate", label: "পরীক্ষার সময়কাল (ExamDate)" },
  { value: "Location", label: "পরীক্ষা কেন্দ্র (Location)" },
  { value: "MarkDistribution", label: "মানবণ্টন ও অন্যান্য তথ্য (MarkDistribution)" },
  { value: "Result", label: "ফলাফল (Result)" },
];

const generalFieldsFormSchema = z.object({
  second_time: z.boolean().default(false),
  second_time_condition: z.string().nullable().optional(),
  has_negative_mark: z.boolean().default(false),
  negative_mark: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return null;
    const parsed = Number(val);
    return isNaN(parsed) ? null : parsed;
  }, z.number().nullable().optional()),
});

type GeneralFieldsFormValues = z.infer<typeof generalFieldsFormSchema>;
type DynamicNoteFormValues = z.infer<typeof dynamicNoteSchema>;

export default function ManageUniversityGeneralInfo({
  universityId,
  entityId: rawEntityId,
  entityType = "university",
}: ManageUniversityGeneralInfoProps) {
  const entityId = rawEntityId || universityId || "";
  const entityLabel = ENTITY_LABELS[entityType];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog and Sheet states for Dynamic Notes CRUD
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DynamicNoteRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DynamicNoteRow | null>(null);

  // 1. Query - Fetch current values of general fields
  const {
    data: generalFields,
    isLoading: loadingFields,
    isError: isFieldsError,
    error: fieldsError,
  } = useQuery({
    queryKey: ["entity-general-fields", entityId, entityType],
    queryFn: () => fetchEntityGeneralFields(entityId, entityType),
    enabled: !!entityId,
  });

  // 2. Query - Fetch dynamic notes
  const {
    data: notesList = [],
    isLoading: loadingNotes,
    isError: isNotesError,
    error: notesError,
  } = useQuery({
    queryKey: ["entity-dynamic-notes", entityId, entityType],
    queryFn: () => fetchDynamicNotesByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  // 3. Query - Fetch units
  const { data: unitsList = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["entity-units", entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  // Calculator per-unit state
  const [selectedCalcUnitId, setSelectedCalcUnitId] = useState<string>("");

  // 4. Query - Fetch calculator settings for selected unit
  const { data: unitCalcData } = useQuery({
    queryKey: ["unit-calculator", selectedCalcUnitId],
    queryFn: () => fetchUnitCalculator(selectedCalcUnitId),
    enabled: !!selectedCalcUnitId,
  });

  // General fields form
  const generalForm = useForm<GeneralFieldsFormValues>({
    resolver: zodResolver(generalFieldsFormSchema) as any,
    defaultValues: {
      second_time: false,
      second_time_condition: "",
      has_negative_mark: false,
      negative_mark: null,
    },
  });

  // Dynamic Notes form
  const noteForm = useForm<DynamicNoteFormValues>({
    resolver: zodResolver(dynamicNoteSchema) as any,
    defaultValues: {
      unit_id: null,
      display_section: "Apply",
      title: "",
      content: "",
      is_active: true,
      sort_order: 0,
    },
  });

  // Populate general fields when loaded
  useEffect(() => {
    if (generalFields) {
      const hasNeg =
        generalFields.negative_mark !== null && generalFields.negative_mark !== undefined;
      generalForm.reset({
        second_time: generalFields.second_time || false,
        second_time_condition: generalFields.second_time_condition || "",
        has_negative_mark: hasNeg,
        negative_mark: generalFields.negative_mark ?? null,
      });
    }
  }, [generalFields, generalForm]);

  // Populate note form on Sheet open/edit note change
  useEffect(() => {
    if (sheetOpen) {
      if (editingNote) {
        noteForm.reset({
          unit_id: editingNote.unit_id || null,
          display_section: editingNote.display_section,
          title: editingNote.title,
          content: editingNote.content,
          is_active: editingNote.is_active,
          sort_order: editingNote.sort_order,
        });
      } else {
        noteForm.reset({
          unit_id: null,
          display_section: "Apply",
          title: "",
          content: "",
          is_active: true,
          sort_order: 0,
        });
      }
    }
  }, [sheetOpen, editingNote, noteForm]);

  // Mutations
  const updateGeneralMut = useMutation({
    mutationFn: (values: GeneralFieldsFormValues) => {
      const payload = {
        second_time: values.second_time,
        second_time_condition: values.second_time ? values.second_time_condition || null : null,
        negative_mark: values.has_negative_mark
          ? values.negative_mark !== null && values.negative_mark !== undefined
            ? values.negative_mark
            : 0.25
          : null,
      };
      return updateEntityGeneralFields(entityId, entityType, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["entity-general-fields", entityId, entityType],
      });
      toast({ title: "✅ সাধারণ তথ্য সফলভাবে আপডেট করা হয়েছে" });
    },
    onError: (e: any) => {
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      });
    },
  });

  // Calculator per-unit mutation
  const updateCalcMut = useMutation({
    mutationFn: ({
      unitId,
      allowed,
      link,
    }: {
      unitId: string;
      allowed: boolean;
      link: string | null;
    }) => updateUnitCalculator(unitId, allowed, link),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-calculator", selectedCalcUnitId] });
      toast({ title: "✅ ক্যালকুলেটর সেটিংস সফলভাবে আপডেট করা হয়েছে" });
    },
    onError: (e: any) => {
      toast({
        title: "❌ ক্যালকুলেটর আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      });
    },
  });

  const insertNoteMut = useMutation({
    mutationFn: (values: DynamicNoteFormValues) => insertDynamicNote(values, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["entity-dynamic-notes", entityId, entityType],
      });
      toast({ title: "✅ ডায়নামিক নোট সফলভাবে যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) => {
      toast({
        title: "❌ নোট যোগ করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      });
    },
  });

  const updateNoteMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DynamicNoteFormValues }) =>
      updateDynamicNote(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["entity-dynamic-notes", entityId, entityType],
      });
      toast({ title: "✅ ডায়নামিক নোট সফলভাবে আপডেট করা হয়েছে" });
      setSheetOpen(false);
      setEditingNote(null);
    },
    onError: (e: any) => {
      toast({
        title: "❌ নোট আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      });
    },
  });

  const deleteNoteMut = useMutation({
    mutationFn: deleteDynamicNote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["entity-dynamic-notes", entityId, entityType],
      });
      toast({ title: "🗑️ ডায়নামিক নোট মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      });
    },
  });

  const onGeneralSubmit = (values: GeneralFieldsFormValues) => {
    updateGeneralMut.mutate(values);
  };

  const onNoteSubmit = (values: DynamicNoteFormValues) => {
    if (editingNote) {
      updateNoteMut.mutate({ id: editingNote.id, values });
    } else {
      insertNoteMut.mutate(values);
    }
  };

  const openAddNote = () => {
    setEditingNote(null);
    setSheetOpen(true);
  };

  const openEditNote = (note: DynamicNoteRow) => {
    setEditingNote(note);
    setSheetOpen(true);
  };

  const isSavingGeneral = updateGeneralMut.isPending;
  const isSavingNote = insertNoteMut.isPending || updateNoteMut.isPending;

  const isSecondTime = generalForm.watch("second_time");
  const hasNegativeMark = generalForm.watch("has_negative_mark");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/60 p-1 rounded-xl mb-6">
          <TabsTrigger value="general" className="font-bengali py-2 rounded-lg">
            সাধারণ তথ্য
          </TabsTrigger>
          <TabsTrigger value="notes" className="font-bengali py-2 rounded-lg">
            ডায়নামিক নোট
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: General Info Fields ─── */}
        <TabsContent value="general" className="focus-visible:outline-none">
          {loadingFields ? (
            <LoadingSpinner message="তথ্য লোড হচ্ছে..." />
          ) : isFieldsError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-destructive font-bengali">
                তথ্য আনতে সমস্যা: {fieldsError instanceof Error ? fieldsError.message : "Unknown"}
              </p>
            </div>
          ) : (
            <Card className="border border-border/80 bg-card rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 px-6 py-4">
                <CardTitle className="text-lg font-bold font-bengali flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  সাধারণ তথ্যাবলী সংশোধন
                </CardTitle>
                <CardDescription className="font-bengali text-xs">
                  {entityLabel.bn}ের সেকেন্ড টাইম এবং নেগেটিভ মার্ক পলিসি পরিবর্তন করুন।
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...generalForm}>
                  <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-8">
                    {/* 1. Second Time Fields */}
                    <div className="space-y-4 rounded-xl border border-border/60 p-5 bg-muted/5">
                      <FormField
                        control={generalForm.control}
                        name="second_time"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/40 p-4 bg-card shadow-xs">
                            <div className="space-y-1">
                              <FormLabel className="text-base font-bold font-bengali">
                                দ্বিতীয়বার পরীক্ষা (Second Time)
                              </FormLabel>
                              <FormDescription className="font-bengali text-xs text-muted-foreground">
                                এই {entityLabel.bn}ে দ্বিতীয়বার পরীক্ষা দেওয়ার সুযোগ বা সেকেন্ড টাইম আছে কি না
                                তা নির্ধারণ করুন।
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {isSecondTime && (
                        <div className="pl-2 pr-2 animate-fade-in duration-300">
                          <FormField
                            control={generalForm.control}
                            name="second_time_condition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-bengali font-bold text-sm">
                                  সেকেন্ড টাইম শর্তাবলী / নিয়ম (ঐচ্ছিক)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="যেমন: শুধু মাত্র যারা বিগত বছর প্রথমবার পরীক্ষায় অংশ নিয়েছিল..."
                                    className="font-bengali"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription className="font-bengali text-[10px]">
                                  কোনো বিশেষ শর্ত বা প্রবিধান থাকলে উল্লেখ করুন।
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* 2. Negative Marking Fields */}
                    <div className="space-y-4 rounded-xl border border-border/60 p-5 bg-muted/5">
                      <FormField
                        control={generalForm.control}
                        name="has_negative_mark"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/40 p-4 bg-card shadow-xs">
                            <div className="space-y-1">
                              <FormLabel className="text-base font-bold font-bengali">
                                নেগেটিভ মার্কিং (Negative Marking)
                              </FormLabel>
                              <FormDescription className="font-bengali text-xs text-muted-foreground">
                                প্রতিটি ভুল উত্তরের জন্য কোনো নম্বর কাটা হবে কি না তা নির্ধারণ করুন।
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (!checked) {
                                    generalForm.setValue("negative_mark", null);
                                  } else {
                                    generalForm.setValue("negative_mark", 0.25);
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {hasNegativeMark && (
                        <div className="pl-2 pr-2 animate-fade-in duration-300">
                          <FormField
                            control={generalForm.control}
                            name="negative_mark"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-bengali font-bold text-sm">
                                  কাটা নম্বরের পরিমাণ (যেমন: 0.25, 0.20, 0.50)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.25"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.onChange(val === "" ? null : Number(val));
                                    }}
                                  />
                                </FormControl>
                                <FormDescription className="font-bengali text-[10px]">
                                  প্রতিটি ভুলের জন্য কাটা যাওয়া নির্দিষ্ট নম্বর প্রদান করুন।
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. Calculator Allowed Fields (per-unit) */}
                    <div className="space-y-4 rounded-xl border border-border/60 p-5 bg-muted/5">
                      <div className="space-y-1">
                        <h3 className="text-base font-bold font-bengali">
                          ক্যালকুলেটর ব্যবহারের অনুমতি (Calculator)
                        </h3>
                        <p className="font-bengali text-xs text-muted-foreground">
                          প্রতিটি ইউনিটের জন্য আলাদাভাবে ক্যালকুলেটর ব্যবহারের অনুমতি এবং লিংক নির্ধারণ করুন।
                        </p>
                      </div>

                      <div className="space-y-3 rounded-lg border border-border/40 p-4 bg-card shadow-xs">
                        <div className="space-y-1.5">
                          <label className="font-bengali font-bold text-sm">
                            ইউনিট নির্বাচন করুন *
                          </label>
                          <Select value={selectedCalcUnitId} onValueChange={setSelectedCalcUnitId}>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="ইউনিট নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                              {unitsList.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id} className="font-bengali">
                                  {unit.unit_name_bn}
                                  {unit.unit_name_en ? ` (${unit.unit_name_en})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCalcUnitId && (
                          <div className="space-y-4 pt-2 animate-fade-in duration-300">
                            <div className="flex flex-row items-center justify-between rounded-lg border border-border/40 p-4 bg-muted/5 shadow-xs">
                              <div className="space-y-1">
                                <label className="text-sm font-bold font-bengali">
                                  ক্যালকুলেটর অনুমতি
                                </label>
                                <p className="font-bengali text-xs text-muted-foreground">
                                  এই ইউনিটে পরীক্ষায় ক্যালকুলেটর ব্যবহার করতে দেওয়া হবে কি না।
                                </p>
                              </div>
                              <Switch
                                checked={unitCalcData?.calculator_allowed ?? false}
                                onCheckedChange={(checked) =>
                                  updateCalcMut.mutate({
                                    unitId: selectedCalcUnitId,
                                    allowed: checked,
                                    link: unitCalcData?.calculator_link ?? null,
                                  })
                                }
                                disabled={updateCalcMut.isPending}
                              />
                            </div>

                            {unitCalcData?.calculator_allowed && (
                              <div className="pl-2 pr-2 animate-fade-in duration-300">
                                <label className="font-bengali font-bold text-sm">
                                  অনুমোদিত ক্যালকুলেটর তালিকা লিংক (ঐচ্ছিক)
                                </label>
                                <Input
                                  placeholder="যেমন: https://example.com/calculator-list"
                                  className="font-bengali mt-1.5"
                                  defaultValue={unitCalcData?.calculator_link ?? ""}
                                  onBlur={(e) => {
                                    const newLink = e.target.value || null;
                                    if (newLink !== (unitCalcData?.calculator_link ?? null)) {
                                      updateCalcMut.mutate({
                                        unitId: selectedCalcUnitId,
                                        allowed: true,
                                        link: newLink,
                                      });
                                    }
                                  }}
                                />
                                <p className="font-bengali text-[10px] text-muted-foreground mt-1">
                                  অনুমোদিত সায়েন্টিফিক বা জেনারেল ক্যালকুলেটর তালিকার লিংক।
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border/40">
                      <Button
                        type="submit"
                        disabled={isSavingGeneral}
                        className="font-bengali px-6"
                      >
                        {isSavingGeneral && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        তথ্য সংরক্ষণ করুন
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── TAB 2: Dynamic Notes CRUD ─── */}
        <TabsContent value="notes" className="focus-visible:outline-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-bengali flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  ডায়নামিক নোটসমূহ (Dynamic Notes)
                </h3>
                <p className="text-xs text-muted-foreground font-bengali mt-0.5">
                  নির্দিষ্ট ইউনিটের বা সেকশনের জন্য বিশেষ বা অদ্ভুত শর্তাবলী নোট আকারে পরিচালনা করুন।
                </p>
              </div>
              <Button onClick={openAddNote} className="gap-1.5 font-bengali">
                <Plus className="h-4 w-4" />
                নতুন নোট যোগ করুন
              </Button>
            </div>

            {loadingNotes || loadingUnits ? (
              <LoadingSpinner message="নোট লোড হচ্ছে..." />
            ) : isNotesError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-destructive font-bengali">
                  নোট আনতে সমস্যা: {notesError instanceof Error ? notesError.message : "Unknown"}
                </p>
              </div>
            ) : notesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                <HelpCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-bengali">
                  এখনো কোনো ডায়নামিক নোট যোগ করা হয়নি।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile view */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {notesList.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-base font-bengali truncate">
                            {note.title}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                              সেকশন: {note.display_section}
                            </span>
                            <span className="text-[10px] bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded">
                              ইউনিট: {note.unit ? note.unit.unit_name_bn : "সকল ইউনিট"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded font-bengali">
                          ক্রম: {note.sort_order}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 font-bengali">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-xs font-semibold">
                          অবস্থা:{" "}
                          <span
                            className={note.is_active ? "text-green-600" : "text-muted-foreground"}
                          >
                            {note.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => openEditNote(note)}
                          >
                            <Pencil className="h-3 w-3" />
                            সম্পাদনা
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => setDeleteTarget(note)}
                          >
                            <Trash2 className="h-3 w-3" />
                            মুছুন
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center font-bengali">ক্রম</TableHead>
                        <TableHead className="font-bengali">টাইটেল</TableHead>
                        <TableHead className="font-bengali">সেকশন</TableHead>
                        <TableHead className="font-bengali">ইউনিট</TableHead>
                        <TableHead className="w-24 text-center font-bengali">অবস্থা</TableHead>
                        <TableHead className="w-24 text-right font-bengali">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notesList.map((note) => (
                        <TableRow key={note.id} className="hover:bg-muted/30">
                          <TableCell className="text-center font-bold">{note.sort_order}</TableCell>
                          <TableCell className="font-semibold font-bengali">{note.title}</TableCell>
                          <TableCell className="font-medium text-xs text-primary font-mono">
                            {note.display_section}
                          </TableCell>
                          <TableCell className="font-medium text-xs font-bengali text-muted-foreground">
                            {note.unit ? note.unit.unit_name_bn : "সব ইউনিট / প্রযোজ্য নয়"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold font-bengali ${
                                note.is_active
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {note.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditNote(note)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(note)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- Sheet to Add/Edit Note --- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full text-left"
        >
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editingNote ? "নোট সম্পাদনা" : "নতুন ডায়নামিক নোট যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              প্রদর্শনের স্থান, ইউনিট এবং কন্টেন্ট আপডেট করুন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...noteForm}>
              <form
                id="note-form"
                onSubmit={noteForm.handleSubmit(onNoteSubmit)}
                className="space-y-5 py-5"
              >
                <FormField
                  control={noteForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali font-bold">
                        টাইটেল (যেমন: আইবিএ কী? / নোটিশ) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="নোটের সংক্ষিপ্ত শিরোনাম..."
                          className="font-bengali"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={noteForm.control}
                    name="display_section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali font-bold">
                          কোথায় প্রদর্শিত হবে (Section) *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="সেকশন নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SECTION_OPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="font-bengali"
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={noteForm.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali font-bold">
                          প্রযোজ্য ইউনিট (ঐচ্ছিক)
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                          defaultValue={field.value || "none"}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="সব ইউনিট / প্রযোজ্য নয়" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none" className="font-bengali">
                              সব ইউনিট / প্রযোজ্য নয়
                            </SelectItem>
                            {unitsList.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id} className="font-bengali">
                                {unit.unit_name_bn}{" "}
                                {unit.unit_name_en ? `(${unit.unit_name_en})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={noteForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali font-bold">
                        বিস্তারিত বিবরণ (Content) *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="বিস্তারিত বিবরণ..."
                          rows={6}
                          className="font-bengali min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={noteForm.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali font-bold">
                          ক্রমবিন্যাস (Sort Order) *
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={noteForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/40 p-4 bg-muted/5 shadow-xs">
                        <div className="space-y-0.5">
                          <FormLabel className="font-bengali font-bold text-sm">
                            সক্রিয় অবস্থা
                          </FormLabel>
                          <FormDescription className="text-xs font-bengali">
                            এটি ফ্রন্টেন্ডে ডিফল্ট ওপেন থাকবে কি না
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </ScrollArea>

          <Separator />

          <div className="px-6 py-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={isSavingNote}
              className="font-bengali"
            >
              বাতিল
            </Button>
            <Button type="submit" form="note-form" disabled={isSavingNote} className="font-bengali">
              {isSavingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingNote ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- Delete Confirm Dialog --- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-left">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি সত্যিই <strong>{deleteTarget?.title}</strong> নামক এই ডায়নামিক নোটটি মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteNoteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteNoteMut.isPending}
            >
              {deleteNoteMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
