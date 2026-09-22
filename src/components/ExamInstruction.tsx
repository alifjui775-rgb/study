import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Clock, Zap, TriangleAlert, CircleQuestionMark, Send } from "lucide-react";
import dayjs from "@/lib/date-utils";

interface ExamInstructionsProps {
  exam: Exam | null;
  onStartExam: () => void;
  questionCount: number;
}

export function ExamInstructions({ exam, onStartExam, questionCount }: ExamInstructionsProps) {
  if (!exam) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <Card className="w-full max-w-2xl mx-auto overflow-hidden">
        <div className="flex flex-col space-y-1.5 p-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{exam.name}</h1>
              <p className="text-sm text-muted-foreground">প্রাকটিস পরীক্ষা</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CircleQuestionMark className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">মোট প্রশ্ন</p>
                <p className="font-bold">{questionCount} টি</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">সময়কাল</p>
                <p className="font-bold">{exam.duration_minutes} মিনিট</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">প্রতিটি প্রশ্ন</p>
                <p className="font-bold">{exam.marks_per_question || 1} মার্ক</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">নেগেটিভ</p>
                <p className="font-bold">{exam.negative_marks_per_wrong || 0} মার্ক</p>
              </div>
            </div>
          </div>

          <div
            role="alert"
            className="relative w-full rounded-lg border p-4 text-foreground bg-warning/10 border-warning/30"
          >
            <TriangleAlert className="h-4 w-4 absolute left-4 top-4" />
            <div className="[&_p]:leading-relaxed text-sm pl-7">
              <strong>গুরুত্বপূর্ণ:</strong> একবার উত্তর নির্বাচন করলে পরিবর্তন করা যাবে না। সময় শেষ হলে পরীক্ষা
              স্বয়ংক্রিয়ভাবে জমা হবে।
            </div>
          </div>

          <Button
            onClick={onStartExam}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground border border-transparent hover:bg-background hover:text-primary hover:border-primary focus-visible:bg-background focus-visible:text-primary focus-visible:border-primary rounded-md px-8 w-full h-12 text-lg"
          >
            <Send className="h-5 w-5 mr-2" />
            পরীক্ষা শুরু করুন
          </Button>
        </div>
      </Card>
    </div>
  );
}
