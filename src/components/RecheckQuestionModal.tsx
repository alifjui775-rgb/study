import { useState } from "react";
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
import { Loader2, Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface RecheckQuestionModalProps {
  questionId: string;
  questionType: "mcq" | "written" | "cq" | string;
  buttonClassName?: string;
}

export function RecheckQuestionModal({
  questionId,
  questionType,
  buttonClassName,
}: RecheckQuestionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const typeKey =
        questionType === "written" ? "written_id" : questionType === "cq" ? "cq_id" : "mcq_id";

      const insertData = {
        [typeKey]: questionId,
        reason: reason.trim() || null,
        status: "pending",
      };

      const { error } = await supabase.from("question_rechecks").insert([insertData]);

      if (error) {
        throw error;
      }

      toast({
        title: "রিচেক অনুরোধ পাঠানো হয়েছে",
        description: "প্রশ্নটি রিচেকের জন্য সফলভাবে নথিবদ্ধ করা হয়েছে।",
      });

      setReason("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error creating recheck request:", error);
      toast({
        title: "অনুরোধ পাঠানো যায়নি",
        description: error.message || "অনুগ্রহ করে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
          "h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
        }
        title="রিচেক করতে পাঠান"
        onClick={() => setIsOpen(true)}
      >
        <Flag className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Flag className="h-5 w-5" />
                <span>প্রশ্ন রিচেক অনুরোধ</span>
              </DialogTitle>
              <DialogDescription>
                এই প্রশ্নটি রিচেকের তালিকায় যোগ করা হবে। অ্যাডমিন এটি যাচাই করে প্রয়োজনীয় সংশোধন করবেন।
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium">কেনো এটি রিচেক করা প্রয়োজন? (ঐচ্ছিক)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                placeholder="ভুল উত্তর, বানান ভুল বা অস্পষ্টতা ইত্যাদি কারণ উল্লেখ করুন..."
                rows={4}
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                অনুরোধ পাঠান
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
