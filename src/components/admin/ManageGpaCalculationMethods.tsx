// =============================================================================
// Admin — GPA Calculation Methods Tab CRUD component (Phase 2)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchGpaMethodsByEntity,
  insertGpaMethod,
  updateGpaMethod,
  deleteGpaMethod,
} from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import {
  gpaCalculationMethodSchema,
  type GpaCalculationMethodRow,
  type GpaCalculationMethodFormValues,
} from "@/lib/university-manage-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Calculator, Loader2 } from "lucide-react";

interface ManageGpaCalculationMethodsProps {
  universityId?: string;
  entityId?: string;
  entityType?: EntityType;
}

const QUERY_KEY_GPA = "admin-entity-gpa";

export default function ManageGpaCalculationMethods({
  universityId,
  entityId: rawEntityId,
  entityType = "university",
}: ManageGpaCalculationMethodsProps) {
  const entityId = rawEntityId || universityId || "";
  const entityLabel = ENTITY_LABELS[entityType];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGpa, setEditingGpa] = useState<GpaCalculationMethodRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GpaCalculationMethodRow | null>(null);

  // Fetch GPA Methods
  const {
    data: methods = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_GPA, entityId, entityType],
    queryFn: () => fetchGpaMethodsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<GpaCalculationMethodFormValues>({
    resolver: zodResolver(gpaCalculationMethodSchema) as any,
    defaultValues: {
      method: "gpa",
      max_gpa: 5.0,
      ssc_max_marks: null,
      hsc_max_marks: null,
      ssc_weight: 0,
      hsc_weight: 0,
      total_score: 0,
      notes: null,
    },
  });

  const methodValue = form.watch("method");

  // Reset form
  useEffect(() => {
    if (sheetOpen) {
      if (editingGpa) {
        form.reset({
          method:
            editingGpa.method === "gpa" || editingGpa.method === "marks"
              ? editingGpa.method
              : "gpa",
          max_gpa: editingGpa.max_gpa,
          ssc_max_marks: editingGpa.ssc_max_marks || null,
          hsc_max_marks: editingGpa.hsc_max_marks || null,
          ssc_weight: editingGpa.ssc_weight,
          hsc_weight: editingGpa.hsc_weight,
          total_score: editingGpa.total_score,
          notes: editingGpa.notes || "",
        });
      } else {
        form.reset({
          method: "gpa",
          max_gpa: 5.0,
          ssc_max_marks: null,
          hsc_max_marks: null,
          ssc_weight: 0,
          hsc_weight: 0,
          total_score: 0,
          notes: "",
        });
      }
    }
  }, [sheetOpen, editingGpa, form]);

  const insertMut = useMutation({
    mutationFn: (values: GpaCalculationMethodFormValues) =>
      insertGpaMethod(values, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_GPA, entityId, entityType] });
      toast({ title: "✅ জিপিএ মেথড যোগ করা হয়েছে" });
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
    mutationFn: ({ id, values }: { id: string; values: GpaCalculationMethodFormValues }) =>
      updateGpaMethod(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_GPA, entityId, entityType] });
      toast({ title: "✅ জিপিএ মেথড আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingGpa(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteGpaMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_GPA, entityId, entityType] });
      toast({ title: "🗑️ জিপিএ মেথড মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: GpaCalculationMethodFormValues) => {
    const cleanedValues: GpaCalculationMethodFormValues = {
      ...values,
      ssc_max_marks: values.method === "gpa" ? null : values.ssc_max_marks,
      hsc_max_marks: values.method === "gpa" ? null : values.hsc_max_marks,
      max_gpa: values.method === "marks" ? null : values.max_gpa,
    };

    if (editingGpa) {
      updateMut.mutate({ id: editingGpa.id, values: cleanedValues });
    } else {
      insertMut.mutate(cleanedValues);
    }
  };

  const openAdd = () => {
    setEditingGpa(null);
    setSheetOpen(true);
  };

  const openEdit = (m: GpaCalculationMethodRow) => {
    setEditingGpa(m);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            GPA ক্যালকুলেশন মেথডসমূহ
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            বিশ্ববিদ্যালয়ের জিপিএ হিসাব করার ফর্মুলা, ওয়েইট ও শর্তাবলী পরিচালনা করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন মেথড
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="জিপিএ মেথড লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো জিপিএ মেথড যোগ করা হয়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* --- Mobile Card Grid --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {methods.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base font-bengali text-foreground truncate">
                      {m.method === "gpa"
                        ? "জিপিএ ভিত্তিক (GPA Based)"
                        : "নম্বর ভিত্তিক (Marks Based)"}
                    </h3>
                    {m.max_gpa !== null && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded mt-1 inline-block">
                        সর্বোচ্চ GPA: {m.max_gpa}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <div>
                    <strong className="font-bengali text-foreground">SSC ওয়েইট:</strong>{" "}
                    <span>{m.ssc_weight}</span>
                  </div>
                  <div>
                    <strong className="font-bengali text-foreground">HSC ওয়েইট:</strong>{" "}
                    <span>{m.hsc_weight}</span>
                  </div>
                  <div>
                    <strong className="font-bengali text-foreground">মোট মার্কস:</strong>{" "}
                    <span className="font-bold text-primary">{m.total_score}</span>
                  </div>
                  {(m.ssc_max_marks || m.hsc_max_marks) && (
                    <div className="col-span-2">
                      <strong className="font-bengali text-foreground">সর্বোচ্চ মার্কস:</strong>{" "}
                      <span>
                        SSC {m.ssc_max_marks || "—"}, HSC {m.hsc_max_marks || "—"}
                      </span>
                    </div>
                  )}
                </div>

                {m.notes && (
                  <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground font-bengali">
                    <strong>নোট:</strong> {m.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => openEdit(m)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="text-xs font-bengali">সম্পাদনা</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setDeleteTarget(m)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-bengali">মুছুন</span>
                  </Button>
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
                    <TableHead className="font-bengali">পদ্ধতির নাম</TableHead>
                    <TableHead className="text-center">Max GPA</TableHead>
                    <TableHead className="text-center font-bengali">SSC গুণক/ওয়েইট</TableHead>
                    <TableHead className="text-center font-bengali">HSC গুণক/ওয়েইট</TableHead>
                    <TableHead className="text-center font-bengali">SSC Max Marks</TableHead>
                    <TableHead className="text-center font-bengali">HSC Max Marks</TableHead>
                    <TableHead className="text-center font-bengali">সর্বমোট স্কোর</TableHead>
                    <TableHead className="font-bengali">নোট</TableHead>
                    <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.map((m) => (
                    <TableRow key={m.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold font-bengali">
                        {m.method === "gpa" ? "জিপিএ ভিত্তিক (GPA)" : "নম্বর ভিত্তিক (Marks)"}
                      </TableCell>
                      <TableCell className="text-center">{m.max_gpa ?? "—"}</TableCell>
                      <TableCell className="text-center font-bold">{m.ssc_weight}</TableCell>
                      <TableCell className="text-center font-bold">{m.hsc_weight}</TableCell>
                      <TableCell className="text-center">{m.ssc_max_marks || "—"}</TableCell>
                      <TableCell className="text-center">{m.hsc_max_marks || "—"}</TableCell>
                      <TableCell className="text-center font-extrabold text-primary">
                        {m.total_score}
                      </TableCell>
                      <TableCell className="text-sm font-bengali text-muted-foreground max-w-[200px] truncate">
                        {m.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(m)}
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
              {editingGpa ? "জিপিএ ক্যালকুলেশন মেথড সম্পাদনা" : "নতুন জিপিএ ক্যালকুলেশন মেথড"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              {editingGpa
                ? "জিপিএ ক্যালকুলেশন ফর্মুলা, ওয়েইট ও প্যারামিটারসমূহ আপডেট করুন।"
                : "জিপিএ হিসাব করার জন্য জিপিএ ওয়েইট, মোট নম্বর ও শর্তাবলী সেট করুন।"}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form id="gpa-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  মেথড বিবরণী
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ক্যালকুলেশন পদ্ধতি *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="পদ্ধতি নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpa" className="font-bengali">
                              জিপিএ ভিত্তিক (GPA Based)
                            </SelectItem>
                            <SelectItem value="marks" className="font-bengali">
                              নম্বর ভিত্তিক (Marks Based)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {methodValue === "gpa" && (
                    <FormField
                      control={form.control}
                      name="max_gpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum GPA *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  গুণক ও ওয়েইট (Weights)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ssc_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">SSC গুণক/ওয়েইট *</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hsc_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">HSC গুণক/ওয়েইট *</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">সর্বমোট স্কোর (Total Marks) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  অতিরিক্ত অপশন ও নোট
                </p>

                {methodValue === "marks" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ssc_max_marks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SSC Max Marks (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="যেমন: ৫০"
                              type="number"
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
                      name="hsc_max_marks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HSC Max Marks (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="যেমন: ৫০"
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নোট বা নির্দেশনাবলী</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="জিপিএ হিসাব করার অতিরিক্ত কোনো শর্ত থাকলে লিখুন।"
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
            <Button type="submit" form="gpa-form" disabled={isSubmitting} className="font-bengali">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingGpa ? "আপডেট করুন" : "যোগ করুন"}
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
              আপনি কি সত্যিই এই জিপিএ ক্যালকুলেশন মেথডটি মুছে ফেলতে চান?
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
