// =============================================================================
// Admin — Admission Circulars CRUD component with Junction Multi-Select (Phase 3)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchCircularsByUniversity,
  fetchLatestCircularByEntity,
  insertCircularWithJunction,
  updateCircularWithJunction,
  deleteCircular,
} from "@/lib/university-events-queries";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import {
  circularSchema,
  type CircularRow,
  type CircularFormValues,
} from "@/lib/university-events-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2, FileText, Loader2, ExternalLink, Sparkles } from "lucide-react";

interface ManageAdmissionCircularsProps {
  entityId: string;
  entityType?: EntityType;
  batchId: string;
}

const QUERY_KEY_CIRCULARS = "admin-admission-circulars";
const QUERY_KEY_UNITS = "admin-university-units";

const EMPTY_ARRAY: any[] = [];

export default function ManageAdmissionCirculars({
  entityId,
  entityType = "university",
  batchId,
}: ManageAdmissionCircularsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCircular, setEditingCircular] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CircularRow | null>(null);
  const [isPrefilled, setIsPrefilled] = useState(false);

  // Fetch Circulars
  const {
    data: circulars = EMPTY_ARRAY,
    isLoading: loadingCirculars,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_CIRCULARS, entityId, batchId, entityType],
    queryFn: () => fetchCircularsByUniversity(entityId, batchId, entityType),
    enabled: !!entityId && !!batchId,
  });

  // Fetch latest circular for prefilling if current batch is empty
  const { data: latestCircular } = useQuery({
    queryKey: ["admin-latest-circular", entityId, entityType],
    queryFn: () => fetchLatestCircularByEntity(entityId, entityType),
    enabled: !!entityId && sheetOpen && !editingCircular,
  });

  // Fetch Units for Multi-Select Checkboxes
  const { data: units = EMPTY_ARRAY, isLoading: loadingUnits } = useQuery({
    queryKey: [QUERY_KEY_UNITS, entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<CircularFormValues>({
    resolver: zodResolver(circularSchema) as any,
    defaultValues: {
      title: "",
      download_url: "",
      note: "",
      unit_ids: [],
    },
  });

  // Reset form with editing data or pre-fill from previous circular
  useEffect(() => {
    if (sheetOpen) {
      if (editingCircular) {
        setIsPrefilled(false);
        const selectedUnitIds = (editingCircular.circular_units || []).map((cu: any) => cu.unit_id);
        form.reset({
          title: editingCircular.title,
          download_url: editingCircular.download_url || "",
          note: editingCircular.note || "",
          unit_ids: selectedUnitIds,
        });
      } else {
        const prev = circulars[0] || latestCircular;
        if (prev) {
          setIsPrefilled(true);
          const selectedUnitIds = (prev.circular_units || []).map((cu: any) => cu.unit_id);
          form.reset({
            title: prev.title || "",
            download_url: prev.download_url || "",
            note: prev.note || "",
            unit_ids: selectedUnitIds,
          });
        } else {
          setIsPrefilled(false);
          form.reset({
            title: "",
            download_url: "",
            note: "",
            unit_ids: [],
          });
        }
      }
    }
  }, [sheetOpen, editingCircular, circulars, latestCircular, form]);

  const insertMut = useMutation({
    mutationFn: (values: CircularFormValues) =>
      insertCircularWithJunction({
        ...values,
        entityId,
        entityType,
        batch_id: batchId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_CIRCULARS, entityId, batchId],
      });
      toast({ title: "✅ সার্কুলার যোগ করা হয়েছে" });
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
    mutationFn: ({ id, values }: { id: string; values: CircularFormValues }) =>
      updateCircularWithJunction(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_CIRCULARS, entityId, batchId],
      });
      toast({ title: "✅ সার্কুলার আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingCircular(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCircular,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_CIRCULARS, entityId, batchId],
      });
      toast({ title: "🗑️ সার্কুলার মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: CircularFormValues) => {
    if (editingCircular) {
      updateMut.mutate({ id: editingCircular.id, values });
    } else {
      insertMut.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingCircular(null);
    setSheetOpen(true);
  };

  const openEdit = (circular: any) => {
    setEditingCircular(circular);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;
  const isLoadingData = loadingCirculars || loadingUnits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-bengali flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            সার্কুলার তালিকা
          </h3>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            এই ব্যাচের জন্য প্রকাশিত ভর্তি সার্কুলার ও সংশ্লিষ্ট ইউনিটসমূহ পরিচালনা করুন।
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন সার্কুলার
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="সার্কুলার লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-destructive font-bengali font-medium">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown Error"}
          </p>
          <p className="text-xs text-muted-foreground font-bengali">
            (যদি `college_id` বা `cluster_id` কলাম অনুপস্থিত থাকে, তবে অনুগ্রহ করে Supabase SQL Editor-এ{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-foreground">
              study/migrations/merged_migration.sql
            </code>{" "}
            ফাইলটি রান করুন।)
          </p>
        </div>
      ) : circulars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground font-bengali text-sm">
            এই ব্যাচের অধীনে কোনো ভর্তি সার্কুলার যোগ করা হয়নি।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* --- Mobile Card Grid --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {circulars.map((c) => {
              const selectedUnitNames = (c.circular_units || [])
                .map((cu: any) => {
                  const matchingUnit = units.find((u) => u.id === cu.unit_id);
                  return matchingUnit
                    ? matchingUnit.unit_name_bn || matchingUnit.unit_name_en
                    : null;
                })
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-foreground truncate font-bengali">
                        {c.title}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    {selectedUnitNames && (
                      <div>
                        <strong className="font-bengali text-foreground">সংযুক্ত ইউনিটসমূহ:</strong>{" "}
                        <span className="font-bengali">{selectedUnitNames}</span>
                      </div>
                    )}
                    {c.note && (
                      <div>
                        <strong className="font-bengali text-foreground">নোট:</strong>{" "}
                        <span className="font-bengali">{c.note}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    {c.download_url ? (
                      <a
                        href={c.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-bengali"
                      >
                        সার্কুলার দেখুন
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-bengali">
                        লিংক নেই
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="text-xs font-bengali">সম্পাদনা</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-bengali">মুছুন</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- Desktop Table View --- */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bengali">শিরোনাম</TableHead>
                    <TableHead className="font-bengali">সংযুক্ত ইউনিটসমূহ</TableHead>
                    <TableHead className="font-bengali">নোট</TableHead>
                    <TableHead className="text-center font-bengali">ডাউনলোড URL</TableHead>
                    <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {circulars.map((c) => {
                    const selectedUnitNames = (c.circular_units || [])
                      .map((cu: any) => {
                        const matchingUnit = units.find((u) => u.id === cu.unit_id);
                        return matchingUnit
                          ? matchingUnit.unit_name_bn || matchingUnit.unit_name_en
                          : null;
                      })
                      .filter(Boolean);

                    return (
                      <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-sm font-bengali">{c.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {selectedUnitNames.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              selectedUnitNames.map((uName: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="font-bengali text-[10px]"
                                >
                                  {uName}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-bengali max-w-[200px] truncate">
                          {c.note || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {c.download_url ? (
                            <a href={c.download_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
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
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
              {editingCircular ? "সার্কুলার সম্পাদনা" : "নতুন সার্কুলার যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              ভর্তি সার্কুলারের বিবরণ এবং সংযুক্ত ইউনিটসমূহ নির্বাচন করুন।
            </SheetDescription>
          </SheetHeader>

          {!editingCircular && isPrefilled && (
            <div className="mx-6 mb-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-bengali text-primary">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>পূর্ববর্তী সার্কুলারের তথ্য ফেচ করে ফর্ম পূরণ করা হয়েছে।</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  form.reset({ title: "", download_url: "", note: "", unit_ids: [] });
                  setIsPrefilled(false);
                }}
              >
                ফাঁকা করুন
              </Button>
            </div>
          )}

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="circular-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">সার্কুলার শিরোনাম *</FormLabel>
                      <FormControl>
                        <Input placeholder="যেমন: ভর্তি বিজ্ঞপ্তি ২০২৬" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="download_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Download URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/circular.pdf"
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

                {/* Junction Multi-Select Checkbox Group */}
                <FormField
                  control={form.control}
                  name="unit_ids"
                  render={() => (
                    <FormItem className="space-y-3">
                      <div>
                        <FormLabel className="font-bengali text-sm font-bold">
                          প্রযোজ্য ইউনিটসমূহ *
                        </FormLabel>
                        <FormDescription className="font-bengali text-[11px]">
                          এই সার্কুলারটি যে সমস্ত ইউনিটের জন্য প্রযোজ্য, টিক চিহ্ন দিন।
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
                                <FormItem
                                  key={unit.id}
                                  className="flex flex-row items-center space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(checkedState) => {
                                        const oldVal = field.value || [];
                                        if (checkedState) {
                                          field.onChange([...oldVal, unit.id]);
                                        } else {
                                          field.onChange(oldVal.filter((val) => val !== unit.id));
                                        }
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
              form="circular-form"
              disabled={isSubmitting}
              className="font-bengali"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCircular ? "আপডেট করুন" : "যোগ করুন"}
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
              আপনি কি সত্যিই <strong>{deleteTarget?.title}</strong> সার্কুলারটি মুছে ফেলতে চান?
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
