import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendarApplications,
  isRowVisible,
  type CalendarApplication,
} from "@/lib/calendar-queries";
import { formatDateBn } from "@/lib/date-utils";
import ExternalLink from "@/components/common/ExternalLink";
import { useCountdown } from "@/hooks/useCountdown";
import SharedScheduleTable from "@/components/common/SharedScheduleTable";
import { Input } from "@/components/ui/input";
import { Search, Info, Heart } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

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

const CountdownDisplay = ({
  startDate,
  endDate,
  showSeconds = true,
}: {
  startDate: string | null;
  endDate: string | null;
  showSeconds?: boolean;
}) => {
  const startCountdown = useCountdown(startDate);
  const endCountdown = useCountdown(endDate);

  if (startDate && !startCountdown.completed) {
    return (
      <span className="text-sm font-bold text-green-600 dark:text-green-500">
        {toBengaliNumber(startCountdown.days)} দিন পর শুরু
      </span>
    );
  }

  if (!endDate) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  if (endCountdown.completed) {
    return <span className="text-xs font-bold text-red-500 dark:text-red-400">সময় শেষ</span>;
  }

  return (
    <div className="font-bengali whitespace-nowrap text-xs sm:text-sm">
      <span className="tabular-nums">
        {toBengaliNumber(String(endCountdown.days).padStart(2, "0"))}
      </span>
      <span className="mr-1 hidden sm:inline">দিন</span>
      <span className="mr-1 sm:hidden">দি</span>
      <span className="tabular-nums">
        {toBengaliNumber(String(endCountdown.hours).padStart(2, "0"))}
      </span>
      <span className="mr-1 hidden sm:inline">ঘণ্টা</span>
      <span className="mr-1 sm:hidden">ঘ</span>
      <span className="tabular-nums">
        {toBengaliNumber(String(endCountdown.minutes).padStart(2, "0"))}
      </span>
      <span className="mr-1 hidden sm:inline">মিনিট</span>
      <span className="mr-1 sm:hidden">মি</span>
      {showSeconds && (
        <>
          <span className="tabular-nums">
            {toBengaliNumber(String(endCountdown.seconds).padStart(2, "0"))}
          </span>
          <span className="hidden sm:inline">সেকেন্ড</span>
          <span className="sm:hidden">সে</span>
        </>
      )}
    </div>
  );
};

interface CalendarApplicationScheduleTableProps {
  filters?: { [key: string]: boolean };
}

const CalendarApplicationScheduleTable = ({ filters }: CalendarApplicationScheduleTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toggleFavorite, isFavorite } = useFavorites();

  const {
    data: applications = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["calendar-applications"],
    queryFn: fetchCalendarApplications,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const formatDateRange = (start: string | null, end: string | null): string => {
    if (!start && !end) return "";
    if (start && end) {
      const startFormatted = formatDateBn(start, "DD MMMM");
      const endFormatted = formatDateBn(end, "DD MMMM");
      return `${startFormatted} - ${endFormatted}`;
    }
    if (start) return formatDateBn(start, "DD MMMM");
    return formatDateBn(end, "DD MMMM");
  };

  const getFavKey = (item: CalendarApplication) =>
    item.unit_id || `${item.institution_slug}_${item.unit_slug}`;

  const sortedSchedule = useMemo(() => {
    const filteredData = applications.filter((item) => {
      if (!isRowVisible(item, filters)) return false;
      const name = item.institution_name_bn
        ? `${item.institution_name_bn}${item.unit_slug ? ` (${item.unit_slug})` : ""}`
        : item.unit_name_bn;
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return [...filteredData].sort((a, b) => {
      const isAFav = isFavorite(getFavKey(a));
      const isBFav = isFavorite(getFavKey(b));
      if (isAFav && !isBFav) return -1;
      if (!isAFav && isBFav) return 1;

      const now = new Date().getTime();

      const startA = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const endA = a.end_datetime ? new Date(a.end_datetime).getTime() : 0;
      const startB = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      const endB = b.end_datetime ? new Date(b.end_datetime).getTime() : 0;

      const a_isOngoing = startA > 0 && startA < now && endA > 0 && endA > now;
      const b_isOngoing = startB > 0 && startB < now && endB > 0 && endB > now;

      const a_isUpcoming = startA > 0 && startA > now;
      const b_isUpcoming = startB > 0 && startB > now;

      const a_isFinished = endA > 0 && endA < now;
      const b_isFinished = endB > 0 && endB < now;

      if (a_isOngoing && !b_isOngoing) return -1;
      if (!a_isOngoing && b_isOngoing) return 1;
      if (a_isOngoing && b_isOngoing) return (endA || 0) - (endB || 0);

      if (a_isUpcoming && !b_isUpcoming) return -1;
      if (!a_isUpcoming && b_isUpcoming) return 1;
      if (a_isUpcoming && b_isUpcoming) return (startA || 0) - (startB || 0);

      if (a_isFinished && !b_isFinished) return 1;
      if (!a_isFinished && b_isFinished) return -1;
      if (a_isFinished && b_isFinished) return (endB || 0) - (endA || 0);

      return (endB || 0) - (endA || 0);
    });
  }, [applications, searchTerm, isFavorite, filters]);

  if (isLoading) {
    return <LoadingSpinner message="আবেদন তথ্য লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">আবেদন তথ্য লোড করতে সমস্যা হয়েছে।</p>
      </div>
    );
  }

  const columns = [
    {
      header: "",
      className: "w-[1%] px-1",
      accessor: (item: CalendarApplication) => {
        const favKey = getFavKey(item);
        const isFav = isFavorite(favKey);
        return (
          <button
            onClick={() => toggleFavorite(favKey)}
            className="p-0.5 rounded-full hover:bg-muted transition-colors inline-flex items-center justify-center"
            title="পছন্দের তালিকায় যুক্ত করুন"
          >
            <Heart
              size={16}
              className={cn(
                "transition-all",
                isFav ? "fill-red-500 text-red-500" : "text-muted-foreground/50 hover:text-red-400",
              )}
            />
          </button>
        );
      },
    },
    {
      header: "বিশ্ববিদ্যালয়",
      className: "w-1/3",
      accessor: (item: CalendarApplication) => {
        const showSlug =
          item.institution_name_bn && item.unit_slug && item.institution_name_bn !== item.unit_slug;
        const nameDisplay = item.institution_name_bn
          ? `${item.institution_name_bn}${showSlug ? ` (${item.unit_slug.toUpperCase()})` : ""}`
          : item.unit_name_bn;
        const detailsLink = item.institution_slug
          ? `/university/${item.institution_slug}#Apply`
          : null;
        return (
          <div>
            <p className="font-bold">{nameDisplay}</p>
            {detailsLink && (
              <p className="text-xs mt-1">
                <ExternalLink href={detailsLink} text="[বিস্তারিত]" />
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: "সময়কাল",
      className: "w-1/3",
      accessor: (item: CalendarApplication) => (
        <div>
          <div>{formatDateRange(item.start_datetime, item.end_datetime)}</div>
          <CountdownDisplay
            startDate={item.start_datetime}
            endDate={item.end_datetime}
            showSeconds={filters?.showSeconds ?? true}
          />
        </div>
      ),
    },
    {
      header: "ফি ও লিংক",
      className: "w-1/3",
      accessor: (item: CalendarApplication) => (
        <div>
          {item.fee != null && (
            <div className="inline-flex items-center gap-1">
              <span>{item.fee.toLocaleString("bn-BD")}৳</span>
              {item.fee_payment_method && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Info className="text-muted-foreground/60 h-3 w-3 inline-block cursor-pointer hover:text-foreground transition-colors" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 text-sm font-bengali">
                    <p>পেমেন্ট পদ্ধতি: {item.fee_payment_method}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          {item.apply_url && (
            <div className="mt-2">
              <ExternalLink href={item.apply_url} text="[লিংক]" />
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="relative my-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="বিশ্ববিদ্যালয় খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 h-12 text-base bg-card border"
        />
      </div>
      <SharedScheduleTable
        data={sortedSchedule}
        columns={columns}
        rowClassName={(item) =>
          isFavorite(getFavKey(item)) ? "bg-primary/5 dark:bg-primary/10" : "even:bg-muted/50"
        }
      />
    </>
  );
};

export default CalendarApplicationScheduleTable;
