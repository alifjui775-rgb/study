// =============================================================================
// CircularSection — Unit-wise circular downloads and history
// =============================================================================

import { useState } from "react";
import { useParams } from "react-router-dom";
import type { Circular, UnitWithDetails } from "@/lib/university-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ChevronRight, ExternalLink, AlertCircle } from "lucide-react";

interface Props {
  circulars: Circular[];
  units?: UnitWithDetails[];
}

export default function CircularSection({ circulars, units = [] }: Props) {
  const { slug: universitySlug } = useParams<{ slug: string }>();

  if (!circulars || circulars.length === 0) return null;

  // Track toggled visibility of previous circulars per unit / generic
  const [showPrev, setShowPrev] = useState<Record<string, boolean>>({});

  const togglePrev = (key: string) => {
    setShowPrev((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to partition circulars into recent (current batch) and previous
  const getRecentAndPrevious = (items: Circular[]) => {
    const hasCurrentBatch = items.some((c) => c.batch?.is_current);
    let recent = items.filter((c) => c.batch?.is_current);
    let previous = items.filter((c) => !c.batch?.is_current);

    if (!hasCurrentBatch && items.length > 0) {
      const maxYear = Math.max(...items.map((c) => c.batch?.year || 0));
      if (maxYear > 0) {
        recent = items.filter((c) => (c.batch?.year || 0) === maxYear);
        previous = items.filter((c) => (c.batch?.year || 0) < maxYear);
      }
    }
    return { recent, previous };
  };

  // Find units that have at least one circular mapping to them
  const unitsWithCirculars = units.filter((unit) =>
    circulars.some(
      (c) =>
        !c.circular_units ||
        c.circular_units.length === 0 ||
        c.circular_units.some((cu) => cu.unit_id === unit.id),
    ),
  );

  // Render the styled previous circulars list container
  const renderPreviousList = (items: Circular[]) => {
    return (
      <div className="bg-[#f0f4f9] dark:bg-[#1e293b] border-l-4 border-primary rounded-r-xl p-4 mt-4 text-left space-y-2.5">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
            {c.download_url ? (
              <a
                href={c.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold hover:text-primary transition-colors inline-flex items-center gap-1 font-bengali text-foreground"
              >
                {c.title}
                <ExternalLink className="h-3 w-3 opacity-70 shrink-0" />
              </a>
            ) : (
              <span className="text-sm font-semibold font-bengali text-muted-foreground">
                {c.title} (লিংক নেই)
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // If there are no units with circulars, or units list is empty, render a generic list
  const renderGenericList = () => {
    const { recent, previous } = getRecentAndPrevious(circulars);
    const latestRecent = recent[0];
    const allPrevious = [...recent.slice(1), ...previous];
    const hasRecent = !!latestRecent;
    const isPrevOpen = showPrev["generic"] || false;

    return (
      <div className="space-y-4">
        {latestRecent ? (
          <div className="text-center space-y-3">
            <span className="text-lg">
              <b>{latestRecent.title}</b>
            </span>
            {latestRecent.note && (
              <p className="text-muted-foreground text-sm font-bengali px-4">
                ({latestRecent.note})
              </p>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 justify-center mt-4">
              {latestRecent.download_url && (
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none border-transparent h-10 px-6 py-2 bg-primary text-primary-foreground flex-1 min-w-[150px] hover:bg-background hover:text-primary border hover:border-primary font-bengali shadow-sm"
                  href={latestRecent.download_url}
                >
                  <Download className="mr-2 h-4 w-4" /> ডাউনলোড করুন
                </a>
              )}

              {allPrevious.length > 0 && (
                <button
                  onClick={() => togglePrev("generic")}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none border bg-background h-10 px-4 py-2 text-primary border-primary flex-1 min-w-[150px] hover:bg-primary hover:text-primary-foreground font-bengali"
                >
                  পূর্ববর্তী বছরের সার্কুলার
                  <ChevronRight
                    className={`ml-2 h-4 w-4 transition-transform duration-300 ${isPrevOpen ? "rotate-90" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-muted-foreground font-bengali text-sm">
            কোনো সাম্প্রতিক সার্কুলার পাওয়া যায়নি।
          </div>
        )}

        {/* Show previous list directly if no recent exists, otherwise toggle it */}
        {allPrevious.length > 0 && (!hasRecent || isPrevOpen) && renderPreviousList(allPrevious)}
      </div>
    );
  };

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-6 shadow-lg text-center relative">
      <div className="flex justify-center">
        <div className="gradient-background inline-block px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md font-bengali">
          সার্কুলার
        </div>
      </div>

      {unitsWithCirculars.length === 0 ? (
        renderGenericList()
      ) : (
        <Tabs defaultValue={unitsWithCirculars[0]?.id} className="w-full">
          {/* Matches QuestionBankSection Tab List Style exactly */}
          {!(
            unitsWithCirculars.length === 1 && unitsWithCirculars[0].unit_slug === universitySlug
          ) && (
            <TabsList className="flex flex-wrap w-full h-auto bg-transparent gap-2">
              {unitsWithCirculars.map((unit) => {
                return (
                  <TabsTrigger
                    key={unit.id}
                    value={unit.id}
                    className="flex-grow border border-primary text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:border-transparent font-bengali text-sm"
                  >
                    {unit.unit_name_bn}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          )}

          {unitsWithCirculars.map((unit) => {
            const unitCirculars = circulars.filter(
              (c) =>
                !c.circular_units ||
                c.circular_units.length === 0 ||
                c.circular_units.some((cu) => cu.unit_id === unit.id),
            );

            const { recent, previous } = getRecentAndPrevious(unitCirculars);
            const latestRecent = recent[0];
            const allPrevious = [...recent.slice(1), ...previous];
            const hasRecent = !!latestRecent;
            const isPrevOpen = showPrev[unit.id] || false;

            return (
              <TabsContent
                key={unit.id}
                value={unit.id}
                className="mt-2 focus-visible:outline-none"
              >
                <div className="space-y-4">
                  {latestRecent ? (
                    <div className="text-center space-y-3">
                      <span className="text-base sm:text-lg">
                        <b>{latestRecent.title}</b>
                      </span>
                      {latestRecent.note ? (
                        <p className="text-muted-foreground text-sm font-bengali px-4">
                          ({latestRecent.note})
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-sm font-bengali px-4">
                          (⚠ নোট: বিস্তারিতভাবে সবকিছু জানার জন্যে সার্কুলারটি ভালোভাবে পড়ে নিয়েন)
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 justify-center mt-4">
                        {latestRecent.download_url && (
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none border-transparent h-10 px-6 py-2 bg-primary text-primary-foreground flex-1 min-w-[150px] hover:bg-background hover:text-primary border hover:border-primary font-bengali shadow-md"
                            href={latestRecent.download_url}
                          >
                            <Download className="mr-2 h-4 w-4" /> ডাউনলোড করুন
                          </a>
                        )}

                        {allPrevious.length > 0 && (
                          <button
                            onClick={() => togglePrev(unit.id)}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none border bg-background h-10 px-4 py-2 text-primary border-primary flex-1 min-w-[150px] hover:bg-primary hover:text-primary-foreground font-bengali"
                          >
                            পূর্ববর্তী বছরের সার্কুলার
                            <ChevronRight
                              className={`ml-2 h-4 w-4 transition-transform duration-300 ${isPrevOpen ? "rotate-90" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-muted-foreground font-bengali text-sm flex items-center justify-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      এই ইউনিটের সাম্প্রতিক কোনো সার্কুলার পাওয়া যায়নি।
                    </div>
                  )}

                  {/* Show previous list directly if no recent exists, otherwise toggle it */}
                  {allPrevious.length > 0 &&
                    (!hasRecent || isPrevOpen) &&
                    renderPreviousList(allPrevious)}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
