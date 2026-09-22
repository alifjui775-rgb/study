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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createCourseAssignment, updateCourseAssignment } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseAssignment } from "@/lib/types";

interface AddEditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsectionId?: string | null;
  assignment?: CourseAssignment | null;
}

export function AddEditAssignmentModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsectionId,
  assignment,
}: AddEditAssignmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!assignment;

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

    // Convert text instructions to simple JSON
    const textInstructions = formData.get("instructions_text") as string;
    if (textInstructions) {
      formData.append("instructions", JSON.stringify({ text: textInstructions }));
    }

    let result;
    if (isEditMode) {
      formData.append("id", assignment.id);
      result = await updateCourseAssignment(formData);
    } else {
      result = await createCourseAssignment(formData);
    }

    if (result.success) {
      toast({ title: `অ্যাসাইনমেন্ট সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে` });
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
          <DialogTitle>{isEditMode ? "অ্যাসাইনমেন্ট আপডেট করুন" : "নতুন অ্যাসাইনমেন্ট যোগ করুন"}</DialogTitle>
          <DialogDescription>অ্যাসাইনমেন্টের তথ্য দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">শিরোনাম *</label>
            <Input
              type="text"
              name="title"
              defaultValue={assignment?.title || ""}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ইন্সট্রাকশন</label>
            <Textarea
              name="instructions_text"
              defaultValue={assignment?.instructions?.text || ""}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">জমা দেওয়ার শেষ তারিখ</label>
            <Input
              type="datetime-local"
              name="due_date"
              defaultValue={
                assignment?.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : ""
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={String(assignment?.sequence_order || 0)}
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
