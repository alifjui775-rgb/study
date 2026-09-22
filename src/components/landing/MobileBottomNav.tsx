import { memo, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, CalendarDays, BookOpen, GraduationCap, Grip } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { menuSections, headerIconMap } from "@/components/landing/menu-data";
import { getExamActive, subscribeExamActive } from "@/lib/exam-mode";

const navIconMap: { [key: string]: React.ElementType } = {
  Home,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Grip,
};

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const navItems: NavItem[] = [
  { id: "home", label: "হোম", icon: "Home", href: "/" },
  { id: "calendar", label: "ক্যালেন্ডার", icon: "CalendarDays", href: "/calendar" },
  { id: "qb", label: "প্রশ্নব্যাংক", icon: "BookOpen", href: "/qb" },
  { id: "course", label: "কোর্স", icon: "GraduationCap", href: "/courses" },
];

function getIsActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

interface MenuGridItemProps {
  to: string;
  icon: string;
  label: string;
  onClick?: () => void;
}

const MenuGridItem = memo(function MenuGridItem({ to, icon, label, onClick }: MenuGridItemProps) {
  const Icon = headerIconMap[icon];
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex flex-col items-center rounded-xl p-1.5 active:scale-95 transition-transform"
    >
      <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-full bg-muted/60 mb-1.5 text-muted-foreground">
        {Icon && <Icon size={22} />}
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight text-foreground/80">
        {label}
      </span>
    </Link>
  );
});

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [examActive, setExamActiveState] = useState(getExamActive);

  useEffect(() => {
    const unsub = subscribeExamActive(() => setExamActiveState(getExamActive()));
    return unsub;
  }, []);

  if (!location || !location.pathname) {
    return null;
  }

  const { pathname } = location;

  if (examActive) {
    return null;
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/instructor") ||
    pathname === "/graph" ||
    pathname.startsWith("/graph")
  ) {
    return null;
  }

  const isDeepCourseRoute = /^\/courses\/[^/]+\/.+/.test(pathname);
  if (isDeepCourseRoute) {
    return null;
  }

  return (
    <>
      <div className="h-[76px] md:hidden block w-full shrink-0" aria-hidden="true" />
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 dark:bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 border-t border-border flex justify-around items-center h-[68px] px-4 md:hidden pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = getIsActive(item, pathname);
          const Icon = navIconMap[item.icon];

          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {Icon && <Icon size={20} />}
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Grip size={20} />
              <span className="text-[9px] font-medium leading-tight">মেনু</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-fit min-w-[280px] rounded-2xl border-border bg-background px-2 py-3 shadow-xl z-[110]"
          >
            <div className="max-h-[60vh] overflow-y-auto pb-6 -mx-1 px-1">
              {menuSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {sectionIndex > 0 && <div className="border-t border-border mt-4" />}
                  <h3 className="text-xs font-bold text-muted-foreground px-2 mt-4 mb-2 tracking-wide">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                    {section.items.map((item) => (
                      <MenuGridItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        onClick={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </>
  );
});
