import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flag, Image, X, Upload } from "lucide-react";
import { reportQuestion } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";

interface ReportQuestionModalProps {
  questionId: string;
  questionType: "mcq" | "written" | "cq" | string;
  studentId: string;
  buttonClassName?: string;
  initialIsReported?: boolean;
}

const MAX_IMAGES = 5;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp",
  initialQuality: 0.8,
};

export function ReportQuestionModal({
  questionId,
  questionType,
  studentId,
  buttonClassName,
  initialIsReported,
}: ReportQuestionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "compressing" | "uploading" | "submitting"
  >("idle");
  const [hasBeenReported, setHasBeenReported] = useState<boolean>(initialIsReported || false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialIsReported !== undefined) {
      setHasBeenReported(initialIsReported);
      return;
    }
    if (!questionId || !questionType) return;

    let isMounted = true;
    const col =
      questionType === "written" ? "written_id" : questionType === "cq" ? "cq_id" : "mcq_id";

    async function checkReportStatus() {
      try {
        const { count, error } = await supabase
          .from("questions_report")
          .select("id", { count: "exact", head: true })
          .eq(col, questionId);

        if (!error && isMounted && typeof count === "number" && count > 0) {
          setHasBeenReported(true);
        }
      } catch (err) {
        console.error("Error checking question report status:", err);
      }
    }

    checkReportStatus();

    return () => {
      isMounted = false;
    };
  }, [questionId, questionType, initialIsReported]);

  const validateFiles = (files: File[]): boolean => {
    if (files.length > MAX_IMAGES) {
      toast({
        title: "ছবির সংখ্যা বেশি",
        description: `আপনি সর্বোচ্চ ${MAX_IMAGES} টি ছবি আপলোড করতে পারেন।`,
        variant: "destructive",
      });
      return false;
    }
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "অবৈধ ফাইল",
          description: "সব ফাইল ছবি হতে হবে।",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!validateFiles(files)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newFiles = [...selectedFiles, ...files].slice(0, MAX_IMAGES);
    setSelectedFiles(newFiles);
    setUploadStage("compressing");

    try {
      const compressedResults = await Promise.all(
        newFiles.map((file) => imageCompression(file, COMPRESSION_OPTIONS)),
      );
      setCompressedFiles(compressedResults);

      const previews = compressedResults.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    } catch (error) {
      console.error("Image compression failed:", error);
      toast({
        title: "ছবি সংকুচিত করা যায়নি",
        description: "অনুগ্রহ করে ছোট আকারের ছবি নির্বাচন করুন।",
        variant: "destructive",
      });
      clearAllImages();
    } finally {
      setUploadStage("idle");
    }
  };

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setCompressedFiles((prev) => prev.filter((_, i) => i !== index));
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setCompressedFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExt = "webp";
      const fileName = `${timestamp}-${randomId}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("report_images")
        .upload(filePath, file, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload failed:", uploadError);
        throw new Error("ছবি আপলোড করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }

      const { data } = supabase.storage.from("report_images").getPublicUrl(filePath);
      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        title: "কারণ লিখুন",
        description: "অনুগ্রহ করে রিপোর্টের কারণ লিখুন।",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    let reportImageUrls: string[] = [];

    try {
      if (compressedFiles.length > 0) {
        setUploadStage("uploading");
        reportImageUrls = await uploadImages(compressedFiles);
      }

      setUploadStage("submitting");

      const formData = new FormData();
      formData.append("question_id", questionId);
      formData.append("question_type", questionType);
      formData.append("student_id", studentId);
      formData.append("reason", reason.trim());
      if (reportImageUrls.length > 0) {
        formData.append("report_images", JSON.stringify(reportImageUrls));
      }

      const result = await reportQuestion(formData);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast({
        title: "আপনার রিপোর্টটি সাবমিট হয়েছে",
        description: "প্রশ্নটি রিপোর্ট করার জন্য ধন্যবাদ। অ্যাডমিন এটি পর্যালোচনা করবেন।",
      });

      setHasBeenReported(true);
      setReason("");
      clearAllImages();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error creating question report:", error);
      toast({
        title: "রিপোর্ট পাঠানো যায়নি",
        description: error.message || "অনুগ্রহ করে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadStage("idle");
    }
  };

  const getSubmitButtonText = () => {
    switch (uploadStage) {
      case "compressing":
        return "ছবি সংকুচিত হচ্ছে...";
      case "uploading":
        return "আপলোড হচ্ছে...";
      case "submitting":
        return "জমা দিচ্ছে...";
      default:
        return isSubmitting ? "জমা দিচ্ছে..." : "সাবমিট করুন";
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={
          buttonClassName ||
          "h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
        }
        title={hasBeenReported ? "এই প্রশ্নটি ইতিমধ্যে রিপোর্ট করা হয়েছে" : "প্রশ্ন রিপোর্ট করুন"}
        onClick={() => setIsOpen(true)}
      >
        <Flag
          className={cn(
            "h-4 w-4 text-red-600 dark:text-red-500",
            hasBeenReported && "fill-current",
          )}
        />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 space-y-2">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Flag
                className={cn(
                  "h-5 w-5",
                  hasBeenReported && "fill-current text-red-600 dark:text-red-400",
                )}
              />
              <span>প্রশ্ন রিপোর্ট করুন</span>
            </DialogTitle>
            <DialogDescription>
              এই প্রশ্নে কোনো সমস্যা পাওয়া গেলে নিচে কারণটি লিখে রিপোর্ট করুন। প্রয়োজনে সর্বোচ্চ ৫ টি ছবি যোগ
              করতে পারেন। অ্যাডমিন এটি যাচাই করবেন।
            </DialogDescription>
            {hasBeenReported && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 font-medium">
                ⚠️ এই প্রশ্নটি ইতিমধ্যে একজন শিক্ষার্থী কর্তৃক রিপোর্ট করা হয়েছে। আপনি চাইলে অতিরিক্ত তথ্য বা ছবি
                সহ আবারও রিপোর্ট করতে পারেন।
              </div>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                প্রশ্নে কী সমস্যা পেয়েছেন? <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                placeholder="ভুল উত্তর, বানান ভুল, অস্পষ্ট প্রশ্ন, ভুল অপশন ইত্যাদি কারণ উল্লেখ করুন..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ছবি যোগ করুন (ঐচ্ছিক, সর্বোচ্চ ৫ টি)</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  disabled={
                    isSubmitting ||
                    selectedFiles.length >= MAX_IMAGES ||
                    uploadStage === "compressing"
                  }
                  className="sr-only"
                  id="report-image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    isSubmitting ||
                    selectedFiles.length >= MAX_IMAGES ||
                    uploadStage === "compressing"
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length}/${MAX_IMAGES} ছবি নির্বাচিত - আরও যোগ করুন`
                    : "ছবি নির্বাচন করুন"}
                </Button>
              </div>

              {selectedFiles.length >= MAX_IMAGES && (
                <p className="text-xs text-muted-foreground">সর্বোচ্চ ছবির সীমা পেয়ে গেছে।</p>
              )}

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group w-20 h-20 flex-shrink-0">
                      <img
                        src={preview}
                        alt={`Report preview ${index + 1}`}
                        className="w-full h-full rounded-lg border object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/90 text-white hover:bg-destructive rounded-full"
                        onClick={() => removeImage(index)}
                        disabled={isSubmitting || uploadStage !== "idle"}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="flex-shrink-0 flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearAllImages();
                  setIsOpen(false);
                }}
                disabled={isSubmitting}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || uploadStage !== "idle"}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {uploadStage !== "idle" || isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    {getSubmitButtonText()}
                  </>
                ) : (
                  "সাবমিট করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
