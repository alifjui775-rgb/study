import React from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface UniversityCardProps {
  university: {
    id: string;
    slug: string;
    nameBn: string;
    nameEn: string;
    shortName: string;
    logo?: string | null;
    description?: string | null;
    link: string;
    clusters?: { label: string; fullName: string }[];
  };
  hideCircular?: boolean;
}

const UniversityCard = React.memo(function UniversityCard({
  university,
  hideCircular = false,
}: UniversityCardProps) {
  const universityLink = university.link;
  const clusters = university.clusters ?? [];
  return (
    <div className="relative">
      {clusters.length > 0 && (
        <span
          title={clusters.map((c) => c.fullName).join(" · ")}
          className="absolute -top-2 left-4 z-10 flex items-center gap-1.5 bg-background text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border text-primary leading-none font-bengali"
        >
          {clusters.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-[7px] text-primary/50">
                  ●
                </span>
              )}
              {c.label}
            </span>
          ))}
        </span>
      )}
      <Accordion
        type="single"
        collapsible
        className="bg-card border border-border rounded-xl shadow-xs transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 overflow-hidden dark:hover:bg-accent"
      >
        <AccordionItem value={university.shortName} className="border-none">
          <AccordionTrigger className="p-4 w-full flex justify-between items-center cursor-pointer hover:no-underline [&[data-state=open]>svg.chevron]:-rotate-180 text-foreground">
            <div className="flex items-center gap-4 text-left w-full">
              {university.logo ? (
                <img
                  src={university.logo}
                  alt={`${university.nameEn} logo`}
                  className="w-10 h-10 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const fallback = (e.target as HTMLImageElement).nextSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
                style={{ display: university.logo ? "none" : "flex" }}
              >
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col flex-grow min-w-0">
                <span className="font-bold text-foreground truncate">
                  {university.nameBn}
                  {university.shortName && university.shortName !== university.nameBn
                    ? ` (${university.shortName})`
                    : ""}
                </span>
                <span className="text-sm text-muted-foreground truncate">{university.nameEn}</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-4 pb-4 border-t border-border/50">
              <p className="text-muted-foreground my-3 text-sm leading-relaxed">
                {university.description ||
                  "এই বিশ্ববিদ্যালয়ের কোনো সংক্ষিপ্ত বিবরণ পাওয়া যায়নি। বিস্তারিত জানতে নিচে ক্লিক করুন।"}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {!hideCircular && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="cursor-pointer font-bengali"
                  >
                    <Link to={`${universityLink}#Circular`}>
                      <FileText className="h-4 w-4 mr-1.5" /> সার্কুলার
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="cursor-pointer font-bengali">
                  <Link to={`${universityLink}#QuestionBank`}>
                    <BookOpen className="h-4 w-4 mr-1.5" /> প্রশ্নব্যাংক
                  </Link>
                </Button>
                <Button asChild variant="default" size="sm" className="cursor-pointer font-bengali">
                  <Link to={universityLink}>
                    বিস্তারিত <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});

export default UniversityCard;
