// =============================================================================
// Public — Master QB chapter questions (/qb/master/:stream/:paperShortCode/:chapterShortCode)
//
// Fetching is delegated to the Postgres RPC `get_master_qb_questions`, which
// resolves allowed units (master_qb_units), keeps the 4 most recent batches, and
// returns MCQ/Written questions for the chapter. All years are fully open.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import MasterQuestionList from "@/components/master-qb/questions/MasterQuestionList";
import MasterTopicFilterDock from "@/components/master-qb/questions/MasterTopicFilterDock";
import {
  fetchMasterQbChapterContext,
  fetchMasterQbTopics,
  fetchMasterQuestions,
  MASTER_QB_PAGE_SIZE,
  type MasterQuestionItem,
  type MasterQuestionType,
} from "@/lib/master-qb-queries";
import { ArrowLeft, BookOpen, FileText, ListChecks, PenLine, Layers } from "lucide-react";

const TAB_LABELS: Record<MasterQuestionType, string> = {
  mcq: "MCQ",
  written: "লিখিত",
};

function SmartIcon({
  url,
  alt,
  className = "size-8 sm:size-10",
  fallbackClassName = "size-8 sm:size-10 text-primary",
}: {
  url: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <BookOpen className={fallbackClassName} />;
  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}

export default function MasterQbChapterQuestionsPage() {
  const { user } = useAuth();
  const { stream: streamSlug, paperShortCode, chapterShortCode } = useParams<{
    stream: string;
    paperShortCode: string;
    chapterShortCode: string;
  }>();

  const [activeTab, setActiveTab] = useState<MasterQuestionType>("mcq");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [mcqQuestions, setMcqQuestions] = useState<MasterQuestionItem[]>([]);
  const [writtenQuestions, setWrittenQuestions] = useState<MasterQuestionItem[]>([]);

  const [mcqPage, setMcqPage] = useState(0);
  const [writtenPage, setWrittenPage] = useState(0);

  const [mcqHasMore, setMcqHasMore] = useState(true);
  const [writtenHasMore, setWrittenHasMore] = useState(true);

  const [mcqLoading, setMcqLoading] = useState(false);
  const [writtenLoading, setWrittenLoading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);

  // --- Context: stream → paper → chapter ---
  const {
    data: context,
    isLoading: contextLoading,
    isError: contextError,
  } = useQuery({
    queryKey: ["master-qb-chapter-context", streamSlug, paperShortCode, chapterShortCode],
    enabled: !!streamSlug && !!paperShortCode && !!chapterShortCode,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      fetchMasterQbChapterContext({
        streamSlug: streamSlug as string,
        paperShortCode: paperShortCode as string,
        chapterShortCode: chapterShortCode as string,
      }),
  });

  const stream = context?.stream ?? null;
  const paper = context?.paper ?? null;
  const chapter = context?.chapter ?? null;

  // --- Chapter topics (for the filter pills) ---
  const { data: topics = [] } = useQuery({
    queryKey: ["master-qb-topics", chapter?.id],
    enabled: !!chapter,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchMasterQbTopics(chapter!.id),
  });

  // --- Reset + load first page whenever tab/topic changes ---
  useEffect(() => {
    if (!streamSlug || !chapter?.id) return;
    let cancelled = false;

    const load = async () => {
      if (activeTab === "mcq") {
        setMcqQuestions([]);
        setMcqPage(0);
        setMcqHasMore(true);
        setMcqLoading(true);
        try {
          const rows = await fetchMasterQuestions({
            streamSlug,
            chapterId: chapter.id,
            questionType: "mcq",
            topicId: selectedTopic,
            limit: MASTER_QB_PAGE_SIZE,
            offset: 0,
          });
          if (cancelled) return;
          setMcqQuestions(rows);
          setMcqHasMore(rows.length === MASTER_QB_PAGE_SIZE);
        } catch (e) {
          console.error("fetchMasterQuestions(mcq) error:", e);
        } finally {
          if (!cancelled) setMcqLoading(false);
        }
      } else {
        setWrittenQuestions([]);
        setWrittenPage(0);
        setWrittenHasMore(true);
        setWrittenLoading(true);
        try {
          const rows = await fetchMasterQuestions({
            streamSlug,
            chapterId: chapter.id,
            questionType: "written",
            topicId: selectedTopic,
            limit: MASTER_QB_PAGE_SIZE,
            offset: 0,
          });
          if (cancelled) return;
          setWrittenQuestions(rows);
          setWrittenHasMore(rows.length === MASTER_QB_PAGE_SIZE);
        } catch (e) {
          console.error("fetchMasterQuestions(written) error:", e);
        } finally {
          if (!cancelled) setWrittenLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [streamSlug, chapter?.id, activeTab, selectedTopic]);

  // --- Load next page (offset = pageIndex * 10) ---
  const loadNextPage = useCallback(async () => {
    if (!streamSlug || !chapter?.id) return;

    if (activeTab === "mcq" && mcqHasMore && !mcqLoading) {
      const nextPage = mcqPage + 1;
      setMcqLoading(true);
      try {
        const rows = await fetchMasterQuestions({
          streamSlug,
          chapterId: chapter.id,
          questionType: "mcq",
          topicId: selectedTopic,
          limit: MASTER_QB_PAGE_SIZE,
          offset: nextPage * MASTER_QB_PAGE_SIZE,
        });
        setMcqQuestions((prev) => [...prev, ...rows]);
        setMcqPage(nextPage);
        setMcqHasMore(rows.length === MASTER_QB_PAGE_SIZE);
      } catch (e) {
        console.error(e);
      } finally {
        setMcqLoading(false);
      }
    } else if (activeTab === "written" && writtenHasMore && !writtenLoading) {
      const nextPage = writtenPage + 1;
      setWrittenLoading(true);
      try {
        const rows = await fetchMasterQuestions({
          streamSlug,
          chapterId: chapter.id,
          questionType: "written",
          topicId: selectedTopic,
          limit: MASTER_QB_PAGE_SIZE,
          offset: nextPage * MASTER_QB_PAGE_SIZE,
        });
        setWrittenQuestions((prev) => [...prev, ...rows]);
        setWrittenPage(nextPage);
        setWrittenHasMore(rows.length === MASTER_QB_PAGE_SIZE);
      } catch (e) {
        console.error(e);
      } finally {
        setWrittenLoading(false);
      }
    }
  }, [
    streamSlug,
    chapter?.id,
    activeTab,
    selectedTopic,
    mcqPage,
    writtenPage,
    mcqHasMore,
    writtenHasMore,
    mcqLoading,
    writtenLoading,
  ]);

  // --- Infinite scroll ---
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, activeTab, selectedTopic]);

  // --- Invalid route → back to /qb ---
  if (
    !contextLoading &&
    !contextError &&
    context &&
    (!context.stream || !context.paper || !context.chapter)
  ) {
    return <Navigate to="/qb" replace />;
  }

  const activeQuestions = activeTab === "mcq" ? mcqQuestions : writtenQuestions;
  const activeLoading = activeTab === "mcq" ? mcqLoading : writtenLoading;
  const activeHasMore = activeTab === "mcq" ? mcqHasMore : writtenHasMore;
  const isInitialLoading = activeLoading && activeQuestions.length === 0;

  return (
    <>
      <Helmet>
        <title>{`${chapter?.name ?? "সূচিপত্র"} — MNR Study`}</title>
        <meta
          name="description"
          content={`${paper?.name_en ?? "মাস্টার প্রশ্নব্যাংক"} — ${chapter?.name ?? ""}`}
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
        <Header />

        <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
          {/* --- Hero --- */}
          <div>
            <Link
              to={`/qb/master/${stream?.slug ?? streamSlug}/${paper?.short_code ?? paperShortCode}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-all border border-border/40 mb-6 font-bengali max-w-full"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{paper?.name_bn || paper?.name_en || "সূচিপত্র"}</span>
            </Link>

            <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border/60 shadow-sm relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8">
              <div className="absolute -top-12 -right-12 size-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              {contextLoading ? (
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
                      alt={chapter?.name ?? ""}
                    />
                  </div>

                  <div className="min-w-0 w-full sm:flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground break-words leading-tight">
                      {chapter?.name}
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto sm:mx-0 mt-1.5 break-words leading-relaxed">
                      {paper?.name_en}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary font-bengali">
                        <Layers className="size-3" />
                        {topics.length} টি টপিক
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Questions --- */}
          {contextLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : contextError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-destructive font-bengali">
                প্রশ্ন আনতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
              </p>
            </div>
          ) : !context?.chapter ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 md:p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-bengali">অধ্যায় পাওয়া যায়নি।</p>
            </div>
          ) : (
            <>
              <div ref={listTopRef} className="scroll-mt-24" />
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as MasterQuestionType)}
              >
                <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted rounded-xl sm:w-auto sm:grid-cols-2">
                  {(["mcq", "written"] as MasterQuestionType[]).map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="font-bengali flex items-center gap-1.5 rounded-lg"
                    >
                      {tab === "mcq" ? (
                        <ListChecks className="h-4 w-4" />
                      ) : (
                        <PenLine className="h-4 w-4" />
                      )}
                      {TAB_LABELS[tab]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {isInitialLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-40 rounded-xl border border-border bg-card animate-pulse"
                    />
                  ))}
                </div>
              ) : activeQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 md:p-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-foreground font-bengali">
                    {selectedTopic
                      ? "এই টপিকে কোনো প্রশ্ন পাওয়া যায়নি"
                      : "এই অধ্যায়ে এখনো কোনো প্রশ্ন যুক্ত করা হয়নি"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-bengali mt-1">
                    নিবন্ধিত ইউনিটগুলোর ৪টি সাম্প্রতিক ব্যাচ থেকে প্রশ্ন দেখানো হয়।
                  </p>
                </div>
              ) : (
                <MasterQuestionList
                  questions={activeQuestions}
                  loading={activeLoading}
                  hasMore={activeHasMore}
                  activeTab={activeTab}
                  user={user ? { uid: user.uid } : null}
                  topics={topics}
                />
              )}

              <div ref={sentinelRef} className="h-4" />
            </>
          )}
        </main>

        {chapter && topics.length > 0 && (
          <MasterTopicFilterDock
            topics={topics}
            selectedTopic={selectedTopic}
            onSelectTopic={setSelectedTopic}
            listTopRef={listTopRef}
          />
        )}

        <Footer />
      </div>
    </>
  );
}
