import { useState, useEffect, useRef } from "react";
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
import { updateCourse } from "@/lib/actions";
import type { Course } from "@/lib/types";
import { Loader2, Upload, Trash2, Check, Plus } from "lucide-react";
import { uploadCourseCover, deleteCourseCover } from "@/utils/supabaseImageUpload";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCourseBatches, getCourseCategories } from "@/lib/queries";
import { Checkbox } from "@/components/ui/checkbox";
import { TiptapEditor } from "@/components/TiptapEditor";
import { ALL_COURSE_FEATURES } from "@/lib/course-features";
import { cn } from "@/lib/utils";

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

export function EditCourseModal({ isOpen, onClose, course }: EditCourseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ["course-batches"],
    queryFn: getCourseBatches,
  });

  const { data: categories } = useQuery({
    queryKey: ["course-categories"],
    queryFn: getCourseCategories,
  });

  // Local state for complex fields
  const [details, setDetails] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeatures, setCustomFeatures] = useState("");
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>([]);
  const [extraSettings, setExtraSettings] = useState<Record<string, boolean>>({
    attendance: false,
    task: false,
    group_study: false,
    battle: false,
    custom_exam: false,
  });

  useEffect(() => {
    if (course) {
      setCoverUrl(course.cover_url || "");
      setPreviewUrl(course.cover_url || null);
      setDetails(course.details || "");

      setExtraSettings({
        attendance: !!course.attendance,
        task: !!course.task,
        group_study: !!course.group_study,
        battle: !!course.battle,
        custom_exam: !!course.custom_exam,
      });

      const courseFaqs = Array.isArray(course.faq)
        ? (course.faq as { question: string; answer: string }[])
        : [];
      setFaqItems(courseFaqs);

      const courseFeats = course.features || [];
      const knownTitles = ALL_COURSE_FEATURES.map((f) => f.title.trim().toLowerCase());
      const checked = ALL_COURSE_FEATURES.filter((af) =>
        courseFeats.some((cf) => cf.trim().toLowerCase() === af.title.trim().toLowerCase()),
      ).map((af) => af.title);
      const extra = courseFeats.filter((cf) => !knownTitles.includes(cf.trim().toLowerCase()));

      setSelectedFeatures(checked);
      setCustomFeatures(extra.join("\n"));
    }
  }, [course]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "অবৈধ ফাইল",
        description: "দয়া করে একটি ছবি ফাইল নির্বাচন করুন।",
        variant: "destructive",
      });
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setSelectedImageFile(file);
    setCoverUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCoverUrlChange = (url: string) => {
    setCoverUrl(url);
    setSelectedImageFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const bucketPrefix = "/storage/v1/object/public/course_covers/";

    if (coverUrl && coverUrl.includes(bucketPrefix) && coverUrl.startsWith(supabaseUrl)) {
      const filePath = coverUrl.split(`${supabaseUrl}${bucketPrefix}`)[1]?.split("?")[0];
      if (filePath) {
        try {
          await deleteCourseCover(filePath);
        } catch (error: any) {
          toast({
            title: "Failed to delete image",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
      }
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedImageFile(null);
    setCoverUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!course) return null;

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("id", course.id);

    if (selectedImageFile) {
      setIsUploadingCover(true);
      try {
        const publicUrl = await uploadCourseCover(selectedImageFile);
        formData.set("cover_url", publicUrl);
      } catch (error: any) {
        toast({
          title: "ছবি আপলোড করা যায়নি",
          description: error.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsUploadingCover(false);
        return;
      }
      setIsUploadingCover(false);
    } else {
      formData.set("cover_url", coverUrl);
    }

    const result = await updateCourse(formData);

    if (result.success) {
      toast({
        title: "কোর্স সফলভাবে আপডেট করা হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      onClose();
    } else {
      toast({
        title: "কোর্স আপডেট করতে সমস্যা হয়েছে",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>কোর্স আপডেট করুন</DialogTitle>
          <DialogDescription>কোর্সের তথ্য পরিবর্তন করে সেভ করুন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">কোর্সের নাম *</label>
              <Input
                type="text"
                name="title"
                defaultValue={course.title}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL স্লাগ *</label>
              <Input
                type="text"
                name="slug"
                defaultValue={course.slug}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube URL</label>
              <Input
                type="url"
                name="youtube_url"
                defaultValue={course.youtube_url || ""}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">রেগুলার মূল্য *</label>
              <Input
                type="number"
                name="price_regular"
                defaultValue={course.price_regular}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ডিসকাউন্ট মূল্য</label>
              <Input
                type="number"
                name="price_discounted"
                defaultValue={
                  course.price_discounted !== null && course.price_discounted !== undefined
                    ? course.price_discounted
                    : ""
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Routine URL</label>
              <Input
                type="url"
                name="routine_url"
                defaultValue={course.routine_url || ""}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ভ্যালিডিটি (দিন)</label>
              <Input
                type="number"
                name="validity_days"
                defaultValue={course.validity_days ?? ""}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">কোর্স শুরু</label>
              <Input
                type="datetime-local"
                name="start_date"
                defaultValue={
                  course.start_date
                    ? new Date(
                        new Date(course.start_date).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">কোর্স শেষ</label>
              <Input
                type="datetime-local"
                name="end_date"
                defaultValue={
                  course.end_date
                    ? new Date(
                        new Date(course.end_date).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ডিসকাউন্ট শেষ সময়</label>
              <Input
                type="datetime-local"
                name="discount_ends_at"
                defaultValue={
                  course.discount_ends_at
                    ? new Date(
                        new Date(course.discount_ends_at).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">সর্বোচ্চ ডিসকাউন্ট লিমিট (ছাত্র সংখ্যা)</label>
              <Input
                type="number"
                name="discount_max_limit"
                defaultValue={course.discount_max_limit ?? ""}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">স্ট্যাটাস</label>
              <select
                name="status"
                defaultValue={course.status}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="draft">ড্রাফট</option>
                <option value="published">পাবলিশড</option>
                <option value="archived">আর্কাইভ</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">গ্রুপ লিংক</label>
              <Input
                type="url"
                name="group_link"
                defaultValue={course.group_link || ""}
                placeholder="https://t.me/..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <label className="text-sm font-medium">কভার ছবি</label>

            {previewUrl ? (
              <div className="relative group rounded-lg overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Cover preview"
                  className="w-full aspect-video object-cover object-center"
                />
                <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploadingCover}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteImage}
                    disabled={isSubmitting || isUploadingCover}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
                <div className="flex md:hidden absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploadingCover}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteImage}
                    disabled={isSubmitting || isUploadingCover}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isUploadingCover}
                className="w-full aspect-video border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">Upload Image</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverFileSelect}
              disabled={isSubmitting || isUploadingCover}
              className="sr-only"
            />

            <Input
              type="url"
              placeholder="Or paste an image URL..."
              value={coverUrl}
              onChange={(e) => handleCoverUrlChange(e.target.value)}
              disabled={isSubmitting || isUploadingCover}
              className="max-w-md text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">সংক্ষিপ্ত বিবরণ</label>
            <Textarea
              name="short_description"
              defaultValue={course.short_description || ""}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">বিস্তারিত বিবরণ (Details)</label>
            <TiptapEditor
              value={details}
              onChange={setDetails}
              placeholder="কোর্সের বিস্তারিত বিবরণ লিখুন..."
            />
            <input type="hidden" name="details" value={details} />
          </div>

          <div className="space-y-3 pt-2 border-t font-bengali">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">সাধারণ জিজ্ঞাসা (FAQ)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaqItems([...faqItems, { question: "", answer: "" }])}
                className="text-xs h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                নতুন FAQ যোগ করুন
              </Button>
            </div>

            {faqItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg text-center">
                কোনো FAQ যোগ করা হয়নি। উপরে "নতুন FAQ যোগ করুন" বাটনে ক্লিক করে প্রশ্ন ও উত্তর যোগ করুন।
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-card space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary">FAQ #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => setFaqItems(faqItems.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Input
                      type="text"
                      placeholder="প্রশ্ন / টাইটেল (যেমন: এই ব্যাচে কি ক্লাস নেয়া হবে?)"
                      value={item.question}
                      onChange={(e) => {
                        const updated = [...faqItems];
                        updated[index].question = e.target.value;
                        setFaqItems(updated);
                      }}
                      className="text-xs"
                    />

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        উত্তর / বিস্তারিত (Rich Text Editor):
                      </label>
                      <TiptapEditor
                        value={item.answer}
                        onChange={(val) => {
                          const updated = [...faqItems];
                          updated[index].answer = val;
                          setFaqItems(updated);
                        }}
                        placeholder="উত্তর / বিস্তারিত লিখুন..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              type="hidden"
              name="faq"
              value={JSON.stringify(
                faqItems.filter((item) => item.question.trim() !== "" || item.answer.trim() !== ""),
              )}
            />
          </div>

          <div className="space-y-3 pt-2 border-t font-bengali">
            <div className="space-y-1">
              <label className="text-sm font-semibold">কোর্সের বিশেষত্ব (Features Checkmarks)</label>
              <p className="text-xs text-muted-foreground">
                যে যে বিশেষত্বগুলো এই কোর্সে দেখাতে চান সেগুলোতে টিক চিন্‌হ দিন:
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/20 max-h-56 overflow-y-auto">
              {ALL_COURSE_FEATURES.map((feature) => {
                const isSelected = selectedFeatures.includes(feature.title);
                return (
                  <div
                    key={feature.title}
                    className={cn(
                      "flex items-center space-x-2.5 p-2 rounded-md border cursor-pointer transition-colors text-xs font-medium select-none",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "bg-background border-border hover:bg-accent",
                    )}
                    onClick={() => {
                      setSelectedFeatures((prev) =>
                        prev.includes(feature.title)
                          ? prev.filter((title) => title !== feature.title)
                          : [...prev, feature.title],
                      );
                    }}
                  >
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input bg-background",
                      )}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </div>
                    <span className="truncate select-none">{feature.title}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                অন্যান্য অতিরিক্ত বিশেষত্ব (প্রতি লাইনে একটি):
              </label>
              <Textarea
                value={customFeatures}
                onChange={(e) => setCustomFeatures(e.target.value)}
                placeholder="অন্য কোনো কাস্টম ফিচার থাকলে এখানে লিখুন..."
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            <input
              type="hidden"
              name="features"
              value={[
                ...selectedFeatures,
                ...customFeatures
                  .split("\n")
                  .map((f) => f.trim())
                  .filter(Boolean),
              ].join("\n")}
            />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-sm font-semibold">কোর্স সম্পর্কিত অতিরিক্ত সেটিংস</label>
              <p className="text-xs text-muted-foreground">নিচের অপশনগুলো চালু করতে টিক চিন্‌হ দিন:</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border rounded-lg p-4 bg-muted/20">
              {[
                { name: "attendance", label: "উপস্থিতি (Attendance)" },
                { name: "task", label: "টাস্ক (Task)" },
                { name: "group_study", label: "গ্রুপ স্টাডি (Group Study)" },
                { name: "battle", label: "ব্যাটেল (Battle)" },
                { name: "custom_exam", label: "কাস্টম পরীক্ষা (Custom Exam)" },
              ].map((field) => (
                <div key={field.name} className="flex items-center space-x-2">
                  <input
                    type="hidden"
                    name={field.name}
                    value={String(!!extraSettings[field.name])}
                  />
                  <Checkbox
                    id={`edit-${field.name}`}
                    checked={!!extraSettings[field.name]}
                    onCheckedChange={(v) =>
                      setExtraSettings((prev) => ({ ...prev, [field.name]: v === true }))
                    }
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor={`edit-${field.name}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                ব্যাচ নির্বাচন করুন
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {batches?.map((batch) => (
                  <div key={batch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-batch-${batch.id}`}
                      name="batch_ids"
                      value={batch.id}
                      disabled={isSubmitting}
                      defaultChecked={course.batch_ids?.includes(batch.id)}
                    />
                    <label
                      htmlFor={`edit-batch-${batch.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {batch.name}
                    </label>
                  </div>
                ))}
                {(!batches || batches.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">কোনো ব্যাচ পাওয়া যায়নি</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                ক্যাটাগরি নির্বাচন করুন
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {categories?.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-cat-${cat.id}`}
                      name="category_ids"
                      value={cat.id}
                      disabled={isSubmitting}
                      defaultChecked={course.category_ids?.includes(cat.id)}
                    />
                    <label
                      htmlFor={`edit-cat-${cat.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {cat.name}
                    </label>
                  </div>
                ))}
                {(!categories || categories.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">কোনো ক্যাটাগরি পাওয়া যায়নি</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              বাতিল
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingCover}>
              {isSubmitting || isUploadingCover ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingCover ? "ছবি আপলোড করা হচ্ছে..." : "আপডেট হচ্ছে..."}
                </>
              ) : (
                "সেভ করুন"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
