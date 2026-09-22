import { memo, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  FileText,
  CalendarCheck,
  ClipboardList,
  Target,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DayActivity } from "@/lib/daily-supabase";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export const toBn = (value: number | string) =>
  String(value).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);

interface CourseOption {
  id: string;
  name: string;
}

interface DayDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: DayActivity | null;
  courses: CourseOption[];
  colorMap: Record<string, string>;
}

interface DetailRowProps {
  label: string;
  done: boolean;
  doneText?: string;
  notDoneText?: string;
  icon: LucideIcon;
}

const DetailRow = ({
  label,
  done,
  doneText = "সাবমিট করা হয়েছে",
  notDoneText = "হয়নি",
  icon: Icon,
}: DetailRowProps) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </span>
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium shrink-0",
        done ? "text-green-600" : "text-muted-foreground/60",
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {done ? doneText : notDoneText}
    </span>
  </div>
);

const DayDetailsModal = ({
  open,
  onOpenChange,
  activity,
  courses,
  colorMap,
}: DayDetailsModalProps) => {
  const courseNameMap = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);

  const dateLabel = activity
    ? toBn(format(new Date(activity.date), "dd MMMM, yyyy", { locale: bn }))
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-bengali flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {dateLabel}
          </DialogTitle>
          <DialogDescription className="font-bengali">
            এই দিনে আপনার করা কার্যকলাপের বিস্তারিত
            {activity ? ` (মোট স্কোর: ${toBn(activity.totalScore)})` : ""}
          </DialogDescription>
        </DialogHeader>

        {activity && activity.activeCourses.length > 0 ? (
          <div className="space-y-4">
            {activity.activeCourses.map((courseId) => {
              const detail = activity.courses[courseId];
              if (!detail) return null;

              const hasAnyActivity =
                detail.attendanceDone ||
                detail.mandatorySubmitted ||
                detail.optionalSubmitted ||
                detail.todoSubmitted ||
                detail.exams.length > 0;
              if (!hasAnyActivity) return null;

              const courseName = courseNameMap.get(courseId) || "পাবলিক পরীক্ষা";

              return (
                <div
                  key={courseId}
                  className="rounded-xl border border-border bg-card p-3 space-y-2.5"
                >
                  <p className="font-semibold text-sm flex items-center gap-2 border-b border-border/50 pb-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        colorMap[courseId] || "bg-gray-400",
                      )}
                    />
                    {courseName}
                  </p>

                  <DetailRow
                    label="উপস্থিতি"
                    done={detail.attendanceDone}
                    doneText="হ্যাঁ"
                    notDoneText="না"
                    icon={CalendarCheck}
                  />
                  <DetailRow
                    label="আজকের কাজ"
                    done={detail.mandatorySubmitted}
                    icon={ClipboardList}
                  />
                  <DetailRow label="যতটুকু হয়েছে" done={detail.optionalSubmitted} icon={Target} />
                  <DetailRow label="যতটুকু বাকি" done={detail.todoSubmitted} icon={CheckCircle} />

                  {detail.exams.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {detail.exams.map((exam, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row justify-between items-start gap-3 rounded-lg bg-muted/50 px-2.5 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm font-medium whitespace-normal break-words leading-snug">
                              {exam.name}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-purple-600 tabular-nums sm:text-right w-full sm:w-auto">
                            স্কোর:{" "}
                            {exam.score !== null && exam.score !== undefined
                              ? toBn(exam.score)
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">এই দিনে কোনো কার্যকলাপ নেই।</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default memo(DayDetailsModal);
