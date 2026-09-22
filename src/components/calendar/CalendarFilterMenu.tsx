import { Button } from "@/components/ui/button";
import { Menu, X, Filter, Cog, ArrowUp } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CalendarFilterMenuProps {
  onFilterChange: (filters: { [key: string]: boolean }) => void;
  initialFilters: { [key: string]: boolean };
  activeTab?: string;
}

const filterOptions = [
  {
    id: "science",
    label: "বিজ্ঞান",
    unitChangeId: "ucS",
    unitChangeLabel: "ইউনিট চেঞ্জ",
  },
  {
    id: "arts",
    label: "মানবিক",
    unitChangeId: "ucA",
    unitChangeLabel: "ইউনিট চেঞ্জ",
  },
  {
    id: "commerce",
    label: "ব্যবসা",
    unitChangeId: "ucC",
    unitChangeLabel: "ইউনিট চেঞ্জ",
  },
  { id: "mixed", label: "বিভাগ উন্মুক্ত" },
  { id: "secondTime", label: "সেকেন্ড টাইম" },
];

const toolOptions = [
  { id: "showColorCode", label: "কালার কোড" },
  { id: "showSeconds", label: "সেকেন্ড দেখান" },
];

const CalendarFilterMenu: React.FC<CalendarFilterMenuProps> = ({
  onFilterChange,
  initialFilters,
  activeTab = "schedule",
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFilterChange = (id: string, checked: boolean) => {
    const newFilters = { ...filters, [id]: checked };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const visibleToolOptions = toolOptions.filter(
    (option) => !(option.id === "showColorCode" && activeTab !== "schedule"),
  );

  return (
    <>
      <div
        className={`fixed bottom-20 right-3 md:bottom-8 md:right-8 z-[60] flex flex-col md:flex-row items-center rounded-full transition-all duration-500 ease-out ${
          isScrolled
            ? "bg-background/95 backdrop-blur-md border border-border shadow-xl p-1.5 md:p-2"
            : "bg-transparent border-transparent shadow-none p-0"
        }`}
      >
        {/* Animated Section (Up on mobile, Left on desktop) */}
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

        {/* Primary Menu Button (Always Visible) */}
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
                <Menu className="w-[18px] h-[18px] md:w-5 md:h-5" />
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
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bengali">
                  <Filter size={20} />
                  ফিল্টার
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                {filterOptions.map((option) => (
                  <div key={option.id}>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={filters[option.id]}
                        onCheckedChange={(checked) => handleFilterChange(option.id, !!checked)}
                      />
                      <Label htmlFor={option.id} className="font-bengali text-base">
                        {option.label}
                      </Label>
                    </div>
                    {option.unitChangeId && (
                      <div className="flex items-center space-x-2 pl-6 mt-2">
                        <Checkbox
                          id={option.unitChangeId}
                          checked={filters[option.unitChangeId]}
                          onCheckedChange={(checked) =>
                            handleFilterChange(option.unitChangeId, !!checked)
                          }
                        />
                        <Label
                          htmlFor={option.unitChangeId}
                          className="font-bengali text-sm text-muted-foreground"
                        >
                          {option.unitChangeLabel}
                        </Label>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
              <hr className="mx-4 border-border/50" />
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bengali">
                  <Cog size={20} />
                  টুলস
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                {visibleToolOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={filters[option.id]}
                      onCheckedChange={(checked) => handleFilterChange(option.id, !!checked)}
                    />
                    <Label htmlFor={option.id} className="font-bengali text-base">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default CalendarFilterMenu;
