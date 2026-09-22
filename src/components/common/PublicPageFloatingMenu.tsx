import { Button } from "@/components/ui/button";
import {
  Menu,
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
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface PublicPageFloatingMenuProps {
  activeCategories?: string[];
}

const PublicPageFloatingMenu: React.FC<PublicPageFloatingMenuProps> = ({
  activeCategories: _activeCategories,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = location.pathname;

  const linkClasses = "block p-2 text-foreground hover:bg-accent rounded-md transition-colors";

  const baseMenuItems = [
    { href: "#cluster-system", label: "গুচ্ছ", Icon: Blocks },
    { href: "#medical", label: "মেডিকেল", Icon: HeartPulse },
    { href: "#general", label: "সাধারণ", Icon: University },
    {
      href: "#science-and-technology",
      label: "বিজ্ঞান ও প্রযুক্তি",
      Icon: Atom,
    },
    { href: "#engineering", label: "ইঞ্জিনিয়ারিং", Icon: Cog },
    { href: "#special", label: "বিশেষ", Icon: Sparkles },
    { href: "#islamic", label: "ইসলামিক", Icon: BookOpen },
    { href: "#agriculture", label: "কৃষি", Icon: Leaf },
    { href: "#affiliated", label: "অধিভুক্ত", Icon: University },
  ];

  let menuItems;

  if (pathname.startsWith("/qb") || pathname.startsWith("/question-bank")) {
    menuItems = [
      {
        href: "#master-question-bank",
        label: "মাস্টার প্রশ্নব্যাংক",
        Icon: Book,
      },
      ...baseMenuItems,
      { href: "#private", label: "প্রাইভেট", Icon: Building },
      { href: "#test-papers", label: "টেস্ট পেপার (HSC)", Icon: Pen },
    ];
  } else {
    menuItems = baseMenuItems;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setMenuOpen(false)} />
      )}
      <div ref={menuRef} className="fixed top-1/2 right-0 transform -translate-y-1/2 z-50">
        <Button
          onClick={() => setMenuOpen(!menuOpen)}
          className="bg-primary/90 text-primary-foreground rounded-l-full rounded-r-none h-12 w-12 p-0 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300"
          aria-label="Toggle Menu"
        >
          <Menu />
        </Button>
        <div
          className={cn(
            "absolute right-full top-1/2 -translate-y-1/2 w-64 max-w-[calc(100vw-3rem)] max-h-[75vh] overflow-y-auto overscroll-contain bg-card border border-border rounded-lg shadow-lg p-2.5 transition-all duration-300 ease-in-out",
            menuOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none",
          )}
        >
          {menuItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={cn(
                linkClasses,
                "transition-transform duration-200 ease-in-out flex items-center font-bengali",
              )}
              style={{
                transitionDelay: `${index * 30}ms`,
                transform: menuOpen ? "translateX(0)" : "translateX(20px)",
              }}
              onClick={() => setMenuOpen(false)}
            >
              <item.Icon className="mr-2 h-4 w-4" />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
};

export default PublicPageFloatingMenu;
