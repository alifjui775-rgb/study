// =============================================================================
// QuestionBankSection — Question Bank Section with Unit Links
// Links each unit to /qb/:slug/:unit_slug
// =============================================================================

import { useParams, Link } from "react-router-dom";
import type { UnitWithDetails } from "@/lib/university-types";
import { BookOpenCheck, ChevronRight } from "lucide-react";

interface Props {
  units: UnitWithDetails[];
}

export default function QuestionBankSection({ units }: Props) {
  const { slug } = useParams<{ slug: string }>();

  if (!units || units.length === 0) return null;

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-6 shadow-lg text-center relative animate-fade-in-up">
      <div className="flex justify-center">
        <div className="gradient-background inline-block px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md font-bengali">
          প্রশ্নব্যাংক
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {units.map((unit) => {
          const unitSlug = unit.unit_slug || unit.id;
          const linkHref = `/qb/${slug}/${unitSlug}`;

          return (
            <Link
              key={unit.id}
              to={linkHref}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary hover:bg-accent/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-3 font-bengali">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <BookOpenCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {unit.unit_name_bn}
                  </h3>
                  {unit.unit_name_en && (
                    <p className="text-xs text-muted-foreground font-sans">{unit.unit_name_en}</p>
                  )}
                </div>
              </div>

              <div className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                <ChevronRight className="h-5 w-5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
