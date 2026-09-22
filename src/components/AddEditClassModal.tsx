import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createCourseClass, updateCourseClass } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseClass } from "@/lib/types";

interface AddEditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsectionId?: string | null;
  courseClass?: CourseClass | null;
}

export function AddEditClassModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsectionId,
  courseClass,
}: AddEditClassModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!courseClass;

  useEffect(() => {
    if (!isOpen && formRef.current) {
      formRef.current.reset();
    }
  }, [isOpen]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("course_id", courseId);
    formData.append("section_id", sectionId);
    if (subsectionId) formData.append("subsection_id", subsectionId);
    // handle is_live checkbox
    formData.append("is_live", formData.get("is_live") === "on" ? "true" : "false");

    let result;
    if (isEditMode) {
      formData.append("id", courseClass.id);
      result = await updateCourseClass(formData);
    } else {
      result = await createCourseClass(formData);
    }

    if (result.success) {
      toast({ title: `ক্লাস সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে` });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", courseId] });
      onClose();
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "ক্লাস আপডেট করুন" : "নতুন ক্লাস যোগ করুন"}</DialogTitle>
          <DialogDescription>ক্লাসের তথ্য দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">শিরোনাম *</label>
            <Input
              type="text"
              name="title"
              defaultValue={courseClass?.title || ""}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ভিডিও URL</label>
            <Input
              type="url"
              name="video_url"
              defaultValue={courseClass?.video_url || ""}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">নোটস (ভিডিওর নিচে দেখানো হবে)</label>
            <textarea
              name="notes"
              defaultValue={courseClass?.notes || ""}
              disabled={isSubmitting}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_live"
              name="is_live"
              defaultChecked={courseClass?.is_live || false}
              disabled={isSubmitting}
              className="h-4 w-4"
            />
            <label htmlFor="is_live" className="text-sm font-medium cursor-pointer">
              এটি কি লাইভ ক্লাস?
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={courseClass?.sequence_order || 0}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              বাতিল
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditMode ? (
                "আপডেট করুন"
              ) : (
                "যোগ করুন"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
