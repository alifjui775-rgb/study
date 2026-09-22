import SimplePageHeader from "@/components/common/SimplePageHeader";
import CalendarFilterMenu from "@/components/calendar/CalendarFilterMenu";
import { useState, useEffect, lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const AdmissionTabs = lazy(() => import("@/components/calendar/CalendarAdmissionTabs"));

function CalendarPageClient() {
  const [activeTab, setActiveTab] = useState("schedule");

  const [filters, setFilters] = useState<{ [key: string]: boolean }>({
    science: true,
    arts: true,
    commerce: true,
    mixed: true,
    secondTime: false,
    showColorCode: false,
    showSeconds: true,
    ucS: false,
    ucA: false,
    ucC: false,
  });

  useEffect(() => {
    const storedFilters = localStorage.getItem("calendarFilters");
    if (storedFilters) {
      try {
        const parsedFilters = JSON.parse(storedFilters);
        setFilters((prevFilters) => ({ ...prevFilters, ...parsedFilters }));
      } catch (error) {
        console.error("Failed to parse filters from localStorage", error);
        localStorage.removeItem("calendarFilters");
      }
    }
  }, []);

  const handleFilterChange = (newFilters: { [key: string]: boolean }) => {
    setFilters(newFilters);
    localStorage.setItem("calendarFilters", JSON.stringify(newFilters));
  };

  return (
    <div className="font-bengali bg-background">
      <CalendarFilterMenu
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        activeTab={activeTab}
      />
      <div className="container mx-auto px-2 lg:px-[170px]">
        <div className="px-4">
          <SimplePageHeader
            title="অ্যাডমিশন ক্যালেন্ডার"
            description="সকল বিশ্ববিদ্যালয় ও অধিভুক্ত কলেজের ভর্তি পরীক্ষার সকল তথ্য একত্রে এক জায়গায়"
          />
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <AdmissionTabs filters={filters} onTabChange={setActiveTab} />
        </Suspense>
      </div>
    </div>
  );
}

export default CalendarPageClient;
