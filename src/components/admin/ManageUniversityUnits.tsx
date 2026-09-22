// =============================================================================
// Admin — University Units Tab CRUD component (Phase 2)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchUnitsByEntity,
  insertUnit,
  updateUnit,
  deleteUnit,
} from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import { fetchGroups } from "@/lib/admin-crud-queries";
import {
  universityUnitSchema,
  type UniversityUnitRow,
  type UniversityUnitFormValues,
} from "@/lib/university-manage-types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Layers, Loader2, ExternalLink } from "lucide-react";

interface ManageUniversityUnitsProps {
  universityId?: string;
  entityId?: string;
  entityType?: EntityType;
}

const QUERY_KEY_UNITS = "admin-entity-units";

export default function ManageUniversityUnits({
  universityId,
  entityId: rawEntityId,
  entityType = "university",
}: ManageUniversityUnitsProps) {
  const entityId = rawEntityId || universityId || "";
  const entityLabel = ENTITY_LABELS[entityType];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UniversityUnitRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UniversityUnitRow | null>(null);

  // Fetch Units
  const {
    data: units = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_UNITS, entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  // Fetch Groups
  const { data: groups = [] } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroups,
  });

  const form = useForm<UniversityUnitFormValues>({
    resolver: zodResolver(universityUnitSchema) as any,
    defaultValues: {
      unit_name_bn: "",
      unit_name_en: "",
      unit_slug: "",
      primary_group_id: null,
      allowed_group_ids: [],
      exam_center_note: null,
      sort_order: 0,
    },
  });

  // Reset form on open/edit change
  useEffect(() => {
    if (sheetOpen) {
      if (editingUnit) {
        form.reset({
          unit_name_bn: editingUnit.unit_name_bn,
          unit_name_en: editingUnit.unit_name_en || "",
          unit_slug: editingUnit.unit_slug,
          primary_group_id: editingUnit.primary_group_id || null,
          allowed_group_ids: editingUnit.allowed_group_ids || [],
          exam_center_note: editingUnit.exam_center_note,
          sort_order: editingUnit.sort_order,
        });
      } else {
        form.reset({
          unit_name_bn: "",
          unit_name_en: "",
          unit_slug: "",
          primary_group_id: null,
          allowed_group_ids: [],
          exam_center_note: null,
          sort_order: 0,
        });
      }
    }
  }, [sheetOpen, editingUnit, form]);

  // Handle Slug generation on Name change when adding
  const unitNameEnValue = form.watch("unit_name_en");
  const unitNameBnValue = form.watch("unit_name_bn");
  const primaryGroupIdValue = form.watch("primary_group_id");
  const allowedGroupIdsValue = form.watch("allowed_group_ids") || [];
  useEffect(() => {
    if (!editingUnit) {
      const baseForSlug = unitNameEnValue || unitNameBnValue;
      if (baseForSlug) {
        const generatedSlug = baseForSlug
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "") // remove special chars
          .trim()
          .replace(/\s+/g, "-"); // spaces to hyphens
        form.setValue("unit_slug", generatedSlug, { shouldValidate: true });
      }
    }
  }, [unitNameEnValue, unitNameBnValue, editingUnit, form]);

  const insertMut = useMutation({
    mutationFn: (values: UniversityUnitFormValues) => insertUnit(values, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_UNITS, entityId, entityType] });
      toast({ title: "✅ ইউনিট যোগ করা হয়েছে" });
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
    mutationFn: ({ id, values }: { id: string; values: UniversityUnitFormValues }) =>
      updateUnit(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_UNITS, entityId, entityType] });
      toast({ title: "✅ ইউনিট আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingUnit(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_UNITS, entityId, entityType] });
      toast({ title: "🗑️ ইউনিট মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: UniversityUnitFormValues) => {
    const updatedAllowedGroupIds = values.primary_group_id
      ? Array.from(new Set([...values.allowed_group_ids, values.primary_group_id]))
      : groups.map((g) => g.id);

    const finalValues: UniversityUnitFormValues = {
      ...values,
      allowed_group_ids: updatedAllowedGroupIds,
    };

    if (editingUnit) {
      updateMut.mutate({ id: editingUnit.id, values: finalValues });
    } else {
      insertMut.mutate(finalValues);
    }
  };

  const openAdd = () => {
    setEditingUnit(null);
    setSheetOpen(true);
  };

  const openEdit = (unit: UniversityUnitRow) => {
    setEditingUnit(unit);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            ইউনিট তালিকা
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            বিশ্ববিদ্যালয়ের অধীনে থাকা বিভিন্ন ইউনিটসমূহ ম্যানেজ করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন ইউনিট
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="ইউনিট লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো ইউনিট যোগ করা হয়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* --- Mobile Card Grid --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
              >
                {/* Header: Name & Slug */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base font-bengali text-foreground truncate">
                      {unit.unit_name_bn}
                    </h3>
                    {unit.unit_name_en && (
                      <span className="text-xs text-muted-foreground block font-sans">
                        ({unit.unit_name_en})
                      </span>
                    )}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground mt-1 inline-block">
                      Slug: {unit.unit_slug}
                    </code>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full font-bengali">
                    ক্রম: {unit.sort_order}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <div>
                    <strong className="font-bengali text-foreground">নিজস্ব বিভাগ:</strong>{" "}
                    <span className="font-bengali">
                      {groups.find((g) => g.id === unit.primary_group_id)?.name_bn || "বিভাগ উন্মুক্ত"}
                    </span>
                  </div>
                  {unit.exam_center_note && (
                    <div>
                      <strong className="font-bengali text-foreground">পরীক্ষা কেন্দ্রের নোট:</strong>{" "}
                      <span className="font-bengali">{unit.exam_center_note}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => openEdit(unit)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-xs font-bengali">সম্পাদনা</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setDeleteTarget(unit)}
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
                    <TableHead className="w-16 font-bengali text-center">ক্রম</TableHead>
                    <TableHead className="font-bengali">ইউনিটের নাম</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="font-bengali">নিজস্ব বিভাগ (Primary Group)</TableHead>
                    <TableHead className="font-bengali">পরীক্ষা কেন্দ্রের নোট</TableHead>
                    <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-bold">{unit.sort_order}</TableCell>
                      <TableCell className="font-semibold font-bengali">
                        {unit.unit_name_bn}
                        {unit.unit_name_en && (
                          <span className="text-xs text-muted-foreground block font-sans">
                            ({unit.unit_name_en})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {unit.unit_slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm font-bengali">
                        {groups.find((g) => g.id === unit.primary_group_id)?.name_bn ||
                          "বিভাগ উন্মুক্ত"}
                      </TableCell>
                      <TableCell className="text-sm font-bengali text-muted-foreground truncate max-w-[200px]">
                        {unit.exam_center_note || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(unit)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(unit)}
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
              {editingUnit ? "ইউনিট তথ্য সম্পাদনা" : "নতুন ইউনিট যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              {editingUnit
                ? "ইউনিটের নাম, স্লাগ এবং অন্যান্য তথ্য পরিবর্তন করুন।"
                : "নতুন ইউনিটের তথ্য ও প্রাধিকার সেটিংস সেট করুন।"}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="unit-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  ইউনিট পরিচিতি
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit_name_bn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ইউনিটের নাম (বাংলা) *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: ক ইউনিট" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit_name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ইউনিটের নাম (ইংরেজি)</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: A Unit" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit_slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: a-unit" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primary_group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">নিজস্ব বিভাগ (Primary Group)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="নিজস্ব বিভাগ নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none" className="font-bengali">
                              None / Open to All (বিভাগ উন্মুক্ত)
                            </SelectItem>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id} className="font-bengali">
                                {group.name_bn} ({group.name_en})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Checklist for Allowed Groups to Apply */}
                <div className="space-y-2">
                  <FormLabel className="font-bengali text-sm">
                    আবেদনযোগ্য বিভাগসমূহ (Allowed Groups to Apply)
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3 bg-muted/10">
                    {groups.map((group) => {
                      const isDisabled =
                        primaryGroupIdValue === null || primaryGroupIdValue === group.id;
                      const checked = isDisabled ? true : allowedGroupIdsValue.includes(group.id);
                      return (
                        <div
                          key={group.id}
                          className={`flex items-center space-x-2 ${isDisabled ? "opacity-50" : ""}`}
                        >
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={checked}
                            disabled={isDisabled}
                            onCheckedChange={(isChecked) => {
                              if (isChecked) {
                                form.setValue(
                                  "allowed_group_ids",
                                  [...allowedGroupIdsValue, group.id],
                                  { shouldDirty: true, shouldValidate: true },
                                );
                              } else {
                                form.setValue(
                                  "allowed_group_ids",
                                  allowedGroupIdsValue.filter((id) => id !== group.id),
                                  { shouldDirty: true, shouldValidate: true },
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={isDisabled ? undefined : `group-${group.id}`}
                            className={`font-bengali text-xs font-normal select-none text-foreground ${
                              isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            {group.name_bn} ({group.name_en})
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ক্রমবিন্যাস (Sort Order) *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  অতিরিক্ত তথ্য
                </p>

                <FormField
                  control={form.control}
                  name="exam_center_note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">পরীক্ষা কেন্দ্রের নোট</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="যেমন: পরীক্ষা শুধুমাত্র মূল ক্যাম্পাসে অনুষ্ঠিত হবে।"
                          rows={3}
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
            <Button type="submit" form="unit-form" disabled={isSubmitting} className="font-bengali">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUnit ? "আপডেট করুন" : "যোগ করুন"}
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
              আপনি কি <strong>{deleteTarget?.unit_name_bn}</strong> মুছে ফেলতে চান? এর অধীনে থাকা সাবজেক্ট
              এবং শর্তাদিও মুছে যেতে পারে।
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
