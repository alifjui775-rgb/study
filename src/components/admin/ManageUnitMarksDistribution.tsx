// =============================================================================
// ManageUnitMarksDistribution — CRUD wrapper for unit_marks_distributions
// Directly renders UnitMarksDistributionForm for the selected unit
// =============================================================================

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import { UnitMarksDistributionForm } from "@/components/admin/UnitMarksDistributionForm";
import {
  fetchMarkDistributionsByUnit,
  insertMarkDistribution,
  updateMarkDistribution,
  deleteMarkDistribution,
} from "@/lib/unit-marks-queries";
import type {
  UnitMarksDistributionRow,
  UnitMarksDistributionFormValues,
  TargetGroupFormValues,
} from "@/lib/unit-marks-types";

const getErrorMessage = (err: any): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String(err.message);
  return String(err);
};

interface ManageUnitMarksDistributionProps {
  unitId: string;
  unitName: string;
}

export default function ManageUnitMarksDistribution({
  unitId,
  unitName,
}: ManageUnitMarksDistributionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["unit-marks-distributions", unitId];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchMarkDistributionsByUnit(unitId),
    enabled: !!unitId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const existingDistribution = rows[0] || null;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: UnitMarksDistributionFormValues) => {
    setIsSubmitting(true);
    try {
      if (existingDistribution) {
        await updateMarkDistribution(existingDistribution.id, data);
        toast({ title: "মানবণ্টন সফলভাবে আপডেট করা হয়েছে।" });
      } else {
        await insertMarkDistribution(data);
        toast({ title: "মানবণ্টন সফলভাবে সংরক্ষণ করা হয়েছে।" });
      }
      invalidate();
    } catch (err) {
      toast({
        title: "সমস্যা হয়েছে",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMarkDistribution(deleteTarget);
      toast({ title: "মানবণ্টন মুছে ফেলা হয়েছে।" });
      invalidate();
    } catch (err) {
      toast({
        title: "মুছে ফেলতে সমস্যা হয়েছে",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const defaultValues: Partial<UnitMarksDistributionFormValues> = existingDistribution
    ? {
        unit_id: existingDistribution.unit_id,
        total_marks: existingDistribution.total_marks,
        mcq_marks: existingDistribution.mcq_marks,
        written_marks: existingDistribution.written_marks,
        other_marks: existingDistribution.other_marks,
        other_marks_type: existingDistribution.other_marks_type,
        total_time: existingDistribution.total_time,
        general_note: existingDistribution.general_note,
        subject_selection_rules: (existingDistribution.subject_selection_rules ??
          []) as TargetGroupFormValues[],
      }
    : {
        unit_id: unitId,
        total_marks: null,
        mcq_marks: null,
        written_marks: null,
        other_marks: null,
        other_marks_type: null,
        total_time: null,
        general_note: null,
        subject_selection_rules: [],
      };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 font-bengali">
              {unitName} - এর মানবণ্টন
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-bengali">
              {existingDistribution ? "বিদ্যমান তথ্য আপডেট করুন।" : "নতুন মানবণ্টন তথ্য যুক্ত করুন।"}
            </p>
          </div>
          {existingDistribution && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(existingDistribution.id)}
              className="gap-1.5 text-red-650 hover:text-red-750 hover:bg-red-50 font-bengali border-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              মুছে ফেলুন
            </Button>
          )}
        </div>

        <UnitMarksDistributionForm
          key={`${unitId}-${existingDistribution?.id || "new"}`}
          unitId={unitId}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={existingDistribution ? "আপডেট করুন" : "সংরক্ষণ করুন"}
        />
      </div>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">আপনি কি নিশ্চিত?</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              এটি স্থায়ীভাবে এই ইউনিটের মানবণ্টন মুছে ফেলবে। এই কাজটি পরিবর্তন করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="font-bengali">
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
