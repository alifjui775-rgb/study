import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { bn } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from "date-fns";
import type { DayProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayActivity } from "@/lib/daily-supabase";
import DayDetailsModal from "./DayDetailsModal";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (value: number | string) =>
  String(value).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);

export const COURSE_DOT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
];

export const buildCourseColorMap = (courses: { id: string }[]): Record<string, string> => {
  const map: Record<string, string> = {};
  courses.forEach((c, i) => {
    map[c.id] = COURSE_DOT_COLORS[i % COURSE_DOT_COLORS.length];
  });
  return map;
};

interface ActivityHeatmapCalendarProps {
  activities: Record<string, DayActivity>;
  courses: { id: string; name: string }[];
}

export const getHeatmapClass = (score: number) => {
  if (score <= 0) return "bg-transparent";
  if (score <= 2) return "bg-green-100 dark:bg-green-900/30";
  if (score <= 4) return "bg-green-300 dark:bg-green-700/50";
  return "bg-green-500 text-white font-bold";
};

export default function ActivityHeatmapCalendar({
  activities,
  courses,
}: ActivityHeatmapCalendarProps) {
  // Responsive Desktop / Mobile State Detection
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // `month` is the anchor: current month by default.
  // Desktop shows [anchor-2, anchor-1, anchor]; mobile shows [anchor].
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const windowStart = startOfMonth(subMonths(new Date(), 2));
  const currentMonth = startOfMonth(new Date());

  // Clamp navigation inside [current - 2, current]
  const handleMonthChange = (m: Date) => {
    const mStart = startOfMonth(m);
    if (mStart < windowStart) setMonth(windowStart);
    else if (mStart > currentMonth) setMonth(currentMonth);
    else setMonth(mStart);
  };

  const canGoPrev = !isSameMonth(month, windowStart);
  const canGoNext = !isSameMonth(month, currentMonth);

  const courseColorMap = useMemo(() => buildCourseColorMap(courses), [courses]);

  // Quick stats recomputed from per-course details
  const stats = useMemo(() => {
    let presentDays = 0;
    let tasksDone = 0;
    let examsTaken = 0;
    Object.values(activities).forEach((day) => {
      let dayHasAttendance = false;
      Object.values(day.courses).forEach((course) => {
        if (course.attendanceDone) dayHasAttendance = true;
        tasksDone +=
          (course.mandatorySubmitted ? 1 : 0) +
          (course.optionalSubmitted ? 1 : 0) +
          (course.todoSubmitted ? 1 : 0);
        examsTaken += course.exams.length;
      });
      if (dayHasAttendance) presentDays += 1;
    });
    return { presentDays, tasksDone, examsTaken };
  }, [activities]);

  // Bengali Caption Formatter
  const formatBengaliCaption = (date: Date) => toBn(format(date, "MMMM yyyy", { locale: bn }));

  // Custom Heatmap Day Component
  const CustomDay = (props: DayProps) => {
    const day = props.day.date;
    if (isNaN(day.getTime())) {
      return <td />;
    }
    const isOutside = Boolean(props.day.outside);
    const dateString = format(day, "yyyy-MM-dd");
    const activity = activities[dateString];
    const score = activity?.totalScore ?? 0;
    const hasActivity = !!activity && score > 0;

    return (
      <td className="min-h-[40px] h-auto w-10 sm:w-12 text-center text-sm p-0.5 relative focus-within:relative focus-within:z-20">
        <div
          role={hasActivity ? "button" : undefined}
          tabIndex={hasActivity ? 0 : undefined}
          onClick={hasActivity ? () => setSelectedDate(dateString) : undefined}
          onKeyDown={
            hasActivity ? (e) => e.key === "Enter" && setSelectedDate(dateString) : undefined
          }
          title={hasActivity ? "বিস্তারিত দেখতে ক্লিক করুন" : undefined}
          className={cn(
            "flex flex-col items-center justify-start min-h-[40px] h-full w-full py-0.5 rounded-md transition-all",
            hasActivity && "cursor-pointer hover:ring-2 hover:ring-primary/50",
            getHeatmapClass(score),
            isOutside && score === 0 && "text-muted-foreground/40",
          )}
        >
          <span>{format(day, "d", { locale: bn })}</span>
          <div className="flex flex-wrap items-center justify-center gap-[3px] mt-[2px] min-h-[6px] px-0.5">
            {(activity?.activeCourses ?? []).map((courseId) => (
              <span
                key={courseId}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  courseColorMap[courseId] || "bg-gray-400",
                  score >= 5 && "ring-1 ring-white/70",
                )}
              />
            ))}
          </div>
        </div>
      </td>
    );
  };

  return (
    <div className="w-full flex flex-col items-center overflow-x-auto px-2 sm:px-4 relative">
      <div className="w-full max-w-5xl flex flex-col items-center">
        {/* Navigation — hidden entirely on desktop; boundary-clamped on mobile */}
        {!isDesktop && (
          <div className="w-full flex items-center justify-between mb-1 px-1 z-20">
            <button
              type="button"
              onClick={() => handleMonthChange(subMonths(month, 1))}
              disabled={!canGoPrev}
              className="h-9 w-9 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-accent active:scale-95 transition-all text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card"
              title="পূর্ববর্তী মাস"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleMonthChange(addMonths(month, 1))}
              disabled={!canGoNext}
              className="h-9 w-9 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-accent active:scale-95 transition-all text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card"
              title="পরবর্তী মাস"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </div>
        )}

        <Calendar
          locale={bn}
          mode="single"
          month={isDesktop ? subMonths(month, 2) : month}
          onMonthChange={handleMonthChange}
          numberOfMonths={isDesktop ? 3 : 1}
          components={{
            Nav: () => <></>, // Hide internal react-day-picker navigation
            Day: CustomDay,
          }}
          formatters={{
            formatCaption: (date) => formatBengaliCaption(date),
          }}
          className="p-0 flex justify-center w-full max-w-full"
          classNames={{
            months:
              "flex flex-col lg:flex-row space-y-8 lg:space-y-0 lg:space-x-8 w-full justify-center pt-1",
            month: "space-y-4 w-full max-w-xs sm:max-w-sm",
            month_caption: "flex justify-center pt-1 items-center w-full min-h-[36px]",
            caption_label: "text-base sm:text-lg font-bold px-2 text-foreground font-bengali",
            month_grid: "rdp-month_grid",
            weekdays: "rdp-weekdays",
            weekday: "rdp-weekday",
            week: "rdp-week",
          }}
        />
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-6 w-full max-w-5xl grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-green-600 tabular-nums">
            {toBn(stats.presentDays)}
          </p>
          <p className="text-[11px] sm:text-sm text-muted-foreground">মোট উপস্থিতি (দিন)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-blue-600 tabular-nums">
            {toBn(stats.tasksDone)}
          </p>
          <p className="text-[11px] sm:text-sm text-muted-foreground">টাস্ক সম্পন্ন (টি)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-lg sm:text-2xl font-bold text-purple-600 tabular-nums">
            {toBn(stats.examsTaken)}
          </p>
          <p className="text-[11px] sm:text-sm text-muted-foreground">পরীক্ষা দেওয়া হয়েছে (টি)</p>
        </div>
      </div>

      {/* Course Legend */}
      {courses.length > 0 && (
        <div className="mt-4 w-full max-w-5xl flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-2">
          {courses.map((course) => (
            <span
              key={course.id}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  courseColorMap[course.id] || "bg-gray-400",
                )}
              />
              {course.name}
            </span>
          ))}
        </div>
      )}

      {/* Day Details Modal */}
      <DayDetailsModal
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        activity={selectedDate ? activities[selectedDate] || null : null}
        courses={courses}
        colorMap={courseColorMap}
      />
    </div>
  );
}
