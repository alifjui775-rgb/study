import {
  Menu,
  X,
  ArrowUp,
  Blocks,
  University,
  Leaf,
  Cog,
  Atom,
  HeartPulse,
  Sparkles,
  Book,
  Building,
  Pen,
  BookOpen,
} from "lucide-react";
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface QbFloatingDockProps {
  isScrolled: boolean;
}

const menuItems = [
  { id: "master-question-bank", label: "মাস্টার প্রশ্নব্যাংক", Icon: Book },
  { id: "cluster-system", label: "গুচ্ছ", Icon: Blocks },
  { id: "medical", label: "মেডিকেল", Icon: HeartPulse },
  { id: "general", label: "সাধারণ", Icon: University },
  { id: "science-and-technology", label: "বিজ্ঞান ও প্রযুক্তি", Icon: Atom },
  { id: "engineering", label: "ইঞ্জিনিয়ারিং", Icon: Cog },
  { id: "special", label: "বিশেষ", Icon: Sparkles },
  { id: "islamic", label: "ইসলামিক", Icon: BookOpen },
  { id: "agriculture", label: "কৃষি", Icon: Leaf },
  { id: "affiliated", label: "অধিভুক্ত", Icon: University },
  { id: "private", label: "প্রাইভেট", Icon: Building },
  { id: "test-papers", label: "টেস্ট পেপার (HSC)", Icon: Pen },
];

const QbFloatingDock: React.FC<QbFloatingDockProps> = ({ isScrolled }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
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

        {/* Responsive Divider: Horizontal on mobile, Vertical on desktop */}
        <div className="shrink-0 bg-border w-[22px] h-[1px] mt-1.5 md:w-[1px] md:h-6 md:mt-0 md:ml-2" />
      </div>

      {/* Primary Button (Always Visible) */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-500 bg-primary text-primary-foreground hover:bg-background hover:border hover:border-primary hover:text-primary ${
              isScrolled
                ? "w-9 h-9 md:w-10 md:h-10 shadow-sm"
                : "w-12 h-12 md:w-14 md:h-14 shadow-xl"
            } ${menuOpen ? "bg-primary/90" : ""}`}
            title="বিভাগ তালিকা"
            aria-label="বিভাগ তালিকা"
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
            বিভাগে যান
          </div>
          <div className="flex flex-col gap-1">
            {menuItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setMenuOpen(false);
                  scrollToSection(id);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-900 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-left group dark:text-foreground dark:hover:text-primary"
              >
                <Icon className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors shrink-0 dark:text-muted-foreground" />
                <span className="font-semibold text-black truncate dark:text-white">{label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default QbFloatingDock;
