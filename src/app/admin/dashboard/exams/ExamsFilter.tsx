"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Loader2, X, ChevronDown, Search } from "lucide-react";

export interface FilterState {
  category_ids: string[];
  institution_ids: string[];
  paper_ids: string[];
  chapter_ids: string[];
  type_ids: string[];
  usage_status: "all" | "used" | "unused";
}

interface ExamsFilterProps {
  onFilterChange: (filters: FilterState) => void;
}

export default function ExamsFilter({ onFilterChange }: ExamsFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    category_ids: [],
    institution_ids: [],
    paper_ids: [],
    chapter_ids: [],
    type_ids: [],
    usage_status: "all",
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instSearch, setInstSearch] = useState("");

  // Fetch all options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoading(true);
      try {
        const [catRes, instRes, paperRes, chapRes, typeRes] = await Promise.all([
          supabase.from("institution_sub_categories").select("*"),
          supabase.from("universities").select("*"),
          supabase.from("curriculum_papers").select("*"),
          supabase
            .from("paper_chapters")
            .select("*")
            .order("serial", { ascending: true, nullsFirst: false }),
          supabase.from("question_types").select("*"),
        ]);

        if (catRes.data) setCategories(catRes.data);
        if (instRes.data) setInstitutions(instRes.data);
        if (paperRes.data) setPapers(paperRes.data);
        if (chapRes.data) setChapters(chapRes.data);
        if (typeRes.data) setTypes(typeRes.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  type ArrayFilterKey =
    | "category_ids"
    | "institution_ids"
    | "paper_ids"
    | "chapter_ids"
    | "type_ids";

  const handleToggle = (key: ArrayFilterKey, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const newArray = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return { ...prev, [key]: newArray };
    });
  };

  const handleClearFilters = () => {
    const reset: FilterState = {
      category_ids: [],
      institution_ids: [],
      paper_ids: [],
      chapter_ids: [],
      type_ids: [],
      usage_status: "all",
    };
    setFilters(reset);
    onFilterChange(reset);
  };

  const getName = (item: any) => {
    return item.name_bn || item.name_en || item.name || item.title || "Unknown";
  };

  const filteredChapters =
    filters.paper_ids.length > 0
      ? chapters.filter((c) => filters.paper_ids.includes(c.paper_id))
      : chapters;

  const filteredInstitutions = useMemo(() => {
    if (!instSearch.trim()) return institutions;
    const q = instSearch.toLowerCase();
    return institutions.filter(
      (inst) =>
        (inst.name_bn && inst.name_bn.toLowerCase().includes(q)) ||
        (inst.name_en && inst.name_en.toLowerCase().includes(q)) ||
        (inst.slug && inst.slug.toLowerCase().includes(q)) ||
        (inst.short_name_bn && inst.short_name_bn.toLowerCase().includes(q)) ||
        (inst.short_name_en && inst.short_name_en.toLowerCase().includes(q)),
    );
  }, [institutions, instSearch]);

  const hasAnyFilter =
    filters.category_ids.length > 0 ||
    filters.institution_ids.length > 0 ||
    filters.paper_ids.length > 0 ||
    filters.chapter_ids.length > 0 ||
    filters.type_ids.length > 0 ||
    filters.usage_status !== "all";

  const renderMultiSelect = (
    label: string,
    key: ArrayFilterKey,
    options: any[],
    placeholder: string,
  ) => {
    const selectedCount = filters[key].length;

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) {
              onFilterChange(filters);
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
              disabled={isLoading}
            >
              <span className="truncate flex-1 text-left">
                {selectedCount > 0 ? (
                  <span className="font-semibold text-primary">
                    {selectedCount} টি {label} নির্বাচিত
                  </span>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[220px] max-h-[300px] overflow-y-auto" align="start">
            {options.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.id}
                checked={filters[key].includes(opt.id)}
                onCheckedChange={() => handleToggle(key, opt.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {getName(opt)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderInstitutionSelect = () => {
    const selectedCount = filters.institution_ids.length;

    return (
      <div className="space-y-2">
        <Label>প্রতিষ্ঠান</Label>
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) {
              onFilterChange(filters);
              setInstSearch("");
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 px-3 font-normal"
              disabled={isLoading}
            >
              <span className="truncate flex-1 text-left">
                {selectedCount > 0 ? (
                  <span className="font-semibold text-primary">
                    {selectedCount} টি প্রতিষ্ঠান নির্বাচিত
                  </span>
                ) : (
                  <span className="text-muted-foreground">সব প্রতিষ্ঠান</span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[260px] p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="নাম দিয়ে খুঁজুন..."
                  value={instSearch}
                  onChange={(e) => setInstSearch(e.target.value)}
                  className="h-8 pl-7 text-xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {filteredInstitutions.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  কোনো প্রতিষ্ঠান পাওয়া যায়নি
                </div>
              ) : (
                filteredInstitutions.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.id}
                    checked={filters.institution_ids.includes(opt.id)}
                    onCheckedChange={() => handleToggle("institution_ids", opt.id)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex flex-col gap-0.5 py-2"
                  >
                    <span className="text-xs font-medium">{getName(opt)}</span>
                    {opt.slug && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {opt.slug}
                      </span>
                    )}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <Card className="bg-muted/30 mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
          {renderMultiSelect("ক্যাটাগরি", "category_ids", categories, "সব ক্যাটাগরি")}
          {renderInstitutionSelect()}
          {renderMultiSelect("পেপার", "paper_ids", papers, "সব পেপার")}
          {renderMultiSelect("অধ্যায়", "chapter_ids", filteredChapters, "সব অধ্যায়")}
          {renderMultiSelect("টাইপ", "type_ids", types, "সব টাইপ")}

          {/* Usage Status Filter */}
          <div className="space-y-2">
            <Label>ব্যবহারের অবস্থা</Label>
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) {
                  onFilterChange(filters);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-10 px-3 font-normal"
                  disabled={isLoading}
                >
                  <span className="truncate flex-1 text-left">
                    {filters.usage_status === "all" ? (
                      <span className="text-muted-foreground">সব অবস্থা</span>
                    ) : filters.usage_status === "used" ? (
                      <span className="font-semibold text-primary">ব্যবহৃত</span>
                    ) : (
                      <span className="font-semibold text-primary">অব্যবহৃত</span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]" align="start">
                <DropdownMenuCheckboxItem
                  checked={filters.usage_status === "all"}
                  onCheckedChange={() => {
                    setFilters((prev) => ({ ...prev, usage_status: "all" }));
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  সব অবস্থা
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.usage_status === "used"}
                  onCheckedChange={() => {
                    setFilters((prev) => ({ ...prev, usage_status: "used" }));
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  ব্যবহৃত (Used)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.usage_status === "unused"}
                  onCheckedChange={() => {
                    setFilters((prev) => ({ ...prev, usage_status: "unused" }));
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  অব্যবহৃত (Unused)
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Clear Filters Button */}
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground h-10"
            disabled={isLoading || !hasAnyFilter}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            ফিল্টার মুছুন
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
