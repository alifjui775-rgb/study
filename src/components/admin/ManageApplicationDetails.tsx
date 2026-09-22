// =============================================================================
// Admin — Application Details CRUD with Junction + Phases (useFieldArray)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchApplicationsByUniversity,
  fetchLatestApplicationByEntity,
  insertApplicationWithJunction,
  updateApplicationWithJunction,
  deleteApplication,
} from "@/lib/university-events-queries";
import type { JoinedApplicationDetailRow } from "@/lib/university-events-queries";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import {
  applicationDetailSchema,
  type ApplicationDetailFormValues,
} from "@/lib/university-events-types";

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
import { Plus, Pencil, Trash2, Contact2, Loader2, ExternalLink, X, Sparkles } from "lucide-react";

import { toBSTISOString, fromUTCtoBSTLocal, formatDateTime } from "@/lib/date-utils";

interface Props {
  entityId: string;
  entityType?: EntityType;
  batchId: string;
}

const QK = "admin-application-details";
const QK_UNITS = "admin-university-units";

const EMPTY_ARRAY: any[] = [];

export default function ManageApplicationDetails({
  entityId,
  entityType = "university",
  batchId,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<JoinedApplicationDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JoinedApplicationDetailRow | null>(null);
  const [isPrefilled, setIsPrefilled] = useState(false);

  const {
    data: items = EMPTY_ARRAY,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QK, entityId, batchId, entityType],
    queryFn: () => fetchApplicationsByUniversity(entityId, batchId, entityType),
    enabled: !!entityId && !!batchId,
  });

  const { data: latestApplication } = useQuery({
    queryKey: ["admin-latest-application", entityId, entityType],
    queryFn: () => fetchLatestApplicationByEntity(entityId, entityType),
    enabled: !!entityId && sheetOpen && !editing,
  });

  const { data: units = EMPTY_ARRAY, isLoading: loadingUnits } = useQuery({
    queryKey: [QK_UNITS, entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<ApplicationDetailFormValues>({
    resolver: zodResolver(applicationDetailSchema) as any,
    defaultValues: {
      start_datetime: "",
      end_datetime: "",
      fee: null,
      fee_payment_method: "",
      apply_url: "",
      helpful_links: [],
      note: "",
      unit_ids: [],
      phases: [],
    },
  });

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control: form.control,
    name: "helpful_links",
  });

  const {
    fields: phaseFields,
    append: appendPhase,
    remove: removePhase,
  } = useFieldArray({
    control: form.control,
    name: "phases",
  });

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setIsPrefilled(false);
        const unitIds = (editing.application_units || []).map((u: any) => u.unit_id);
        form.reset({
          start_datetime: editing.start_datetime ? fromUTCtoBSTLocal(editing.start_datetime) : "",
          end_datetime: editing.end_datetime ? fromUTCtoBSTLocal(editing.end_datetime) : "",
          fee: editing.fee,
          fee_payment_method: editing.fee_payment_method || "",
          apply_url: editing.apply_url || "",
          helpful_links: editing.helpful_links || [],
          note: editing.note || "",
          unit_ids: unitIds,
          phases: (editing.application_phases || []).map((p: any) => ({
            phase_name: p.phase_name,
            start_datetime: p.start_datetime ? fromUTCtoBSTLocal(p.start_datetime) : "",
            end_datetime: p.end_datetime ? fromUTCtoBSTLocal(p.end_datetime) : "",
            fee: p.fee,
            fee_payment_method: p.fee_payment_method || "",
            apply_url: p.apply_url || "",
            phase_links: p.phase_links || [],
            sort_order: p.sort_order,
          })),
        });
      } else {
        const prev = items[0] || latestApplication;
        if (prev) {
          setIsPrefilled(true);
          const unitIds = (prev.application_units || []).map((u: any) => u.unit_id);
          form.reset({
            start_datetime: prev.start_datetime ? fromUTCtoBSTLocal(prev.start_datetime) : "",
            end_datetime: prev.end_datetime ? fromUTCtoBSTLocal(prev.end_datetime) : "",
            fee: prev.fee,
            fee_payment_method: prev.fee_payment_method || "",
            apply_url: prev.apply_url || "",
            helpful_links: prev.helpful_links || [],
            note: prev.note || "",
            unit_ids: unitIds,
            phases: (prev.application_phases || []).map((p: any) => ({
              phase_name: p.phase_name,
              start_datetime: p.start_datetime ? fromUTCtoBSTLocal(p.start_datetime) : "",
              end_datetime: p.end_datetime ? fromUTCtoBSTLocal(p.end_datetime) : "",
              fee: p.fee,
              fee_payment_method: p.fee_payment_method || "",
              apply_url: p.apply_url || "",
              phase_links: p.phase_links || [],
              sort_order: p.sort_order,
            })),
          });
        } else {
          setIsPrefilled(false);
          form.reset({
            start_datetime: "",
            end_datetime: "",
            fee: null,
            fee_payment_method: "",
            apply_url: "",
            helpful_links: [],
            note: "",
            unit_ids: [],
            phases: [],
          });
        }
      }
    }
  }, [sheetOpen, editing, items, latestApplication, form]);

  const insertMut = useMutation({
    mutationFn: (v: ApplicationDetailFormValues) =>
      insertApplicationWithJunction({ ...v, entityId, entityType, batch_id: batchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ আবেদন বিবরণ যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ApplicationDetailFormValues }) =>
      updateApplicationWithJunction(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ আবেদন বিবরণ আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "🗑️ আবেদন বিবরণ মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = (v: ApplicationDetailFormValues) => {
    const payload = {
      ...v,
      start_datetime: toBSTISOString(v.start_datetime),
      end_datetime: toBSTISOString(v.end_datetime),
      phases: (v.phases || []).map((p) => ({
        ...p,
        start_datetime: toBSTISOString(p.start_datetime) || "",
        end_datetime: toBSTISOString(p.end_datetime) || "",
      })),
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
            <Contact2 className="h-5 w-5 text-primary" />
            আবেদন বিবরণ তালিকা
          </h3>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            এই ব্যাচের আবেদন সংক্রান্ত সকল তথ্য পরিচালনা করুন।
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
          নতুন আবেদন বিবরণ
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="আবেদন বিবরণ লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground font-bengali text-sm">
            এই ব্যাচের জন্য কোনো আবেদন বিবরণ যোগ করা হয়নি।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => {
            const unitNames = (item.application_units || [])
              .map((au: any) => units.find((u) => u.id === au.unit_id))
              .filter(Boolean)
              .map((u: any) => u.unit_name_bn || u.unit_name_en)
              .join(", ");

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    {item.start_datetime && (
                      <p className="text-xs text-muted-foreground font-bengali">
                        <strong>শুরু:</strong> {formatDateTime(item.start_datetime)}
                      </p>
                    )}
                    {item.end_datetime && (
                      <p className="text-xs text-muted-foreground font-bengali">
                        <strong>শেষ:</strong> {formatDateTime(item.end_datetime)}
                      </p>
                    )}
                    {item.fee != null && (
                      <p className="text-xs font-bengali">
                        <strong>ফি:</strong> {item.fee}৳{" "}
                        {item.fee_payment_method && `(${item.fee_payment_method})`}
                      </p>
                    )}
                    {unitNames && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(item.application_units || []).map((au: any, i: number) => {
                          const u = units.find((u) => u.id === au.unit_id);
                          return u ? (
                            <Badge key={i} variant="secondary" className="font-bengali text-[10px]">
                              {u.unit_name_bn}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    {item.application_phases && item.application_phases.length > 0 && (
                      <p className="text-[10px] text-muted-foreground font-bengali mt-1">
                        {item.application_phases.length}টি আবেদন ধাপ রয়েছে
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.apply_url && (
                      <a href={item.apply_url} target="_blank" rel="noopener noreferrer">
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
            );
          })}
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
              {editing ? "আবেদন বিবরণ সম্পাদনা" : "নতুন আবেদন বিবরণ যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              আবেদনের সময়কাল, ফি, লিংক ও ধাপসমূহ নির্ধারণ করুন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="app-detail-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">আবেদন শুরুর তারিখ/সময়</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">আবেদন শেষের তারিখ/সময়</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">আবেদন ফি (৳)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
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
                    name="fee_payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">পেমেন্ট মেথড</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="যেমন: বিকাশ, নগদ"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="apply_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apply URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://admission.example.com"
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

                {/* Helpful Links (useFieldArray) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-bengali text-sm font-bold">সহায়ক লিঙ্কসমূহ</FormLabel>
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
                        name={`helpful_links.${idx}.label`}
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
                        name={`helpful_links.${idx}.url`}
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

                {/* Application Phases (useFieldArray) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-bengali text-sm font-bold">
                      আবেদনের ধাপসমূহ (Phases)
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs font-bengali"
                      onClick={() =>
                        appendPhase({
                          phase_name: "",
                          start_datetime: "",
                          end_datetime: "",
                          fee: null,
                          fee_payment_method: "",
                          apply_url: "",
                          phase_links: [],
                          sort_order: phaseFields.length,
                        })
                      }
                    >
                      <Plus className="h-3 w-3" /> ধাপ যোগ
                    </Button>
                  </div>
                  {phaseFields.map((pf, idx) => (
                    <div
                      key={pf.id}
                      className="rounded-lg border border-border p-3 space-y-3 bg-muted/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-bengali text-muted-foreground">
                          ধাপ #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removePhase(idx)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`phases.${idx}.phase_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bengali text-xs">ধাপের নাম *</FormLabel>
                            <FormControl>
                              <Input placeholder="যেমন: Primary / Final" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`phases.${idx}.start_datetime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bengali text-xs">শুরু *</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`phases.${idx}.end_datetime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bengali text-xs">শেষ *</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`phases.${idx}.fee`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bengali text-xs">ফি (৳)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
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
                          name={`phases.${idx}.apply_url`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Apply URL</FormLabel>
                              <FormControl>
                                <Input placeholder="URL" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
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
              disabled={isSubmitting}
              className="font-bengali"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              form="app-detail-form"
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
              আপনি কি সত্যিই এই আবেদন বিবরণটি মুছে ফেলতে চান?
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
