import type { AdmissionUnitItem } from "@/lib/syllabus-queries";
import { BookOpen } from "lucide-react";

interface UnitSelectorProps {
  units: AdmissionUnitItem[];
  selectedUnitId: string | null;
  onSelect: (unit: AdmissionUnitItem) => void;
  isLoading?: boolean;
  isParentLoading?: boolean;
}

export default function UnitSelector({
  units,
  selectedUnitId,
  onSelect,
  isLoading,
  isParentLoading,
}: UnitSelectorProps) {
  if (isLoading || isParentLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-24 bg-muted rounded-xl animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-bengali bg-card border border-border rounded-2xl">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">কোনো ইউনিট পাওয়া যায়নি।</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold font-bengali text-muted-foreground">অ্যাডমিশন ইউনিট</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {units.map((unit) => {
          const isSelected = unit.id === selectedUnitId;
          return (
            <button
              key={unit.id}
              onClick={() => onSelect(unit)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bengali font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <span>{unit.unit_name_bn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
