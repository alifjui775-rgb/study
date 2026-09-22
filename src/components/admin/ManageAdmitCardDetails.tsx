// =============================================================================
// Admin — Admit Card Details CRUD with Junction Multi-Select
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchAdmitCardsByUniversity,
  insertAdmitCardWithJunction,
  updateAdmitCardWithJunction,
  deleteAdmitCard,
} from "@/lib/university-events-queries";
import type { JoinedAdmitCardDetailRow } from "@/lib/university-events-queries";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import {
  admitCardDetailSchema,
  type AdmitCardDetailFormValues,
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
import { Plus, Pencil, Trash2, CalendarDays, Loader2, ExternalLink } from "lucide-react";

import { toBSTISOString, fromUTCtoBSTLocal, formatDateTime } from "@/lib/date-utils";

interface Props {
  entityId: string;
  entityType?: EntityType;
  batchId: string;
}

const QK = "admin-admit-cards";
const QK_UNITS = "admin-university-units";

export default function ManageAdmitCardDetails({
  entityId,
  entityType = "university",
  batchId,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<JoinedAdmitCardDetailRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JoinedAdmitCardDetailRow | null>(null);

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QK, entityId, batchId],
    queryFn: () => fetchAdmitCardsByUniversity(entityId, batchId, entityType),
    enabled: !!entityId && !!batchId,
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: [QK_UNITS, entityId],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<AdmitCardDetailFormValues>({
    resolver: zodResolver(admitCardDetailSchema) as any,
    defaultValues: {
      download_start_datetime: "",
      download_end_datetime: "",
      admit_card_url: "",
      note: "",
      unit_ids: [],
    },
  });

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        const unitIds = (editing.admit_card_units || []).map((u: any) => u.unit_id);
        form.reset({
          download_start_datetime: editing.download_start_datetime
            ? fromUTCtoBSTLocal(editing.download_start_datetime)
            : "",
          download_end_datetime: editing.download_end_datetime
            ? fromUTCtoBSTLocal(editing.download_end_datetime)
            : "",
          admit_card_url: editing.admit_card_url || "",
          note: editing.note || "",
          unit_ids: unitIds,
        });
      } else {
        form.reset({
          download_start_datetime: "",
          download_end_datetime: "",
          admit_card_url: "",
          note: "",
          unit_ids: [],
        });
      }
    }
  }, [sheetOpen, editing, form]);

  const insertMut = useMutation({
    mutationFn: (v: AdmitCardDetailFormValues) =>
      insertAdmitCardWithJunction({ ...v, entityId, entityType, batch_id: batchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ এডমিট কার্ড তথ্য যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AdmitCardDetailFormValues }) =>
      updateAdmitCardWithJunction(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ এডমিট কার্ড তথ্য আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdmitCard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "🗑️ এডমিট কার্ড তথ্য মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = (v: AdmitCardDetailFormValues) => {
    const payload = {
      ...v,
      download_start_datetime: toBSTISOString(v.download_start_datetime),
      download_end_datetime: toBSTISOString(v.download_end_datetime),
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
            <CalendarDays className="h-5 w-5 text-primary" />
            এডমিট কার্ড তথ্য
          </h3>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            এডমিট কার্ড ডাউনলোড লিংক ও সময়সীমা পরিচালনা করুন।
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
          নতুন এডমিট কার্ড তথ্য
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="এডমিট কার্ড তথ্য লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground font-bengali text-sm">
            এই ব্যাচের জন্য কোনো এডমিট কার্ড তথ্য যোগ করা হয়নি।
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
                  {item.download_start_datetime && (
                    <p className="text-xs text-muted-foreground font-bengali">
                      <strong>ডাউনলোড শুরু:</strong> {formatDateTime(item.download_start_datetime)}
                    </p>
                  )}
                  {item.download_end_datetime && (
                    <p className="text-xs text-muted-foreground font-bengali">
                      <strong>ডাউনলোড শেষ:</strong> {formatDateTime(item.download_end_datetime)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(item.admit_card_units || []).map((au: any, i: number) => {
                      const u = units.find((u) => u.id === au.unit_id);
                      return u ? (
                        <Badge key={i} variant="secondary" className="font-bengali text-[10px]">
                          {u.unit_name_bn}
                        </Badge>
                      ) : null;
                    })}
                    {(!item.admit_card_units || item.admit_card_units.length === 0) && (
                      <span className="text-[10px] text-muted-foreground font-bengali">
                        সকল ইউনিট
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-xs text-muted-foreground font-bengali mt-1">{item.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.admit_card_url && (
                    <a href={item.admit_card_url} target="_blank" rel="noopener noreferrer">
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
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editing ? "এডমিট কার্ড তথ্য সম্পাদনা" : "নতুন এডমিট কার্ড তথ্য যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              ডাউনলোড সময়সীমা ও লিংক নির্ধারণ করুন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="admit-card-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="download_start_datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ডাউনলোড শুরু</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="download_end_datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ডাউনলোড শেষ</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="admit_card_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admit Card URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/admit-card"
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
              form="admit-card-form"
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
              আপনি কি সত্যিই এই এডমিট কার্ড তথ্যটি মুছে ফেলতে চান?
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
