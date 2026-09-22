// =============================================================================
// FloatingMenu — Right-edge hamburger menu (legacy match)
// =============================================================================

import { useState } from "react";
import type { UnitWithDetails } from "@/lib/university-types";
import {
  Menu,
  X,
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

interface Props {
  units: UnitWithDetails[];
  hasCirculars: boolean;
  hasLinks: boolean;
  hasGeneralInfo: boolean;
  hasHistory: boolean;
  hasMap: boolean;
}

type NavItem = { id: string; label: string; icon: React.ReactNode };

export default function FloatingMenu({ hasCirculars, hasLinks, hasHistory, hasMap }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [];

  if (hasLinks) {
    navItems.push({
      id: "Links",
      label: "গুরুত্বপূর্ণ কিছু লিংক একত্রে",
      icon: <Link2 className="mr-2 h-4 w-4" />,
    });
  }
  if (hasCirculars) {
    navItems.push({ id: "Circular", label: "সার্কুলার", icon: <FileText className="mr-2 h-4 w-4" /> });
  }
  navItems.push({
    id: "QuestionBank",
    label: "প্রশ্নব্যাংক",
    icon: <BookOpen className="mr-2 h-4 w-4" />,
  });
  navItems.push({ id: "Apply", label: "আবেদন", icon: <SquarePen className="mr-2 h-4 w-4" /> });
  navItems.push({ id: "AdmitCard", label: "প্রবেশপত্র", icon: <Ticket className="mr-2 h-4 w-4" /> });
  navItems.push({
    id: "ExamDate",
    label: "পরীক্ষার সময়কাল",
    icon: <Timer className="mr-2 h-4 w-4" />,
  });
  navItems.push({
    id: "Location",
    label: "ভর্তি পরীক্ষার কেন্দ্র",
    icon: <MapPin className="mr-2 h-4 w-4" />,
  });
  navItems.push({
    id: "MarkDistribution",
    label: "মানবণ্টন ও অন্যান্য তথ্য",
    icon: <Info className="mr-2 h-4 w-4" />,
  });
  navItems.push({
    id: "Result",
    label: "ভর্তি পরীক্ষার ফলাফল",
    icon: <BarChart3 className="mr-2 h-4 w-4" />,
  });
  navItems.push({
    id: "Subjects",
    label: "সাবজেক্ট প্রতি সিট সংখ্যা",
    icon: <Users className="mr-2 h-4 w-4" />,
  });

  if (hasHistory || hasMap) {
    navItems.push({
      id: "History",
      label: "একনজরে বিশ্ববিদ্যালয়",
      icon: <Info className="mr-2 h-4 w-4" />,
    });
  }

  const scrollTo = (id: string) => {
    setIsOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  return (
    <div className="fixed top-1/2 right-0 transform -translate-y-1/2 z-50">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none border border-transparent hover:bg-background hover:text-primary hover:border-primary bg-primary/90 text-primary-foreground rounded-l-full rounded-r-none h-12 w-12 p-0 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Dropdown menu */}
      <div
        className={`absolute right-full top-1/2 -translate-y-1/2 w-64 max-w-[calc(100vw-3rem)] max-h-[75vh] overflow-y-auto overscroll-contain bg-card border border-border rounded-lg shadow-lg p-2.5 transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-x-4 pointer-events-none"
        }`}
      >
        {navItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className="w-full p-2 text-foreground hover:bg-accent rounded-md transition-transform duration-200 ease-in-out flex items-center text-left font-bengali text-sm"
            style={{
              transitionDelay: `${idx * 30}ms`,
              transform: isOpen ? "translateX(0)" : "translateX(20px)",
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
