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
import { createCourseSubsection, updateCourseSubsection } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseSubsection } from "@/lib/types";

interface AddEditSubsectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsection?: CourseSubsection | null; // If provided, it's edit mode
}

export function AddEditSubsectionModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsection,
}: AddEditSubsectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!subsection;

  useEffect(() => {
    if (!isOpen && formRef.current) {
      formRef.current.reset();
    }
  }, [isOpen]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("section_id", sectionId);

    let result;
    if (isEditMode) {
      formData.append("id", subsection.id);
      result = await updateCourseSubsection(formData);
    } else {
      result = await createCourseSubsection(formData);
    }

    if (result.success) {
      toast({
        title: `সাবসেকশন সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", courseId] });
      onClose();
    } else {
      toast({
        title: `সাবসেকশন ${isEditMode ? "আপডেট" : "যোগ"} করতে সমস্যা হয়েছে`,
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "সাবসেকশন আপডেট করুন" : "নতুন সাবসেকশন যোগ করুন"}</DialogTitle>
          <DialogDescription>সাবসেকশনের নাম এবং অন্যান্য তথ্য দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">সাবসেকশনের নাম *</label>
            <Input
              type="text"
              name="title"
              placeholder="উদা: ভিডিও ১: বেসিক ধারণা"
              defaultValue={subsection?.title || ""}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">বিস্তারিত বিবরণ</label>
            <Textarea
              name="description"
              placeholder="সাবসেকশন সম্পর্কে সংক্ষেপে লিখুন..."
              defaultValue={subsection?.description || ""}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={subsection?.sequence_order || 0}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">ছোট সংখ্যা আগে দেখাবে।</p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_open_sub"
              name="is_open"
              value="true"
              defaultChecked={subsection ? !!subsection.is_open : false}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="is_open_sub" className="text-sm font-medium cursor-pointer">
              বাই-ডিফল্ট খোলা (Open) থাকবে
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
