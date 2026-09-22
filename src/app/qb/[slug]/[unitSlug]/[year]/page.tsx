import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Building,
  FileText,
  GraduationCap,
  Layers,
  CheckCircle2,
  ChevronRight,
  Home,
  ListChecks,
  PenLine,
  Lightbulb,
  Lock,
  Tag,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const FREE_BATCHES = 3;

// ─── Types ────────────────────────────────────────────────────────────

interface McqOption {
  id: string;
  option_text: string;
  option_image?: string[] | null;
  is_correct: boolean;
}

interface McqQuestion {
  id: string;
  question: string;
  question_image?: string[] | null;
  explanation?: string | null;
  explanation_image?: string[] | null;
  type_id: string | null;
  sequence_order?: number | null;
  question_options: McqOption[];
  curriculum_papers: { name_bn: string } | null;
  paper_chapters: { name: string } | null;
}

interface WrittenQuestion {
  id: string;
  question: string;
  question_image?: string[] | null;
  answer?: string | null;
  answer_image?: string[] | null;
}

interface CqQuestion {
  id: string;
  stem: string;
  stem_image?: string[] | null;
  question_1?: string | null;
  question_image_1?: string[] | null;
  answer_1?: string | null;
  answer_image_1?: string[] | null;
  question_2?: string | null;
  question_image_2?: string[] | null;
  answer_2?: string | null;
  answer_image_2?: string[] | null;
  question_3?: string | null;
  question_image_3?: string[] | null;
  answer_3?: string | null;
  answer_image_3?: string[] | null;
  question_4?: string | null;
  question_image_4?: string[] | null;
  answer_4?: string | null;
  answer_image_4?: string[] | null;
}

interface EntityInfo {
  id: string;
  slug: string;
  name_bn: string;
  name_en?: string | null;
  short_name_en?: string | null;
  short_name_bn?: string | null;
  logo_url?: string | null;
  category?: string | null;
  entityType: "university" | "cluster" | "college";
}

interface AdmissionUnit {
  id: string;
  university_id?: string | null;
  cluster_id?: string | null;
  college_id?: string | null;
  unit_name_bn: string;
  unit_name_en?: string | null;
  unit_slug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getBatchDisplay(batchObj: any): string | null {
  if (!batchObj) return null;
  if (batchObj.session) return batchObj.session;
  if (batchObj.year) {
    const yr = Number(batchObj.year);
    if (!isNaN(yr)) {
      const fullYear = yr < 100 ? 2000 + yr : yr;
      const nextTwoDigits = String(fullYear + 1).slice(-2);
      return `${fullYear}-${nextTwoDigits}`;
    }
  }
  const name = batchObj.name_bn || batchObj.name_en || batchObj.name || batchObj.title || "";
  const match = name.match(/(\d{2,4})/);
  if (match) {
    const yr = Number(match[1]);
    const fullYear = yr < 100 ? 2000 + yr : yr;
    const nextTwoDigits = String(fullYear + 1).slice(-2);
    return `${fullYear}-${nextTwoDigits}`;
  }
  return name || null;
}

const SUB_QUESTION_LABELS = ["ক", "খ", "গ", "ঘ"];

type TabType = "mcq" | "written" | "cq";

// ─── Paginated Fetch Helpers ──────────────────────────────────────────

async function fetchMcqPage(fileId: string, page: number): Promise<McqQuestion[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("questions_mcq")
    .select(
      `
      *,
      question_options (id, option_text, option_image, is_correct),
      curriculum_papers (
        id, name_bn, name_en, discipline_id,
        study_disciplines (id, name_bn, name_en, short_code)
      ),
      paper_chapters (name),
      chapter_topics (name),
      question_types (name)
    `,
    )
    .eq("file_id", fileId)
    .order("sequence_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) throw error;

  return (data || []).map((q: any) => ({
    ...q,
    curriculum_papers: Array.isArray(q.curriculum_papers)
      ? q.curriculum_papers[0] || null
      : q.curriculum_papers || null,
    paper_chapters: Array.isArray(q.paper_chapters)
      ? q.paper_chapters[0] || null
      : q.paper_chapters || null,
    chapter_topics: Array.isArray(q.chapter_topics)
      ? q.chapter_topics[0] || null
      : q.chapter_topics || null,
    question_types: Array.isArray(q.question_types)
      ? q.question_types[0] || null
      : q.question_types || null,
    question_options: Array.isArray(q.question_options) ? q.question_options : [],
  }));
}

async function fetchWrittenPage(fileId: string, page: number): Promise<WrittenQuestion[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("questions_written")
    .select(
      `
      *,
      curriculum_papers (
        id, name_bn, name_en, discipline_id,
        study_disciplines (id, name_bn, name_en, short_code)
      ),
      paper_chapters (name),
      chapter_topics (name),
      question_types (name)
    `,
    )
    .eq("file_id", fileId)
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("fetchWrittenPage error:", error);
    return [];
  }
  return (data || []).map((q: any) => ({
    ...q,
    curriculum_papers: Array.isArray(q.curriculum_papers)
      ? q.curriculum_papers[0] || null
      : q.curriculum_papers || null,
    paper_chapters: Array.isArray(q.paper_chapters)
      ? q.paper_chapters[0] || null
      : q.paper_chapters || null,
    chapter_topics: Array.isArray(q.chapter_topics)
      ? q.chapter_topics[0] || null
      : q.chapter_topics || null,
    question_types: Array.isArray(q.question_types)
      ? q.question_types[0] || null
      : q.question_types || null,
  })) as WrittenQuestion[];
}

async function fetchCqPage(fileId: string, page: number): Promise<CqQuestion[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("questions_cq")
    .select(
      `
      *,
      curriculum_papers (
        id, name_bn, name_en, discipline_id,
        study_disciplines (id, name_bn, name_en, short_code)
      ),
      paper_chapters (name),
      chapter_topics (name),
      question_types (name)
    `,
    )
    .eq("file_id", fileId)
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("fetchCqPage error:", error);
    return [];
  }
  return (data || []).map((q: any) => ({
    ...q,
    curriculum_papers: Array.isArray(q.curriculum_papers)
      ? q.curriculum_papers[0] || null
      : q.curriculum_papers || null,
    paper_chapters: Array.isArray(q.paper_chapters)
      ? q.paper_chapters[0] || null
      : q.paper_chapters || null,
    chapter_topics: Array.isArray(q.chapter_topics)
      ? q.chapter_topics[0] || null
      : q.chapter_topics || null,
    question_types: Array.isArray(q.question_types)
      ? q.question_types[0] || null
      : q.question_types || null,
  })) as CqQuestion[];
}

// ─── Component ────────────────────────────────────────────────────────

export default function QbSolutionPage() {
  const { user } = useAuth();
  const { slug, unitSlug, year } = useParams<{
    slug: string;
    unitSlug: string;
    year: string;
  }>();

  // ─── Tab state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>("mcq");
  const [tabCounts, setTabCounts] = useState({ mcq: 0, written: 0, cq: 0 });

  // ─── Per-tab loaded data & pagination ─────────────────────────────
  const [mcqQuestions, setMcqQuestions] = useState<McqQuestion[]>([]);
  const [writtenQuestions, setWrittenQuestions] = useState<WrittenQuestion[]>([]);
  const [cqQuestions, setCqQuestions] = useState<CqQuestion[]>([]);

  const [mcqPage, setMcqPage] = useState(0);
  const [writtenPage, setWrittenPage] = useState(0);
  const [cqPage, setCqPage] = useState(0);

  const [mcqHasMore, setMcqHasMore] = useState(true);
  const [writtenHasMore, setWrittenHasMore] = useState(true);
  const [cqHasMore, setCqHasMore] = useState(true);

  const [mcqLoading, setMcqLoading] = useState(false);
  const [writtenLoading, setWrittenLoading] = useState(false);
  const [cqLoading, setCqLoading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─── Main entity/file query ───────────────────────────────────────
  const {
    data: mainData,
    isLoading: mainLoading,
    isError,
  } = useQuery({
    queryKey: ["qb-solution", slug, unitSlug, year],
    queryFn: async () => {
      if (!slug || !unitSlug || !year) return null;

      // 1. Fetch institution entity
      let entityType: "university" | "cluster" | "college" = "university";
      let entityRow: any = null;

      const uniRes = await supabase
        .from("universities")
        .select("id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, category")
        .is("deleted_at", null)
        .eq("slug", slug)
        .maybeSingle();

      if (uniRes.data) {
        entityRow = uniRes.data;
        entityType = "university";
      } else {
        const clusterRes = await supabase
          .from("clusters")
          .select("id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url")
          .is("deleted_at", null)
          .eq("slug", slug)
          .maybeSingle();
        if (clusterRes.data) {
          entityRow = clusterRes.data;
          entityType = "cluster";
        } else {
          const collegeRes = await supabase
            .from("colleges")
            .select("id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, category")
            .is("deleted_at", null)
            .eq("slug", slug)
            .maybeSingle();
          if (collegeRes.data) {
            entityRow = collegeRes.data;
            entityType = "college";
          }
        }
      }

      if (!entityRow) return null;

      const entity: EntityInfo = { ...entityRow, entityType };

      const fkColumn =
        entityType === "university"
          ? "university_id"
          : entityType === "cluster"
            ? "cluster_id"
            : "college_id";

      // 2. Fetch Unit
      let { data: unitData } = await supabase
        .from("admission_units")
        .select("*")
        .is("deleted_at", null)
        .eq(fkColumn, entity.id)
        .eq("unit_slug", unitSlug)
        .maybeSingle();

      if (!unitData) {
        const { data: fallbackUnit } = await supabase
          .from("admission_units")
          .select("*")
          .is("deleted_at", null)
          .eq(fkColumn, entity.id)
          .eq("id", unitSlug)
          .maybeSingle();
        unitData = fallbackUnit;
      }

      if (!unitData) return null;
      const unit = unitData as AdmissionUnit;

      // 3. Fetch Batch first (supports session "2022-23", year "2022", or batch name)
      const sessionParts = year.split("-");
      const startYearNum = Number(sessionParts[0]);

      let targetBatchId: string | null = null;
      let batchMatch: any = null;

      if (sessionParts.length === 2 && !isNaN(startYearNum)) {
        const { data: bData } = await supabase
          .from("batches")
          .select("id, name, year")
          .eq("year", startYearNum)
          .limit(1)
          .maybeSingle();
        batchMatch = bData;
      }

      if (!batchMatch) {
        const yearNum = Number(year);
        let batchQuery = supabase.from("batches").select("id, name, year");
        if (!isNaN(yearNum)) {
          batchQuery = batchQuery.eq("year", yearNum);
        } else {
          batchQuery = batchQuery.or(`name.eq.${year},year.eq.${year}`);
        }
        const { data: bData } = await batchQuery.limit(1).maybeSingle();
        batchMatch = bData;
      }

      if (batchMatch) {
        targetBatchId = batchMatch.id;
      }

      // 3b. Check batch access (first FREE_BATCHES years are free)
      if (batchMatch?.year) {
        const { data: unitFiles } = await supabase
          .from("qb_files")
          .select("year_id, batches!inner(id, year)")
          .eq(fkColumn, entity.id)
          .eq("unit_id", unit.id);

        const sortedYears = [
          ...new Set(
            (unitFiles || [])
              .map((f: any) => f.batches?.year as number | undefined)
              .filter((y): y is number => y != null),
          ),
        ].sort((a, b) => b - a);

        const batchRank = sortedYears.indexOf(batchMatch.year);
        if (batchRank >= FREE_BATCHES) {
          return {
            entity,
            unit,
            file: null,
            locked: true,
            batchDisplay: getBatchDisplay(batchMatch),
            counts: { mcq: 0, written: 0, cq: 0 },
            disciplineCounts: [],
          };
        }
      }

      // 4. Fetch qb_file matching unit and year_id
      let fileQuery = supabase
        .from("qb_files")
        .select(
          "*, batch:batches(id, name, year), category:institution_sub_categories(id, name_bn, name_en)",
        )
        .eq(fkColumn, entity.id)
        .eq("unit_id", unit.id);

      if (targetBatchId) {
        fileQuery = fileQuery.eq("year_id", targetBatchId);
      } else if (year) {
        // Fallback: check if year parameter is a qb_file ID or batch name
        fileQuery = fileQuery.or(`id.eq.${year},year_id.eq.${year}`);
      }

      const { data: fileRows } = await fileQuery
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!fileRows) return null;

      const file = fileRows as any;
      const batchDisplay = getBatchDisplay(file.batch);

      // 4. Lightweight count check for each tab
      const [mcqCount, writtenCount, cqCount] = await Promise.all([
        supabase
          .from("questions_mcq")
          .select("id", { count: "exact", head: true })
          .eq("file_id", file.id),
        supabase
          .from("questions_written")
          .select("id", { count: "exact", head: true })
          .eq("file_id", file.id),
        supabase
          .from("questions_cq")
          .select("id", { count: "exact", head: true })
          .eq("file_id", file.id),
      ]);

      if (mcqCount.error) throw mcqCount.error;

      // 5. Fetch discipline-wise counts for MCQ (for subject filter)
      const { data: disciplineRows } = await supabase
        .from("questions_mcq")
        .select(`
          curriculum_papers (
            discipline_id,
            study_disciplines (id, name_bn)
          )
        `)
        .eq("file_id", file.id);

      const disciplineCounts: Record<string, { id: string; name: string; count: number }> = {};
      if (disciplineRows) {
        for (const row of disciplineRows as any[]) {
          const paper = Array.isArray(row.curriculum_papers)
            ? row.curriculum_papers[0]
            : row.curriculum_papers;
          if (!paper) continue;
          const disc = Array.isArray(paper.study_disciplines)
            ? paper.study_disciplines[0]
            : paper.study_disciplines;
          const name = disc?.name_bn || paper.name_bn || "অন্যান্য বিষয়";
          const id = disc?.id || paper.discipline_id || name;
          if (!disciplineCounts[id]) {
            disciplineCounts[id] = { id, name, count: 0 };
          }
          disciplineCounts[id].count++;
        }
      }

      return {
        entity,
        unit,
        file,
        batchDisplay,
        counts: {
          mcq: mcqCount.count || 0,
          written: writtenCount.count || 0,
          cq: cqCount.count || 0,
        },
        disciplineCounts: Object.values(disciplineCounts),
      };
    },
    enabled: !!slug && !!unitSlug && !!year,
    staleTime: 5 * 60 * 1000,
  });

  const entity = mainData?.entity;
  const unit = mainData?.unit;
  const file = mainData?.file;
  const isLocked = mainData?.locked === true;
  const batchDisplay = mainData?.batchDisplay ?? null;

  // ─── Set tab counts from main query ───────────────────────────────
  useEffect(() => {
    if (mainData?.counts) {
      setTabCounts(mainData.counts);
    }
  }, [mainData?.counts]);

  // ─── Auto-select first available tab ──────────────────────────────
  useEffect(() => {
    if (!mainData?.counts) return;
    const { mcq, written, cq } = mainData.counts;
    if (mcq > 0) setActiveTab("mcq");
    else if (written > 0) setActiveTab("written");
    else if (cq > 0) setActiveTab("cq");
  }, [mainData?.counts]);

  // ─── Fetch first page of active tab on mount / tab switch ─────────
  useEffect(() => {
    if (!file?.id) return;

    const loadFirstPage = async () => {
      if (activeTab === "mcq" && mcqQuestions.length === 0) {
        setMcqLoading(true);
        try {
          const page = await fetchMcqPage(file.id, 0);
          setMcqQuestions(page);
          setMcqHasMore(page.length === PAGE_SIZE);
          if (page.length > 0) {
            setTabCounts((prev) => ({ ...prev, mcq: Math.max(prev.mcq, page.length) }));
          }
        } catch (e) {
          console.error("fetchMcqPage error:", e);
        } finally {
          setMcqLoading(false);
        }
      } else if (activeTab === "written" && writtenQuestions.length === 0) {
        setWrittenLoading(true);
        try {
          const page = await fetchWrittenPage(file.id, 0);
          setWrittenQuestions(page);
          setWrittenHasMore(page.length === PAGE_SIZE);
          if (page.length > 0) {
            setTabCounts((prev) => ({ ...prev, written: Math.max(prev.written, page.length) }));
          }
        } catch (e) {
          console.error("fetchWrittenPage error:", e);
        } finally {
          setWrittenLoading(false);
        }
      } else if (activeTab === "cq" && cqQuestions.length === 0) {
        setCqLoading(true);
        try {
          const page = await fetchCqPage(file.id, 0);
          setCqQuestions(page);
          setCqHasMore(page.length === PAGE_SIZE);
          if (page.length > 0) {
            setTabCounts((prev) => ({ ...prev, cq: Math.max(prev.cq, page.length) }));
          }
        } catch (e) {
          console.error("fetchCqPage error:", e);
        } finally {
          setCqLoading(false);
        }
      }
    };

    loadFirstPage();
  }, [file?.id, activeTab, mcqQuestions.length, writtenQuestions.length, cqQuestions.length]);

  // ─── Load next page for active tab ────────────────────────────────
  const loadNextPage = useCallback(async () => {
    if (!file?.id) return;

    if (activeTab === "mcq" && mcqHasMore && !mcqLoading) {
      const nextPage = mcqPage + 1;
      setMcqLoading(true);
      try {
        const page = await fetchMcqPage(file.id, nextPage);
        setMcqQuestions((prev) => [...prev, ...page]);
        setMcqPage(nextPage);
        setMcqHasMore(page.length === PAGE_SIZE);
      } catch (e) {
        console.error(e);
      } finally {
        setMcqLoading(false);
      }
    } else if (activeTab === "written" && writtenHasMore && !writtenLoading) {
      const nextPage = writtenPage + 1;
      setWrittenLoading(true);
      try {
        const page = await fetchWrittenPage(file.id, nextPage);
        setWrittenQuestions((prev) => [...prev, ...page]);
        setWrittenPage(nextPage);
        setWrittenHasMore(page.length === PAGE_SIZE);
      } catch (e) {
        console.error(e);
      } finally {
        setWrittenLoading(false);
      }
    } else if (activeTab === "cq" && cqHasMore && !cqLoading) {
      const nextPage = cqPage + 1;
      setCqLoading(true);
      try {
        const page = await fetchCqPage(file.id, nextPage);
        setCqQuestions((prev) => [...prev, ...page]);
        setCqPage(nextPage);
        setCqHasMore(page.length === PAGE_SIZE);
      } catch (e) {
        console.error(e);
      } finally {
        setCqLoading(false);
      }
    }
  }, [
    file?.id,
    activeTab,
    mcqPage,
    writtenPage,
    cqPage,
    mcqHasMore,
    writtenHasMore,
    cqHasMore,
    mcqLoading,
    writtenLoading,
    cqLoading,
  ]);

  // ─── Intersection Observer for infinite scroll ────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, activeTab]);

  // ─── Derived state ────────────────────────────────────────────────
  const activeTabCount =
    activeTab === "mcq"
      ? tabCounts.mcq
      : activeTab === "written"
        ? tabCounts.written
        : tabCounts.cq;

  const totalQuestions = tabCounts.mcq + tabCounts.written + tabCounts.cq;
  const visibleTabs: TabType[] = ["mcq", "written", "cq"].filter(
    (t) => tabCounts[t as TabType] > 0,
  ) as TabType[];
  const showTabBar = visibleTabs.length > 1;

  const currentQuestions =
    activeTab === "mcq" ? mcqQuestions : activeTab === "written" ? writtenQuestions : cqQuestions;

  const currentLoading =
    activeTab === "mcq" ? mcqLoading : activeTab === "written" ? writtenLoading : cqLoading;

  const currentHasMore =
    activeTab === "mcq" ? mcqHasMore : activeTab === "written" ? writtenHasMore : cqHasMore;

  const shortNameDisplay = entity?.short_name_en || entity?.short_name_bn || "";

  // ─── Loading state ────────────────────────────────────────────────
  if (mainLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner message="সমাধান লোড হচ্ছে..." />
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Locked (premium) state ──────────────────────────────────────
  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow container mx-auto px-4 py-16 text-center font-bengali">
          <div className="max-w-md mx-auto bg-card border rounded-2xl p-8 shadow-lg space-y-4">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">প্রিমিয়াম কনটেন্ট</h1>
            <p className="text-muted-foreground text-sm">
              এই ব্যাচের প্রশ্নগুলো প্রিমিয়াম। এই ফিচারটি শীঘ্রই উন্মুক্ত করা হবে!
            </p>
            <Button asChild className="mt-4">
              <Link
                to={slug && unitSlug ? `/qb/${slug}/${unitSlug}` : slug ? `/qb/${slug}` : "/qb"}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> ফিরে যান
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Error / Not found state ──────────────────────────────────────
  if (isError || !entity || !unit || !file) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow container mx-auto px-4 py-16 text-center font-bengali">
          <div className="max-w-md mx-auto bg-card border rounded-2xl p-8 shadow-lg space-y-4">
            <Building className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">সমাধান পাওয়া যায়নি</h1>
            <p className="text-muted-foreground text-sm">
              আপনার খোঁজা ফাইলটি তথ্যভান্ডারে নেই অথবা এখনও আপলোড করা হয়নি।
            </p>
            <Button asChild className="mt-4">
              <Link
                to={slug && unitSlug ? `/qb/${slug}/${unitSlug}` : slug ? `/qb/${slug}` : "/qb"}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> ফিরে যান
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── No questions at all ──────────────────────────────────────────
  if (totalQuestions === 0) {
    return (
      <>
        <Helmet>
          <title>{`${entity.name_bn} - ${unit.unit_name_bn} - ${batchDisplay || year} সমাধান | MNR Study`}</title>
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
          <Header />
          <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
            <Breadcrumb
              entity={entity}
              unit={unit}
              unitSlug={unitSlug ?? ""}
              batchDisplay={batchDisplay}
              year={year ?? ""}
            />
            <HeaderCard
              entity={entity}
              unit={unit}
              file={file}
              batchDisplay={batchDisplay}
              year={year ?? ""}
              tabCounts={tabCounts}
              unitSlug={unitSlug ?? ""}
              shortNameDisplay={shortNameDisplay}
            />
            <EmptyState message="এই ফাইলে এখনও কোনো প্রশ্ন যোগ করা হয়নি।" />
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${entity.name_bn} - ${unit.unit_name_bn} - ${batchDisplay || year} সমাধান | MNR Study`}</title>
        <meta
          name="description"
          content={`${entity.name_bn}-এর ${unit.unit_name_bn}-এর ${batchDisplay || year} সালের প্রশ্নের সমাধান।`}
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
        <Header />

        <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
          <Breadcrumb
            entity={entity}
            unit={unit}
            unitSlug={unitSlug ?? ""}
            batchDisplay={batchDisplay}
            year={year ?? ""}
          />
          <HeaderCard
            entity={entity}
            unit={unit}
            file={file}
            batchDisplay={batchDisplay}
            year={year ?? ""}
            tabCounts={tabCounts}
            unitSlug={unitSlug ?? ""}
            shortNameDisplay={shortNameDisplay}
          />

          {/* Question Category Tabs — only shown if 2+ tabs have questions */}
          {showTabBar ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabType)}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <TabsList className="h-auto gap-1 p-1 bg-muted/60 border rounded-xl w-fit inline-flex justify-center">
                  {visibleTabs.includes("mcq") && (
                    <TabsTrigger
                      value="mcq"
                      className="gap-1.5 px-4 py-2 text-sm font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <ListChecks className="h-4 w-4" />
                      MCQ
                    </TabsTrigger>
                  )}

                  {visibleTabs.includes("written") && (
                    <TabsTrigger
                      value="written"
                      className="gap-1.5 px-4 py-2 text-sm font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <PenLine className="h-4 w-4" />
                      লিখিত (Written)
                    </TabsTrigger>
                  )}

                  {visibleTabs.includes("cq") && (
                    <TabsTrigger
                      value="cq"
                      className="gap-1.5 px-4 py-2 text-sm font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Lightbulb className="h-4 w-4" />
                      সৃজনশীল (CQ)
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="mcq">
                <QuestionList
                  questions={mcqQuestions}
                  loading={mcqLoading}
                  hasMore={mcqHasMore}
                  activeTab="mcq"
                  entity={entity}
                  batchDisplay={batchDisplay}
                  file={file}
                  user={user}
                  disciplineCounts={mainData?.disciplineCounts}
                />
              </TabsContent>
              <TabsContent value="written">
                <QuestionList
                  questions={writtenQuestions}
                  loading={writtenLoading}
                  hasMore={writtenHasMore}
                  activeTab="written"
                  entity={entity}
                  batchDisplay={batchDisplay}
                  file={file}
                  user={user}
                />
              </TabsContent>
              <TabsContent value="cq">
                <QuestionList
                  questions={cqQuestions}
                  loading={cqLoading}
                  hasMore={cqHasMore}
                  activeTab="cq"
                  entity={entity}
                  batchDisplay={batchDisplay}
                  file={file}
                  user={user}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <QuestionList
              questions={currentQuestions}
              loading={currentLoading}
              hasMore={currentHasMore}
              activeTab={activeTab}
              entity={entity}
              batchDisplay={batchDisplay}
              file={file}
              user={user}
            />
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
        </main>

        <Footer />
      </div>
    </>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────

function Breadcrumb({
  entity,
  unit,
  unitSlug,
  batchDisplay,
  year,
}: {
  entity: EntityInfo;
  unit: AdmissionUnit;
  unitSlug: string;
  batchDisplay: string | null;
  year: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
        হোম
      </Link>
      <ChevronRight className="h-3 w-3" />
      <Link to="/qb" className="hover:text-primary transition-colors">
        প্রশ্নব্যাংক
      </Link>
      <ChevronRight className="h-3 w-3" />
      <Link to={`/qb/${entity.slug}`} className="hover:text-primary transition-colors">
        {entity.name_bn}
      </Link>
      <ChevronRight className="h-3 w-3" />
      <Link to={`/qb/${entity.slug}/${unitSlug}`} className="hover:text-primary transition-colors">
        {unit.unit_name_bn}
      </Link>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{batchDisplay || year} সমাধান</span>
    </nav>
  );
}

// ─── Header Card ──────────────────────────────────────────────────────

function HeaderCard({
  entity,
  unit,
  file,
  batchDisplay,
  year,
  tabCounts,
  unitSlug,
  shortNameDisplay,
}: {
  entity: EntityInfo;
  unit: AdmissionUnit;
  file: any;
  batchDisplay: string | null;
  year: string;
  tabCounts: { mcq: number; written: number; cq: number };
  unitSlug: string;
  shortNameDisplay: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xl">
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
        <div className="relative shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-background/90 p-3 border border-border/80 shadow-md flex items-center justify-center overflow-hidden">
            {entity.logo_url ? (
              <img
                src={entity.logo_url}
                alt={entity.name_bn}
                className="w-full h-full object-contain"
              />
            ) : (
              <GraduationCap className="h-10 w-10 text-primary" />
            )}
          </div>
        </div>

        <div className="text-center sm:text-left space-y-3 grow">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-sm font-semibold text-primary/80">
              {entity.name_bn} {shortNameDisplay ? `(${shortNameDisplay})` : ""}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
            {unit.unit_name_bn}: {batchDisplay || year} সমাধান
          </h1>
          {unit.unit_name_en && (
            <p className="text-sm text-muted-foreground font-sans font-medium">
              {unit.unit_name_en}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3.5 w-3.5" />
              {file.display_name || file.original_filename}
            </Badge>
            {tabCounts.mcq > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                MCQ: {tabCounts.mcq} টি
              </Badge>
            )}
            {tabCounts.written > 0 && (
              <Badge variant="secondary" className="gap-1">
                <PenLine className="h-3.5 w-3.5" />
                লিখিত: {tabCounts.written} টি
              </Badge>
            )}
            {tabCounts.cq > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Lightbulb className="h-3.5 w-3.5" />
                সৃজনশীল: {tabCounts.cq} টি
              </Badge>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-2 sm:pt-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 border-primary/30 hover:bg-primary/10"
          >
            <Link to={`/qb/${entity.slug}/${unitSlug}`}>
              <ArrowLeft className="h-4 w-4" />
              সকল ফাইল
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function getDisciplineInfo(q: any): { id: string; name: string } {
  const paper = Array.isArray(q?.curriculum_papers) ? q.curriculum_papers[0] : q?.curriculum_papers;
  if (!paper) return { id: "other", name: "অন্যান্য বিষয়" };

  const disc = Array.isArray(paper.study_disciplines)
    ? paper.study_disciplines[0]
    : paper.study_disciplines;
  if (disc?.name_bn) {
    return { id: disc.id || disc.name_bn, name: disc.name_bn };
  }
  if (paper.name_bn) {
    return { id: paper.id || paper.name_bn, name: paper.name_bn };
  }
  return { id: "other", name: "অন্যান্য বিষয়" };
}

// ─── Question List (per tab) ──────────────────────────────────────────

const QuestionList = memo(function QuestionList({
  questions,
  loading,
  hasMore,
  activeTab,
  entity,
  batchDisplay,
  file,
  user,
  disciplineCounts,
}: {
  questions: any[];
  loading: boolean;
  hasMore: boolean;
  activeTab: TabType;
  entity: EntityInfo;
  batchDisplay: string | null;
  file: any;
  user?: { uid: string } | null;
  disciplineCounts?: { id: string; name: string; count: number }[];
}) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);

  const disciplines = useMemo(() => {
    if (disciplineCounts && disciplineCounts.length > 0) {
      return [...disciplineCounts].sort((a, b) => {
        if (a.id === "other") return 1;
        if (b.id === "other") return -1;
        return a.name.localeCompare(b.name, "bn");
      });
    }
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const q of questions) {
      const disc = getDisciplineInfo(q);
      const existing = map.get(disc.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(disc.id, { id: disc.id, name: disc.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === "other") return 1;
      if (b.id === "other") return -1;
      return a.name.localeCompare(b.name, "bn");
    });
  }, [questions, disciplineCounts]);

  const effectiveSelected = useMemo(() => {
    if (selectedDiscipline && disciplines.some((d) => d.id === selectedDiscipline)) {
      return selectedDiscipline;
    }
    return null;
  }, [selectedDiscipline, disciplines]);

  if (questions.length === 0 && !loading) {
    return <EmptyState message="এই ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।" />;
  }

  const filteredQuestions = useMemo(() => {
    if (!effectiveSelected) return questions;
    return questions.filter((q) => getDisciplineInfo(q).id === effectiveSelected);
  }, [questions, effectiveSelected]);

  const sortedQuestions = useMemo(() => {
    return [...filteredQuestions].sort((a, b) => {
      const discA = getDisciplineInfo(a);
      const discB = getDisciplineInfo(b);
      if (discA.name !== discB.name) {
        if (discA.id === "other") return 1;
        if (discB.id === "other") return -1;
        return discA.name.localeCompare(discB.name, "bn");
      }
      return (a.sequence_order ?? 0) - (b.sequence_order ?? 0);
    });
  }, [filteredQuestions]);

  let lastDisciplineId = "";

  return (
    <div className="space-y-6">
      {disciplines.length >= 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDiscipline(null)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border",
              effectiveSelected === null
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary",
            )}
          >
            সকল বিষয় ({questions.length})
          </button>
          {disciplines.map((disc) => (
            <button
              key={disc.id}
              onClick={() => setSelectedDiscipline(disc.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border",
                effectiveSelected === disc.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary",
              )}
            >
              {disc.name} ({disc.count})
            </button>
          ))}
        </div>
      )}

      {sortedQuestions.map((q: any, i: number) => {
        const disc = getDisciplineInfo(q);
        const showHeader = disc.id !== lastDisciplineId;
        if (showHeader) {
          lastDisciplineId = disc.id;
        }

        return (
          <div key={q.id} className="space-y-4">
            {showHeader && (
              <div className="flex items-center gap-3 pt-4 pb-2 border-b-2 border-primary/20">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{disc.name}</h2>
              </div>
            )}

            {activeTab === "mcq" ? (
              <McqCard
                question={q}
                index={i}
                entity={entity}
                batchDisplay={batchDisplay}
                file={file}
                user={user}
              />
            ) : activeTab === "written" ? (
              <WrittenCard
                question={q}
                index={i}
                entity={entity}
                batchDisplay={batchDisplay}
                file={file}
                user={user}
              />
            ) : (
              <CqCard
                question={q}
                index={i}
                entity={entity}
                batchDisplay={batchDisplay}
                file={file}
                user={user}
              />
            )}
          </div>
        );
      })}

      {loading && (
        <div className="flex justify-center py-6">
          <LoadingSpinner message="আরো প্রশ্ন লোড হচ্ছে..." />
        </div>
      )}

      {!hasMore && sortedQuestions.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          সব প্রশ্ন দেখানো হয়েছে ({sortedQuestions.length} টি)
        </p>
      )}
    </div>
  );
});

// ─── Shared Sub-Components ────────────────────────────────────────────

function QuestionBadges({
  index,
  extraBadges,
  questionId,
  questionType,
  user,
}: {
  index: number;
  extraBadges?: React.ReactNode;
  questionId: string;
  questionType: string;
  user?: { uid: string } | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="font-mono">
          #{index + 1}
        </Badge>
        {extraBadges}
      </div>
      {user?.uid && questionId && (
        <ReportQuestionModal
          questionId={questionId}
          questionType={questionType}
          studentId={user.uid}
          buttonClassName="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
        />
      )}
    </div>
  );
}

function ImageList({ images, alt }: { images?: string[] | null; alt: string }) {
  if (!images || images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt={alt}
          className="max-h-80 rounded-xl border border-border bg-white dark:bg-white p-1 object-contain shadow-sm"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-card border rounded-3xl p-12 text-center space-y-4 shadow-sm">
      <FileText className="h-16 w-16 text-muted-foreground/60 mx-auto" />
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground">কোনো প্রশ্ন পাওয়া যায়নি</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
      </div>
    </div>
  );
}

function QuestionFooterBadges({ q }: { q: any }) {
  const paperName = q.curriculum_papers?.name_bn || q.curriculum_papers?.name_en;
  const chapterName = q.paper_chapters?.name;
  const topicName = q.chapter_topics?.name;
  const typeName = q.question_types?.name;

  if (!paperName && !chapterName && !topicName && !typeName) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/70 flex flex-wrap gap-2 items-center">
      {paperName && (
        <Badge
          variant="outline"
          className="text-xs bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          {paperName}
        </Badge>
      )}
      {chapterName && (
        <Badge
          variant="outline"
          className="text-xs bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
        >
          <Layers className="w-3 h-3 mr-1" />
          {chapterName}
        </Badge>
      )}
      {topicName && (
        <Badge
          variant="outline"
          className="text-xs bg-teal-50/50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800"
        >
          <FileText className="w-3 h-3 mr-1" />
          {topicName}
        </Badge>
      )}
      {typeName && (
        <Badge
          variant="outline"
          className="text-xs bg-purple-50/50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
        >
          <Tag className="w-3 h-3 mr-1" />
          {typeName}
        </Badge>
      )}
    </div>
  );
}

// ─── MCQ Card ─────────────────────────────────────────────────────────

function McqCard({
  question: q,
  index,
  entity,
  batchDisplay,
  file,
  user,
}: {
  question: McqQuestion;
  index: number;
  entity: EntityInfo;
  batchDisplay: string | null;
  file: any;
  user?: { uid: string } | null;
}) {
  const paperName = q.curriculum_papers?.name_bn;
  const chapterName = q.paper_chapters?.name;

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <QuestionBadges index={index} questionId={q.id} questionType="mcq" user={user} />

        <div className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
          {q.question && <LatexRenderer html={q.question} />}
          {!q.question && (!q.question_image || q.question_image.length === 0) && (
            <span className="text-muted-foreground italic text-sm">(প্রশ্নের টেক্সট বা ছবি নেই)</span>
          )}
          <ImageList images={q.question_image} alt="Question" />
        </div>

        {q.question_options && q.question_options.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {q.question_options.map((opt, oi) => (
              <div
                key={opt.id}
                className={cn(
                  "p-2.5 sm:p-3.5 rounded-xl border flex items-start gap-2.5 sm:gap-3 transition-all shadow-sm",
                  opt.is_correct
                    ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 dark:border-emerald-500/60 text-emerald-950 dark:text-emerald-200 font-semibold"
                    : "bg-background/80 dark:bg-card/40 border-border/80 text-foreground hover:border-border",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold border shadow-sm",
                    opt.is_correct
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-700 dark:border-emerald-400"
                      : "bg-muted text-muted-foreground border-border/50",
                  )}
                >
                  {String.fromCharCode(2453 + oi)}
                </span>
                <div className="flex-1 text-xs sm:text-sm pt-0.5 space-y-2">
                  {opt.option_text && <LatexRenderer html={opt.option_text} />}
                  <ImageList images={opt.option_image} alt="Option" />
                </div>
              </div>
            ))}
          </div>
        )}

        {(q.explanation || (q.explanation_image && q.explanation_image.length > 0)) && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
              ব্যাখ্যা (Explanation)
            </h4>
            {q.explanation && (
              <MarkdownRenderer
                className="text-sm sm:text-base text-amber-950 dark:text-amber-200 leading-relaxed"
                content={q.explanation}
              />
            )}
            <ImageList images={q.explanation_image} alt="Explanation" />
          </div>
        )}

        <QuestionFooterBadges q={q} />
      </CardContent>
    </Card>
  );
}

// ─── Written Card ─────────────────────────────────────────────────────

function WrittenCard({
  question: q,
  index,
  entity,
  batchDisplay,
  file,
  user,
}: {
  question: WrittenQuestion;
  index: number;
  entity: EntityInfo;
  batchDisplay: string | null;
  file: any;
  user?: { uid: string } | null;
}) {
  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <QuestionBadges index={index} questionId={q.id} questionType="written" user={user} />

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">প্রশ্ন</h4>
          <div className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
            {q.question && <LatexRenderer html={q.question} />}
            {!q.question && (!q.question_image || q.question_image.length === 0) && (
              <span className="text-muted-foreground italic text-sm">(প্রশ্নের টেক্সট বা ছবি নেই)</span>
            )}
            <ImageList images={q.question_image} alt="Question" />
          </div>
        </div>

        {(q.answer || (q.answer_image && q.answer_image.length > 0)) && (
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">
              উত্তর
            </h4>
            {q.answer && (
              <MarkdownRenderer
                className="text-sm sm:text-base text-emerald-950 dark:text-emerald-200 leading-relaxed"
                content={q.answer}
              />
            )}
            <ImageList images={q.answer_image} alt="Answer" />
          </div>
        )}

        <QuestionFooterBadges q={q} />
      </CardContent>
    </Card>
  );
}

// ─── CQ Card ──────────────────────────────────────────────────────────

function CqCard({
  question: q,
  index,
  entity,
  batchDisplay,
  file,
  user,
}: {
  question: CqQuestion;
  index: number;
  entity: EntityInfo;
  batchDisplay: string | null;
  file: any;
  user?: { uid: string } | null;
}) {
  const subQuestions = [
    { q: q.question_1, qImg: q.question_image_1, a: q.answer_1, aImg: q.answer_image_1 },
    { q: q.question_2, qImg: q.question_image_2, a: q.answer_2, aImg: q.answer_image_2 },
    { q: q.question_3, qImg: q.question_image_3, a: q.answer_3, aImg: q.answer_image_3 },
    { q: q.question_4, qImg: q.question_image_4, a: q.answer_4, aImg: q.answer_image_4 },
  ];

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <QuestionBadges index={index} questionId={q.id} questionType="cq" user={user} />

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            উপপ্রশ্ন
          </h4>
          <div className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
            {q.stem && <LatexRenderer html={q.stem} />}
            {!q.stem && (!q.stem_image || q.stem_image.length === 0) && (
              <span className="text-muted-foreground italic text-sm">
                (উপপ্রশ্নের টেক্সট বা ছবি নেই)
              </span>
            )}
            <ImageList images={q.stem_image} alt="Stem" />
          </div>
        </div>

        <div className="space-y-3">
          {subQuestions.map(
            (sq, si) =>
              (sq.q || sq.qImg || sq.a || sq.aImg) && (
                <div
                  key={si}
                  className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {SUB_QUESTION_LABELS[si]}
                    </span>
                    <div className="text-sm sm:text-base font-medium leading-relaxed flex-1 text-foreground">
                      {sq.q && <LatexRenderer html={sq.q} />}
                      <ImageList images={sq.qImg} alt={`Sub-question ${SUB_QUESTION_LABELS[si]}`} />
                    </div>
                  </div>

                  {(sq.a || (sq.aImg && sq.aImg.length > 0)) && (
                    <div className="ml-9 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
                      <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">
                        উত্তর
                      </h5>
                      {sq.a && (
                        <MarkdownRenderer
                          className="text-sm sm:text-base text-emerald-950 dark:text-emerald-200 leading-relaxed"
                          content={sq.a}
                        />
                      )}
                      <ImageList images={sq.aImg} alt={`Answer ${SUB_QUESTION_LABELS[si]}`} />
                    </div>
                  )}
                </div>
              ),
          )}
        </div>

        <QuestionFooterBadges q={q} />
      </CardContent>
    </Card>
  );
}
