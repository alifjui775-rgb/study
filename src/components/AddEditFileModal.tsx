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
import { createCourseFile, updateCourseFile } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseFile } from "@/lib/types";

interface AddEditFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsectionId?: string | null;
  file?: CourseFile | null;
}

export function AddEditFileModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsectionId,
  file,
}: AddEditFileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!file;

  const [descriptionHtml, setDescriptionHtml] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDescriptionHtml(file?.description || "");
    }
    if (!isOpen && formRef.current) {
      formRef.current.reset();
      setDescriptionHtml("");
    }
  }, [isOpen, file]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("course_id", courseId);
    formData.append("section_id", sectionId);
    if (subsectionId) formData.append("subsection_id", subsectionId);

    let result;
    if (isEditMode) {
      formData.append("id", file.id);
      result = await updateCourseFile(formData);
    } else {
      result = await createCourseFile(formData);
    }

    if (result.success) {
      toast({ title: `ফাইল সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে` });
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
          <DialogTitle>{isEditMode ? "ফাইল আপডেট করুন" : "নতুন ফাইল যোগ করুন"}</DialogTitle>
          <DialogDescription>ফাইলের শিরোনাম ও লিংক দিন। (যেমন গুগল ড্রাইভ লিংক)</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">শিরোনাম *</label>
            <Input
              type="text"
              name="title"
              defaultValue={file?.title || ""}
              disabled={isSubmitting}
              required
              placeholder="যেমন: লেকচার স্লাইড PDF"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ফাইল লিংক (URL বা Embed HTML) *</label>
            <Input
              type="text"
              name="file_url"
              defaultValue={file?.file_url || ""}
              disabled={isSubmitting}
              required
              placeholder="URL অথবা Canva/Drive iframe কোড পেস্ট করুন..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">বিস্তারিত বিবরণ (ঐচ্ছিক)</label>
            <input type="hidden" name="description" value={descriptionHtml} />
            <TiptapEditor value={descriptionHtml} onChange={setDescriptionHtml} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ক্রম (Sequence Order)</label>
            <Input
              type="number"
              name="sequence_order"
              defaultValue={String(file?.sequence_order || 0)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="is_public_file"
              name="is_public"
              value="true"
              defaultChecked={file ? !!file.is_public : false}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="is_public_file" className="text-sm font-medium cursor-pointer">
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
