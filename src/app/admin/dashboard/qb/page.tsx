// =============================================================================
// Admin — Master Question Bank (page shell with two tabs)
// Tab 1: Unit Mapping (master_qb_units) — default
// Tab 2: Streams Management (master_qb_streams)
// =============================================================================

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { BookMarked, Layers } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UnitMappingTab from "./UnitMappingTab";
import StreamsTab from "./StreamsTab";

type QbAdminTab = "units" | "streams";

export default function AdminMasterQbPage() {
  const [activeTab, setActiveTab] = useState<QbAdminTab>("units");

  return (
    <>
      <Helmet>
        <title>মাস্টার প্রশ্নব্যাংক — অ্যাডমিন</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold font-bengali flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" />
            মাস্টার প্রশ্নব্যাংক
          </h1>
          <p className="text-sm text-muted-foreground font-bengali mt-1">
            স্ট্রিম তৈরি করুন এবং প্রতিষ্ঠানের ইউনিটগুলো স্ট্রিমের সাথে ম্যাপ করুন।
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as QbAdminTab)}>
          <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted rounded-xl sm:w-auto sm:grid-cols-2">
            <TabsTrigger value="units" className="font-bengali flex items-center gap-1.5 rounded-lg">
              <Layers className="h-4 w-4" />
              ইউনিট ম্যাপিং
            </TabsTrigger>
            <TabsTrigger
              value="streams"
              className="font-bengali flex items-center gap-1.5 rounded-lg"
            >
              <BookMarked className="h-4 w-4" />
              স্ট্রিম ব্যবস্থাপনা
            </TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="mt-6 outline-none">
            <UnitMappingTab />
          </TabsContent>

          <TabsContent value="streams" className="mt-6 outline-none">
            <StreamsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
