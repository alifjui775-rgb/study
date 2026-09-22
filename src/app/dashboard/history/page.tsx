import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "@/lib/date-utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getAllStudentResults, type StudentExamResult } from "@/lib/queries";
import { PageHeader } from "@/components";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  PenLine,
  RotateCcw,
  Tag,
  Trophy,
  XCircle,
  Zap,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Interfaces ────────────────────────────────────────────────────────

interface Option {
  id: string;
  option_text: string | null;
  option_image: string[] | null;
  is_correct: boolean;
  option_order: number;
}

interface WrongAnswerRecord {
  id: string;
  selected_options: string[] | null;
  created_at: string;
  mcq: {
    id: string;
    question: string | null;
    question_image: string[] | null;
    explanation: string | null;
    explanation_image: string[] | null;
    paper_id: string | null;
    question_options: Option[];
    curriculum_papers?: { id: string; name_bn: string | null; name_en: string | null } | null;
    paper_chapters?: { id: string; name: string } | null;
    chapter_topics?: { id: string; name: string } | null;
  } | null;
}

interface StudentPracticeExamRecord {
  id: string;
  name: string;
  student_id: string;
  status: string;
  score: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unattempted: number | null;
  total_questions: number;
  started_at: string;
  submitted_at: string | null;
  time_minutes: number | null;
  negative_mark: number | null;
  practice_exam_sessions?: { id: string }[] | { id: string } | null;
}

const PAGE_SIZE = 10;
const WRONG_PAGE_SIZE = 50;

const computeCourseScore = (r: StudentExamResult) =>
  r.correct_answers * r.marks_per_question - r.wrong_answers * r.negative_marks_per_wrong;

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"wrong" | "course" | "practice">("wrong");

  // ── 1. Fetch Wrong Answers (student_exam_answers where is_correct = false, 50 at a time) ──
  const [wrongLimit, setWrongLimit] = useState(WRONG_PAGE_SIZE);

  const {
    data: wrongAnswersData,
    isLoading: loadingWrong,
    isFetching: fetchingMoreWrong,
  } = useQuery({
    queryKey: ["student-wrong-answers", user?.uid, wrongLimit],
    queryFn: async () => {
      if (!user?.uid) return { items: [], totalCount: 0 };

      // Exact count
      const { count } = await supabase
        .from("student_exam_answers")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.uid)
        .eq("is_correct", false);

      const { data, error } = await supabase
        .from("student_exam_answers")
        .select(`
          id, selected_options, created_at,
          mcq:questions_mcq (
            id, question, question_image, explanation, explanation_image, paper_id,
            question_options(id, option_text, option_image, is_correct, option_order),
            curriculum_papers(id, name_bn, name_en),
            paper_chapters(id, name),
            chapter_topics(id, name)
          )
        `)
        .eq("student_id", user.uid)
        .eq("is_correct", false)
        .order("created_at", { ascending: false })
        .range(0, wrongLimit - 1);

      if (error) {
        console.error("Failed to fetch wrong answers:", error);
        return { items: [], totalCount: 0 };
      }

      const items = (data || []).filter((item: any) => item.mcq) as unknown as WrongAnswerRecord[];
      return { items, totalCount: count ?? items.length };
    },
    enabled: !!user?.uid,
  });

  const wrongAnswers = wrongAnswersData?.items || [];
  const totalWrongCount = wrongAnswersData?.totalCount || 0;
  const hasMoreWrong = wrongAnswers.length < totalWrongCount;

  // Filter subject pills for wrong answers
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

  const wrongSubjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const item of wrongAnswers) {
      if (item.mcq?.curriculum_papers) {
        const p = item.mcq.curriculum_papers;
        const id = p.id;
        const name = p.name_bn || p.name_en || "অন্যান্য";
        if (map.has(id)) {
          map.get(id)!.count++;
        } else {
          map.set(id, { id, name, count: 1 });
        }
      }
    }
    return Array.from(map.values());
  }, [wrongAnswers]);

  const filteredWrongAnswers = useMemo(() => {
    if (selectedSubjectId === "all") return wrongAnswers;
    return wrongAnswers.filter((item) => item.mcq?.curriculum_papers?.id === selectedSubjectId);
  }, [wrongAnswers, selectedSubjectId]);

  // ── 2. Fetch Course Exam Results ──
  const { data: rawCourseResults = [], isLoading: loadingCourseResults } = useQuery({
    queryKey: ["all-student-results", user?.uid],
    queryFn: () => getAllStudentResults(user?.uid || ""),
    enabled: !!user?.uid,
  });

  const [courseSortBy, setCourseSortBy] = useState<"recent" | "score">("recent");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");

  const courseResults = useMemo(
    () =>
      rawCourseResults.map((r) => ({
        ...r,
        score: computeCourseScore(r),
        totalMarks: (r.correct_answers + r.wrong_answers + r.unattempted) * r.marks_per_question,
      })),
    [rawCourseResults],
  );

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    courseResults.forEach((r) => {
      if (r.course_id && !map.has(r.course_id)) {
        map.set(r.course_id, r.course_title || "পাবলিক পরীক্ষা");
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [courseResults]);

  const filteredCourseResults = useMemo(() => {
    const filtered =
      selectedCourseFilter === "all"
        ? courseResults
        : courseResults.filter((r) => r.course_id === selectedCourseFilter);

    return [...filtered].sort((a, b) =>
      courseSortBy === "score"
        ? b.score - a.score
        : dayjs(b.submitted_at).diff(dayjs(a.submitted_at)),
    );
  }, [courseResults, selectedCourseFilter, courseSortBy]);

  const courseSummary = useMemo(() => {
    const totalAttempts = filteredCourseResults.length;
    const averageScore =
      totalAttempts > 0
        ? filteredCourseResults.reduce((sum, r) => sum + r.score, 0) / totalAttempts
        : 0;
    const bestScore =
      totalAttempts > 0 ? Math.max(...filteredCourseResults.map((r) => r.score)) : 0;
    return { totalAttempts, averageScore, bestScore };
  }, [filteredCourseResults]);

  // ── 3. Fetch Practice Exam History (student_practice_exams) ──
  const { data: practiceExams = [], isLoading: loadingPracticeExams } = useQuery({
    queryKey: ["student-practice-exams", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const { data, error } = await supabase
        .from("student_practice_exams")
        .select(`
          *,
          practice_exam_sessions (id)
        `)
        .eq("student_id", user.uid)
        .order("started_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch student practice exams:", error);
        return [];
      }

      return (data || []) as StudentPracticeExamRecord[];
    },
    enabled: !!user?.uid,
  });

  const [practiceStatusFilter, setPracticeStatusFilter] = useState<string>("all");
  const [practiceSortBy, setPracticeSortBy] = useState<"recent" | "score">("recent");

  const filteredPracticeExams = useMemo(() => {
    const filtered =
      practiceStatusFilter === "all"
        ? practiceExams
        : practiceExams.filter((e) => e.status === practiceStatusFilter);

    return [...filtered].sort((a, b) => {
      if (practiceSortBy === "score") {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return dayjs(b.submitted_at || b.started_at).diff(dayjs(a.submitted_at || a.started_at));
    });
  }, [practiceExams, practiceStatusFilter, practiceSortBy]);

  const practiceSummary = useMemo(() => {
    const totalCount = practiceExams.length;
    const completedCount = practiceExams.filter((e) => e.status === "completed").length;
    const totalQuestionsSolved = practiceExams.reduce(
      (sum, e) => sum + (e.correct_answers || 0) + (e.wrong_answers || 0),
      0,
    );
    const avgScore =
      completedCount > 0
        ? practiceExams
            .filter((e) => e.status === "completed")
            .reduce((sum, e) => sum + (e.score || 0), 0) / completedCount
        : 0;

    return { totalCount, completedCount, totalQuestionsSolved, avgScore };
  }, [practiceExams]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader title="পরীক্ষার হিস্ট্রি" description="লোড হচ্ছে..." />
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
            <span>লোড হচ্ছে...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 space-y-8 max-w-4xl w-full min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        title="পরীক্ষার হিস্ট্রি"
        description="আপনার ভুল করা প্রশ্ন, কোর্সের পরীক্ষার রেকর্ড এবং প্রাকটিস পরীক্ষার ফলাফলসমূহ"
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full min-w-0"
      >
        {/* Main Header Tabs */}
        <TabsList className="grid w-full grid-cols-3 rounded-2xl h-14 bg-muted/60 p-1.5 max-w-2xl mx-auto min-w-0">
          <TabsTrigger
            value="wrong"
            className="rounded-xl font-bold text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <AlertCircle className="h-4 w-4 mr-2 text-rose-500 shrink-0" />
            ভুল দাগানো
          </TabsTrigger>
          <TabsTrigger
            value="course"
            className="rounded-xl font-bold text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <FileText className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
            কোর্সের পরীক্ষা
          </TabsTrigger>
          <TabsTrigger
            value="practice"
            className="rounded-xl font-bold text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <RotateCcw className="h-4 w-4 mr-2 text-emerald-500 shrink-0" />
            প্রাকটিস পরীক্ষা
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: ভুল দাগানো (WRONG ANSWERS) ──────────────────────────────── */}
        <TabsContent value="wrong" className="mt-6 space-y-6 w-full min-w-0">
          {loadingWrong ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-rose-500" />
                <span>ভুল উত্তরসমূহ লোড হচ্ছে...</span>
              </CardContent>
            </Card>
          ) : wrongAnswers.length === 0 ? (
            <Card className="border border-border/80 shadow-xs text-center py-12 px-6">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">কোনো ভুল উত্তর পাওয়া যায়নি!</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    অভিনন্দন! আপনার পরীক্ষার রেকর্ডে কোনো ভুল উত্তর পাওয়া যায়নি।
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Dedicated Horizontal Scroll Container for Subject Filter Pills */}
              <div className="w-full max-w-full min-w-0 bg-muted/40 p-2 sm:p-2.5 rounded-2xl border border-border/60 shadow-2xs overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar scrollbar-none touch-pan-x w-full min-w-0 max-w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectId("all")}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer shadow-2xs",
                      selectedSubjectId === "all"
                        ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-rose-300 hover:text-foreground",
                    )}
                  >
                    সব বিষয় ({wrongAnswers.length})
                  </button>
                  {wrongSubjectOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(opt.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer shadow-2xs",
                        selectedSubjectId === opt.id
                          ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-rose-300 hover:text-foreground",
                      )}
                    >
                      {opt.name} ({opt.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Wrong Questions List (QB Layout Style) */}
              <div className="space-y-5">
                {filteredWrongAnswers.map((item, idx) => {
                  const q = item.mcq;
                  if (!q) return null;

                  const paperName = q.curriculum_papers?.name_bn || q.curriculum_papers?.name_en;
                  const chapterName = q.paper_chapters?.name;
                  const topicName = q.chapter_topics?.name;
                  const selectedOpts = item.selected_options || [];

                  return (
                    <Card
                      key={item.id}
                      className="overflow-hidden border border-border bg-card shadow-xs"
                    >
                      <CardContent className="p-4 sm:p-6 space-y-4">
                        {/* Question Badge Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="font-mono bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200"
                            >
                              #{idx + 1} ভুল উত্তর
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {dayjs(item.created_at).format("DD MMM, YYYY hh:mm A")}
                            </span>
                          </div>
                        </div>

                        {/* Question Text & Images */}
                        <div className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
                          {q.question && <LatexRenderer html={q.question} />}
                          {!q.question && (!q.question_image || q.question_image.length === 0) && (
                            <span className="text-muted-foreground italic text-sm">
                              (প্রশ্নের টেক্সট বা ছবি নেই)
                            </span>
                          )}
                          {q.question_image && q.question_image.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {q.question_image.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt="Question"
                                  className="max-h-80 rounded-xl border border-border bg-white dark:bg-white p-1 object-contain shadow-xs"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Options List */}
                        {q.question_options && q.question_options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.question_options
                              .sort((a, b) => a.option_order - b.option_order)
                              .map((opt, oi) => {
                                const isUserSelectedWrong = selectedOpts.includes(opt.id);

                                return (
                                  <div
                                    key={opt.id}
                                    className={cn(
                                      "p-3 rounded-xl border flex items-start gap-3 transition-all shadow-2xs",
                                      opt.is_correct
                                        ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 text-emerald-950 dark:text-emerald-200 font-semibold"
                                        : isUserSelectedWrong
                                          ? "bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/50 text-rose-950 dark:text-rose-200 font-semibold"
                                          : "bg-background/80 dark:bg-card/40 border-border/80 text-foreground",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold border shadow-2xs",
                                        opt.is_correct
                                          ? "bg-emerald-600 text-white border-emerald-700"
                                          : isUserSelectedWrong
                                            ? "bg-rose-600 text-white border-rose-700"
                                            : "bg-muted text-muted-foreground border-border/50",
                                      )}
                                    >
                                      {String.fromCharCode(2453 + oi)}
                                    </span>
                                    <div className="flex-1 text-xs sm:text-sm pt-0.5 space-y-1">
                                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        {opt.option_text && (
                                          <LatexRenderer
                                            html={opt.option_text}
                                            className="inline"
                                          />
                                        )}
                                        {isUserSelectedWrong && (
                                          <span className="inline-flex items-center text-xs text-rose-600 dark:text-rose-400 font-bold">
                                            (আপনার সিলেক্ট করা উত্তর)
                                          </span>
                                        )}
                                        {opt.is_correct && (
                                          <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                            (সঠিক উত্তর)
                                          </span>
                                        )}
                                      </div>
                                      {opt.option_image && opt.option_image.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          {opt.option_image.map((img, i) => (
                                            <img
                                              key={i}
                                              src={img}
                                              alt="Option"
                                              className="max-h-40 rounded-lg border border-border bg-white dark:bg-white p-1 object-contain"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Explanation Box */}
                        {(q.explanation ||
                          (q.explanation_image && q.explanation_image.length > 0)) && (
                          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                              ব্যাখ্যা (Explanation)
                            </h4>
                            {q.explanation && (
                              <MarkdownRenderer
                                className="text-sm text-amber-950 dark:text-amber-200 leading-relaxed"
                                content={q.explanation}
                              />
                            )}
                            {q.explanation_image && q.explanation_image.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {q.explanation_image.map((img, i) => (
                                  <img
                                    key={i}
                                    src={img}
                                    alt="Explanation"
                                    className="max-h-60 rounded-xl border border-border bg-white dark:bg-white p-1 object-contain shadow-2xs"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Breadcrumb Footer Badges */}
                        {(paperName || chapterName || topicName) && (
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
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Load More Button for Wrong Answers */}
              {hasMoreWrong && (
                <div className="flex flex-col items-center justify-center pt-6 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWrongLimit((prev) => prev + WRONG_PAGE_SIZE)}
                    disabled={fetchingMoreWrong}
                    className="rounded-full px-6 py-2.5 text-xs font-bold bg-background hover:bg-muted border border-border shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    {fetchingMoreWrong ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                    ) : (
                      <Plus className="h-4 w-4 text-rose-500" />
                    )}
                    <span>আরও ৫০টি ভুল প্রশ্ন লোড করুন</span>
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                    {totalWrongCount} টির মধ্যে {wrongAnswers.length} টি দেখানো হচ্ছে
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── TAB 2: কোর্সের পরীক্ষা (COURSE EXAMS) ────────────────────────── */}
        <TabsContent value="course" className="mt-6 space-y-6">
          {loadingCourseResults ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-500" />
                <span>কোর্সের পরীক্ষার রেজাল্ট লোড হচ্ছে...</span>
              </CardContent>
            </Card>
          ) : courseResults.length === 0 ? (
            <Card className="border border-border/80 text-center py-12 px-6">
              <CardContent className="space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground/60 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">কোনো কোর্স পরীক্ষা পাওয়া যায়নি</h3>
                  <p className="text-sm text-muted-foreground">
                    আপনি এখনও কোনো কোর্স পরীক্ষায় অংশ নেননি।
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">মোট পরীক্ষা</p>
                      <p className="text-xl font-extrabold font-sans text-foreground">
                        {courseSummary.totalAttempts}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">গড় স্কোর</p>
                      <p className="text-xl font-extrabold font-sans text-foreground">
                        {courseSummary.averageScore.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">সর্বোচ্চ স্কোর</p>
                      <p className="text-xl font-extrabold font-sans text-foreground">
                        {courseSummary.bestScore.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-2xl border border-border/60">
                <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-background">
                    <SelectValue placeholder="সব কোর্স" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব কোর্স</SelectItem>
                    {courseOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={courseSortBy} onValueChange={(val) => setCourseSortBy(val as any)}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="সর্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">সর্বশেষ পরীক্ষা</SelectItem>
                    <SelectItem value="score">সর্বোচ্চ স্কোর</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Course Exam Cards List */}
              <div className="space-y-4">
                {filteredCourseResults.map((r) => {
                  const percentage = r.totalMarks > 0 ? (r.score / r.totalMarks) * 100 : 0;
                  return (
                    <Card
                      key={r.id}
                      className="border shadow-xs hover:border-primary/40 transition-colors"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-foreground">
                              {r.exam_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.course_title || "পাবলিক পরীক্ষা"} •{" "}
                              {dayjs(r.submitted_at).format("DD MMMM, YYYY hh:mm A")}
                            </p>
                          </div>
                          <Badge className="w-fit text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20 font-bold font-sans">
                            স্কোর: {r.score.toFixed(2)} / {r.totalMarks}
                          </Badge>
                        </div>

                        <Progress value={Math.max(0, percentage)} className="h-2 rounded-full" />

                        <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-xl">
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">সঠিক</p>
                            <p className="text-base font-bold text-emerald-600 font-sans">
                              {r.correct_answers}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">ভুল</p>
                            <p className="text-base font-bold text-rose-600 font-sans">
                              {r.wrong_answers}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">অনুত্তরিত</p>
                            <p className="text-base font-bold text-amber-600 font-sans">
                              {r.unattempted}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Link to={`/courses/${r.course_id}/exams/${r.exam_id}/solve`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs font-semibold"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
                              বিস্তারিত ফলাফল ও সলভ
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── TAB 3: প্রাকটিস পরীক্ষা (PRACTICE EXAMS) ────────────────────────── */}
        <TabsContent value="practice" className="mt-6 space-y-6">
          {loadingPracticeExams ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-emerald-500" />
                <span>প্রাকটিস পরীক্ষার হিস্ট্রি লোড হচ্ছে...</span>
              </CardContent>
            </Card>
          ) : practiceExams.length === 0 ? (
            <Card className="border border-border/80 text-center py-12 px-6">
              <CardContent className="space-y-4">
                <RotateCcw className="h-12 w-12 text-muted-foreground/60 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">কোনো প্রাকটিস পরীক্ষা পাওয়া যায়নি</h3>
                  <p className="text-sm text-muted-foreground">
                    আপনি এখনও কোনো আনলিমিটেড প্রাকটিস পরীক্ষা দেননি।
                  </p>
                </div>
                <Link to="/dashboard/practice">
                  <Button className="rounded-xl font-bold mt-2">
                    <PenLine className="h-4 w-4 mr-2" />
                    প্রাকটিস পরীক্ষা শুরু করুন
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Practice Stats Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">মোট প্রাকটিস পরীক্ষা</p>
                      <p className="text-xl font-extrabold font-sans text-foreground">
                        {practiceSummary.totalCount}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">মোট সমাধান করা প্রশ্ন</p>
                      <p className="text-xl font-extrabold font-sans text-foreground">
                        {practiceSummary.totalQuestionsSolved}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">গড় স্কোর</p>
                      <p className="text-xl font-extrabold font-sans text-foreground">
                        {practiceSummary.avgScore.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-2xl border border-border/60">
                <Select value={practiceStatusFilter} onValueChange={setPracticeStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-background">
                    <SelectValue placeholder="সকল অবস্থা" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল অবস্থা</SelectItem>
                    <SelectItem value="completed">কমপ্লিট</SelectItem>
                    <SelectItem value="ongoing">চলমান</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={practiceSortBy}
                  onValueChange={(val) => setPracticeSortBy(val as any)}
                >
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue placeholder="সর্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">সর্বশেষ পরীক্ষা</SelectItem>
                    <SelectItem value="score">সর্বোচ্চ স্কোর</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Practice Exams Cards List */}
              <div className="space-y-4">
                {filteredPracticeExams.map((exam) => {
                  const ses = exam.practice_exam_sessions;
                  const sessionId = Array.isArray(ses) ? ses[0]?.id : (ses as any)?.id;
                  const isCompleted = exam.status === "completed";
                  const score = exam.score ?? 0;
                  const total = exam.total_questions || 1;
                  const pct = (score / total) * 100;

                  return (
                    <Card
                      key={exam.id}
                      className="border shadow-xs hover:border-emerald-500/40 transition-colors"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base sm:text-lg text-foreground">
                                {exam.name}
                              </h3>
                              <Badge
                                className={cn(
                                  "text-xs px-2.5 py-0.5 rounded-full font-medium",
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
                                )}
                              >
                                {isCompleted ? "কমপ্লিট" : "চলমান"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              তারিখ:{" "}
                              {dayjs(exam.submitted_at || exam.started_at).format(
                                "DD MMMM, YYYY hh:mm A",
                              )}
                              {exam.time_minutes ? ` • সময়: ${exam.time_minutes} মিনিট` : ""}
                            </p>
                          </div>

                          <Badge className="w-fit text-sm px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 font-bold font-sans">
                            স্কোর: {score.toFixed(2)} / {total}
                          </Badge>
                        </div>

                        {isCompleted && (
                          <Progress value={Math.max(0, pct)} className="h-2 rounded-full" />
                        )}

                        <div className="grid grid-cols-4 gap-2 text-center bg-muted/30 p-3 rounded-xl">
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">সঠিক</p>
                            <p className="text-base font-bold text-emerald-600 font-sans">
                              {exam.correct_answers ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">ভুল</p>
                            <p className="text-base font-bold text-rose-600 font-sans">
                              {exam.wrong_answers ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">অনুত্তরিত</p>
                            <p className="text-base font-bold text-amber-600 font-sans">
                              {exam.unattempted ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                              মোট প্রশ্ন
                            </p>
                            <p className="text-base font-bold text-foreground font-sans">
                              {exam.total_questions}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
