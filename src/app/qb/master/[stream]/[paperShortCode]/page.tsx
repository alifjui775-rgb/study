// =============================================================================
// Public — Master Question Bank paper chapter index (/qb/master/:stream/:paperShortCode)
// Displays the chapter list ("সূচিপত্র") for a selected paper.
// =============================================================================

import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, FileText, ListOrdered, ChevronRight } from "lucide-react";

interface StreamRef {
  id: number;
  slug: string;
  name_bn: string;
  icon_url: string | null;
}

interface StudyDisciplineRef {
  name_bn: string | null;
  icon_url: string | null;
}

interface PaperDetail {
  id: string;
  name_bn: string | null;
  name_en: string;
  short_code: string | null;
  discipline_id: string | null;
  study_disciplines: StudyDisciplineRef | null;
}

export interface PaperChapter {
  id: string;
  paper_id: string;
  serial: number | null;
  name: string;
  short_code: string | null;
}

interface ChapterIndexResult {
  stream: StreamRef | null;
  paper: PaperDetail | null;
  chapters: PaperChapter[];
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function formatSerial(serial: number | null, index: number) {
  const n = serial ?? index + 1;
  return String(n)
    .padStart(2, "0")
    .split("")
    .map((d) => BN_DIGITS[Number(d)] ?? d)
    .join("");
}

function SmartIcon({
  url,
  alt,
  className = "size-9",
  fallbackClassName = "size-8 text-primary",
}: {
  url: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <BookOpen className={fallbackClassName} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}

export default function MasterQbPaperChaptersPage() {
  const { stream: streamSlug, paperShortCode } = useParams<{
    stream: string;
    paperShortCode: string;
  }>();

  const { data, isLoading, isError } = useQuery<ChapterIndexResult>({
    queryKey: ["master-qb-paper", streamSlug, paperShortCode],
    enabled: !!streamSlug && !!paperShortCode,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [streamRes, paperRes] = await Promise.all([
        supabase
          .from("master_qb_streams")
          .select("id, slug, name_bn, icon_url")
          .eq("slug", streamSlug)
          .maybeSingle(),
        supabase
          .from("curriculum_papers")
          .select(
            "id, name_bn, name_en, short_code, discipline_id, study_disciplines(name_bn, icon_url)",
          )
          .eq("short_code", paperShortCode)
          .maybeSingle(),
      ]);

      if (streamRes.error) throw streamRes.error;
      if (paperRes.error) throw paperRes.error;

      if (!streamRes.data || !paperRes.data) {
        return { stream: null, paper: null, chapters: [] };
      }

      const paper = paperRes.data as unknown as PaperDetail;

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("paper_chapters")
        .select("id, paper_id, serial, name, short_code")
        .eq("paper_id", paper.id)
        .order("serial", { ascending: true, nullsFirst: false });

      if (chaptersError) throw chaptersError;

      return {
        stream: streamRes.data as StreamRef,
        paper,
        chapters: (chaptersData ?? []) as PaperChapter[],
      };
    },
  });

  // Invalid stream or paper → back to /qb
  if (!isLoading && !isError && data && (!data.stream || !data.paper)) {
    return <Navigate to="/qb" replace />;
  }

  const stream = data?.stream ?? null;
  const paper = data?.paper ?? null;
  const chapters = data?.chapters ?? [];

  return (
    <>
      <Helmet>
        <title>{`${paper?.name_bn || paper?.name_en || "সূচিপত্র"} — MNR Study`}</title>
        <meta
          name="description"
          content={paper?.name_en ?? "মাস্টার প্রশ্নব্যাংক — অধ্যায়ভিত্তিক সূচিপত্র।"}
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
        <Header />

        <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
          {/* --- Hero Header --- */}
          <div>
            <Link
              to={`/qb/master/${stream?.slug ?? streamSlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-all border border-border/40 mb-6 font-bengali max-w-full"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{stream?.name_bn ?? "প্রশ্নব্যাংক"}</span>
            </Link>

            <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border/60 shadow-sm relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8">
              <div className="absolute -top-12 -right-12 size-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              {isLoading ? (
                <div className="relative flex flex-col items-center sm:flex-row sm:items-center gap-5 sm:gap-6">
                  <div className="size-16 sm:size-20 rounded-2xl bg-muted animate-pulse shrink-0 mx-auto sm:mx-0" />
                  <div className="space-y-3 w-full flex flex-col items-center sm:items-start">
                    <div className="h-8 w-64 max-w-full bg-muted rounded animate-pulse" />
                    <div className="h-4 w-80 max-w-full bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-5 sm:gap-6">
                  <div className="size-16 sm:size-20 shrink-0 mx-auto sm:mx-0 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent ring-1 ring-primary/20 shadow-inner flex items-center justify-center">
                    <SmartIcon
                      url={paper?.study_disciplines?.icon_url ?? null}
                      alt={paper?.name_bn || paper?.name_en || ""}
                      className="size-8 sm:size-10"
                      fallbackClassName="size-8 sm:size-10 text-primary"
                    />
                  </div>

                  <div className="min-w-0 w-full sm:flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground break-words leading-tight">
                      {paper?.name_bn || paper?.name_en}
                    </h1>

                    {paper?.name_en && (
                      <p className="text-sm text-muted-foreground max-w-xl mx-auto sm:mx-0 mt-1.5 break-words leading-relaxed">
                        {paper.name_en}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary font-bengali">
                        <FileText className="size-3" />
                        {chapters.length} টি অধ্যায়
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Section title --- */}
          <div className="flex items-center gap-2">
            <ListOrdered className="size-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-bold font-bengali text-foreground">
              অধ্যায়ভিত্তিক সূচিপত্র
            </h2>
          </div>

          {/* --- Chapter list --- */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 p-4 flex items-center gap-3 animate-pulse"
                >
                  <div className="size-9 rounded-lg bg-muted shrink-0" />
                  <div className="h-4 flex-1 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-destructive font-bengali">
                তথ্য আনতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
              </p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 md:p-12 text-center">
              <ListOrdered className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-foreground font-bengali">
                এই পেপারে এখনো কোনো অধ্যায় যুক্ত করা হয়নি
              </h3>
              <p className="text-sm text-muted-foreground font-bengali mt-1">
                খুব শীঘ্রই এখানে অধ্যায়ভিত্তিক সূচিপত্র যুক্ত করা হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chapters.map((chapter, index) => (
                <Link
                  key={chapter.id}
                  to={`/qb/master/${stream?.slug ?? streamSlug}/${paper?.short_code ?? paperShortCode}/${chapter.short_code || chapter.id}`}
                  className="border border-border/60 hover:border-primary/40 hover:bg-accent/40 transition-all rounded-xl p-4 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-muted text-muted-foreground font-semibold size-9 rounded-lg flex items-center justify-center shrink-0 font-bengali">
                      {formatSerial(chapter.serial, index)}
                    </div>
                    <span className="font-medium text-sm text-foreground font-bengali break-words leading-snug">
                      {chapter.name}
                    </span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
