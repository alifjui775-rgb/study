import { useState, useEffect } from "react";
import { X, ArrowUp, Filter, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getFilters,
  setFilters,
  GROUP_IDS,
  type GroupFilterState,
} from "@/lib/syllabus-filter-store";
import {
  getProgressMode,
  setProgressMode,
  onProgressModeChange,
  type ProgressMode,
} from "@/lib/progress-mode-store";

const PROGRESS_MODE_OPTIONS: { value: ProgressMode; label: string }[] = [
  { value: "mixed", label: "টাস্ক + টপিক" },
  { value: "task", label: "শুধু টাস্ক" },
  { value: "topic", label: "শুধু টপিক" },
];

export default function SyllabusFloatingDock() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [filters, setFiltersState] = useState<GroupFilterState>(getFilters);
  const [progressMode, setProgressModeState] = useState<ProgressMode>(getProgressMode);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    return onProgressModeChange(() => setProgressModeState(getProgressMode()));
  }, []);

  const handleFilterChange = (id: string, checked: boolean) => {
    const next = { ...filters, [id]: checked };
    setFiltersState(next);
    setFilters(next);
  };

  return (
    <div
      className={`fixed bottom-20 right-3 md:bottom-8 md:right-8 z-[60] flex flex-col md:flex-row items-center rounded-full transition-all duration-500 ease-out ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md border border-border shadow-xl p-1.5 md:p-2"
          : "bg-transparent border-transparent shadow-none p-0"
      }`}
    >
      {/* Back-to-top button (visible after scroll) */}
      <div
        className={`flex flex-col md:flex-row items-center overflow-hidden transition-all duration-500 ease-out origin-bottom md:origin-right ${
          isScrolled
            ? "opacity-100 scale-100 max-h-[100px] md:max-w-[150px] mb-1.5 md:mb-0 md:mr-2"
            : "opacity-0 scale-50 max-h-0 md:max-h-[100px] max-w-[150px] md:max-w-0 pointer-events-none mb-0 md:mr-0"
        }`}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all bg-primary/10 text-primary hover:bg-primary/20"
          aria-label="Back to top"
        >
          <ArrowUp className="w-[18px] h-[18px] md:w-5 md:h-5" />
        </button>
        <div className="shrink-0 bg-border w-[22px] h-[1px] mt-1.5 md:w-[1px] md:h-6 md:mt-0 md:ml-2" />
      </div>

      {/* Primary Menu Button */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            className={`shrink-0 rounded-full p-0 flex items-center justify-center transition-all duration-500 bg-primary text-primary-foreground hover:bg-background hover:border hover:border-primary hover:text-primary ${
              isScrolled ? "w-9 h-9 md:w-10 md:h-10 shadow-sm" : "w-12 h-12 shadow-xl"
            }`}
            aria-label="Toggle Filter Menu"
          >
            {menuOpen ? (
              <X className="w-[18px] h-[18px] md:w-5 md:h-5" />
            ) : (
              <Filter className="w-[18px] h-[18px] md:w-5 md:h-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          avoidCollisions={true}
          collisionPadding={16}
          className="w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-xs z-[100] max-h-[65vh] md:max-h-[70vh] overflow-y-auto overscroll-contain shadow-2xl rounded-2xl p-4 font-bengali"
        >
          <Card className="border-none shadow-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bengali">
                <Filter size={20} />
                ফিল্টার
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Group filters */}
              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`grp-${GROUP_IDS.science}`}
                    checked={!!filters[GROUP_IDS.science]}
                    onCheckedChange={(checked) => handleFilterChange(GROUP_IDS.science, !!checked)}
                  />
                  <Label
                    htmlFor={`grp-${GROUP_IDS.science}`}
                    className="font-bengali text-base cursor-pointer"
                  >
                    বিজ্ঞান
                  </Label>
                </div>
                <div className="flex items-center space-x-2 pl-6 mt-2">
                  <Checkbox
                    id="ucS"
                    checked={!!filters["ucS"]}
                    onCheckedChange={(c) => handleFilterChange("ucS", !!c)}
                  />
                  <Label
                    htmlFor="ucS"
                    className="font-bengali text-sm text-muted-foreground cursor-pointer"
                  >
                    ইউনিট চেঞ্জ
                  </Label>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`grp-${GROUP_IDS.arts}`}
                    checked={!!filters[GROUP_IDS.arts]}
                    onCheckedChange={(checked) => handleFilterChange(GROUP_IDS.arts, !!checked)}
                  />
                  <Label
                    htmlFor={`grp-${GROUP_IDS.arts}`}
                    className="font-bengali text-base cursor-pointer"
                  >
                    মানবিক
                  </Label>
                </div>
                <div className="flex items-center space-x-2 pl-6 mt-2">
                  <Checkbox
                    id="ucA"
                    checked={!!filters["ucA"]}
                    onCheckedChange={(c) => handleFilterChange("ucA", !!c)}
                  />
                  <Label
                    htmlFor="ucA"
                    className="font-bengali text-sm text-muted-foreground cursor-pointer"
                  >
                    ইউনিট চেঞ্জ
                  </Label>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`grp-${GROUP_IDS.commerce}`}
                    checked={!!filters[GROUP_IDS.commerce]}
                    onCheckedChange={(checked) => handleFilterChange(GROUP_IDS.commerce, !!checked)}
                  />
                  <Label
                    htmlFor={`grp-${GROUP_IDS.commerce}`}
                    className="font-bengali text-base cursor-pointer"
                  >
                    ব্যবসা
                  </Label>
                </div>
                <div className="flex items-center space-x-2 pl-6 mt-2">
                  <Checkbox
                    id="ucC"
                    checked={!!filters["ucC"]}
                    onCheckedChange={(c) => handleFilterChange("ucC", !!c)}
                  />
                  <Label
                    htmlFor="ucC"
                    className="font-bengali text-sm text-muted-foreground cursor-pointer"
                  >
                    ইউনিট চেঞ্জ
                  </Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mixed"
                  checked={!!filters["mixed"]}
                  onCheckedChange={(c) => handleFilterChange("mixed", !!c)}
                />
                <Label htmlFor="mixed" className="font-bengali text-base cursor-pointer">
                  বিভাগ উন্মুক্ত
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="secondTime"
                  checked={!!filters["secondTime"]}
                  onCheckedChange={(c) => handleFilterChange("secondTime", !!c)}
                />
                <Label htmlFor="secondTime" className="font-bengali text-base cursor-pointer">
                  সেকেন্ড টাইম
                </Label>
              </div>

              <hr className="border-border/60" />

              {/* Progress Management */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <ListChecks size={18} className="text-primary" />
                  <p className="font-semibold font-bengali text-base">প্রোগ্রেস ম্যানেজমেন্ট</p>
                </div>
                <RadioGroup
                  value={progressMode}
                  onValueChange={(v) => {
                    setProgressModeState(v as ProgressMode);
                    setProgressMode(v as ProgressMode);
                  }}
                  className="gap-2.5"
                >
                  {PROGRESS_MODE_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} />
                      <Label
                        htmlFor={`pm-${opt.value}`}
                        className="font-bengali text-sm cursor-pointer"
                      >
                        {opt.label}
                        {opt.value === "mixed" && (
                          <span className="text-[10px] text-muted-foreground ml-1.5">(ডিফল্ট)</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
