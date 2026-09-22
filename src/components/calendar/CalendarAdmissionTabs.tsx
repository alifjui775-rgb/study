import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarAdmissionScheduleTable from "./CalendarAdmissionScheduleTable";
import { CalendarClock, Info, FilePenLine, Ticket, BarChart3 } from "lucide-react";
import CalendarApplicationScheduleTable from "./CalendarApplicationScheduleTable";
import CalendarAdmitCardScheduleTable from "./CalendarAdmitCardScheduleTable";
import CalendarResultScheduleTable from "./CalendarResultScheduleTable";
import CalendarInfoTable from "./CalendarInfoTable";
import FavoriteExamsCalendar from "../FavoriteExamsCalendar";
import NotificationBar from "@/components/common/NotificationBar";

interface AdmissionTabsProps {
  filters: { [key: string]: boolean };
  onTabChange: (tab: string) => void;
}

const AdmissionTabs = ({ filters, onTabChange }: AdmissionTabsProps) => {
  return (
    <div className="mt-8">
      <NotificationBar />
      <Tabs defaultValue="schedule" className="w-full" onValueChange={onTabChange}>
        <div className="overflow-x-auto no-scrollbar flex justify-center">
          <TabsList className="flex w-fit sm:w-full bg-transparent gap-2">
            <TabsTrigger value="schedule" className="px-2 border border-primary text-primary">
              <CalendarClock className="mr-2 h-4 w-4 hidden sm:inline-block" /> সময়কাল
            </TabsTrigger>
            <TabsTrigger value="info" className="px-2 border border-primary text-primary">
              <Info className="mr-2 h-4 w-4 hidden sm:inline-block" /> তথ্য
            </TabsTrigger>
            <TabsTrigger value="application" className="px-2 border border-primary text-primary">
              <FilePenLine className="mr-2 h-4 w-4 hidden sm:inline-block" /> আবেদন
            </TabsTrigger>
            <TabsTrigger value="admit-card" className="px-2 border border-primary text-primary">
              <Ticket className="mr-2 h-4 w-4 hidden sm:inline-block" /> প্রবেশপত্র
            </TabsTrigger>
            <TabsTrigger value="result" className="px-2 border border-primary text-primary">
              <BarChart3 className="mr-2 h-4 w-4 hidden sm:inline-block" /> ফলাফল
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="schedule" className="mt-1">
          <CalendarAdmissionScheduleTable filters={filters} />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
              <span className="text-red-500 font-bold">"*"</span> চিহ্ন দেওয়া তারিখগুলো কর্তৃপক্ষ সম্ভাব্য
              তারিখ হিসেবে জানিয়েছে
            </p>
            <hr className="my-4 border-border/50" />
          </div>
          <div className="mt-8 text-center">
            <p className="mb-4 text-muted-foreground">
              লিস্ট ভালো না লাগলে ডিরেক্ট ক্যালেন্ডারেই দেখে নাও...
            </p>
            <div className="mt-4 w-full border border-border bg-card rounded-2xl shadow-lg p-4 flex justify-center">
              <FavoriteExamsCalendar filters={filters} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="info" className="mt-1">
          <CalendarInfoTable filters={filters} />
        </TabsContent>
        <TabsContent value="application" className="mt-1">
          <CalendarApplicationScheduleTable filters={filters} />
        </TabsContent>
        <TabsContent value="admit-card" className="mt-1">
          <CalendarAdmitCardScheduleTable filters={filters} />
        </TabsContent>
        <TabsContent value="result" className="mt-1">
          <CalendarResultScheduleTable filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdmissionTabs;
