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
import { TiptapEditor } from "@/components/TiptapEditor";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createCourseInstruction, updateCourseInstruction } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseInstruction } from "@/lib/types";

interface AddEditInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsectionId?: string | null;
  instruction?: CourseInstruction | null;
}

export function AddEditInstructionModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsectionId,
  instruction,
}: AddEditInstructionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!instruction;

  const [detailsHtml, setDetailsHtml] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDetailsHtml(instruction?.details || "");
    }
    if (!isOpen && formRef.current) {
      formRef.current.reset();
      setDetailsHtml("");
    }
  }, [isOpen, instruction]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("course_id", courseId);
    formData.append("section_id", sectionId);
    if (subsectionId) formData.append("subsection_id", subsectionId);

    let result;
    if (isEditMode) {
      formData.append("id", instruction.id);
      result = await updateCourseInstruction(formData);
    } else {
      result = await createCourseInstruction(formData);
    }

    if (result.success) {
      toast({ title: `ইন্সট্রাকশন সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে` });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", courseId] });
      onClose();
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "ইন্সট্রাকশন আপডেট করুন" : "নতুন ইন্সট্রাকশন যোগ করুন"}</DialogTitle>
          <DialogDescription>ইন্সট্রাকশনের শিরোনাম ও বিস্তারিত বিবরণ দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">শিরোনাম *</label>
            <Input
              type="text"
              name="title"
              defaultValue={instruction?.title || ""}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">বিস্তারিত বিবরণ *</label>
            <input type="hidden" name="details" value={detailsHtml} />
            <TiptapEditor value={detailsHtml} onChange={setDetailsHtml} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={String(instruction?.sequence_order || 0)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="is_public_instruction"
              name="is_public"
              value="true"
              defaultChecked={instruction ? !!instruction.is_public : false}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="is_public_instruction" className="text-sm font-medium cursor-pointer">
              পাবলিক কন্টেন্ট (সকলের জন্য ফ্রি প্রিভিউ)
            </label>
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
