import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { setExamActive } from "@/lib/exam-mode";
import { useAuth } from "@/context/AuthContext";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  QUESTIONS_PER_PAGE,
  QUESTIONS_PER_PAGE_MOBILE,
  CRITICAL_TIME_THRESHOLD,
  TIMER_CLASSES,
  BREAKPOINTS,
} from "@/lib/examConstants";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  Flag,
  Eye,
  Send,
  Loader2,
  FileText,
  Layers,
  Tag,
  PenLine,
  ChevronRight,
  Home,
  GraduationCap,
  RotateCw,
  Trophy,
  ListChecks,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ─── Interfaces ───────────────────────────────────────────────────────

interface Option {
  id: string;
  option_text: string | null;
  option_image: string[] | null;
  is_correct: boolean;
  option_order: number;
}

interface McqQuestion {
  id: string;
  question: string | null;
  question_image: string[] | null;
  explanation: string | null;
  explanation_image: string[] | null;
  paper_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  type_id: number | null;
  sequence_order: number | null;
  curriculum_papers?: {
    id: string;
    name_bn: string;
    name_en: string;
    discipline_id: string | null;
    study_disciplines?: {
      id: string;
      name_bn: string;
      name_en: string;
      short_code: string;
    } | null;
  } | null;
  paper_chapters?: { name: string } | null;
  chapter_topics?: { name: string } | null;
  question_types?: { name: string } | null;
  question_options: Option[];
}

interface EntityInfo {
  type: "university" | "cluster" | "college";
  id: string;
  slug: string;
  name_bn: string;
  name_en: string;
  short_name_en?: string | null;
  short_name_bn?: string | null;
  logo_url?: string | null;
}

interface DisciplineGroup {
  id: string;
  name: string;
  count: number;
}

// ─── Helper Functions ─────────────────────────────────────────────────

function getDisciplineInfo(q: McqQuestion): { id: string; name: string } {
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

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// ─── Helper Components ────────────────────────────────────────────────

function ImageList({ images, alt }: { images?: string[] | null; alt: string }) {
  if (!images || images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt={alt}
          className="max-h-60 rounded-md border bg-white dark:bg-white p-1 object-contain"
        />
      ))}
    </div>
  );
}

function QuestionFooterBadges({ q }: { q: McqQuestion }) {
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

// ─── Main QB Exam Component ──────────────────────────────────────────

export default function QbExamPage() {
  const { slug, unitSlug, year } = useParams<{
    slug: string;
    unitSlug: string;
    year: string;
  }>();

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // ─── Data Loading State ───────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<EntityInfo | null>(null);
  const [unit, setUnit] = useState<any>(null);
  const [batchDisplay, setBatchDisplay] = useState<string | null>(null);
  const [allQuestions, setAllQuestions] = useState<McqQuestion[]>([]);

  // Exam flow states: 'setup' | 'exam' | 'result'
  const [mode, setMode] = useState<"setup" | "exam" | "result">("setup");

  // ─── Setup State ──────────────────────────────────────────────────
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>("30");
  const [doShuffle, setDoShuffle] = useState<boolean>(false);

  // ─── Active Exam State ────────────────────────────────────────────
  const [examQuestions, setExamQuestions] = useState<McqQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: string]: number }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // ─── Result State ─────────────────────────────────────────────────
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");

  // ─── Mobile detection ─────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const questionsPerPage = isMobile ? QUESTIONS_PER_PAGE_MOBILE : QUESTIONS_PER_PAGE;
  const totalPages = Math.ceil(examQuestions.length / questionsPerPage);
  const startIndex = currentPageIndex * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentPageQuestions = examQuestions.slice(startIndex, endIndex);

  // ─── Load Data ────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!slug || !unitSlug || !year) return;

      try {
        setLoading(true);

        // Fetch Entity
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
              .select(
                "id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, category",
              )
              .is("deleted_at", null)
              .eq("slug", slug)
              .maybeSingle();
            if (collegeRes.data) {
              entityRow = collegeRes.data;
              entityType = "college";
            }
          }
        }

        if (!entityRow) {
          if (isMounted) setError("প্রতিষ্ঠান পাওয়া যায়নি।");
          return;
        }

        const eInfo: EntityInfo = {
          type: entityType,
          id: entityRow.id,
          slug: entityRow.slug,
          name_bn: entityRow.name_bn,
          name_en: entityRow.name_en,
          short_name_en: entityRow.short_name_en,
          short_name_bn: entityRow.short_name_bn,
          logo_url: entityRow.logo_url,
        };

        const fkColumn =
          entityType === "university"
            ? "university_id"
            : entityType === "cluster"
              ? "cluster_id"
              : "college_id";

        // Fetch Unit
        let { data: unitData } = await supabase
          .from("admission_units")
          .select("*")
          .is("deleted_at", null)
          .eq(fkColumn, entityRow.id)
          .eq("unit_slug", unitSlug)
          .maybeSingle();

        if (!unitData) {
          const { data: fallbackUnit } = await supabase
            .from("admission_units")
            .select("*")
            .is("deleted_at", null)
            .eq(fkColumn, entityRow.id)
            .eq("id", unitSlug)
            .maybeSingle();
          unitData = fallbackUnit;
        }

        if (!unitData) {
          if (isMounted) setError("ইউনিট পাওয়া যায়নি।");
          return;
        }

        // Fetch Batch
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
          const fullYear = batchMatch.year;
          if (fullYear) {
            setBatchDisplay(`${fullYear}-${String(fullYear + 1).slice(-2)}`);
          } else {
            setBatchDisplay(batchMatch.name || year);
          }
        }

        // Batch access check (first FREE_BATCHES years are free)
        if (batchMatch?.year) {
          const { data: unitFiles } = await supabase
            .from("qb_files")
            .select("year_id, batches!inner(id, year)")
            .eq(fkColumn, eInfo.id)
            .eq("unit_id", unitData.id);

          const sortedYears = [
            ...new Set(
              (unitFiles || [])
                .map((f: any) => f.batches?.year as number | undefined)
                .filter((y): y is number => y != null),
            ),
          ].sort((a, b) => b - a);

          const batchRank = sortedYears.indexOf(batchMatch.year);
          if (batchRank >= 3) {
            if (isMounted) setError("locked");
            return;
          }
        }

        // Fetch qb_file
        let fileQuery = supabase
          .from("qb_files")
          .select("*, batch:batches(id, name, year)")
          .eq(fkColumn, eInfo.id)
          .eq("unit_id", unitData.id);

        if (targetBatchId) {
          fileQuery = fileQuery.eq("year_id", targetBatchId);
        }

        const { data: fileData } = await fileQuery.limit(1).maybeSingle();

        if (!fileData) {
          if (isMounted) setError("প্রশ্নপত্রের ফাইল পাওয়া যায়নি।");
          return;
        }

        // Fetch all questions_mcq for file
        const { data: mcqData, error: mcqErr } = await supabase
          .from("questions_mcq")
          .select(
            `
            *,
            question_options (id, option_text, option_image, is_correct, option_order),
            curriculum_papers (
              id, name_bn, name_en, discipline_id,
              study_disciplines (id, name_bn, name_en, short_code)
            ),
            paper_chapters (name),
            chapter_topics (name),
            question_types (name)
          `,
          )
          .eq("file_id", fileData.id)
          .order("sequence_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (mcqErr) throw mcqErr;

        const formattedQuestions: McqQuestion[] = (mcqData || []).map((q: any) => ({
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
          // Sort options by option_order
          question_options: Array.isArray(q.question_options)
            ? [...q.question_options].sort((a, b) => (a.option_order ?? 0) - (b.option_order ?? 0))
            : [],
        }));

        if (isMounted) {
          setEntity(eInfo);
          setUnit(unitData);
          setAllQuestions(formattedQuestions);

          // Default: all available disciplines selected
          const uniqueSubjIds = Array.from(
            new Set(formattedQuestions.map((q) => getDisciplineInfo(q).id)),
          );
          setSelectedSubjects(uniqueSubjIds);
        }
      } catch (err: any) {
        console.error("Error loading exam questions:", err);
        if (isMounted) setError(err.message || "ডেটা লোড করতে সমস্যা হয়েছে।");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug, unitSlug, year]);

  // ─── Available Disciplines ────────────────────────────────────────
  const availableDisciplines: DisciplineGroup[] = useMemo(() => {
    const map = new Map<string, DisciplineGroup>();
    for (const q of allQuestions) {
      const disc = getDisciplineInfo(q);
      if (!map.has(disc.id)) {
        map.set(disc.id, { id: disc.id, name: disc.name, count: 1 });
      } else {
        map.get(disc.id)!.count += 1;
      }
    }
    return Array.from(map.values());
  }, [allQuestions]);

  const toggleSubject = (subjId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjId) ? prev.filter((id) => id !== subjId) : [...prev, subjId],
    );
  };

  // ─── Start Exam ───────────────────────────────────────────────────
  const handleStartExam = () => {
    if (selectedSubjects.length === 0) {
      toast({ title: "কমপক্ষে একটি বিষয় নির্বাচন করুন", variant: "destructive" });
      return;
    }
    const mins = parseInt(duration, 10);
    if (isNaN(mins) || mins <= 0) {
      toast({ title: "সঠিক সময় দিন (মিনিটে)", variant: "destructive" });
      return;
    }

    let filtered = allQuestions.filter((q) => selectedSubjects.includes(getDisciplineInfo(q).id));

    if (doShuffle) {
      filtered = shuffleArray(filtered);
    }

    setExamQuestions(filtered);
    setSelectedAnswers({});
    setMarkedForReview(new Set());
    setCurrentPageIndex(0);
    setTimeLeft(mins * 60);
    setMode("exam");
  };

  // ─── Exam mode flag (hides mobile bottom nav) ────────────────────
  useEffect(() => {
    setExamActive(mode === "exam");
    return () => setExamActive(false);
  }, [mode]);

  // ─── Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "exam" || timeLeft === null || isSubmitting) return;

    if (timeLeft <= 1) {
      handleSubmitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, timeLeft, isSubmitting]);

  // ─── Time Warning ─────────────────────────────────────────────────
  const showTimeWarning = useMemo(() => {
    if (timeLeft === null || !duration) return false;
    const totalSecs = parseInt(duration, 10) * 60;
    const tenPercent = totalSecs * 0.1;
    return timeLeft <= tenPercent && timeLeft > 60;
  }, [timeLeft, duration]);

  const showCriticalWarning = useMemo(() => {
    if (timeLeft === null) return false;
    return timeLeft <= 60;
  }, [timeLeft]);

  useEffect(() => {
    if (showTimeWarning) {
      setTimeout(
        () =>
          toast({
            title: "⏱️ সময় শেষ হওয়ার সতর্কতা",
            description: "মাত্র ১০% সময় বাকি আছে। দ্রুত উত্তর সম্পন্ন করুন।",
            variant: "destructive",
          }),
        0,
      );
    }
  }, [showTimeWarning, toast]);

  useEffect(() => {
    if (showCriticalWarning) {
      setTimeout(
        () =>
          toast({
            title: "🚨 জরুরি: সময় শেষ হতে চলেছে",
            description: "মাত্র ১ মিনিট বাকি। পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হবে।",
            variant: "destructive",
          }),
        0,
      );
    }
  }, [showCriticalWarning, toast]);

  // ─── Answer Selection (with locking) ─────────────────────────────
  const handleAnswerSelect = useCallback(
    (questionId: string, optionIndex: number) => {
      if (mode !== "exam") return;
      // Lock answer once selected
      if (selectedAnswers[questionId] !== undefined) return;
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
      setMarkedForReview((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    },
    [mode, selectedAnswers],
  );

  const toggleMarkForReview = useCallback((questionId: string) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const { attemptedCount } = useMemo(
    () => ({
      attemptedCount: Object.keys(selectedAnswers).length,
      unattemptedCount: examQuestions.length - Object.keys(selectedAnswers).length,
    }),
    [selectedAnswers, examQuestions.length],
  );

  const getAnswerStatus = (questionId: string) => {
    if (markedForReview.has(questionId)) return "marked";
    if (selectedAnswers[questionId] !== undefined) return "attempted";
    return "unattempted";
  };

  // ─── Submit Exam ──────────────────────────────────────────────────
  const handleSubmitExam = useCallback(async () => {
    setIsSubmitting(true);
    setMode("result");
    setResultFilter("all");
    toast({ title: "পরীক্ষা সম্পন্ন হয়েছে!", description: "আপনার ফলাফল নিচে দেখুন।" });
    setIsSubmitting(false);
  }, [toast]);

  // ─── Result Metrics ───────────────────────────────────────────────
  const { correctAnswers, wrongAnswers, unattempted, finalScore, negativeMarks, marksFromCorrect } =
    useMemo(() => {
      let correct = 0;
      let wrong = 0;

      for (const q of examQuestions) {
        const selectedIndex = selectedAnswers[q.id];
        if (selectedIndex !== undefined) {
          const correctIndex = q.question_options.findIndex((o) => o.is_correct);
          if (selectedIndex === correctIndex) {
            correct++;
          } else {
            wrong++;
          }
        }
      }

      const unattemptedCount = examQuestions.length - (correct + wrong);
      const negativePerWrong = 0.25; // default for QB practice
      const marksPerQ = 1;
      const totalNegative = wrong * negativePerWrong;
      const score = correct * marksPerQ - totalNegative;

      return {
        correctAnswers: correct,
        wrongAnswers: wrong,
        unattempted: unattemptedCount,
        finalScore: score,
        negativeMarks: totalNegative,
        marksFromCorrect: correct * marksPerQ,
      };
    }, [examQuestions, selectedAnswers]);

  const { wrongQuestionIds, skippedQuestionIds } = useMemo(() => {
    const answeredIds = Object.keys(selectedAnswers);
    const wrong: string[] = [];
    const skipped: string[] = [];

    examQuestions.forEach((q) => {
      if (!q.id) return;
      if (answeredIds.includes(q.id)) {
        const correctIndex = q.question_options.findIndex((o) => o.is_correct);
        if (selectedAnswers[q.id] !== correctIndex) {
          wrong.push(q.id);
        }
      } else {
        skipped.push(q.id);
      }
    });

    return { wrongQuestionIds: wrong, skippedQuestionIds: skipped };
  }, [examQuestions, selectedAnswers]);

  const filteredResultQuestions = useMemo(() => {
    if (resultFilter === "all") return examQuestions;
    return examQuestions.filter((q) => {
      const userAnswer = selectedAnswers[q.id!];
      const isSkipped = userAnswer === undefined;
      const correctIndex = q.question_options.findIndex((o) => o.is_correct);
      const isCorrect = userAnswer === correctIndex;

      if (resultFilter === "correct") return !isSkipped && isCorrect;
      if (resultFilter === "wrong") return !isSkipped && !isCorrect;
      if (resultFilter === "skipped") return isSkipped;
      return false;
    });
  }, [resultFilter, examQuestions, selectedAnswers]);

  const totalMarks = examQuestions.length;

  const pieData = [
    { name: "সঠিক উত্তর", value: correctAnswers, color: "#22c55e" },
    { name: "ভুল উত্তর", value: wrongAnswers, color: "#ef4444" },
    { name: "চেষ্টা করেননি", value: unattempted, color: "#eab308" },
  ];

  // ─── Loading / Error ──────────────────────────────────────────────
  if (loading) return <LoadingSpinner message="প্র্যাকটিস পরীক্ষার প্রশ্ন লোড হচ্ছে..." />;

  if (error === "locked") {
    return (
      <div className="min-h-screen bg-background font-bengali flex flex-col justify-between">
        <Header />
        <div className="container mx-auto p-8 max-w-xl text-center space-y-4 my-12">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">প্রিমিয়াম কনটেন্ট</h2>
          <p className="text-muted-foreground">
            এই ব্যাচের প্রশ্নগুলো প্রিমিয়াম। এই ফিচারটি শীঘ্রই উন্মুক্ত করা হবে!
          </p>
          <Button asChild variant="outline">
            <Link to={slug && unitSlug ? `/qb/${slug}/${unitSlug}` : "/qb"}>ফিরে যান</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !entity || !unit) {
    return (
      <div className="min-h-screen bg-background font-bengali flex flex-col justify-between">
        <Header />
        <div className="container mx-auto p-8 max-w-xl text-center space-y-4 my-12">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">ত্রুটি ঘটেছে</h2>
          <p className="text-muted-foreground">{error || "ডেটা পাওয়া যায়নি।"}</p>
          <Button asChild variant="outline">
            <Link to="/qb">প্রশ্নব্যাংকে ফিরে যান</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const shortNameDisplay = entity.short_name_bn || entity.short_name_en || "";
  const sessionLabel = batchDisplay || year;

  return (
    <>
      <Helmet>
        <title>
          {unit.unit_name_bn} - প্র্যাকটিস পরীক্ষা | {entity.name_bn}
        </title>
      </Helmet>

      <div className="min-h-screen bg-background font-bengali flex flex-col">
        {mode !== "exam" && <Header />}

        <main className="flex-1">
          {/* ─── PHASE 1: SETUP MODE ─────────────────────────────────── */}
          {mode === "setup" && (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-4xl space-y-6">
              {/* Breadcrumb */}
              <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Link
                  to="/"
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Home className="h-3.5 w-3.5" /> হোম
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
                <Link
                  to={`/qb/${entity.slug}/${unitSlug}`}
                  className="hover:text-primary transition-colors"
                >
                  {unit.unit_name_bn}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{sessionLabel} প্র্যাকটিস পরীক্ষা</span>
              </nav>

              {/* Header Card */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-background/90 p-3 border border-border/80 shadow-md flex items-center justify-center shrink-0">
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
                  <div className="text-center sm:text-left space-y-2 grow">
                    <span className="text-xs font-semibold text-primary/80 uppercase tracking-wide">
                      {entity.name_bn} {shortNameDisplay ? `(${shortNameDisplay})` : ""}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                      {unit.unit_name_bn}: {sessionLabel} কাস্টম প্র্যাকটিস পরীক্ষা
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      পছন্দমতো বিষয় ও সময় নির্ধারণ করে পরীক্ষা শুরু করুন। এটি একটি প্র্যাকটিস পরীক্ষা — কোনো ডেটা
                      সেভ হবে না।
                    </p>
                  </div>
                </div>
              </div>

              {/* Setup Card */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      বিষয় নির্বাচন করুন
                    </h2>
                    <div
                      onClick={() => {
                        if (selectedSubjects.length === availableDisciplines.length) {
                          setSelectedSubjects([]);
                        } else {
                          setSelectedSubjects(availableDisciplines.map((d) => d.id));
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors text-xs font-semibold text-primary"
                    >
                      <Checkbox
                        checked={
                          availableDisciplines.length > 0 &&
                          selectedSubjects.length === availableDisciplines.length
                        }
                        onCheckedChange={(val) => {
                          if (val) {
                            setSelectedSubjects(availableDisciplines.map((d) => d.id));
                          } else {
                            setSelectedSubjects([]);
                          }
                        }}
                      />
                      <span>সবগুলো সিলেক্ট করুন</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    যে বিষয়গুলোর ওপর প্র্যাকটিস পরীক্ষা দিতে চান সেগুলোতে টিক চিহ্ন দিন।
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {availableDisciplines.map((disc) => {
                      const checked = selectedSubjects.includes(disc.id);
                      return (
                        <div
                          key={disc.id}
                          onClick={() => toggleSubject(disc.id)}
                          className={cn(
                            "p-2.5 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 cursor-pointer transition-all",
                            checked
                              ? "bg-primary/10 border-primary/40 font-semibold"
                              : "bg-card border-border/80 hover:border-border",
                          )}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSubject(disc.id)}
                              className="shrink-0"
                            />
                            <Label className="cursor-pointer text-xs sm:text-sm font-medium text-foreground truncate">
                              {disc.name}
                            </Label>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] sm:text-xs font-mono shrink-0 px-1.5 py-0.5"
                          >
                            {disc.count} টি
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
                    <div className="space-y-2">
                      <Label
                        htmlFor="duration"
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        <Clock className="h-4 w-4 text-primary" />
                        পরীক্ষার সময় (মিনিট)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="180"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2 flex flex-col justify-end">
                      <div
                        onClick={() => setDoShuffle((prev) => !prev)}
                        className={cn(
                          "p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all",
                          doShuffle
                            ? "bg-primary/10 border-primary/40"
                            : "bg-card border-border/80",
                        )}
                      >
                        <Checkbox
                          checked={doShuffle}
                          onCheckedChange={(val) => setDoShuffle(!!val)}
                        />
                        <Label className="cursor-pointer text-sm font-medium text-foreground">
                          প্রশ্নগুলো এলোমেলো (Shuffle) করে সাজান
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between flex-wrap gap-3">
                    <Button asChild variant="outline" size="lg" className="gap-2">
                      <Link to={`/qb/${slug}/${unitSlug}/${sessionLabel}`}>
                        <ArrowLeft className="h-4 w-4" /> প্রশ্নপত্র দেখুন
                      </Link>
                    </Button>
                    <Button size="lg" onClick={handleStartExam} className="gap-2 font-bold px-8">
                      <PenLine className="h-4 w-4" /> পরীক্ষা শুরু করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── PHASE 2: ACTIVE EXAM MODE ─────────────────────────────── */}
          {mode === "exam" && (
            <div className="min-h-screen bg-background flex flex-col font-bengali">
              <div className="container mx-auto p-2 md:p-4 md:pb-8">
                <div>
                  {/* Sticky Header */}
                  <div className="sticky top-0 z-10 py-4 bg-background/95 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <BookOpen className="h-5 w-5" />
                        <div className="hidden sm:block">
                          <h2 className="font-semibold">
                            {unit.unit_name_bn}: {sessionLabel}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            পৃষ্ঠা {currentPageIndex + 1} / {totalPages}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-xs md:text-sm font-semibold">
                          {attemptedCount}/{examQuestions.length}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={(attemptedCount / examQuestions.length) * 100}
                      className="mt-3 h-1"
                    />
                  </div>

                  {/* Questions for current page */}
                  <div className="space-y-6 mt-2">
                    {currentPageQuestions.map((q, pageIndex) => {
                      const globalIndex = startIndex + pageIndex;
                      const status = getAnswerStatus(q.id);
                      const isAnswered = selectedAnswers[q.id] !== undefined;

                      return (
                        <Card key={q.id} id={`question-${q.id}`} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant="secondary">প্রশ্ন {globalIndex + 1}</Badge>
                                  {isAnswered && (
                                    <Badge variant="default" className="bg-success">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      উত্তরিত
                                    </Badge>
                                  )}
                                  {status === "marked" && (
                                    <Badge variant="outline" className="text-warning">
                                      <Flag className="h-3 w-3 mr-1" />
                                      পর্যালোচনা
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-lg font-semibold leading-relaxed">
                                  <span className="inline">
                                    {q.question && <LatexRenderer html={q.question} />}
                                  </span>
                                  <ImageList images={q.question_image} alt="Question" />
                                </div>
                              </div>
                              <Button
                                variant={status === "marked" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => toggleMarkForReview(q.id)}
                                className={status === "marked" ? "bg-warning" : ""}
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4 p-3">
                            <div className="space-y-3">
                              {q.question_options.map((opt, oi) => {
                                const bengaliLetters = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
                                const letter = bengaliLetters[oi] || String.fromCharCode(65 + oi);
                                const isSelected = selectedAnswers[q.id] === oi;

                                return (
                                  <label
                                    key={opt.id}
                                    className="group flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border-2 transition-all min-h-[48px]"
                                  >
                                    <div
                                      className="flex-shrink-0 pt-0.5"
                                      onClick={(e) => {
                                        if (isAnswered) return;
                                        e.preventDefault();
                                        handleAnswerSelect(q.id, oi);
                                      }}
                                    >
                                      <div
                                        className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${
                                          isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : `border-muted-foreground/30 bg-muted/30 ${!isAnswered ? "group-hover:border-primary/50" : ""}`
                                        }`}
                                      >
                                        {letter}
                                      </div>
                                    </div>

                                    <input
                                      type="radio"
                                      value={oi.toString()}
                                      checked={isSelected}
                                      readOnly
                                      className="hidden"
                                    />
                                    <div className="flex-1 flex flex-col items-start justify-center text-sm md:text-base font-medium break-words text-foreground">
                                      {opt.option_text && <LatexRenderer html={opt.option_text} />}
                                      <ImageList images={opt.option_image} alt="Option" />
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Page Navigation Footer */}
                  <footer
                    id="exam-navigation"
                    className="flex justify-between items-center gap-4 pt-4 mt-6"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPageIndex === 0 || isSubmitting}
                      className="flex-1 md:flex-initial"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      পূর্ববর্তী
                    </Button>

                    <div className="text-sm font-semibold text-muted-foreground hidden md:block">
                      {currentPageIndex + 1} / {totalPages}
                    </div>

                    {currentPageIndex < totalPages - 1 ? (
                      <Button
                        onClick={() => {
                          setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1));
                          window.scrollTo(0, 0);
                        }}
                        disabled={isSubmitting}
                        className="flex-1 md:flex-initial"
                      >
                        পরবর্তী
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitExam}
                        disabled={isSubmitting}
                        className="flex-1 md:flex-initial"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            জমা দেওয়া হচ্ছে...
                          </>
                        ) : (
                          <>
                            জমা দিন
                            <Send className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </footer>
                  <hr className="h-20 border-transparent" />
                </div>
              </div>

              {/* Floating Timer */}
              {timeLeft !== null && (
                <div className="fixed bottom-8 left-4 z-50 flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all text-lg shadow-lg ${
                      (timeLeft || 0) <= CRITICAL_TIME_THRESHOLD
                        ? TIMER_CLASSES.critical
                        : (timeLeft || 0) <= 300
                          ? TIMER_CLASSES.warning
                          : TIMER_CLASSES.normal
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                    <span>{formatTime(timeLeft || 1)}</span>
                  </div>
                </div>
              )}

              {/* Floating Review Button */}
              <Button
                onClick={() => setShowReviewDialog(true)}
                variant="default"
                className="fixed bottom-8 right-4 z-50 h-11 w-11 rounded-full shadow-lg"
                aria-label="পর্যালোচনা খুলুন"
              >
                <Eye className="h-6 w-6" />
              </Button>

              {/* Review Dialog */}
              <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      সমস্ত প্রশ্ন পর্যালোচনা
                    </DialogTitle>
                    <DialogDescription>এক নজরে আপনার পরীক্ষার অবস্থা দেখুন।</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto p-1">
                    {examQuestions.map((q, index) => {
                      const status = getAnswerStatus(q.id);
                      let statusClass = "bg-muted hover:bg-muted/80";
                      if (status === "attempted") {
                        statusClass = "bg-success/80 hover:bg-success text-white";
                      } else if (status === "marked") {
                        statusClass = "bg-warning/80 hover:bg-warning text-white";
                      }
                      return (
                        <Button
                          key={q.id}
                          variant="outline"
                          className={`h-10 w-10 rounded-full ${statusClass}`}
                          onClick={() => {
                            const page = Math.floor(index / questionsPerPage);
                            setCurrentPageIndex(page);
                            setShowReviewDialog(false);
                            setTimeout(() => {
                              document
                                .getElementById(`question-${q.id}`)
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                        >
                          {index + 1}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-success"></div>উত্তরিত
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-muted"></div>অনুত্তরিত
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-warning"></div>পর্যালোচনা
                    </div>
                  </div>
                  <div className="pt-4 flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                      বন্ধ করুন
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleSubmitExam}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> জমা হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" /> পরীক্ষা জমা দিন
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ─── PHASE 3: RESULT MODE ────────────────────────────────── */}
          {mode === "result" && (
            <div className="min-h-screen bg-background flex flex-col font-bengali">
              <div className="container mx-auto px-2 pt-8 pb-2 md:px-4 md:pt-8 md:pb-4">
                <div className="w-full max-w-3xl mx-auto space-y-4">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setMode("setup")}
                      className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
                    >
                      <RotateCw className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>আবার পরীক্ষা দিন</span>
                    </Button>

                    <Button
                      variant="outline"
                      asChild
                      className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
                    >
                      <Link to={`/qb/${slug}/${unitSlug}/${sessionLabel}`}>
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <span>সমাধান দেখুন</span>
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      asChild
                      className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
                    >
                      <Link to={`/qb/${slug}/${unitSlug}`}>
                        <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>প্রশ্নপত্র তালিকা</span>
                      </Link>
                    </Button>
                  </div>

                  {/* Score Card */}
                  <Card className="border shadow-md overflow-hidden bg-card bg-gradient-to-r from-primary/10 to-primary-shift/5 dark:from-primary/20 dark:to-primary-shift/10">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-3 text-center sm:text-left flex-1">
                          <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                              {unit.unit_name_bn}: {sessionLabel}
                            </h1>
                            <p className="text-muted-foreground text-xs mt-1">
                              প্র্যাকটিস পরীক্ষার ফলাফল
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-xs px-3.5 py-1.5 rounded-lg border border-border/40 shadow-2xs">
                            <span className="text-xs font-semibold text-muted-foreground tracking-wider">
                              মোট স্কোর:
                            </span>
                            <span className="text-2xl sm:text-3xl font-extrabold text-success font-sans">
                              {finalScore % 1 === 0 ? finalScore : finalScore.toFixed(2)}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground font-sans">
                              / {totalMarks}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center shrink-0">
                          <div className="h-[120px] w-[120px] sm:h-[130px] sm:w-[130px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Tooltip
                                  formatter={(value: any, name: any) => [`${value} টি`, name]}
                                  contentStyle={{
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border, #333)",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    padding: "6px 10px",
                                    backgroundColor: "var(--color-card, #18181b)",
                                    color: "var(--color-foreground, #fff)",
                                  }}
                                />
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={36}
                                  outerRadius={52}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 md:gap-4">
                    <Card>
                      <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-success">
                          <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                          <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:text-left leading-tight">
                            সঠিক উত্তর
                          </span>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-success font-sans text-center xl:text-left">
                          {correctAnswers}
                        </p>
                        <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:text-left leading-tight">
                          নম্বর: {marksFromCorrect.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                          <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:text-left leading-tight">
                            ভুল উত্তর
                          </span>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive font-sans text-center xl:text-left">
                          {wrongAnswers}
                        </p>
                        <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:text-left leading-tight">
                          {negativeMarks > 0 ? "-" : ""}
                          {negativeMarks.toFixed(2)} মার্ক
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-warning">
                          <HelpCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                          <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:text-left leading-tight">
                            চেষ্টা করেননি
                          </span>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-warning font-sans text-center xl:text-left">
                          {unattempted}
                        </p>
                        <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:text-left leading-tight">
                          মার্ক নেই
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                        <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-primary">
                          <Zap className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                          <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:text-left leading-tight">
                            নেগেটিভ
                          </span>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary font-sans text-center xl:text-left">
                          {negativeMarks > 0 ? "-" : ""}
                          {negativeMarks.toFixed(2)}
                        </p>
                        <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:text-left leading-tight">
                          ভুলে 0.25
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Feedback Alert */}
                  <Alert
                    className={`mb-8 border ${
                      finalScore >= totalMarks * 0.75
                        ? "bg-success/10 border-success/30 text-foreground"
                        : finalScore >= totalMarks * 0.5
                          ? "bg-warning/10 border-warning/30 text-foreground"
                          : "bg-destructive/10 border-destructive/30 text-foreground"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>ফিডব্যাক:</strong>{" "}
                      {finalScore >= totalMarks * 0.75
                        ? " চমৎকার! আপনি খুব ভালো করেছেন।"
                        : finalScore >= totalMarks * 0.5
                          ? " ভালো! আরও অনুশীলন করুন।"
                          : " আরও মনোযোগ দিয়ে পড়ুন।"}
                    </AlertDescription>
                  </Alert>

                  {/* Detailed Results */}
                  <div className="space-y-6 mt-8">
                    <Card>
                      <CardHeader className="flex flex-col sm:flex-row justify-between items-center">
                        <h2 className="text-2xl font-bold">বিস্তারিত ফলাফল</h2>
                        <div className="flex items-center gap-2 p-1 bg-muted rounded-md">
                          {(["all", "correct", "wrong", "skipped"] as const).map((f) => (
                            <Button
                              key={f}
                              size="sm"
                              variant={resultFilter === f ? "default" : "ghost"}
                              onClick={() => setResultFilter(f)}
                            >
                              {f === "all"
                                ? "সবগুলো"
                                : f === "correct"
                                  ? "সঠিক"
                                  : f === "wrong"
                                    ? "ভুল"
                                    : "স্কিপ"}
                            </Button>
                          ))}
                        </div>
                      </CardHeader>
                    </Card>

                    {filteredResultQuestions.length > 0 ? (
                      filteredResultQuestions.map((q, qIdx) => {
                        const userAnswer = selectedAnswers[q.id];
                        const correctOptIdx = q.question_options.findIndex((o) => o.is_correct);
                        const isSkipped = userAnswer === undefined;
                        const isCorrect = userAnswer === correctOptIdx;

                        return (
                          <Card
                            key={q.id}
                            className={`mb-4 ${
                              isCorrect && !isSkipped
                                ? "bg-success/5 border-l-4 border-success"
                                : isSkipped
                                  ? "bg-warning/5 border-l-4 border-warning"
                                  : "bg-destructive/5 border-l-4 border-destructive"
                            }`}
                          >
                            <CardHeader>
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-2">
                                  <Badge
                                    variant={
                                      isCorrect && !isSkipped
                                        ? "default"
                                        : isSkipped
                                          ? "outline"
                                          : "destructive"
                                    }
                                    className={
                                      isCorrect && !isSkipped
                                        ? "bg-success"
                                        : isSkipped
                                          ? "text-warning border-warning"
                                          : ""
                                    }
                                  >
                                    {isCorrect && !isSkipped
                                      ? "সঠিক"
                                      : isSkipped
                                        ? "উত্তর করা হয়নি"
                                        : "ভুল"}
                                  </Badge>
                                  <div className="text-lg font-semibold">
                                    <span className="mr-2 inline-block">{qIdx + 1}.</span>
                                    <span className="inline">
                                      {q.question && <LatexRenderer html={q.question} />}
                                    </span>
                                    <ImageList images={q.question_image} alt="Question" />
                                  </div>
                                </div>
                                {user?.uid && q.id && (
                                  <ReportQuestionModal
                                    questionId={q.id}
                                    questionType="mcq"
                                    studentId={user.uid}
                                    buttonClassName="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid gap-3">
                                {q.question_options.map((opt, oi) => {
                                  const isSelected = userAnswer === oi;
                                  const isRightAnswer = oi === correctOptIdx;
                                  const bengaliLetters = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

                                  let optionClass = "p-3 rounded-lg border";
                                  if (isRightAnswer) {
                                    optionClass +=
                                      " bg-success/20 border-success text-success-foreground font-medium";
                                  } else if (isSelected && !isRightAnswer) {
                                    optionClass +=
                                      " bg-destructive/20 border-destructive text-destructive-foreground font-medium";
                                  } else {
                                    optionClass += " bg-background border-muted";
                                  }

                                  return (
                                    <div key={opt.id} className={cn(optionClass)}>
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm shrink-0 ${
                                            isRightAnswer
                                              ? "border-success bg-success text-white"
                                              : isSelected
                                                ? "border-destructive bg-destructive text-white"
                                                : "border-muted"
                                          }`}
                                        >
                                          {bengaliLetters[oi] || String.fromCharCode(65 + oi)}
                                        </div>
                                        <div className="flex-1 flex flex-col items-start justify-center text-sm md:text-base font-medium break-words">
                                          {opt.option_text && (
                                            <LatexRenderer html={opt.option_text} />
                                          )}
                                          <ImageList images={opt.option_image} alt="Option" />
                                        </div>
                                        {isRightAnswer && (
                                          <CheckCircle2 className="h-4 w-4 text-success ml-auto" />
                                        )}
                                        {isSelected && !isRightAnswer && (
                                          <AlertCircle className="h-4 w-4 text-destructive ml-auto" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation */}
                              {(q.explanation ||
                                (q.explanation_image && q.explanation_image.length > 0)) && (
                                <div className="mt-4 pb-4 p-4 bg-muted/50 rounded-lg text-sm">
                                  <p className="font-semibold mb-1">ব্যাখ্যা:</p>
                                  {q.explanation && <MarkdownRenderer content={q.explanation} />}
                                  <ImageList images={q.explanation_image} alt="Explanation" />
                                </div>
                              )}

                              {/* Footer Badges */}
                              <QuestionFooterBadges q={q} />
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                          এই ক্যাটাগরিতে কোনো প্রশ্ন পাওয়া যায়নি।
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Bottom nav */}
                  <div className="flex gap-3 pt-4 mt-6 pb-4 md:pb-8">
                    <Button
                      onClick={() => navigate(-1)}
                      variant="outline"
                      className="flex-1 h-12"
                      size="lg"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      পিছনে যান
                    </Button>
                    <Button onClick={() => setMode("setup")} className="flex-1 h-12" size="lg">
                      <PenLine className="h-4 w-4 mr-2" />
                      আবার পরীক্ষা দিন
                    </Button>
                  </div>
                  <hr className="h-16 border-transparent" />
                </div>
              </div>
            </div>
          )}
        </main>

        {mode !== "exam" && <Footer />}
      </div>
    </>
  );
}
