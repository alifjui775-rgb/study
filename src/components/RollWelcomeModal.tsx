import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Copy, Check, GraduationCap } from "lucide-react";

export function RollWelcomeModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && user.roll) {
      const userKey = `hasSeenRollPopup_${user.uid || (user as any).id}`;
      const hasSeen = localStorage.getItem(userKey);
      if (!hasSeen || hasSeen !== "true") {
        setIsOpen(true);
      }
    }
  }, [user]);

  if (!user || !user.roll) return null;

  // Format Roll Number prepending 'SOT-'
  const rawRoll = String(user.roll).trim();
  const formattedRoll = rawRoll.startsWith("SOT-") ? rawRoll : `SOT-${rawRoll}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedRoll);
      setCopied(true);
      toast({
        title: "রোল নম্বর কপি করা হয়েছে!",
        description: `${formattedRoll} আপনার ক্লিপবোর্ডে কপি হয়েছে।`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy roll number: ", err);
    }
  };

  const handleClose = () => {
    if (user) {
      const userKey = `hasSeenRollPopup_${user.uid || (user as any).id}`;
      localStorage.setItem(userKey, "true");
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md w-[92vw] rounded-3xl p-6 md:p-8 font-bengali text-center space-y-4">
        <DialogHeader className="space-y-3 items-center text-center">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <GraduationCap className="size-8" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-2xl md:text-3xl font-bold font-bengali gradient-text flex items-center justify-center gap-2">
              <span>স্বাগতম, {user.name}!</span>
              <Sparkles className="size-5 text-amber-500 animate-pulse" />
            </DialogTitle>
            <DialogDescription className="text-sm font-bengali text-muted-foreground">
              আমাদের প্ল্যাটফর্মে আপনার ইউনিক স্টুডেন্ট রোল নম্বর প্রস্তুত রয়েছে।
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Formatted Roll Number Display Box */}
        <div className="bg-muted/40 border-2 border-primary/30 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            আপনার স্টুডেন্ট রোল নম্বর
          </p>
          <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-widest font-mono text-primary select-all">
            {formattedRoll}
          </div>

          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-xl gap-2 font-sans text-xs font-semibold cursor-pointer border-primary/20 hover:bg-primary/10 transition-all"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-green-600" />
                  <span className="text-green-600 font-bengali">কপি করা হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span className="font-bengali">রোল নম্বর কপি করুন</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          পরীক্ষায় অংশগ্রহণ ও যেকোনো সাপোর্টের জন্য এই রোল নম্বরটি সংরক্ষণ করুন।
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleClose}
            size="lg"
            className="w-full rounded-2xl font-bold text-base py-5 cursor-pointer shadow-md hover:shadow-lg transition-all"
          >
            বুঝেছি, ধন্যবাদ!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
