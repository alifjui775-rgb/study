// =============================================================================
// Admin — Exam Schedules CRUD (unit-level, no junction table)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchExamSchedulesByUniversity,
  fetchLatestExamScheduleByEntity,
  insertExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
} from "@/lib/university-events-queries";
import type { JoinedExamScheduleRow } from "@/lib/university-events-queries";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { examScheduleSchema, type ExamScheduleFormValues } from "@/lib/university-events-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Clock, Loader2, Sparkles } from "lucide-react";

import { toBSTISOString, fromUTCtoBSTLocal, formatDateTime } from "@/lib/date-utils";

interface Props {
  entityId: string;
  entityType?: EntityType;
  batchId: string;
}

const QK = "admin-exam-schedules";
const QK_UNITS = "admin-university-units";

const EMPTY_ARRAY: any[] = [];

export default function ManageExamSchedules({
  entityId,
  entityType = "university",
  batchId,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<JoinedExamScheduleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JoinedExamScheduleRow | null>(null);
  const [isPrefilled, setIsPrefilled] = useState(false);

  const {
    data: items = EMPTY_ARRAY,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QK, entityId, batchId, entityType],
    queryFn: () => fetchExamSchedulesByUniversity(entityId, batchId, entityType),
    enabled: !!entityId && !!batchId,
  });

  const { data: latestExamSchedule } = useQuery({
    queryKey: ["admin-latest-exam-schedule", entityId, entityType],
    queryFn: () => fetchLatestExamScheduleByEntity(entityId, entityType),
    enabled: !!entityId && sheetOpen && !editing,
  });

  const { data: units = EMPTY_ARRAY, isLoading: loadingUnits } = useQuery({
    queryKey: [QK_UNITS, entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<ExamScheduleFormValues>({
    resolver: zodResolver(examScheduleSchema) as any,
    defaultValues: {
      unit_id: "",
      exam_datetime: "",
      is_tentative: false,
      note: "",
    },
  });

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setIsPrefilled(false);
        form.reset({
          unit_id: editing.unit_id,
          exam_datetime: editing.exam_datetime ? fromUTCtoBSTLocal(editing.exam_datetime) : "",
          is_tentative: editing.is_tentative ?? false,
          note: editing.note || "",
        });
      } else {
        const prev = items[0] || latestExamSchedule;
        if (prev) {
          setIsPrefilled(true);
          form.reset({
            unit_id: prev.unit_id || "",
            exam_datetime: prev.exam_datetime ? fromUTCtoBSTLocal(prev.exam_datetime) : "",
            is_tentative: prev.is_tentative ?? false,
            note: prev.note || "",
          });
        } else {
          setIsPrefilled(false);
          form.reset({ unit_id: "", exam_datetime: "", is_tentative: false, note: "" });
        }
      }
    }
  }, [sheetOpen, editing, items, latestExamSchedule, form]);

  const insertMut = useMutation({
    mutationFn: (v: ExamScheduleFormValues) => insertExamSchedule({ ...v, batch_id: batchId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ পরীক্ষার সময়সূচী যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExamScheduleFormValues }) =>
      updateExamSchedule(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "✅ পরীক্ষার সময়সূচী আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteExamSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK, entityId, batchId] });
      toast({ title: "🗑️ পরীক্ষার সময়সূচী মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = (v: ExamScheduleFormValues) => {
    const payload = {
      ...v,
      exam_datetime: toBSTISOString(v.exam_datetime) || "",
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
            <Clock className="h-5 w-5 text-primary" />
            পরীক্ষার সময়সূচী
          </h3>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            প্রতিটি ইউনিটের জন্য পরীক্ষার তারিখ ও সময় নির্ধারণ করুন।
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
          নতুন সময়সূচী
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="সময়সূচী লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground font-bengali text-sm">
            এই ব্যাচের জন্য কোনো পরীক্ষার সময়সূচী যোগ করা হয়নি।
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bengali">ইউনিট</TableHead>
                  <TableHead className="font-bengali">পরীক্ষার তারিখ ও সময়</TableHead>
                  <TableHead className="font-bengali">নোট</TableHead>
                  <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-sm font-bengali">
                      {(item.unit as any)?.unit_name_bn || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(item.exam_datetime)}
                      {item.is_tentative && (
                        <span className="text-red-500 font-bold ml-1" title="সম্ভাব্য তারিখ">
                          *
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-bengali max-w-[200px] truncate">
                      {item.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editing ? "সময়সূচী সম্পাদনা" : "নতুন পরীক্ষার সময়সূচী যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              ইউনিট নির্বাচন করে পরীক্ষার তারিখ ও সময় নির্ধারণ করুন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="exam-schedule-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <FormField
                  control={form.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">ইউনিট নির্বাচন *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-bengali">
                            <SelectValue placeholder="ইউনিট নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="font-bengali">
                              {u.unit_name_bn} {u.unit_name_en ? `(${u.unit_name_en})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exam_datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">পরীক্ষার তারিখ ও সময় *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_tentative"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border p-4 bg-muted/20">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-bengali cursor-pointer font-medium text-sm">
                          এটি আনুমানিক/সম্ভাব্য তারিখ (Tentative)
                        </FormLabel>
                        <p className="text-xs text-muted-foreground font-bengali">
                          চেকমার্ক দিলে ইউজার ক্যালেন্ডার ও তালিকায় তারিখের পাশে লাল "*" চিহ্ন দেখতে পাবে।
                        </p>
                      </div>
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
            <Button
              type="submit"
              form="exam-schedule-form"
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
              আপনি কি সত্যিই এই পরীক্ষার সময়সূচীটি মুছে ফেলতে চান?
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
