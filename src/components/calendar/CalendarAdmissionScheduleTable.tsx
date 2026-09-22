import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendarExamSchedules,
  isRowVisible,
  type CalendarExamSchedule,
} from "@/lib/calendar-queries";
import { formatDateBn, formatTimeBn } from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";
import { Heart, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useFavorites } from "@/hooks/useFavorites";

const toBengaliNumber = (num: number | string) => {
  const bengaliNumbers: { [key: string]: string } = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",
  };
  return String(num).replace(/[0-9]/g, (match) => bengaliNumbers[match]);
};

const CountdownCell = ({
  targetDate,
  showSeconds,
}: {
  targetDate: string | null;
  showSeconds: boolean;
}) => {
  const timeLeft = useCountdown(targetDate);

  if (timeLeft.completed) {
    return (
      <TableCell className="text-center align-top text-red-500 dark:text-red-400 whitespace-nowrap font-medium">
        পরীক্ষা হয়ে গেছে
      </TableCell>
    );
  }

  return (
    <TableCell className="text-center align-top font-bengali whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-medium">
      <span className="tabular-nums">
        {toBengaliNumber(String(timeLeft.days).padStart(2, "0"))}
      </span>
      <span className="mr-1 hidden sm:inline">দিন</span>
      <span className="mr-1 sm:hidden">দি</span>
      <span className="tabular-nums">
        {toBengaliNumber(String(timeLeft.hours).padStart(2, "0"))}
      </span>
      <span className="mr-1 hidden sm:inline">ঘণ্টা</span>
      <span className="mr-1 sm:hidden">ঘ</span>
      <span className="tabular-nums">
        {toBengaliNumber(String(timeLeft.minutes).padStart(2, "0"))}
      </span>
      <span className="mr-1 hidden sm:inline">মিনিট</span>
      <span className="mr-1 sm:hidden">মি</span>
      {showSeconds && (
        <>
          <span className="tabular-nums">
            {toBengaliNumber(String(timeLeft.seconds).padStart(2, "0"))}
          </span>
          <span className="hidden sm:inline">সেকেন্ড</span>
          <span className="sm:hidden">সে</span>
        </>
      )}
    </TableCell>
  );
};

const departmentInfo: {
  [key: string]: { color: string; label: string };
} = {
  science: { color: "#22c55e", label: "বিজ্ঞান" },
  arts: { color: "#3b82f6", label: "মানবিক" },
  commerce: { color: "#eab308", label: "ব্যবসা" },
  mixed: { color: "#6b7280", label: "বিভাগ উন্মুক্ত" },
};

const ArrowTag = ({
  color,
  label,
  className,
}: {
  color: string;
  label: string;
  className?: string;
}) => {
  return (
    <div className={cn("relative whitespace-nowrap", className)}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M0 0 H80 L100 50 L80 100 H0 Z" fill={color} />
      </svg>
      <div className="relative z-10 flex items-center justify-center text-white font-bold h-full px-4 pr-6">
        {label}
      </div>
    </div>
  );
};

interface CalendarAdmissionScheduleTableProps {
  filters: { [key: string]: boolean };
}

const CalendarAdmissionScheduleTable = ({ filters }: CalendarAdmissionScheduleTableProps) => {
  const { toggleFavorite, isFavorite } = useFavorites();

  const {
    data: dbSchedule = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["calendar-exam-schedules"],
    queryFn: fetchCalendarExamSchedules,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const admissionSchedule = dbSchedule
    .filter((item) => isRowVisible(item, filters))
    .sort((a, b) => {
      const keyA = a.unit_id || `${a.institution_slug}_${a.unit_slug}`;
      const keyB = b.unit_id || `${b.institution_slug}_${b.unit_slug}`;
      const isAFav = isFavorite(keyA);
      const isBFav = isFavorite(keyB);

      if (isAFav && !isBFav) return -1;
      if (!isAFav && isBFav) return 1;

      const dateA = new Date(a.exam_datetime).getTime();
      const dateB = new Date(b.exam_datetime).getTime();

      const now = new Date().getTime();
      const completedA = dateA < now;
      const completedB = dateB < now;

      if (completedA && !completedB) return 1;
      if (!completedA && completedB) return -1;
      if (completedA && completedB) return dateA - dateB;

      return dateA - dateB;
    });

  const { showColorCode, showSeconds } = filters;

  if (isLoading) {
    return <LoadingSpinner message="সময়সূচী লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">সময়সূচী লোড করতে সমস্যা হয়েছে।</p>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full border border-border bg-card rounded-2xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="bg-primary text-primary-foreground text-center font-bold rounded-tl-2xl w-[1%] p-0 border-b-0"></TableHead>
              {showColorCode && (
                <TableHead className="bg-primary text-primary-foreground p-0 w-[10px] border-b-0"></TableHead>
              )}
              <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0">
                বিশ্ববিদ্যালয়
              </TableHead>
              <TableHead className="bg-primary text-primary-foreground text-center font-bold truncate border-b-0">
                তারিখ
              </TableHead>
              <TableHead className="bg-primary text-primary-foreground text-center font-bold rounded-tr-2xl border-b-0">
                সময় বাকি
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {admissionSchedule.map((item: CalendarExamSchedule) => {
              const deptInfo = departmentInfo[item.department] || departmentInfo.mixed;
              const favoriteKey = item.unit_id || `${item.institution_slug}_${item.unit_slug}`;
              const isFav = isFavorite(favoriteKey);
              const bengaliDate = formatDateBn(item.exam_datetime, "DD MMMM");
              const timeDisplay = formatTimeBn(item.exam_datetime);
              const nameDisplay = item.institution_name_bn
                ? `${item.institution_name_bn}${item.show_unit_slug ? ` (${item.unit_slug.toUpperCase()})` : ""}`
                : item.unit_name_bn;

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "hover:bg-muted/40 transition-colors duration-150",
                    isFav && "bg-primary/5 dark:bg-primary/10",
                  )}
                >
                  <TableCell className="text-center p-1 px-1 w-[1%]">
                    <button
                      onClick={() => toggleFavorite(favoriteKey)}
                      className="p-0.5 rounded-full hover:bg-muted transition-colors inline-flex items-center justify-center"
                      title="পছন্দের তালিকায় যুক্ত করুন"
                    >
                      <Heart
                        size={16}
                        className={cn(
                          "transition-all",
                          isFav
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground/50 hover:text-red-400",
                        )}
                      />
                    </button>
                  </TableCell>
                  {showColorCode && (
                    <TableCell className="align-middle p-0 group relative">
                      <div
                        className="w-2 h-full absolute top-0 left-0 rounded-r-full group-hover:rounded-r-none transition-all duration-300"
                        style={{ backgroundColor: deptInfo.color }}
                      ></div>
                      <ArrowTag
                        color={deptInfo.color}
                        label={deptInfo.label}
                        className="absolute left-2 top-0 bottom-0 text-white font-bold opacity-0 transition-all duration-300 group-hover:opacity-100 pointer-events-none -translate-x-full group-hover:translate-x-0 z-10"
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-center font-bold whitespace-nowrap align-top">
                    {nameDisplay}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap align-top text-muted-foreground px-0 sm:px-4">
                    <span>
                      {bengaliDate}
                      {item.is_tentative && (
                        <span className="text-destructive font-bold ml-0.5">*</span>
                      )}
                    </span>
                    {timeDisplay && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Info className="text-muted-foreground/60 h-3 w-3 inline-block ml-1 cursor-pointer hover:text-foreground transition-colors" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 text-sm font-bengali">
                          <p>সময়: {timeDisplay}</p>
                          {item.note && (
                            <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                  <CountdownCell targetDate={item.exam_datetime} showSeconds={!!showSeconds} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CalendarAdmissionScheduleTable;
