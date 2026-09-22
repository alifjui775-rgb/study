import type { MapLocation } from "@/lib/university-types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { History, MapPin, ExternalLink, Map } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const CATEGORY_MAP = {
  academic: "একাডেমিক ভবন",
  administrative: "প্রশাসনিক ভবন",
  residential: "আবাসিক হল/হোস্টেল",
  canteen: "ক্যান্টিন/খাবারের স্থান",
  library: "লাইব্রেরি",
  playground: "খেলার মাঠ",
  monument: "ভাস্কর্য/দর্শনীয় স্থান",
  gate: "প্রবেশদ্বার",
  mosque: "মসজিদ",
  other: "অন্যান্য",
};

interface Props {
  history: string | null;
  universityNameBn: string;
  mapLocations: MapLocation[];
  historySource?: { label: string; url: string }[] | { label: string; url: string } | null;
}

export default function HistoryAndMap({
  history,
  universityNameBn,
  mapLocations,
  historySource,
}: Props) {
  // Group map locations by category
  const groupedLocations = mapLocations.reduce(
    (acc, loc) => {
      const cat = loc.category || "other";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(loc);
      return acc;
    },
    {} as Record<string, MapLocation[]>,
  );

  // Sort categories according to CATEGORY_MAP order, followed by other categories
  const sortedCategories = Object.keys(CATEGORY_MAP).filter(
    (key) => groupedLocations[key] && groupedLocations[key].length > 0,
  );
  const otherCategories = Object.keys(groupedLocations).filter(
    (key) =>
      !CATEGORY_MAP[key as keyof typeof CATEGORY_MAP] && (groupedLocations[key] || []).length > 0,
  );
  const categoriesToRender = [...sortedCategories, ...otherCategories];

  return (
    <div className="w-full space-y-4">
      {/* History */}
      {history && (
        <Accordion type="single" collapsible>
          <AccordionItem
            value="history"
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
          >
            <AccordionTrigger className="p-4 sm:p-5 w-full flex justify-between items-center text-lg font-bold cursor-pointer hover:no-underline">
              <div className="flex items-center font-bengali">
                <History className="mr-2 h-5 w-5" />
                <span>একনজরে {universityNameBn}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 sm:p-5 border-t border-border/50 text-base text-muted-foreground">
              <div className="prose prose-sm dark:prose-invert max-w-none font-bengali leading-relaxed whitespace-pre-line">
                {history}
              </div>
              {historySource &&
                (Array.isArray(historySource)
                  ? historySource.length > 0 && (
                      <div className="mt-6">
                        <Separator className="mb-4" />
                        <div className="text-xs text-muted-foreground font-bengali">
                          <p className="font-medium mb-2 text-sm text-foreground/80">তথ্যসূত্র:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-1">
                            {historySource.map((source, index) => (
                              <li key={index}>
                                {source.url ? (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline hover:text-primary transition-colors inline-flex items-center gap-1"
                                  >
                                    {source.label}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span>{source.label}</span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )
                  : (historySource.label || historySource.url) && (
                      <div className="mt-6">
                        <Separator className="mb-4" />
                        <div className="text-xs text-muted-foreground font-bengali">
                          <p className="font-medium mb-2 text-sm text-foreground/80">তথ্যসূত্র:</p>
                          <ul className="list-disc list-inside space-y-1 ml-1">
                            <li>
                              {historySource.url ? (
                                <a
                                  href={historySource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline hover:text-primary transition-colors inline-flex items-center gap-1"
                                >
                                  {historySource.label || "লিংক"}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span>{historySource.label}</span>
                              )}
                            </li>
                          </ul>
                        </div>
                      </div>
                    ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Map */}
      {mapLocations.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem
            value="map"
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
          >
            <AccordionTrigger className="p-4 sm:p-5 w-full flex justify-between items-center text-lg font-bold cursor-pointer hover:no-underline">
              <div className="flex items-center font-bengali">
                <Map className="mr-2 h-5 w-5" />
                <span>ক্যাম্পাসের গুগল ম্যাপ লোকেশন</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 sm:p-5 border-t border-border/50 text-base text-muted-foreground">
              <Accordion type="multiple" className="space-y-3">
                {categoriesToRender.map((categoryKey) => {
                  const categoryName =
                    CATEGORY_MAP[categoryKey as keyof typeof CATEGORY_MAP] || categoryKey;
                  const locations = groupedLocations[categoryKey] || [];
                  return (
                    <AccordionItem
                      key={categoryKey}
                      value={categoryKey}
                      className="border border-border rounded-xl bg-card overflow-hidden shadow-xs"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline flex justify-between items-center cursor-pointer bg-card">
                        <div className="flex items-center gap-2.5 font-bengali text-foreground/85 font-bold">
                          <MapPin className="h-5 w-5 text-slate-500/80" />
                          <span>{categoryName}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/5">
                        <div className="space-y-3 pl-7">
                          {locations.map((loc) => (
                            <div
                              key={loc.id}
                              className="flex items-center justify-between gap-4 py-1"
                            >
                              <span className="font-bengali text-sm text-foreground/75 font-medium">
                                {loc.name}
                              </span>
                              <a
                                href={loc.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 font-bengali shrink-0"
                              >
                                [দেখুন]
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
