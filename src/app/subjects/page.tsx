// =============================================================================
// All Subjects Review Listing Page — /subjects
// Displays a grouped grid of degree programs / subjects by faculty.
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import SharedPageHeader from "@/components/common/SharedPageHeader";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileText,
  List,
  X,
  ArrowUp,
  Cpu,
  Dna,
  Pill,
  Atom,
  Sprout,
  Globe,
  Scale,
  Users,
  Briefcase,
  GraduationCap,
  Palette,
  Folder,
} from "lucide-react";

const facultyIcons: Record<string, React.ElementType> = {
  "প্রকৌশল ও প্রযুক্তি অনুষদ": Cpu,
  "জীববিজ্ঞান অনুষদ": Dna,
  "ফার্মেসি অনুষদ": Pill,
  "বিজ্ঞান অনুষদ": Atom,
  "কৃষি ও পশুচিকিৎসা বিজ্ঞান অনুষদ": Sprout,
  "আর্থ অ্যান্ড এনভায়রনমেন্টাল সায়েন্সেস / ভূ-বিজ্ঞান অনুষদ": Globe,
  "আইন অনুষদ": Scale,
  "সামাজিক বিজ্ঞান অনুষদ": Users,
  "ব্যবসায় শিক্ষা অনুষদ": Briefcase,
  "ইনস্টিটিউট ও শিক্ষা বিভাগ": GraduationCap,
  "কলা অনুষদ": Palette,
  অন্যান্য: Folder,
};

// ─── Data Interface ───────────────────────────────────────────────────────────
export interface ReviewedSubject {
  slug: string;
  short_name: string | null;
  full_name_en: string;
  full_name_bn: string | null;
  lucide_icon_name: string | null;
  faculties: any;
}

// ─── Faculty Sort Order ───────────────────────────────────────────────────────
const facultyOrder = [
  "প্রকৌশল ও প্রযুক্তি অনুষদ",
  "জীববিজ্ঞান অনুষদ",
  "ফার্মেসি অনুষদ",
  "বিজ্ঞান অনুষদ",
  "কৃষি ও পশুচিকিৎসা বিজ্ঞান অনুষদ",
  "আর্থ অ্যান্ড এনভায়রনমেন্টাল সায়েন্সেস / ভূ-বিজ্ঞান অনুষদ",
  "আইন অনুষদ",
  "সামাজিক বিজ্ঞান অনুষদ",
  "ব্যবসায় শিক্ষা অনুষদ",
  "ইনস্টিটিউট ও শিক্ষা বিভাগ",
  "কলা অনুষদ",
];

function sortFacultyKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ai = facultyOrder.indexOf(a);
    const bi = facultyOrder.indexOf(b);
    const aIdx = ai === -1 ? Infinity : ai;
    const bIdx = bi === -1 ? Infinity : bi;
    return aIdx - bIdx;
  });
}

// ─── Supabase Query Function ──────────────────────────────────────────────────
export const fetchReviewedDegreePrograms = async (): Promise<ReviewedSubject[]> => {
  try {
    const { data, error } = await supabase
      .from("degree_programs")
      .select(`
        slug, short_name, full_name_en, full_name_bn, lucide_icon_name,
        faculties ( name_bn )
      `)
      .is("deleted_at", null)
      .not("review", "is", null)
      .neq("review", "")
      .order("full_name_en", { ascending: true });

    if (error) {
      console.error("Error fetching degree programs:", error);
      return [];
    }

    return (data || []) as ReviewedSubject[];
  } catch (err) {
    console.error("Unexpected error fetching degree programs:", err);
    return [];
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract the faculty name from the Supabase join result. */
function getFacultyName(item: ReviewedSubject): string | null {
  const f = item.faculties;
  if (!f) return null;
  if (!Array.isArray(f) && typeof f.name_bn === "string" && f.name_bn) return f.name_bn;
  if (Array.isArray(f) && f[0]?.name_bn) return f[0].name_bn;
  return null;
}

// ─── Grouping Helper ──────────────────────────────────────────────────────────
function groupByFaculty(subjects: ReviewedSubject[]): Record<string, ReviewedSubject[]> {
  return subjects.reduce<Record<string, ReviewedSubject[]>>((acc, item) => {
    const facultyName = getFacultyName(item) || "অন্যান্য";
    if (!acc[facultyName]) acc[facultyName] = [];
    acc[facultyName].push(item);
    return acc;
  }, {});
}

// ─── Scroll Helper ────────────────────────────────────────────────────────────
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SubjectsGridSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 3 }).map((_, gi) => (
        <div key={gi}>
          <div className="mx-auto h-8 w-40 bg-muted rounded-full mb-6 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border p-6 flex flex-col items-center space-y-3 animate-pulse"
              >
                <div className="w-16 h-16 rounded-full bg-muted" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State Component ────────────────────────────────────────────────────
function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-10 sm:p-16 text-center my-8 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-4">
        <FileText className="h-8 w-8" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 font-bengali">
        {isSearching ? "কোনো সাবজেক্ট খুঁজে পাওয়া যায়নি" : "খুব শিগগিরই সাবজেক্ট রিভিউ যুক্ত করা হবে..."}
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto font-bengali">
        {isSearching
          ? "অন্য কোনো নাম লিখে অনুসন্ধান করার চেষ্টা করুন।"
          : "আমাদের টিম নতুন সাবজেক্ট রিভিউ তৈরিতে কাজ করছে। আপডেট পেতে সাথেই থাকুন।"}
      </p>
    </div>
  );
}

// ─── Main Subjects Listing Page ───────────────────────────────────────────────
export default function AllSubjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const {
    data: subjects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["reviewed-degree-programs"],
    queryFn: fetchReviewedDegreePrograms,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Client-side filter
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return subjects;
    return subjects.filter((subject) => {
      const nameEn = (subject.full_name_en || "").toLowerCase();
      const nameBn = (subject.full_name_bn || "").toLowerCase();
      const shortName = (subject.short_name || "").toLowerCase();
      const facultyName = (getFacultyName(subject) || "").toLowerCase();
      return (
        nameEn.includes(q) || nameBn.includes(q) || shortName.includes(q) || facultyName.includes(q)
      );
    });
  }, [subjects, searchQuery]);

  // Group filtered subjects by faculty, then sort by predefined order
  const sortedGroupEntries = useMemo(() => {
    const grouped = groupByFaculty(filteredSubjects);
    const sortedKeys = sortFacultyKeys(Object.keys(grouped));
    return sortedKeys.map((key) => [key, grouped[key]] as const);
  }, [filteredSubjects]);

  // Available faculties for the nav menu (only those present in data)
  const navFaculties = useMemo(
    () => sortedGroupEntries.map(([name]) => name),
    [sortedGroupEntries],
  );

  return (
    <>
      <Helmet>
        <title>সাবজেক্ট রিভিউ — Subject Reviews</title>
        <meta
          name="description"
          content="বিশ্ববিদ্যালয়ের বিভিন্ন বিষয় ও অনুষদের ক্যারিয়ার সম্ভাবনা, সিলেবাস ও জব মার্কেট সম্পর্কে বিস্তারিত রিভিউ দেখুন।"
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Header />

        <main className="grow container mx-auto px-2 lg:px-44 pt-8 sm:pt-12 font-bengali pb-12">
          {/* ── Hero Header ── */}
          <SharedPageHeader
            title="সাবজেক্ট রিভিউ"
            description="বিশ্ববিদ্যালয়ের বিভিন্ন বিষয় ও ডিগ্রির ক্যারিয়ার সম্ভাবনা, সিলেবাস ও চাকরির সুযোগ সম্পর্কে জেনে নিন এবং নিজের জন্য সঠিক বিষয়টি বেছে নিন"
            placeholder="সাবজেক্টের নাম অনুসন্ধান করুন (যেমন: Botany, CSE)..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* ── Content ── */}
          <div className="mt-12">
            {isLoading ? (
              <SubjectsGridSkeleton />
            ) : isError ? (
              <EmptyState isSearching={false} />
            ) : filteredSubjects.length === 0 ? (
              <EmptyState isSearching={searchQuery.trim().length > 0} />
            ) : (
              <div className="space-y-10">
                {sortedGroupEntries.map(([facultyName, items]) => (
                  <section key={facultyName} id={facultyName} className="scroll-mt-24 mb-12">
                    {/* Faculty Section Header — Gradient Pill with Icon */}
                    <div className="mx-auto gradient-background text-primary-foreground px-6 py-2.5 rounded-full w-fit font-semibold mb-8 shadow-sm flex items-center justify-center gap-2.5">
                      {(() => {
                        const Icon = facultyIcons[facultyName] || Folder;
                        return <Icon className="w-5 h-5 shrink-0" />;
                      })()}
                      <h2 className="font-semibold text-base sm:text-lg text-center leading-tight">
                        {facultyName}
                      </h2>
                    </div>

                    {/* Subject Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {items.map((subject) => (
                        <Link
                          key={subject.slug}
                          to={`/subjects/${subject.slug}`}
                          className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer text-center group dark:bg-card dark:border-border"
                        >
                          {/* Icon Circle */}
                          <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 dark:group-hover:bg-primary/20 transition-colors">
                            <DynamicIcon
                              iconName={subject.lucide_icon_name}
                              className="w-8 h-8 text-primary"
                            />
                          </div>

                          {/* Bengali Name */}
                          <h3 className="font-bold text-gray-900 dark:text-foreground mb-1 font-bengali line-clamp-2">
                            {subject.full_name_bn || subject.full_name_en}
                          </h3>

                          {/* English Name (only if Bengali exists) */}
                          {subject.full_name_bn && (
                            <p className="text-sm text-gray-500 dark:text-muted-foreground mb-1 line-clamp-1">
                              {subject.full_name_en}
                            </p>
                          )}

                          {/* Short Name */}
                          {subject.short_name && (
                            <p className="text-xs text-gray-400 dark:text-muted-foreground/70 font-medium">
                              ({subject.short_name})
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* ── Progressive Floating Dock (Bi-directional) ── */}
      {!isLoading && navFaculties.length > 0 && (
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
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-500 bg-primary text-primary-foreground hover:bg-background hover:border hover:border-primary hover:text-primary ${
                  isScrolled
                    ? "w-9 h-9 md:w-10 md:h-10 shadow-sm"
                    : "w-12 h-12 md:w-14 md:h-14 shadow-xl"
                } ${isMenuOpen ? "bg-primary/90" : ""}`}
                title="অনুষদ তালিকা"
                aria-label="অনুষদ তালিকা"
              >
                {isMenuOpen ? (
                  <X
                    className={`transition-all duration-500 ${
                      isScrolled ? "w-[18px] h-[18px] md:w-5 md:h-5" : "w-6 h-6"
                    }`}
                  />
                ) : (
                  <List
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
                অনুষদে যান
              </div>
              <div className="flex flex-col gap-1">
                {navFaculties.map((name) => {
                  const Icon = facultyIcons[name] || Folder;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setIsMenuOpen(false);
                        scrollToSection(name);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-900 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-left group dark:text-foreground dark:hover:text-primary"
                    >
                      <Icon className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors shrink-0 dark:text-muted-foreground" />
                      <span className="font-semibold text-black truncate dark:text-white">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  );
}
