import { useQuery } from "@tanstack/react-query";
import {
  fetchCalendarAdmitCards,
  isRowVisible,
  type CalendarAdmitCard,
} from "@/lib/calendar-queries";
import { formatDateBn } from "@/lib/date-utils";
import ExternalLink from "@/components/common/ExternalLink";
import SharedScheduleTable from "@/components/common/SharedScheduleTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface CalendarAdmitCardScheduleTableProps {
  filters?: { [key: string]: boolean };
}

const CalendarAdmitCardScheduleTable = ({ filters }: CalendarAdmitCardScheduleTableProps) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const {
    data: admitCards = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["calendar-admit-cards"],
    queryFn: fetchCalendarAdmitCards,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <LoadingSpinner message="প্রবেশপত্র লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">প্রবেশপত্র লোড করতে সমস্যা হয়েছে।</p>
      </div>
    );
  }

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

  const getFavKey = (item: CalendarAdmitCard) =>
    item.unit_id || `${item.institution_slug}_${item.unit_slug}`;

  const filteredAdmitCards = admitCards.filter((item) => isRowVisible(item, filters));

  const sortedAdmitCards = [...filteredAdmitCards].sort((a, b) => {
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
      accessor: (item: CalendarAdmitCard) => {
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
      accessor: (item: CalendarAdmitCard) => {
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
      accessor: (item: CalendarAdmitCard) =>
        formatDateRange(item.download_start_datetime, item.download_end_datetime),
    },
    {
      header: "লিংক",
      className: "w-1/3",
      accessor: (item: CalendarAdmitCard) =>
        item.admit_card_url ? <ExternalLink href={item.admit_card_url} text="[লিংক]" /> : null,
    },
  ];

  return (
    <SharedScheduleTable
      data={sortedAdmitCards}
      columns={columns}
      rowClassName={(item) =>
        isFavorite(getFavKey(item)) ? "bg-primary/5 dark:bg-primary/10" : "even:bg-muted/50"
      }
    />
  );
};

export default CalendarAdmitCardScheduleTable;
