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
import { createCoursePoll, updateCoursePoll } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CoursePoll } from "@/lib/types";

interface AddEditPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsectionId?: string | null;
  poll?: CoursePoll | null;
}

export function AddEditPollModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsectionId,
  poll,
}: AddEditPollModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!poll;

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

    let result;
    if (isEditMode) {
      formData.append("id", poll.id);
      result = await updateCoursePoll(formData);
    } else {
      result = await createCoursePoll(formData);
    }

    if (result.success) {
      toast({ title: `পোল সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে` });
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
          <DialogTitle>{isEditMode ? "পোল আপডেট করুন" : "নতুন পোল যোগ করুন"}</DialogTitle>
          <DialogDescription>পোলের তথ্য দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">শিরোনাম *</label>
            <Input
              type="text"
              name="title"
              defaultValue={poll?.title || ""}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">পোল সিস্টেম আইডি *</label>
            <Input
              type="text"
              name="poll_system_id"
              defaultValue={poll?.poll_system_id || ""}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={String(poll?.sequence_order || 0)}
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
