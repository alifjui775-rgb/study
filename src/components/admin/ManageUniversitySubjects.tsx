// =============================================================================
// Admin — University Subjects Tab CRUD component (Phase 2)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchSubjectsByEntity,
  insertSubject,
  updateSubject,
  deleteSubject,
  fetchUnitsByEntity,
} from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import { fetchDegreePrograms } from "@/lib/admin-crud-queries";
import {
  universitySubjectSchema,
  type UniversitySubjectRow,
  type UniversitySubjectFormValues,
} from "@/lib/university-manage-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, BookMarked, Loader2, ExternalLink, HelpCircle } from "lucide-react";

interface ManageUniversitySubjectsProps {
  universityId?: string;
  entityId?: string;
  entityType?: EntityType;
}

const QUERY_KEY_SUBJECTS = "admin-entity-subjects";
const QUERY_KEY_UNITS = "admin-entity-units";
const QUERY_KEY_DEGREE_PROGRAMS = "admin-degree-programs";

export default function ManageUniversitySubjects({
  universityId,
  entityId: rawEntityId,
  entityType = "university",
}: ManageUniversitySubjectsProps) {
  const entityId = rawEntityId || universityId || "";
  const entityLabel = ENTITY_LABELS[entityType];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<UniversitySubjectRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!popoverOpen) {
      setSearchQuery("");
    }
  }, [popoverOpen]);

  // Fetch Institution Subjects
  const {
    data: uniSubjects = [],
    isLoading: loadingSubs,
    isError: hasSubError,
    error: subError,
  } = useQuery({
    queryKey: [QUERY_KEY_SUBJECTS, entityId, entityType],
    queryFn: () => fetchSubjectsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  // Fetch Units for Select dropdown and filtering
  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: [QUERY_KEY_UNITS, entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const filteredSubjects = uniSubjects.filter((sub) => {
    if (!selectedUnitId) return true;
    return sub.unit_id === selectedUnitId;
  });

  // Fetch Degree Programs for Select dropdown
  const { data: degreePrograms = [], isLoading: loadingDegreePrograms } = useQuery({
    queryKey: [QUERY_KEY_DEGREE_PROGRAMS],
    queryFn: () => fetchDegreePrograms(),
  });

  const filteredAvailablePrograms = degreePrograms.filter((sub) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (sub.short_name && sub.short_name.toLowerCase().includes(q)) ||
      (sub.full_name_en && sub.full_name_en.toLowerCase().includes(q)) ||
      (sub.full_name_bn && sub.full_name_bn.toLowerCase().includes(q)) ||
      (sub.slug && sub.slug.toLowerCase().includes(q))
    );
  });

  const form = useForm<UniversitySubjectFormValues>({
    resolver: zodResolver(universitySubjectSchema) as any,
    defaultValues: {
      degree_program_id: "",
      unit_id: null,
      custom_review_url: null,
    },
  });

  // Reset form on open/edit change
  useEffect(() => {
    if (sheetOpen) {
      if (editingSub) {
        form.reset({
          degree_program_id: editingSub.degree_program_id,
          unit_id: editingSub.unit_id || null,
          custom_review_url: editingSub.custom_review_url || "",
        });
      } else {
        form.reset({
          degree_program_id: "",
          unit_id: null,
          custom_review_url: "",
        });
      }
    }
  }, [sheetOpen, editingSub, form]);

  const insertMut = useMutation({
    mutationFn: (values: UniversitySubjectFormValues) =>
      insertSubject(values, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SUBJECTS, entityId, entityType] });
      toast({ title: "✅ বিষয় যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "❌ যোগ করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UniversitySubjectFormValues }) =>
      updateSubject(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SUBJECTS, entityId, entityType] });
      toast({ title: "✅ বিষয় আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingSub(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SUBJECTS, entityId, entityType] });
      toast({ title: "🗑️ বিষয় মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: UniversitySubjectFormValues) => {
    if (editingSub) {
      updateMut.mutate({ id: editingSub.id, values });
    } else {
      insertMut.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingSub(null);
    setSheetOpen(true);
  };

  const openEdit = (sub: UniversitySubjectRow) => {
    setEditingSub(sub);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;
  const isLoadingData = loadingSubs || loadingUnits || loadingDegreePrograms;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            বিশ্ববিদ্যালয়ের বিষয়সমূহ
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            বিশ্ববিদ্যালয় এবং ইউনিটের সাথে ডিগ্রি প্রোগ্রাম ম্যাপিং পরিচালনা করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন বিষয় ম্যাপিং
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="সাবজেক্ট ও ইউনিটের তথ্য লোড হচ্ছে..." />
      ) : hasSubError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {subError instanceof Error ? subError.message : "Unknown"}
          </p>
        </div>
      ) : uniSubjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <BookMarked className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো বিষয় যোগ করা হয়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Unit Filters */}
          <div className="md:hidden">
            <Select
              value={selectedUnitId || "all"}
              onValueChange={(val) => setSelectedUnitId(val === "all" ? null : val)}
            >
              <SelectTrigger className="w-full font-bengali bg-background border-border">
                <SelectValue placeholder="ইউনিট ফিল্টার করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bengali">
                  সব ইউনিট
                </SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="font-bengali">
                    {unit.unit_name_bn} ({unit.unit_name_en})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <Button
              variant={selectedUnitId === null ? "default" : "outline"}
              size="sm"
              className="rounded-full font-bengali whitespace-nowrap"
              onClick={() => setSelectedUnitId(null)}
            >
              সব ইউনিট
            </Button>
            {units.map((unit) => (
              <Button
                key={unit.id}
                variant={selectedUnitId === unit.id ? "default" : "outline"}
                size="sm"
                className="rounded-full font-bengali whitespace-nowrap"
                onClick={() => setSelectedUnitId(unit.id)}
              >
                {unit.unit_name_bn} ({unit.unit_name_en})
              </Button>
            ))}
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <p className="text-muted-foreground font-bengali text-sm">
                এই ইউনিটের জন্য কোনো বিষয় পাওয়া যায়নি।
              </p>
            </div>
          ) : (
            <>
              {/* --- Mobile Card Grid --- */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredSubjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
                  >
                    {/* Top: Name & Unit */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm bg-primary/10 text-primary px-2 py-0.5 rounded inline-block mb-1.5">
                          {sub.degree_program?.short_name || "Unknown"}
                        </span>
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {sub.degree_program?.full_name_en || "Unknown"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 font-bengali">
                          ইউনিট:{" "}
                          {sub.unit
                            ? sub.unit.unit_name_bn || sub.unit.unit_name_en
                            : "সব ইউনিট / প্রযোজ্য নয়"}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    {sub.custom_review_url && (
                      <div className="pt-2 border-t border-border/50 text-xs flex items-center justify-between">
                        <span className="text-muted-foreground font-bengali">কাস্টম রিভিউ:</span>
                        <a
                          href={sub.custom_review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          ভিজিট করুন
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openEdit(sub)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="text-xs font-bengali">সম্পাদনা</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => setDeleteTarget(sub)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-bengali">মুছুন</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- Desktop Table View --- */}
              <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">কোড</TableHead>
                        <TableHead className="font-bengali">সাবজেক্টের নাম</TableHead>
                        <TableHead className="font-bengali">ইউনিট</TableHead>
                        <TableHead className="font-bengali">কাস্টম রিভিউ</TableHead>
                        <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((sub) => (
                        <TableRow
                          key={sub.id}
                          className="group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-bold">
                            {sub.degree_program?.short_name || "—"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {sub.degree_program?.full_name_en || "—"}
                          </TableCell>
                          <TableCell className="font-bengali">
                            {sub.unit ? sub.unit.unit_name_bn || sub.unit.unit_name_en : "—"}
                          </TableCell>
                          <TableCell>
                            {sub.custom_review_url ? (
                              <a
                                href={sub.custom_review_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(sub)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(sub)}
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
            </>
          )}
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editingSub ? "সাবজেক্ট ম্যাপিং সম্পাদনা" : "নতুন বিষয় ম্যাপিং"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              {editingSub
                ? "বিষয়ের তথ্য ও ইউনিট ম্যাপিং পরিবর্তন করুন।"
                : "বিশ্ববিদ্যালয়ের অধীনে নতুন সাবজেক্ট এবং এর ইউনিট ম্যাপিং সেট করুন।"}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="uni-subject-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  সাবজেক্ট ও ইউনিট নির্বাচন
                </p>

                <FormField
                  control={form.control}
                  name="degree_program_id"
                  render={({ field }) => {
                    const selectedProgram = degreePrograms.find((p) => p.id === field.value);
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-bengali">ডিগ্রি প্রোগ্রাম *</FormLabel>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal hover:bg-background/85 active:scale-100 text-left font-bengali min-h-10 h-auto py-2 px-3 border-border rounded-md"
                              >
                                {selectedProgram ? (
                                  <span className="font-semibold text-foreground animate-in fade-in duration-200">
                                    {selectedProgram.short_name} — {selectedProgram.full_name_en}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    ডিগ্রি প্রোগ্রাম সিলেক্ট করুন
                                  </span>
                                )}
                                <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border border-border rounded-xl shadow-lg z-50"
                            align="start"
                          >
                            <div className="p-3 border-b border-border">
                              <Input
                                placeholder="বাংলা, ইংরেজি, কোড বা স্লগ লিখে খুঁজুন..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 font-bengali"
                                autoFocus
                              />
                            </div>
                            <div
                              className="max-h-[280px] overflow-y-auto p-2 space-y-1"
                              style={{ overscrollBehavior: "contain" }}
                              onWheel={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                              {filteredAvailablePrograms.map((sub) => {
                                const isSelected = sub.id === field.value;
                                return (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                      field.onChange(sub.id);
                                      setPopoverOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex flex-col gap-0.5 hover:bg-muted/65 ${
                                      isSelected
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-foreground/90"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold">{sub.short_name}</span>
                                      {sub.full_name_bn && (
                                        <span className="text-xs text-muted-foreground font-bengali">
                                          {sub.full_name_bn}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {sub.full_name_en}
                                    </span>
                                  </button>
                                );
                              })}
                              {filteredAvailablePrograms.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground py-6 font-bengali">
                                  কোনো ডিগ্রি প্রোগ্রাম পাওয়া যায়নি।
                                </p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">বিশ্ববিদ্যালয় ইউনিট</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="font-bengali">
                            <SelectValue placeholder="ইউনিট নির্বাচন করুন (ঐচ্ছিক)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" className="font-bengali">
                            সব ইউনিট / প্রযোজ্য নয়
                          </SelectItem>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id} className="font-bengali">
                              {unit.unit_name_bn}{" "}
                              {unit.unit_name_en ? `(${unit.unit_name_en})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="font-bengali text-[11px]">
                        যদি বিষয়টির আবেদন সম্পূর্ণ বিশ্ববিদ্যালয়ের জন্য প্রযোজ্য হয় তবে এটি ফাঁকা রাখুন।
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  অতিরিক্ত তথ্য
                </p>

                <FormField
                  control={form.control}
                  name="custom_review_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">কাস্টম রিভিউ URL (যদি থাকে)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/cse-review"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </ScrollArea>

          <Separator />

          <div className="px-6 py-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={isSubmitting}
              className="font-bengali"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              form="uni-subject-form"
              disabled={isSubmitting}
              className="font-bengali"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSub ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deleteTarget?.degree_program?.short_name || "এই বিষয়টি"}</strong>-এর
              ম্যাপিং মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
