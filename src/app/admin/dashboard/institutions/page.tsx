import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, School, Network } from "lucide-react";
import AdminUniversitiesPage from "@/app/admin/dashboard/universities/page";
import AdminCollegesPage from "@/app/admin/dashboard/colleges/page";
import AdminClustersPage from "@/app/admin/dashboard/clusters/page";

type InstitutionTab = "universities" | "colleges" | "clusters";

export default function AdminInstitutionsPage() {
  const [activeTab, setActiveTab] = useState<InstitutionTab>("universities");

  return (
    <>
      <Helmet>
        <title>প্রতিষ্ঠান ও গুচ্ছ — অ্যাডমিন</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold font-bengali flex items-center gap-2">
            <School className="h-6 w-6 text-primary" />
            প্রতিষ্ঠান ও গুচ্ছ ব্যবস্থাপনা
          </h1>
          <p className="text-sm text-muted-foreground font-bengali mt-1">
            বিশ্ববিদ্যালয়, কলেজ এবং গুচ্ছ পরিচালনা করুন।
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InstitutionTab)}>
          <TabsList className="h-11 p-1 bg-muted rounded-xl">
            <TabsTrigger
              value="universities"
              className="font-bengali flex items-center gap-1.5 rounded-lg"
            >
              <GraduationCap className="h-4 w-4" />
              বিশ্ববিদ্যালয়
            </TabsTrigger>
            <TabsTrigger
              value="colleges"
              className="font-bengali flex items-center gap-1.5 rounded-lg"
            >
              <School className="h-4 w-4" />
              কলেজ
            </TabsTrigger>
            <TabsTrigger
              value="clusters"
              className="font-bengali flex items-center gap-1.5 rounded-lg"
            >
              <Network className="h-4 w-4" />
              গুচ্ছ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="universities" className="mt-6 outline-none">
            <AdminUniversitiesPage />
          </TabsContent>

          <TabsContent value="colleges" className="mt-6 outline-none">
            <AdminCollegesPage />
          </TabsContent>

          <TabsContent value="clusters" className="mt-6 outline-none">
            <AdminClustersPage />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
