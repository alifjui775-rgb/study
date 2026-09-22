import { useQuery } from "@tanstack/react-query";
import { fetchCalendarResults, isRowVisible, type CalendarResult } from "@/lib/calendar-queries";
import { formatDateBn } from "@/lib/date-utils";
import ExternalLink from "@/components/common/ExternalLink";
import SharedScheduleTable from "@/components/common/SharedScheduleTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface CalendarResultScheduleTableProps {
  filters?: { [key: string]: boolean };
}

const CalendarResultScheduleTable = ({ filters }: CalendarResultScheduleTableProps) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const {
    data: resultSchedule = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["calendar-results"],
    queryFn: fetchCalendarResults,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <LoadingSpinner message="ফলাফল লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">ফলাফল লোড করতে সমস্যা হয়েছে।</p>
      </div>
    );
  }

  const getFavKey = (item: CalendarResult) =>
    item.unit_id || `${item.institution_slug}_${item.unit_slug}`;

  const filteredResults = resultSchedule.filter((item) => isRowVisible(item, filters));

  const sortedResults = [...filteredResults].sort((a, b) => {
    const isAFav = isFavorite(getFavKey(a));
    const isBFav = isFavorite(getFavKey(b));
    if (isAFav && !isBFav) return -1;
    if (!isAFav && isBFav) return 1;
    return 0;
  });

  const columns = [
    {
      header: "",
      className: "w-[1%] px-1",
      accessor: (item: CalendarResult) => {
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
      accessor: (item: CalendarResult) => {
        const showSlug =
          item.institution_name_bn && item.unit_slug && item.institution_name_bn !== item.unit_slug;
        const nameDisplay = item.institution_name_bn
          ? `${item.institution_name_bn}${showSlug ? ` (${item.unit_slug.toUpperCase()})` : ""}`
          : item.unit_name_bn;
        return <span className="font-bold">{nameDisplay}</span>;
      },
    },
    {
      header: "তারিখ",
      className: "w-1/3",
      accessor: (item: CalendarResult) =>
        item.result_datetime ? formatDateBn(item.result_datetime, "DD MMMM") : "",
    },
    {
      header: "লিংক",
      className: "w-1/3",
      accessor: (item: CalendarResult) =>
        item.result_url ? <ExternalLink href={item.result_url} text="[লিংক]" /> : null,
    },
  ];

  return (
    <SharedScheduleTable
      data={sortedResults}
      columns={columns}
      rowClassName={(item) =>
        isFavorite(getFavKey(item)) ? "bg-primary/5 dark:bg-primary/10" : "even:bg-muted/50"
      }
    />
  );
};

export default CalendarResultScheduleTable;
