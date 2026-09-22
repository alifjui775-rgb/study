// =============================================================================
// Admin — Manage University Marks Distributions Tab (Phase 3)
// =============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import ManageUnitMarksDistribution from "@/components/admin/ManageUnitMarksDistribution";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BarChart3, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManageUniversityMarksDistributionsProps {
  entityId: string;
  entityType?: EntityType;
}

export default function ManageUniversityMarksDistributions({
  entityId,
  entityType = "university",
}: ManageUniversityMarksDistributionsProps) {
  const entityLabel = ENTITY_LABELS[entityType];
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Fetch Units for this entity
  const {
    data: units = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-entity-units", entityId, entityType],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  // Automatically select first unit if none selected and units are loaded
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
  const currentUnitId = selectedUnit?.id || null;

  if (isLoading) {
    return <LoadingSpinner message="ইউনিট তালিকা লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">
          তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
        </p>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-lg font-bold font-bengali text-foreground mb-1">কোনো ইউনিট পাওয়া যায়নি</h3>
        <p className="text-sm text-muted-foreground font-bengali max-w-sm mx-auto">
          মানবণ্টন সেট আপ করার আগে অনুগ্রহ করে &quot;ইউনিট&quot; ট্যাব থেকে অন্তত একটি ইউনিট তৈরি করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          ইউনিট মানবণ্টন (Marks Distribution)
        </h2>
        <p className="text-xs text-muted-foreground font-bengali mt-0.5">
          ইউনিট ভিত্তিক মানবণ্টন ও সাবজেক্ট সিলেকশন রুলস ম্যানেজ করুন।
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sub-navigation (sidebar list of units) */}
        <div className="lg:col-span-1 space-y-1 bg-muted/20 p-2 rounded-xl border border-border/60 h-fit">
          <p className="text-xs font-bold text-muted-foreground font-bengali px-3 py-2 uppercase tracking-wider">
            ইউনিটসমূহ
          </p>
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {units.map((unit) => {
              const isActive = currentUnitId === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={cn(
                    "flex-1 lg:w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap font-bengali",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {unit.unit_name_bn}
                  {unit.unit_name_en && (
                    <span
                      className={cn(
                        "block text-[10px] font-sans",
                        isActive ? "text-primary-foreground/85" : "text-muted-foreground",
                      )}
                    >
                      {unit.unit_name_en}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="lg:col-span-3 border border-border/60 bg-card rounded-xl p-6 shadow-sm">
          {selectedUnit ? (
            <ManageUnitMarksDistribution
              key={selectedUnit.id}
              unitId={selectedUnit.id}
              unitName={selectedUnit.unit_name_bn || selectedUnit.unit_name_en || ""}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground font-bengali">
              অনুগ্রহ করে বামপাশ থেকে একটি ইউনিট নির্বাচন করুন।
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
