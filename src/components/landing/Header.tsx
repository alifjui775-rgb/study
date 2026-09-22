import { memo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getStudyUser } from "@/lib/queries";
import { menuSections, headerIconMap } from "@/components/landing/menu-data";
import {
  BookOpen,
  CalendarDays,
  Home,
  ChevronDown,
  School,
  GraduationCap,
  Calculator,
  CheckCircle,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  FileText,
  LogIn,
  BookMarked,
  Shield,
  Database,
  ExternalLink,
  Grip,
  CalendarCheck,
  BarChart,
  Landmark,
  Building2,
  FileSignature,
  MessageSquareText,
} from "lucide-react";
import { ThemeToggle } from "../theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const icons: { [key: string]: React.ElementType } = {
  Home,
  BookOpen,
  CalendarDays,
  School,
  GraduationCap,
  Calculator,
  CheckCircle,
  BookMarked,
};

interface NavItemProps {
  item: {
    id: string;
    label: string;
    icon: string;
    href: string;
    subItems?: { id: string; label: string; icon: string; href: string }[];
  };
  isActive: boolean;
}

const NavItem = memo(function NavItem({ item, isActive }: NavItemProps) {
  const Icon = icons[item.icon];

  if (item.subItems) {
    const SubItemIcon = ({ name }: { name: string }) => {
      const IconComp = icons[name];
      return IconComp ? <IconComp size={16} /> : null;
    };
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "group relative flex cursor-pointer items-center justify-center rounded-full transition-colors duration-300",
              "h-9 focus-visible:outline-none",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground",
              "px-2 sm:px-3",
            )}
          >
            <div className="relative z-10 flex items-center">
              <div className="shrink-0">{Icon && <Icon size={18} />}</div>
              <div className={cn("ml-2 hidden sm:block", { "sm:block": isActive })}>
                <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
              </div>
              <ChevronDown
                size={16}
                className="ml-1 hidden shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block"
              />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="z-50">
          {item.subItems.map((subItem) => (
            <DropdownMenuItem key={subItem.id} asChild>
              <Link to={subItem.href} className="flex items-center gap-2 cursor-pointer w-full">
                <SubItemIcon name={subItem.icon} />
                <span>{subItem.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      to={item.href}
      aria-label={item.label}
      className={cn(
        "relative flex cursor-pointer items-center justify-center rounded-full transition-colors duration-300",
        "h-9 focus-visible:outline-none",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        "px-2 sm:px-3",
      )}
    >
      <div className="relative z-10 flex items-center">
        <div className="shrink-0">{Icon && <Icon size={18} />}</div>
        <div className={cn("ml-2 hidden sm:block", { "sm:block": isActive })}>
          <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
        </div>
      </div>
    </Link>
  );
});

export const Header = memo(function Header() {
  const { pathname } = useLocation();
  const { user, signOut, loginWithMnrId } = useAuth();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const { data: studyUser } = useQuery({
    queryKey: ["study-user-header", user?.uid],
    queryFn: () => getStudyUser(user!.uid),
    enabled: !!user?.uid,
    staleTime: 10 * 60 * 1000,
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "হোম", icon: "Home", href: "/" },
    {
      id: "calendar",
      label: "ক্যালেন্ডার",
      icon: "CalendarDays",
      href: "/calendar",
    },
    {
      id: "qb",
      label: "প্রশ্নব্যাংক",
      icon: "BookOpen",
      href: "/qb",
    },
    {
      id: "course",
      label: "কোর্স",
      icon: "GraduationCap",
      href: "/courses",
    },
  ];

  return (
    <header className="sticky top-2 z-40 w-full flex justify-center px-2 sm:px-0">
      <div
        className={cn(
          "flex items-center gap-x-1 rounded-full border border-border bg-card/70 dark:bg-card/60 backdrop-blur-lg p-1.5 shadow-lg transition-all duration-300 w-full sm:max-w-fit justify-between sm:justify-start",
        )}
      >
        <Link to="/" aria-label="হোমপেজে যান" className="group flex items-center pl-3 pr-2 shrink-0">
          <img
            src={import.meta.env.VITE_ICON_URL || "/icon.svg"}
            alt="Logo"
            className="h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 group-active:scale-95"
          />
          <span className="font-heading font-bold text-lg tracking-tight ml-1.5 text-foreground">
            Study
          </span>
        </Link>
        <div className="hidden sm:flex flex-grow items-center overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-x-1">
            <div className="h-6 w-px bg-border/50"></div>
            {navItems.map((item) => {
              let isActive = false;
              if (item.href === "/") {
                isActive = pathname === item.href;
              } else {
                isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              }
              return <NavItem key={item.id} item={item} isActive={isActive} />;
            })}

            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "group relative flex cursor-pointer items-center justify-center rounded-full transition-colors duration-300",
                    "h-9 focus-visible:outline-none",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    "px-2 sm:px-3",
                  )}
                >
                  <div className="relative z-10 flex items-center">
                    <div className="shrink-0">
                      <Grip size={18} />
                    </div>
                    <div className="ml-2 hidden sm:block">
                      <span className="whitespace-nowrap text-sm font-medium">মেনু</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className="ml-1 hidden shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block"
                    />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={8}
                className="w-fit min-w-[280px] rounded-2xl border-border bg-background px-2 py-3 shadow-xl z-[110]"
              >
                <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
                  {menuSections.map((section, sectionIndex) => (
                    <div key={section.title}>
                      {sectionIndex > 0 && <div className="border-t border-border mt-4" />}
                      <h3 className="text-xs font-bold text-muted-foreground px-2 mt-4 mb-2 tracking-wide">
                        {section.title}
                      </h3>
                      <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                        {section.items.map((item) => {
                          const Icon = headerIconMap[item.icon];
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setMenuOpen(false)}
                              className="flex flex-col items-center rounded-xl p-1.5 hover:bg-accent transition-colors"
                            >
                              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-muted/60 mb-1.5 text-muted-foreground">
                                {Icon && <Icon size={22} />}
                              </div>
                              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight text-foreground/80">
                                {item.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-border/50"></div>
        <div className="flex items-center gap-1.5 pl-1">
          <ThemeToggle />
          <div className="h-5 w-px bg-border/50"></div>

          {user ? (
            <>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 p-[1.5px] rounded-full bg-gradient-to-tr from-neutral-200 via-neutral-400/50 to-neutral-200 dark:from-neutral-800 dark:via-neutral-600/50 dark:to-neutral-800 shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <Avatar className="h-full w-full rounded-full">
                      {user.avatar_url && (
                        <AvatarImage
                          src={user.avatar_url}
                          alt={user.name}
                          className="rounded-full object-cover border border-background"
                        />
                      )}
                      <AvatarFallback className="rounded-full">
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 z-50" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Roll: {user.roll}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex items-center w-full">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>প্রোফাইল</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer flex items-center w-full">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>ড্যাশবোর্ড</span>
                    </Link>
                  </DropdownMenuItem>

                  {studyUser &&
                    (studyUser.is_admin || studyUser.is_instructor || studyUser.is_qb_user) && (
                      <>
                        <DropdownMenuSeparator />
                        {studyUser.is_admin && (
                          <DropdownMenuItem asChild>
                            <a
                              href="/admin/dashboard/"
                              className="cursor-pointer flex items-center w-full"
                            >
                              <Shield className="mr-2 h-4 w-4 text-primary" />
                              <span>এডমিন প্যানেল</span>
                            </a>
                          </DropdownMenuItem>
                        )}
                        {studyUser.is_instructor && (
                          <DropdownMenuItem asChild>
                            <a
                              href="/instructor/dashboard/"
                              className="cursor-pointer flex items-center w-full"
                            >
                              <GraduationCap className="mr-2 h-4 w-4 text-emerald-500" />
                              <span>ইন্সট্রাক্টর প্যানেল</span>
                            </a>
                          </DropdownMenuItem>
                        )}
                        {studyUser.is_qb_user && (
                          <DropdownMenuItem asChild>
                            <a
                              href="https://qb.mnr.bd/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer flex items-center w-full"
                            >
                              <Database className="mr-2 h-4 w-4 text-amber-500" />
                              <span>প্রশ্নব্যাংক প্যানেল</span>
                              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                            </a>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setLogoutDialogOpen(true);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>লগ আউট</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>লগ আউট করতে চান?</AlertDialogTitle>
                    <AlertDialogDescription>
                      আপনি সত্যিই লগ আউট করতে চান? আপনাকে আবার লগইন করতে হবে।
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={signOut}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      হ্যাঁ, লগ আউট
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:w-auto h-9 w-9 p-0 md:px-3 rounded-full cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <LogIn className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">লগইন</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[360px] sm:max-w-[380px] w-[calc(100%-2rem)] rounded-2xl bg-card border-border text-foreground p-7 shadow-2xl gap-0">
                <DialogHeader className="flex flex-col items-center justify-center text-center space-y-2 pb-6">
                  <DialogTitle className="text-2xl font-bold tracking-tight">লগইন করুন</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    আপনার পছন্দের পদ্ধতিতে লগইন করুন।
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <button
                    onClick={loginWithMnrId}
                    className="relative flex items-center justify-center w-full gap-3 py-3 px-4 bg-[#0f0f0f] border border-white/10 hover:bg-[#1a1a1a] transition-all duration-300 rounded-xl text-white font-medium text-base shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <img
                      src="/mnr.svg"
                      className="h-8 w-8 rounded-full overflow-hidden shrink-0"
                      alt="MNR ID"
                    />
                    <span className="font-sans tracking-wide text-[15px]">
                      Continue with MNR ID
                    </span>
                  </button>

                  <div className="flex items-center py-1">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="px-3 text-xs text-muted-foreground font-medium">অথবা</span>
                    <div className="flex-grow border-t border-border"></div>
                  </div>

                  <button className="flex items-center justify-center w-full gap-3 py-3 px-4 bg-transparent border border-border hover:bg-accent hover:text-accent-foreground transition-colors rounded-xl text-foreground font-medium text-base cursor-pointer">
                    <UserIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span>গেস্ট হিসেবে চালিয়ে যান</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                      শীঘ্রই
                    </span>
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
});
