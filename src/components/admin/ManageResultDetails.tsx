// =============================================================================
// Admin — Result Details CRUD with Junction + JSONB others_links (useFieldArray)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchResultsByUniversity,
  insertResultWithJunction,
  updateResultWithJunction,
  deleteResult,
} from "@/lib/university-events-queries";
import type { JoinedResultDetailRow } from "@/lib/university-events-queries";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { resultDetailSchema, type ResultDetailFormValues } from "@/lib/university-events-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2, Award, Loader2, ExternalLink, X } from "lucide-react";

import { toBSTISOString, fromUTCtoBSTLocal, formatDateTime } from "@/lib/date-utils";

interface Props {
  entityId: string;
  entityType?: EntityType;
  batchId: string;
}

const QK = "admin-result-details";
const QK_UNITS = "admin-university-units";

export default function ManageResultDetails({
  entityId,
  entityType = "university",
  batchId,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<JoinedResultDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JoinedResultDetailRow | null>(null);

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QK, entityId, batchId],
    queryFn: () => fetchResultsByUniversity(entityId, batchId, entityType),
    enabled: !!entityId && !!batchId,
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: [QK_UNITS, entityId],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<ResultDetailFormValues>({
    resolver: zodResolver(resultDetailSchema) as any,
    defaultValues: {
      result_datetime: "",
      result_url: "",
      others_links: [],
      note: "",
      unit_ids: [],
    },
  });

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control: form.control,
    name: "others_links",
  });

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        const unitIds = (editing.result_units || []).map((u: any) => u.unit_id);
        form.reset({
          result_datetime: editing.result_datetime
            ? fromUTCtoBSTLocal(editing.result_datetime)
            : "",
          result_url: editing.result_url || "",
          others_links: editing.others_links || [],
          note: editing.note || "",
          unit_ids: unitIds,
        });
      } else {
        form.reset({
          result_datetime: "",
          result_url: "",
          others_links: [],
          note: "",
          unit_ids: [],
        });
      }
    }
  }, [sheetOpen, editing, form]);

  const insertMut = useMutation({
    mutationFn: (v: ResultDetailFormValues) =>
      insertResultWithJunction({ ...v, entityId, entityType, batch_id: batchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ ফলাফল তথ্য যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ResultDetailFormValues }) =>
      updateResultWithJunction(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ ফলাফল তথ্য আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteResult,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "🗑️ ফলাফল তথ্য মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = (v: ResultDetailFormValues) => {
    const payload = {
      ...v,
      result_datetime: toBSTISOString(v.result_datetime),
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, values: payload });
    } else {
      insertMut.mutate(payload);
    }
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;
  const isLoadingData = isLoading || loadingUnits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-bengali flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            পরীক্ষার ফলাফল
          </h3>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            ভর্তি পরীক্ষার ফলাফল প্রকাশের তথ্য ও লিংকসমূহ পরিচালনা করুন।
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
          size="sm"
          className="gap-1.5 font-bengali"
        >
          <Plus className="h-4 w-4" />
          নতুন ফলাফল তথ্য
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="ফলাফল তথ্য লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground font-bengali text-sm">
            এই ব্যাচের জন্য কোনো ফলাফল তথ্য যোগ করা হয়নি।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {item.result_datetime && (
                    <p className="text-xs text-muted-foreground font-bengali">
                      <strong>ফলাফল প্রকাশ:</strong> {formatDateTime(item.result_datetime)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(item.result_units || []).map((ru: any, i: number) => {
                      const u = units.find((u) => u.id === ru.unit_id);
                      return u ? (
                        <Badge key={i} variant="secondary" className="font-bengali text-[10px]">
                          {u.unit_name_bn}
                        </Badge>
                      ) : null;
                    })}
                    {(!item.result_units || item.result_units.length === 0) && (
                      <span className="text-[10px] text-muted-foreground font-bengali">
                        সকল ইউনিট
                      </span>
                    )}
                  </div>
                  {item.others_links && item.others_links.length > 0 && (
                    <p className="text-[10px] text-muted-foreground font-bengali mt-1">
                      {item.others_links.length}টি অতিরিক্ত লিঙ্ক
                    </p>
                  )}
                  {item.note && (
                    <p className="text-xs text-muted-foreground font-bengali mt-1">{item.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.result_url && (
                    <a href={item.result_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditing(item);
                      setSheetOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
              {editing ? "ফলাফল তথ্য সম্পাদনা" : "নতুন ফলাফল তথ্য যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              ফলাফল প্রকাশের তারিখ, লিংক ও অন্যান্য তথ্য নির্ধারণ করুন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="result-detail-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <FormField
                  control={form.control}
                  name="result_datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">ফলাফল প্রকাশের তারিখ/সময়</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="result_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://result.example.com"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নোট</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="অতিরিক্ত তথ্য..."
                          rows={2}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Others Links (useFieldArray) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-bengali text-sm font-bold">অন্যান্য লিঙ্কসমূহ</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs font-bengali"
                      onClick={() => appendLink({ label: "", url: "" })}
                    >
                      <Plus className="h-3 w-3" /> লিঙ্ক যোগ
                    </Button>
                  </div>
                  {linkFields.map((lf, idx) => (
                    <div key={lf.id} className="flex gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`others_links.${idx}.label`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="লেবেল" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`others_links.${idx}.url`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="URL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeLink(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Unit Checkboxes */}
                <FormField
                  control={form.control}
                  name="unit_ids"
                  render={() => (
                    <FormItem className="space-y-3">
                      <div>
                        <FormLabel className="font-bengali text-sm font-bold">
                          প্রযোজ্য ইউনিটসমূহ
                        </FormLabel>
                        <FormDescription className="font-bengali text-[11px]">
                          কোনো ইউনিট সিলেক্ট না করলে সকল ইউনিটের জন্য প্রযোজ্য হবে।
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto p-3 rounded-lg border border-border bg-muted/20">
                        {units.map((unit) => (
                          <FormField
                            key={unit.id}
                            control={form.control}
                            name="unit_ids"
                            render={({ field }) => {
                              const checked = field.value?.includes(unit.id) ?? false;
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(cs) => {
                                        const old = field.value || [];
                                        field.onChange(
                                          cs ? [...old, unit.id] : old.filter((v) => v !== unit.id),
                                        );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal font-bengali">
                                    {unit.unit_name_bn}{" "}
                                    {unit.unit_name_en ? `(${unit.unit_name_en})` : ""}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
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
              form="result-detail-form"
              disabled={isSubmitting}
              className="font-bengali"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "আপডেট করুন" : "যোগ করুন"}
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
              আপনি কি সত্যিই এই ফলাফল তথ্যটি মুছে ফেলতে চান?
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
