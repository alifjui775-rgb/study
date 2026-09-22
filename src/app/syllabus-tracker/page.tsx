import { useState, lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import SimplePageHeader from "@/components/common/SimplePageHeader";
import SyllabusFloatingDock from "@/components/syllabus/SyllabusFloatingDock";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SyllabusTrackerClient = lazy(() => import("./SyllabusTrackerClient"));
const UniversityList = lazy(() => import("@/components/syllabus/UniversityList"));

const TABS = [
  { value: "subject", label: "বিষয়ভিত্তিক" },
  { value: "university", label: "ইউনিভার্সিটি" },
] as const;

const VALID_TABS = TABS.map((t) => t.value);

function getInitialTab(): string {
  try {
    const saved = localStorage.getItem("st_active_tab");
    if (saved && VALID_TABS.includes(saved as (typeof VALID_TABS)[number])) return saved;
  } catch {}
  return "subject";
}

function TabFallback() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

export default function SyllabusTrackerPage() {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    try {
      localStorage.setItem("st_active_tab", value);
    } catch {}
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <SimplePageHeader title="সিলেবাস ট্র্যাকার" description="আপনার পড়াশুনার অগ্রগতি ট্রাক করুন।" />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex w-full gap-2 p-1 overflow-x-auto bg-muted/50 rounded-xl mb-6">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-bengali shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="subject">
            <Suspense fallback={<TabFallback />}>
              <SyllabusTrackerClient />
            </Suspense>
          </TabsContent>

          <TabsContent value="university">
            <Suspense fallback={<TabFallback />}>
              <UniversityList />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <SyllabusFloatingDock />
    </div>
  );
}
