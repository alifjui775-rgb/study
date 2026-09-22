import { useState, useEffect, useMemo } from "react";
import {
  Menu,
  X,
  ArrowUp,
  Link2,
  FileText,
  BookOpen,
  SquarePen,
  Ticket,
  Timer,
  MapPin,
  Info,
  BarChart3,
  Users,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Batch } from "@/lib/university-types";

interface Props {
  hasCirculars: boolean;
  hasLinks: boolean;
  hasGeneralInfo: boolean;
  hasHistory: boolean;
  hasMap: boolean;
  availableBatches?: Batch[];
  selectedBatchFilter?: string;
  onBatchFilterChange?: (batchId: string) => void;
}

type NavItem = { id: string; label: string; Icon: React.ElementType };

export default function UniversityFloatingDock({
  hasCirculars,
  hasLinks,
  hasHistory,
  hasMap,
  availableBatches = [],
  selectedBatchFilter = "all",
  onBatchFilterChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems: NavItem[] = [];

  if (hasLinks) {
    navItems.push({ id: "Links", label: "গুরুত্বপূর্ণ কিছু লিংক", Icon: Link2 });
  }
  if (hasHistory || hasMap) {
    navItems.push({ id: "History", label: "একনজরে প্রতিষ্ঠান", Icon: Info });
  }
  if (hasCirculars) {
    navItems.push({ id: "Circular", label: "সার্কুলার", Icon: FileText });
  }
  navItems.push({ id: "QuestionBank", label: "প্রশ্নব্যাংক", Icon: BookOpen });
  navItems.push({ id: "Apply", label: "আবেদন", Icon: SquarePen });
  navItems.push({ id: "AdmitCard", label: "প্রবেশপত্র", Icon: Ticket });
  navItems.push({ id: "ExamDate", label: "পরীক্ষার সময়কাল", Icon: Timer });
  navItems.push({ id: "Location", label: "ভর্তি পরীক্ষার কেন্দ্র", Icon: MapPin });
  navItems.push({ id: "MarkDistribution", label: "মানবণ্টন ও অন্যান্য তথ্য", Icon: Info });
  navItems.push({ id: "Result", label: "ভর্তি পরীক্ষার ফলাফল", Icon: BarChart3 });
  navItems.push({ id: "Subjects", label: "সাবজেক্ট প্রতি সিট সংখ্যা", Icon: Users });

  const batchOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [{ id: "all", label: "পুরনো ও নতুন ব্যাচ একত্রে" }];

    const current = availableBatches?.find((b) => b.is_current) || availableBatches?.[0];
    const currentYear = current?.year || new Date().getFullYear();

    const currentBatchName = current?.name || `HSC-${String(currentYear).slice(-2)}`;
    options.push({
      id: current?.id || `batch-${currentYear}`,
      label: `শুধু ${currentBatchName} ব্যাচ`,
    });

    const nonCurrent = (availableBatches || [])
      .filter((b) => !current || b.id !== current.id)
      .sort((a, b) => b.year - a.year);

    const prev1 = nonCurrent[0];
    const prev1Year = currentYear - 1;
    const prev1Name = prev1?.name || `HSC-${String(prev1Year).slice(-2)}`;
    options.push({
      id: prev1?.id || `batch-${prev1Year}`,
      label: `শুধু ${prev1Name} ব্যাচ`,
    });

    const prev2 = nonCurrent[1];
    const prev2Year = currentYear - 2;
    const prev2Name = prev2?.name || `HSC-${String(prev2Year).slice(-2)}`;
    options.push({
      id: prev2?.id || `batch-${prev2Year}`,
      label: `শুধু ${prev2Name} ব্যাচ`,
    });

    return options;
  }, [availableBatches]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  return (
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

        {/* Responsive Divider */}
        <div className="shrink-0 bg-border w-[22px] h-[1px] mt-1.5 md:w-[1px] md:h-6 md:mt-0 md:ml-2" />
      </div>

      {/* Primary Menu Button */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-500 bg-primary text-primary-foreground hover:bg-background hover:border hover:border-primary hover:text-primary ${
              isScrolled
                ? "w-9 h-9 md:w-10 md:h-10 shadow-sm"
                : "w-12 h-12 md:w-14 md:h-14 shadow-xl"
            } ${menuOpen ? "bg-primary/90" : ""}`}
            title="মেনু"
            aria-label="মেনু"
          >
            {menuOpen ? (
              <X
                className={`transition-all duration-500 ${
                  isScrolled ? "w-[18px] h-[18px] md:w-5 md:h-5" : "w-6 h-6"
                }`}
              />
            ) : (
              <Menu
                className={`transition-all duration-500 ${
                  isScrolled ? "w-[18px] h-[18px] md:w-5 md:h-5" : "w-6 h-6"
                }`}
              />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          avoidCollisions={true}
          collisionPadding={16}
          className="w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-xs z-[100] max-h-[65vh] md:max-h-[70vh] overflow-y-auto overscroll-contain shadow-2xl rounded-2xl p-4 font-bengali"
        >
          <div className="px-2 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            নেভিগেশন
          </div>
          <div className="flex flex-col gap-1">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-900 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-left group dark:text-foreground dark:hover:text-primary"
              >
                <Icon className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors shrink-0 dark:text-muted-foreground" />
                <span className="font-semibold text-black truncate dark:text-white">{label}</span>
              </button>
            ))}
          </div>

          {onBatchFilterChange && (
            <>
              <div className="my-2.5 border-t border-border" />
              <div className="px-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                সেটিংস
              </div>
              <div className="flex flex-col gap-1 px-1">
                {batchOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 text-xs sm:text-sm font-medium font-bengali text-foreground cursor-pointer hover:bg-primary/5 rounded-md transition-colors"
                  >
                    <input
                      type="radio"
                      name="batch_filter"
                      value={opt.id}
                      checked={selectedBatchFilter === opt.id}
                      onChange={() => onBatchFilterChange(opt.id)}
                      className="h-4 w-4 text-primary border-primary focus:ring-primary accent-primary shrink-0"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
