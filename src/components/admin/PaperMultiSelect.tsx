import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CurriculumPaperOption } from "@/lib/master-qb-admin-types";

interface PaperMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  papers: CurriculumPaperOption[];
  isLoading?: boolean;
  disabled?: boolean;
}

const UNCATEGORIZED = "অন্যান্য";

export default function PaperMultiSelect({
  value,
  onChange,
  papers,
  isLoading,
  disabled,
}: PaperMultiSelectProps) {
  const [search, setSearch] = useState("");

  const selectedIds = value || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return papers;
    return papers.filter((p) =>
      [p.name_en, p.name_bn, p.short_code, p.discipline_name_bn]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [papers, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CurriculumPaperOption[]>();
    filtered.forEach((paper) => {
      const key = paper.discipline_name_bn || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(paper);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selectedPapers = useMemo(
    () => papers.filter((p) => selectedIds.includes(p.id)),
    [papers, selectedIds],
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((v) => v !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal hover:bg-background/80 active:scale-100 text-left font-bengali min-h-10 h-auto py-2"
        >
          {selectedIds.length === 0 ? (
            <span className="text-muted-foreground">পেপার নির্বাচন করুন</span>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-w-full">
              {selectedPapers.slice(0, 6).map((paper) => (
                <Badge
                  key={paper.id}
                  variant="secondary"
                  className="text-[10px] font-bengali shrink-0 px-2 py-0.5"
                >
                  {paper.name_bn || paper.name_en}
                </Badge>
              ))}
              {selectedIds.length > 6 && (
                <Badge variant="outline" className="text-[10px] shrink-0 px-2 py-0.5">
                  +{selectedIds.length - 6}
                </Badge>
              )}
            </div>
          )}
          <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border border-border rounded-xl shadow-lg z-[100]"
        align="start"
      >
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="পেপার খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 font-bengali"
            />
          </div>
        </div>

        <div
          className="max-h-64 overflow-y-auto overscroll-contain pr-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="p-3 space-y-4">
            {isLoading ? (
              <p className="text-xs text-muted-foreground font-bengali text-center py-6">
                লোড হচ্ছে...
              </p>
            ) : grouped.length === 0 ? (
              <p className="text-xs text-muted-foreground font-bengali text-center py-6">
                কোনো পেপার পাওয়া যায়নি।
              </p>
            ) : (
              grouped.map(([discipline, items]) => (
                <div key={discipline} className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold font-bengali px-1">
                    {discipline}
                  </p>
                  {items.map((paper) => {
                    const isChecked = selectedIds.includes(paper.id);
                    return (
                      <label
                        key={paper.id}
                        className="flex items-center gap-2.5 rounded-lg hover:bg-muted/40 p-1.5 -mx-1.5 cursor-pointer select-none transition-colors"
                      >
                        <Checkbox checked={isChecked} onCheckedChange={() => toggle(paper.id)} />
                        <span className="text-sm font-medium font-bengali text-foreground/90 flex-1 min-w-0 truncate">
                          {paper.name_bn || paper.name_en}
                        </span>
                        {paper.short_code && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {paper.short_code}
                          </span>
                        )}
                        {isChecked && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
