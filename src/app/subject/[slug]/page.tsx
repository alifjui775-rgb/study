// =============================================================================
// Subject Review Page — /subjects/:slug
// Renders a Subject / Degree Program's Tiptap HTML review content with a premium UI.
// =============================================================================

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { fetchDegreeProgramBySlug } from "@/lib/admin-crud-queries";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { DynamicIcon } from "@/components/DynamicIcon";
import {
  ExternalLink,
  BookOpen,
  ArrowLeft,
  FileText,
  Link2,
  Home,
  ChevronRight,
  User,
  Building2,
  Landmark,
  GraduationCap,
} from "lucide-react";

// ─── Helper: Format seat breakdown from subject_group_seats ───────────────────
function formatSeatBreakdown(
  seats: { seat_count: number; group: { name_en: string } | null }[] | null,
): string {
  if (!seats || seats.length === 0) return "";
  const parts = seats.filter((s) => s.group).map((s) => `${s.group!.name_en}: ${s.seat_count}`);
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}

// ─── Helper: Parse Credit info from HTML ──────────────────────────────────────
function parseReviewContent(htmlString: string | null | undefined): {
  cleanHtml: string;
  credit: string | null;
} {
  if (!htmlString || !htmlString.trim()) {
    return { cleanHtml: "", credit: null };
  }

  const rawHtml = htmlString.trim();

  // Match credit text in paragraphs (e.g. "Main Credit : মাহমুদ হাসান ফয়সাল (DU)")
  const creditRegex =
    /<p[^>]*>\s*(?:<(?:strong|b|em|i)[^>]*>)*\s*(?:Main\s+Credit|Credit|মূল\s+ক্রেডিট|ক্রেডিট)\s*[:：]\s*(.*?)(?:<\/(?:strong|b|em|i)>)*\s*<\/p>/i;

  const match = rawHtml.match(creditRegex);
  if (match) {
    const rawCredit = match[1].replace(/<[^>]+>/g, "").trim();
    const cleanHtml = rawHtml.replace(match[0], "").trim();
    return {
      cleanHtml: cleanHtml,
      credit: rawCredit || null,
    };
  }

  return { cleanHtml: rawHtml, credit: null };
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function ReviewSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-pulse space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-56 bg-muted rounded-md" />

      {/* Hero skeleton */}
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
        <div className="h-7 w-20 bg-muted rounded-full mx-auto" />
        <div className="h-10 w-2/3 bg-muted rounded-xl mx-auto" />
        <div className="h-6 w-1/3 bg-muted rounded-lg mx-auto" />
        <div className="h-0.5 w-24 bg-muted mx-auto mt-6" />
      </div>

      {/* Content card skeleton */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 space-y-4 shadow-sm">
        <div className="h-6 w-1/4 bg-muted rounded" />
        <div className="space-y-2.5">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-[92%]" />
          <div className="h-4 bg-muted rounded w-[85%]" />
        </div>
        <div className="h-6 w-1/3 bg-muted rounded mt-8" />
        <div className="space-y-2.5">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-[88%]" />
        </div>
      </div>
    </div>
  );
}

// ─── Not Found State ──────────────────────────────────────────────────────────
function NotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
          <BookOpen className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive font-bold text-sm">404</span>
        </div>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2 font-bengali">বিষয় পাওয়া যায়‌নি</h1>
      <p className="text-muted-foreground text-sm max-w-sm font-bengali">
        <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{slug}</code> নামে কোনো বিষয়
        ডেটাবেজে নেই।
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity font-bengali"
      >
        <ArrowLeft className="h-4 w-4" />
        হোমে ফিরে যান
      </Link>
    </div>
  );
}

// ─── Empty Review State ───────────────────────────────────────────────────────
function EmptyReview() {
  return (
    <div className="bg-card rounded-2xl border border-border p-10 sm:p-16 text-center mt-6 shadow-sm">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-5">
        <FileText className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Subject Review Coming Soon...</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto font-bengali">
        এই বিষয়ের রিভিউ শীঘ্রই যুক্ত করা হবে। আপডেট দেখতে পরবর্তীতে আবার ভিজিট করুন।
      </p>
    </div>
  );
}

// ─── Institution Block Component ──────────────────────────────────────────────
const INITIAL_LIMIT = 5;

function InstitutionBlock({
  title,
  icon,
  items,
  type,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  type: "university" | "college";
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_LIMIT);
  const remainingCount = items.length - INITIAL_LIMIT;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-base font-bold text-foreground font-bengali">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground font-bengali">{items.length}টি</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {visibleItems.map((item) => {
          const inst = type === "university" ? item.universities : item.colleges;
          if (!inst) return null;
          const seatText = formatSeatBreakdown(item.subject_group_seats);
          const linkTo =
            type === "university" ? `/university/${inst.slug}` : `/college/${inst.slug}`;

          return (
            <Link
              key={item.id}
              to={linkTo}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-background hover:bg-accent hover:border-primary/30 transition-all duration-200 group"
            >
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {inst.short_name_en}
              </span>
              {seatText && <span className="text-xs text-muted-foreground">{seatText}</span>}
            </Link>
          );
        })}

        {items.length > INITIAL_LIMIT && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors font-bengali"
          >
            {isExpanded ? "কম দেখুন" : `+ আরও ${remainingCount}টি`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubjectReviewPage() {
  const { slug = "" } = useParams<{ slug: string }>();

  const {
    data: program,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["degree-program-review", slug],
    queryFn: () => fetchDegreeProgramBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // ── Institution Subjects Query ──
  const { data: institutionSubjects = [] } = useQuery({
    queryKey: ["institution-subjects", program?.id],
    queryFn: async () => {
      if (!program?.id) return [];
      const { data, error } = await supabase
        .from("institution_subjects")
        .select(`
          id,
          university_id,
          college_id,
          universities(slug, short_name_en, short_name_bn, name_en, category),
          colleges(slug, short_name_en, short_name_bn, name_en),
          subject_group_seats(
            seat_count,
            group:groups(name_en, name_bn)
          )
        `)
        .eq("degree_program_id", program.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!program?.id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Group institutions by category ──
  const { publicUniversities, privateUniversities, colleges } = useMemo(() => {
    const pubUni: typeof institutionSubjects = [];
    const priUni: typeof institutionSubjects = [];
    const coll: typeof institutionSubjects = [];

    for (const row of institutionSubjects) {
      if (row.universities) {
        const cat = (row.universities as any).category?.toLowerCase();
        if (cat === "public") {
          pubUni.push(row);
        } else if (cat === "private") {
          priUni.push(row);
        }
      } else if (row.colleges) {
        coll.push(row);
      }
    }

    return { publicUniversities: pubUni, privateUniversities: priUni, colleges: coll };
  }, [institutionSubjects]);

  // Safely parse review content — wrapped in try-catch to prevent crashes from malformed HTML
  let cleanHtml = "";
  let credit: string | null = null;
  let reviewSources: { url: string; title?: string }[] = [];
  try {
    const rawReviewContent = program?.review || (program as any)?.review_content || null;
    const parsed = parseReviewContent(rawReviewContent);
    cleanHtml = parsed.cleanHtml;
    credit = parsed.credit;
    reviewSources = Array.isArray(program?.review_sources) ? program.review_sources : [];
  } catch (err) {
    console.error("Failed to parse review content:", err);
    cleanHtml = "";
    credit = null;
    reviewSources = [];
  }

  return (
    <>
      <Helmet>
        <title>
          {isLoading
            ? "লোড হচ্ছে..."
            : program
              ? `${program.full_name_en}${program.short_name ? ` (${program.short_name})` : ""} — সাবজেক্ট রিভিউ`
              : "বিষয় পাওয়া যায়নি"}
        </title>
        {program?.full_name_en && (
          <meta
            name="description"
            content={`${program.full_name_en} (${program.full_name_bn ?? ""}) এর ক্যারিয়ার, জব মার্কেট ও বিস্তারিত রিভিউ।`}
          />
        )}
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {!slug ? (
          <NotFound slug="" />
        ) : isLoading ? (
          <ReviewSkeleton />
        ) : isError ? (
          <NotFound slug={slug} />
        ) : !program ? (
          <NotFound slug={slug} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* ── 1. Breadcrumb Navigation ── */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-6 font-bengali flex-wrap"
            >
              <Link
                to="/"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                হোম
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <Link to="/subjects" className="hover:text-foreground transition-colors">
                সাবজেক্ট রিভিউ
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-foreground font-medium truncate">{program.full_name_en}</span>
            </nav>

            {/* ── 2. Premium Hero Header Section ── */}
            <header className="relative overflow-hidden bg-card border border-border rounded-3xl p-6 sm:p-10 shadow-sm text-center">
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                {/* Subject Badge */}
                {program.short_name && (
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-bold tracking-wider border border-primary/20 shadow-2xs mb-4 uppercase">
                    <DynamicIcon
                      iconName={program.lucide_icon_name}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    {program.short_name}
                  </div>
                )}

                {/* English Name */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
                  {program.full_name_en}
                </h1>

                {/* Bengali Name */}
                {program.full_name_bn && (
                  <p className="mt-3 text-lg sm:text-xl text-muted-foreground font-bengali font-medium">
                    {program.full_name_bn}
                  </p>
                )}

                {/* Visual Separator */}
                <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3">
                  <div className="h-px w-20 bg-gradient-to-r from-transparent to-primary/40" />
                  <div className="h-2 w-2 rounded-full bg-primary/60" />
                  <div className="h-px w-20 bg-gradient-to-l from-transparent to-primary/40" />
                </div>
              </div>
            </header>

            {/* ── 3. Tiptap HTML Content Container ── */}
            {cleanHtml ? (
              <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10 mt-6 sm:mt-8">
                <article
                  className="prose prose-neutral dark:prose-invert prose-p:text-base prose-p:leading-relaxed max-w-none
                    prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
                    prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:border-b prose-h1:pb-2 prose-h1:border-border/60
                    prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-lg sm:prose-h3:text-xl
                    prose-p:text-foreground/90 prose-p:leading-relaxed
                    prose-a:text-primary prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-code:bg-muted prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                    prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-li:marker:text-primary prose-li:my-1
                    prose-hr:border-border prose-hr:my-8
                    prose-img:rounded-2xl prose-img:shadow-md prose-img:border prose-img:border-border/50 prose-img:mx-auto
                    prose-table:w-full prose-table:my-6 prose-table:overflow-hidden prose-table:rounded-xl prose-table:border prose-table:border-border prose-table:text-sm
                    prose-th:bg-muted/60 prose-th:text-foreground prose-th:p-3 prose-th:text-left prose-th:font-semibold
                    prose-td:p-3 prose-td:border-t prose-td:border-border/60"
                  dangerouslySetInnerHTML={{ __html: cleanHtml }}
                />

                {/* ── 4. Credit / Author Box ── */}
                {credit && (
                  <div className="mt-10 pt-6 border-t border-border/80">
                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-muted/40 border border-border/80">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          মূল অবদানে / ক্রেডিট
                        </p>
                        <p className="text-sm font-medium text-foreground mt-0.5 font-bengali">
                          {credit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyReview />
            )}

            {/* ── 5. Review Sources & Helpful Links ── */}
            {reviewSources.length > 0 && (
              <section className="mt-12 sm:mt-16">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted border border-border">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap font-bengali">
                      সহায়ক লিঙ্ক ও রেফারেন্স
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviewSources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />

                      <div className="relative shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 group-hover:bg-primary/15 transition-colors">
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </div>

                      <div className="relative flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {source.title || "ইউআরএল লিঙ্ক"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                          {(() => {
                            try {
                              return new URL(source.url).hostname;
                            } catch {
                              return source.url;
                            }
                          })()}
                        </p>
                      </div>

                      <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3.5 w-3.5 text-primary mt-1" />
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
            {/* ── 6. Institutions Offering This Subject ── */}
            {(publicUniversities.length > 0 ||
              privateUniversities.length > 0 ||
              colleges.length > 0) && (
              <section className="mt-12 sm:mt-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted border border-border">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap font-bengali">
                      যে প্রতিষ্ঠানে এই বিষয় আছে
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-8">
                  {/* Public Universities */}
                  {publicUniversities.length > 0 && (
                    <InstitutionBlock
                      title="পাবলিক ইউনিভার্সিটি"
                      icon={<Landmark className="h-4 w-4 text-primary" />}
                      items={publicUniversities}
                      type="university"
                    />
                  )}

                  {/* Private Universities */}
                  {privateUniversities.length > 0 && (
                    <InstitutionBlock
                      title="প্রাইভেট ইউনিভার্সিটি"
                      icon={<Building2 className="h-4 w-4 text-primary" />}
                      items={privateUniversities}
                      type="university"
                    />
                  )}

                  {/* Colleges */}
                  {colleges.length > 0 && (
                    <InstitutionBlock
                      title="কলেজ"
                      icon={<GraduationCap className="h-4 w-4 text-primary" />}
                      items={colleges}
                      type="college"
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
