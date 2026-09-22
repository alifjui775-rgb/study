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
import { createCourseSection, updateCourseSection } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseSection } from "@/lib/types";

interface AddEditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  section?: CourseSection | null; // If provided, it's edit mode
}

export function AddEditSectionModal({
  isOpen,
  onClose,
  courseId,
  section,
}: AddEditSectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!section;

  useEffect(() => {
    if (!isOpen && formRef.current) {
      formRef.current.reset();
    }
  }, [isOpen]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("course_id", courseId);

    let result;
    if (isEditMode) {
      formData.append("id", section.id);
      result = await updateCourseSection(formData);
    } else {
      // For new sections, maybe auto-assign a sequence order based on existing sections
      // In a real app we'd fetch the max sequence order, but here we can just pass 0
      // or whatever the user inputs (we will add a field for it).
      result = await createCourseSection(formData);
    }

    if (result.success) {
      toast({
        title: `সেকশন সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", courseId] });
      onClose();
    } else {
      toast({
        title: `সেকশন ${isEditMode ? "আপডেট" : "যোগ"} করতে সমস্যা হয়েছে`,
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
          <DialogTitle>{isEditMode ? "সেকশন আপডেট করুন" : "নতুন সেকশন যোগ করুন"}</DialogTitle>
          <DialogDescription>সেকশনের নাম এবং অন্যান্য তথ্য দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">সেকশনের নাম *</label>
            <Input
              type="text"
              name="title"
              placeholder="উদা: পর্ব ১: প্রাথমিক ধারণা"
              defaultValue={section?.title || ""}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">বিস্তারিত বিবরণ</label>
            <Textarea
              name="description"
              placeholder="সেকশন সম্পর্কে সংক্ষেপে লিখুন..."
              defaultValue={section?.description || ""}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={section?.sequence_order || 0}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">ছোট সংখ্যা আগে দেখাবে।</p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_open_section"
              name="is_open"
              value="true"
              defaultChecked={section ? !!section.is_open : true}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <input type="hidden" name="is_open" value="false" />
            <label htmlFor="is_open_section" className="text-sm font-medium cursor-pointer">
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
