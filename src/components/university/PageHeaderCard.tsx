// =============================================================================
// PageHeaderCard — Centered hero with floating logo, matching legacy design
// =============================================================================

import type { University } from "@/lib/university-types";
import { Info } from "lucide-react";

import { useSubCategoryMap } from "@/lib/institution-category-queries";

interface Props {
  university: University;
  totalUnits: number;
  totalSeats: number;
  totalSubjects: number;
  entityType?: "university" | "college" | "cluster";
}

export default function PageHeaderCard({
  university,
  totalUnits,
  totalSeats,
  totalSubjects,
  entityType = "university",
}: Props) {
  const subCategoryMap = useSubCategoryMap();
  const subCategoryLabel = university.sub_category
    ? Array.isArray(university.sub_category)
      ? university.sub_category.map((sub) => subCategoryMap[sub]?.name_bn ?? sub).join(" / ")
      : (subCategoryMap[university.sub_category as string]?.name_bn ?? university.sub_category)
    : "সাধারণ";

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-8 shadow-lg text-center relative">
      {/* Category badge */}
      <div className="text-xs sm:text-sm text-foreground absolute -top-3 left-4 sm:left-6 bg-card border border-border rounded-lg px-3 py-1 z-20 font-bengali">
        <b>{subCategoryLabel}</b>
      </div>

      {/* Floating logo */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 bg-card rounded-2xl shadow-xl z-10 flex items-center justify-center p-1">
        {university.logo_url ? (
          <img
            alt={`${university.name_bn} Logo`}
            loading="lazy"
            width={100}
            height={100}
            className="p-1 w-full h-full object-contain rounded-2xl"
            src={university.logo_url}
          />
        ) : (
          <div className="w-full h-full rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
            {university.short_name?.[0] || "🎓"}
          </div>
        )}
      </div>

      {/* Name & Description */}
      <div className="pt-10 sm:pt-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold my-2 text-foreground font-bengali">
          {university.name_bn}
        </h1>
        {university.name_en && (
          <p className="text-sm text-muted-foreground mb-4">({university.name_en})</p>
        )}
        {university.description && (
          <p className="text-base text-muted-foreground mb-6 max-w-2xl mx-auto font-bengali">
            {university.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="flex justify-around items-center mb-6 text-sm max-w-md mx-auto">
        <div className="text-center px-2">
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-center justify-center font-bengali">
            {totalUnits > 0 ? `${toBanglaNum(totalUnits)}টি` : "—"}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-bengali">
            ইউনিট
          </div>
        </div>
        {entityType === "cluster" ? (
          <div className="text-center px-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-center justify-center font-bengali">
              {university.parent_university_name || "—"}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-bengali">
              বিশ্ববিদ্যালয়
            </div>
          </div>
        ) : (
          <>
            <div className="text-center px-2">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-center justify-center font-bengali">
                {totalSubjects > 0 ? `${toBanglaNum(totalSubjects)}টি` : "—"}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-bengali">
                বিষয়
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-center justify-center font-bengali">
                {totalSeats > 0 ? `${toBanglaNum(totalSeats)}টি` : "—"}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-bengali">
                আসন
              </div>
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <a
        href="#Info"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground border border-transparent hover:bg-background hover:text-primary hover:border-primary h-10 px-4 py-2 rounded-lg"
      >
        <Info className="h-4 w-4" /> মূল তথ্য
      </a>
    </div>
  );
}

/** Convert number to Bangla digits */
function toBanglaNum(n: number): string {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return n.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d)]);
}
