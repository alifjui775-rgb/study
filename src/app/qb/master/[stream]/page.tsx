// =============================================================================
// Public — Master Question Bank stream page (/qb/master/:stream)
// Displays the papers linked to a master stream as a responsive square grid.
// =============================================================================

import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";

interface MasterQbStreamDetail {
  id: number;
  slug: string;
  name_bn: string;
  short_name_bn: string | null;
  description: string | null;
  icon_url: string | null;
  paper_ids: string[];
}

interface StudyDisciplineRef {
  id: string;
  name_bn: string | null;
  name_en: string | null;
  icon_url: string | null;
}

interface MasterQbPaper {
  id: string;
  name_bn: string | null;
  name_en: string;
  short_code: string | null;
  discipline_id: string | null;
  study_disciplines: StudyDisciplineRef | null;
}

interface MasterQbStreamResult {
  stream: MasterQbStreamDetail | null;
  papers: MasterQbPaper[];
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

export default function MasterQbStreamPage() {
  const { stream: streamSlug } = useParams<{ stream: string }>();

  const { data, isLoading, isError } = useQuery<MasterQbStreamResult>({
    queryKey: ["master-qb-stream", streamSlug],
    enabled: !!streamSlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: streamRow, error } = await supabase
        .from("master_qb_streams")
        .select("id, slug, name_bn, short_name_bn, description, icon_url, paper_ids")
        .eq("slug", streamSlug)
        .maybeSingle();

      if (error) throw error;
      if (!streamRow) return { stream: null, papers: [] };

      const stream = streamRow as MasterQbStreamDetail;
      const paperIds = stream.paper_ids ?? [];

      if (paperIds.length === 0) return { stream, papers: [] };

      const { data: papersData, error: papersError } = await supabase
        .from("curriculum_papers")
        .select(
          "id, name_bn, name_en, short_code, discipline_id, study_disciplines(id, name_bn, name_en, icon_url)",
        )
        .in("id", paperIds);

      if (papersError) throw papersError;

      // Preserve the order defined in stream.paper_ids
      const paperMap = new Map<string, MasterQbPaper>(
        (papersData ?? []).map((p: any) => [p.id, p as MasterQbPaper]),
      );
      const papers = paperIds
        .map((id) => paperMap.get(id))
        .filter((p): p is MasterQbPaper => p !== undefined);

      return { stream, papers };
    },
  });

  // Stream slug not found → back to /qb
  if (!isLoading && !isError && data && !data.stream) {
    return <Navigate to="/qb" replace />;
  }

  const stream = data?.stream ?? null;
  const papers = data?.papers ?? [];

  return (
    <>
      <Helmet>
        <title>{`${stream?.name_bn ?? "মাস্টার প্রশ্নব্যাংক"} — MNR Study`}</title>
        <meta
          name="description"
          content={stream?.description ?? "মাস্টার প্রশ্নব্যাংক — বিষয়ভিত্তিক পেপার ও সমাধান।"}
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
        <Header />

        <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
          {/* --- Hero Header --- */}
          <div>
            <Link
              to="/qb"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-all border border-border/40 mb-6 font-bengali"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              প্রশ্নব্যাংক
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
                      url={stream?.icon_url ?? null}
                      alt={stream?.name_bn ?? ""}
                      className="size-8 sm:size-10"
                      fallbackClassName="size-8 sm:size-10 text-primary"
                    />
                  </div>

                  <div className="min-w-0 w-full sm:flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground break-words leading-tight">
                      {stream?.name_bn}
                    </h1>

                    {stream?.description && (
                      <p className="text-sm text-muted-foreground max-w-xl mx-auto sm:mx-0 mt-1.5 break-words leading-relaxed font-bengali">
                        {stream.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary font-bengali">
                        <FileText className="size-3" />
                        {papers.length} টি বিষয়/পেপার অন্তর্ভুক্ত
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Papers --- */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-destructive font-bengali">
                তথ্য আনতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
              </p>
            </div>
          ) : papers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 md:p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h2 className="font-bold text-lg text-foreground font-bengali">
                এই স্ট্রিমে এখনো কোনো পেপার যুক্ত করা হয়নি
              </h2>
              <p className="text-sm text-muted-foreground font-bengali mt-1">
                খুব শীঘ্রই এখানে পেপার ও সমাধান যুক্ত করা হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {papers.map((paper) => (
                <Link
                  key={paper.id}
                  to={`/qb/master/${streamSlug}/${paper.short_code ?? paper.id}`}
                  className="group aspect-square flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-3 text-center overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
                >
                  <div className="h-16 w-16 rounded-full bg-accent dark:bg-[#757575] flex items-center justify-center shrink-0 shadow-inner">
                    <SmartIcon
                      url={paper.study_disciplines?.icon_url ?? null}
                      alt={paper.name_bn || paper.name_en}
                      className="size-9"
                      fallbackClassName="size-8 text-primary"
                    />
                  </div>
                  <div className="min-w-0 w-full space-y-1">
                    <p className="font-bold text-sm text-foreground font-bengali break-words leading-snug line-clamp-2">
                      {paper.name_bn || paper.name_en}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {paper.name_en || paper.short_code}
                    </p>
                  </div>
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
