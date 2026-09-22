import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Note } from "@/lib/types";

interface NoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onSave: (note: Omit<Note, "created_at">) => void;
}

export default function NoteDialog({ isOpen, onClose, note, onSave }: NoteDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setContent(note.content || "");
    } else {
      setTitle("");
      setContent("");
    }
  }, [note, isOpen]);

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "অনুগ্রহ করে একটি টাইটেল দিন।", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const noteToSave: Omit<Note, "created_at"> = {
        id: note?.id || "",
        user_id: note?.user_id || "",
        title: title,
        content: content,
      };
      onSave(noteToSave);
      toast({ title: note ? "নোট সফলভাবে আপডেট করা হয়েছে।" : "নোট সফলভাবে তৈরি করা হয়েছে।" });
    } catch (error) {
      toast({
        title: "ত্রুটি",
        description: "নোটটি সেভ করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? "নোট এডিট করুন" : "নতুন নোট তৈরি করুন"}</DialogTitle>
          <DialogDescription>
            {note ? "আপনার নোটের পরিবর্তন সেভ করুন।" : "আপনার নতুন নোটের বিস্তারিত তথ্য দিন।"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">টাইটেল</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="নোটের টাইটেল"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">নোট</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="আপনার নোট এখানে লিখুন..."
              className="min-h-[150px]"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            বাতিল
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                সেভ হচ্ছে...
              </>
            ) : (
              "সেভ করুন"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
