import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendarExamSchedules,
  isRowVisible,
  type CalendarExamSchedule,
} from "@/lib/calendar-queries";
import { useFavorites } from "@/hooks/useFavorites";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bn } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths } from "date-fns";
import type { DayProps } from "react-day-picker";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import ExternalLink from "@/components/common/ExternalLink";

export type CalendarDayEvent = {
  unit_id: string;
  favKey: string;
  title: string;
  department: string;
  isFav: boolean;
  isTentative?: boolean;
  institution_slug?: string;
  institution_type?: "university" | "cluster" | "college";
};

interface FavoriteExamsCalendarProps {
  filters?: { [key: string]: boolean };
}

const FavoriteExamsCalendar = ({ filters }: FavoriteExamsCalendarProps) => {
  const { isFavorite } = useFavorites();
  const [month, setMonth] = useState<Date>(new Date());
  const isInitialMonthSet = useRef(false);

  // Step 1: Responsive Desktop / Mobile State Detection
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: dbSchedule = [], isLoading } = useQuery({
    queryKey: ["calendar-exam-schedules"],
    queryFn: fetchCalendarExamSchedules,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: { [dateString: string]: CalendarDayEvent[] } = {};

    const filtered = dbSchedule.filter((item: CalendarExamSchedule) => isRowVisible(item, filters));

    filtered.forEach((item: CalendarExamSchedule) => {
      if (!item.exam_datetime) return;
      const dateObj = new Date(item.exam_datetime);
      if (isNaN(dateObj.getTime())) return;

      const dateString = format(dateObj, "yyyy-MM-dd");
      const favKey = item.unit_id || `${item.institution_slug}_${item.unit_slug}`;
      const title = item.institution_name_bn
        ? `${item.institution_name_bn}${item.show_unit_slug ? ` (${item.unit_slug.toUpperCase()})` : ""}`
        : item.unit_name_bn;

      if (!map[dateString]) {
        map[dateString] = [];
      }

      map[dateString].push({
        unit_id: item.unit_id,
        favKey,
        title,
        department: item.department,
        isFav: isFavorite(favKey),
        isTentative: item.is_tentative,
        institution_slug: item.institution_slug,
        institution_type: item.institution_type || "university",
      });
    });

    return map;
  }, [dbSchedule, filters, isFavorite]);

  // Set initial month to first upcoming exam date ONCE when data loads
  useEffect(() => {
    if (isInitialMonthSet.current) return;
    const dateKeys = Object.keys(eventsByDate).sort();
    if (dateKeys.length > 0) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const upcomingKey = dateKeys.find((k) => k >= todayStr) || dateKeys[0];
      const targetDate = new Date(upcomingKey);
      if (!isNaN(targetDate.getTime())) {
        setMonth(targetDate);
        isInitialMonthSet.current = true;
      }
    }
  }, [eventsByDate]);

  // Bengali Caption Formatter
  const formatBengaliCaption = (date: Date) => {
    const formatted = format(date, "MMMM yyyy", { locale: bn });
    const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return formatted.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  };

  // Direct Handlers for Month Navigation
  const handlePrevMonth = () => {
    setMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setMonth((prev) => addMonths(prev, 1));
  };

  // Custom Day Component
  const CustomDay = (props: DayProps) => {
    const day = props.day.date;
    if (isNaN(day.getTime())) {
      return <td />;
    }
    const isOutside = Boolean(props.day.outside);

    const dateString = format(day, "yyyy-MM-dd");
    const dayEvents = eventsByDate[dateString] || [];
    const hasEvents = dayEvents.length > 0;
    const hasFavorite = dayEvents.some((e) => e.isFav);

    const formattedDayBn = format(day, "d", { locale: bn });
    const [isOpen, setIsOpen] = useState(false);

    if (!hasEvents) {
      return (
        <td className="min-h-[40px] h-auto w-10 sm:w-12 text-center text-sm p-0.5 relative focus-within:relative focus-within:z-20">
          <div
            className={cn(
              "min-h-[40px] h-full w-full p-0 flex items-center justify-center",
              isOutside ? "text-muted-foreground/40 font-normal" : "text-foreground",
            )}
          >
            {formattedDayBn}
          </div>
        </td>
      );
    }

    return (
      <td className="min-h-[40px] h-auto w-10 sm:w-12 text-center text-sm p-0.5 relative focus-within:relative focus-within:z-20">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div
              onMouseEnter={() => setIsOpen(true)}
              onMouseLeave={() => setIsOpen(false)}
              className={cn(
                "relative flex flex-col items-center justify-start min-h-[40px] h-full w-full py-1 rounded-md cursor-pointer transition-all",
                isOutside
                  ? "bg-muted/60 dark:bg-muted/40 border border-muted-foreground/20"
                  : hasFavorite
                    ? "bg-primary/20 border-2 border-primary dark:border-primary/80"
                    : "bg-green-500/20",
              )}
            >
              <span
                className={cn(
                  isOutside ? "text-muted-foreground/70 font-normal" : "text-foreground",
                )}
              >
                {formattedDayBn}
              </span>
              <div className="w-full flex flex-col items-center gap-0.5 px-0.5 mt-0.5">
                {dayEvents.map((event, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "text-[8px] leading-tight text-center w-full px-0.5 truncate bg-transparent font-medium",
                      isOutside
                        ? "text-muted-foreground dark:text-muted-foreground/80 font-medium"
                        : event.isFav
                          ? "text-primary font-bold"
                          : "text-green-900 dark:text-green-200",
                    )}
                  >
                    {event.title}
                    {event.isTentative ? "*" : ""}
                  </span>
                ))}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-3 max-w-xs bg-card border border-border shadow-xl rounded-xl z-50"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="font-bengali space-y-1.5 text-xs">
              <p className="font-bold text-sm text-primary border-b pb-1">
                {format(day, "dd MMMM, yyyy", { locale: bn }).replace(
                  /\d/g,
                  (d) => ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"][parseInt(d)],
                )}
              </p>
              {dayEvents.map((event, i) => {
                const detailsLink = event.institution_slug
                  ? `/${event.institution_type || "university"}/${event.institution_slug}`
                  : null;

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 pt-1 border-b border-border/40 last:border-b-0 pb-1"
                  >
                    <span className="font-medium text-foreground">
                      {event.title}
                      {event.isTentative && (
                        <span className="text-red-500 font-bold ml-0.5">*</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {detailsLink && <ExternalLink href={detailsLink} text="[বিস্তারিত]" />}
                      {event.isFav && (
                        <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </td>
    );
  };

  return (
    <div className="w-full flex flex-col items-center overflow-x-auto px-2 sm:px-4 relative">
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
          ক্যালেন্ডার ডাটা লোড হচ্ছে...
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center">
          {/* Robust Custom Navigation Header Bar */}
          <div className="w-full flex items-center justify-between mb-1 px-1 sm:px-4 z-20">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-9 w-9 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-accent active:scale-95 transition-all text-foreground cursor-pointer"
              title="পূর্ববর্তী মাস"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="h-9 w-9 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-accent active:scale-95 transition-all text-foreground cursor-pointer"
              title="পরবর্তী মাস"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </div>

          <Calendar
            locale={bn}
            mode="single"
            month={month}
            onMonthChange={setMonth}
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
      )}
    </div>
  );
};

export default FavoriteExamsCalendar;
