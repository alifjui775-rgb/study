import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase, setSupabaseUserHeader } from "@/lib/supabase";
import { setExamActive } from "@/lib/exam-mode";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { QUESTIONS_PER_PAGE, CRITICAL_TIME_THRESHOLD, TIMER_CLASSES } from "@/lib/examConstants";
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
  Layers,
  Tag,
  Home,
  RotateCw,
  PenLine,
  AlertTriangle,
  FileText,
  ListChecks,
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
  paper_chapters?: { name: string } | null;
  chapter_topics?: { name: string } | null;
  curriculum_papers?: { name_bn: string | null; name_en: string | null } | null;
  section?: string | null;
  section_name?: string | null;
  chapter_name?: string | null;
  topic_name?: string | null;
  question_options: Option[];
}

interface PracticeSession {
  id: string;
  student_id: string;
  question_ids: string[];
  duration_minutes?: number | null;
  negative_marks?: number | null;
  practice_exam_id?: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function shuffleArray<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
          className="max-h-60 max-w-full rounded-md border bg-white dark:bg-white p-1 object-contain"
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function PracticeExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // ─── State ────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"loading" | "instructions" | "exam" | "result">("loading");
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [examQuestions, setExamQuestions] = useState<McqQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Load session & questions ─────────────────────────────────────
  useEffect(() => {
    if (
      !sessionId ||
      sessionId === "[object Object]" ||
      typeof sessionId !== "string" ||
      !user?.uid
    ) {
      if (sessionId === "[object Object]") {
        setLoadError("পরীক্ষার সেশন পাওয়া যায়নি।");
      }
      return;
    }

    const loadSession = async () => {
      try {
        const { data: sessionData, error: sessionErr } = await supabase
          .from("practice_exam_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("student_id", user.uid)
          .single();

        if (sessionErr || !sessionData) {
          setLoadError("পরীক্ষার সেশন পাওয়া যায়নি।");
          setMode("loading");
          return;
        }

        setSession(sessionData);

        const questionIds = sessionData.question_ids;
        if (!questionIds || questionIds.length === 0) {
          setLoadError("এই সেশনে কোনো প্রশ্ন নেই।");
          return;
        }

        const { data: questions, error: qErr } = await supabase
          .from("questions_mcq")
          .select(`
            id, question, question_image, explanation, explanation_image, paper_id,
            paper_chapters ( name ),
            chapter_topics ( name ),
            curriculum_papers ( name_bn, name_en ),
            question_options ( id, option_text, option_image, is_correct, option_order )
          `)
          .in("id", questionIds);

        if (qErr || !questions) {
          setLoadError("প্রশ্ন লোড করা যায়নি।");
          return;
        }

        const ordered = questionIds
          .map((id: string) => questions.find((q: any) => q.id === id))
          .filter(Boolean) as McqQuestion[];

        setExamQuestions(ordered);

        const isSolveRoute = window.location.pathname.endsWith("/solve");
        if (sessionData.status === "completed" || isSolveRoute) {
          if (user?.uid) {
            const { data: userAnswers } = await supabase
              .from("student_exam_answers")
              .select("mcq_id, selected_options")
              .eq("student_id", user.uid);

            if (userAnswers && userAnswers.length > 0) {
              const restoredSel: Record<string, number> = {};
              for (const ans of userAnswers) {
                if (ans.mcq_id && ans.selected_options?.[0]) {
                  const q = ordered.find((item) => item.id === ans.mcq_id);
                  if (q) {
                    const optIndex = q.question_options.findIndex(
                      (o) => o.id === ans.selected_options[0],
                    );
                    if (optIndex !== -1) {
                      restoredSel[q.id] = optIndex;
                    }
                  }
                }
              }
              setSelectedAnswers(restoredSel);
            }
          }
          setMode("result");
        } else {
          setMode("exam");
          const sessionDuration = sessionData.duration_minutes ?? 30;
          setDurationMinutes(sessionDuration);
          setTimeLeft(sessionDuration * 60);
        }
      } catch {
        setLoadError("ডাটা লোডে সমস্যা হয়েছে।");
      }
    };

    loadSession();
  }, [sessionId, user?.uid]);

  const location = useLocation();

  useEffect(() => {
    if (location.pathname.endsWith("/solve")) {
      setMode("result");
    }
  }, [location.pathname]);

  // ─── Exam mode flag ───────────────────────────────────────────────
  useEffect(() => {
    setExamActive(mode === "exam");
    return () => setExamActive(false);
  }, [mode]);

  // ─── Timer ────────────────────────────────────────────────────────
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

  // ─── Time warnings ────────────────────────────────────────────────
  const showTimeWarning = useMemo(() => {
    if (timeLeft === null) return false;
    return timeLeft <= durationMinutes * 60 * 0.1 && timeLeft > 60;
  }, [timeLeft, durationMinutes]);

  const showCriticalWarning = useMemo(() => {
    if (timeLeft === null) return false;
    return timeLeft <= 60;
  }, [timeLeft]);

  useEffect(() => {
    if (showTimeWarning) {
      toast({
        title: "সময় শেষ হওয়ার সতর্কতা",
        description: "মাত্র ১০% সময় বাকি আছে। দ্রুত উত্তর সম্পন্ন করুন।",
        variant: "destructive",
      });
    }
  }, [showTimeWarning]);

  useEffect(() => {
    if (showCriticalWarning) {
      toast({
        title: "জরুরি: সময় শেষ হতে চলেছে",
        description: "মাত্র ১ মিনিট বাকি। পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হবে।",
        variant: "destructive",
      });
    }
  }, [showCriticalWarning]);

  // ─── Pagination ───────────────────────────────────────────────────
  const questionsPerPage = QUESTIONS_PER_PAGE;
  const totalPages = Math.ceil(examQuestions.length / questionsPerPage);
  const startIndex = currentPageIndex * questionsPerPage;
  const currentPageQuestions = examQuestions.slice(startIndex, startIndex + questionsPerPage);

  // ─── Answer Selection (locking) ───────────────────────────────────
  const handleAnswerSelect = useCallback(
    (questionId: string, optionIndex: number) => {
      if (mode !== "exam") return;
      if (selectedAnswers[questionId] !== undefined) return;
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
      setMarkedForReview((prev) => {
        const ns = new Set(prev);
        ns.delete(questionId);
        return ns;
      });
    },
    [mode, selectedAnswers],
  );

  const toggleMarkForReview = useCallback((questionId: string) => {
    setMarkedForReview((prev) => {
      const ns = new Set(prev);
      ns.has(questionId) ? ns.delete(questionId) : ns.add(questionId);
      return ns;
    });
  }, []);

  const attemptedCount = useMemo(() => Object.keys(selectedAnswers).length, [selectedAnswers]);

  const getAnswerStatus = (questionId: string) => {
    if (markedForReview.has(questionId)) return "marked";
    if (selectedAnswers[questionId] !== undefined) return "attempted";
    return "unattempted";
  };

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmitExam = useCallback(async () => {
    setIsSubmitting(true);

    try {
      if (session?.practice_exam_id && user?.uid) {
        // Build answers map: question_id -> [selected_option_id]
        const answersMap: Record<string, string[]> = {};
        for (const [qId, optionIdx] of Object.entries(selectedAnswers)) {
          const question = examQuestions.find((q) => q.id === qId);
          if (question && question.question_options[optionIdx]) {
            answersMap[qId] = [question.question_options[optionIdx].id];
          }
        }

        setSupabaseUserHeader(user.uid);
        const { error: rpcErr } = await supabase.rpc("submit_practice_exam", {
          p_practice_exam_id: session.practice_exam_id,
          p_answers: answersMap,
        });

        if (rpcErr) {
          console.error("RPC Submit Error:", rpcErr);
        }
      }
    } catch (err) {
      console.error("Error persisting practice exam:", err);
    } finally {
      setIsSubmitting(false);
      setMode("result");
      setResultFilter("all");
      setExamActive(false);
      toast({ title: "পরীক্ষা সম্পন্ন হয়েছে!", description: "আপনার ফলাফল ও উত্তর সল্যুশন নিচে দেখুন।" });
      navigate(`/dashboard/practice/exam/${sessionId}/solve`, { replace: true });
    }
  }, [session, user?.uid, selectedAnswers, examQuestions, toast]);

  // ─── Result Metrics ───────────────────────────────────────────────
  const {
    correctAnswers,
    wrongAnswers,
    unattempted,
    finalScore,
    negativeMarks,
    marksFromCorrect,
    totalMarks,
  } = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    const negativePerWrong = session?.negative_marks ?? 0.25;
    const marksPerQ = 1;

    for (const q of examQuestions) {
      const sel = selectedAnswers[q.id];
      if (sel !== undefined) {
        const correctIdx = q.question_options.findIndex((o) => o.is_correct);
        sel === correctIdx ? correct++ : wrong++;
      }
    }

    const unattemptedCount = examQuestions.length - correct - wrong;
    const totalNeg = wrong * negativePerWrong;
    const total = correct * marksPerQ;
    const score = total - totalNeg;

    return {
      correctAnswers: correct,
      wrongAnswers: wrong,
      unattempted: unattemptedCount,
      finalScore: score,
      negativeMarks: totalNeg,
      marksFromCorrect: total,
      totalMarks: examQuestions.length * marksPerQ,
    };
  }, [examQuestions, selectedAnswers, session]);

  const pieData = useMemo(
    () => [
      { name: "সঠিক", value: correctAnswers, color: "#22c55e" },
      { name: "ভুল", value: wrongAnswers, color: "#ef4444" },
      { name: "অনুত্তরিত", value: unattempted, color: "#f59e0b" },
    ],
    [correctAnswers, wrongAnswers, unattempted],
  );

  const [practiceModalOpen, setPracticeModalOpen] = useState(false);

  const wrongQuestionIds = useMemo(() => {
    return examQuestions
      .filter((q) => {
        const sel = selectedAnswers[q.id];
        if (sel === undefined) return false;
        const correctIdx = q.question_options.findIndex((o) => o.is_correct);
        return sel !== correctIdx;
      })
      .map((q) => q.id);
  }, [examQuestions, selectedAnswers]);

  const skippedQuestionIds = useMemo(() => {
    return examQuestions.filter((q) => selectedAnswers[q.id] === undefined).map((q) => q.id);
  }, [examQuestions, selectedAnswers]);

  const combinedQuestionIds = useMemo(() => {
    return Array.from(new Set([...wrongQuestionIds, ...skippedQuestionIds]));
  }, [wrongQuestionIds, skippedQuestionIds]);

  const handleStartPractice = async (mode: "wrong" | "skipped" | "combined") => {
    let targetIds: string[] = [];
    if (mode === "wrong") {
      targetIds = wrongQuestionIds;
      if (targetIds.length === 0) {
        toast({ title: "আপনার কোনো ভুল উত্তর নেই!", description: "চমৎকার কাজ!" });
        return;
      }
    } else if (mode === "skipped") {
      targetIds = skippedQuestionIds;
      if (targetIds.length === 0) {
        toast({
          title: "আপনার কোনো স্কিপ করা প্রশ্ন নেই!",
          description: "আপনি সব প্রশ্নের উত্তর দিয়েছিলেন।",
        });
        return;
      }
    } else {
      targetIds = combinedQuestionIds;
      if (targetIds.length === 0) {
        toast({
          title: "আপনার কোনো ভুল বা স্কিপ করা প্রশ্ন নেই!",
          description: "আপনি সব প্রশ্নের সঠিক উত্তর দিয়েছেন।",
        });
        return;
      }
    }

    setPracticeModalOpen(false);

    const filtered = examQuestions.filter((q) => targetIds.includes(q.id));
    if (filtered.length === 0) return;

    const paperIds = Array.from(
      new Set(filtered.map((q) => q.paper_id).filter(Boolean)),
    ) as string[];

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/practice-exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user?.uid,
          paper_ids: paperIds.length > 0 ? paperIds : [],
          limit: filtered.length,
          time_minutes: Math.max(
            5,
            Math.round((durationMinutes * filtered.length) / examQuestions.length),
          ),
          negative_mark: session?.negative_marks ?? 0.25,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.questions && resData.questions.length > 0) {
        const newSessionId = resData.questions[0]?.session_id;
        if (newSessionId) {
          navigate(`/dashboard/practice/exam/${newSessionId}`);
          window.location.reload();
          return;
        }
      }

      setExamQuestions(filtered);
      setSelectedAnswers({});
      setMarkedForReview(new Set());
      setCurrentPageIndex(0);
      setTimeLeft(
        Math.max(5, Math.round((durationMinutes * filtered.length) / examQuestions.length)) * 60,
      );
      setMode("exam");
    } catch (err) {
      console.error("Error starting practice for wrong questions:", err);
      setExamQuestions(filtered);
      setSelectedAnswers({});
      setMarkedForReview(new Set());
      setCurrentPageIndex(0);
      setTimeLeft(
        Math.max(5, Math.round((durationMinutes * filtered.length) / examQuestions.length)) * 60,
      );
      setMode("exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredResultQuestions = useMemo(() => {
    if (resultFilter === "all") return examQuestions;
    return examQuestions.filter((q) => {
      const sel = selectedAnswers[q.id];
      const correctIdx = q.question_options.findIndex((o) => o.is_correct);
      if (resultFilter === "skipped") return sel === undefined;
      if (resultFilter === "correct") return sel !== undefined && sel === correctIdx;
      if (resultFilter === "wrong") return sel !== undefined && sel !== correctIdx;
      return true;
    });
  }, [examQuestions, selectedAnswers, resultFilter]);

  // ─── Loading / Error ──────────────────────────────────────────────
  if (mode === "loading") {
    if (loadError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-lg font-semibold">{loadError}</p>
              <Button onClick={() => navigate("/dashboard/practice")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                প্র্যাকটিসে ফিরুন
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>প্র্যাকটিস পরীক্ষা | MNR Study</title>
      </Helmet>

      {/* ─── ACTIVE EXAM ─────────────────────────────────────────── */}
      {mode === "exam" && (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
          <div className="container mx-auto p-2 md:p-4 md:pb-8 overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 py-4 bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <BookOpen className="h-5 w-5" />
                  <div className="hidden sm:block">
                    <h2 className="font-semibold">প্র্যাকটিস পরীক্ষা</h2>
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

            {/* Questions */}
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

            {/* Page Navigation */}
            <footer className="flex justify-between items-center gap-4 pt-4 mt-6">
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
                  onClick={() => {
                    window.scrollTo(0, 0);
                    setShowSubmitConfirm(true);
                  }}
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

          {/* Floating Timer */}
          {timeLeft !== null && (
            <div className="fixed bottom-8 left-4 z-50 flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all text-lg shadow-lg ${
                  timeLeft <= CRITICAL_TIME_THRESHOLD
                    ? TIMER_CLASSES.critical
                    : timeLeft <= 300
                      ? TIMER_CLASSES.warning
                      : TIMER_CLASSES.normal
                }`}
              >
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeLeft)}</span>
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
                  if (status === "attempted")
                    statusClass = "bg-success/80 hover:bg-success text-white";
                  else if (status === "marked")
                    statusClass = "bg-warning/80 hover:bg-warning text-white";
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
                  <div className="h-3 w-3 rounded-full bg-success" /> উত্তরিত
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted" /> অনুত্তরিত
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-warning" /> পর্যালোচনা
                </div>
              </div>
              <div className="pt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                  বন্ধ করুন
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowReviewDialog(false);
                    window.scrollTo(0, 0);
                    setShowSubmitConfirm(true);
                  }}
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

          {/* Submit Confirmation Dialog */}
          <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-lg font-bold font-bengali">
                  সাবমিট করতে চাও?
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground font-bengali">
                  পরীক্ষা সাবমিট করার পর আর উত্তর পরিবর্তন করা যাবে না।
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 font-bengali"
                >
                  না
                </Button>
                <Button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    handleSubmitExam();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 font-bengali"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "সাবমিট"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ─── RESULTS ──────────────────────────────────────────────── */}
      {mode === "result" && (
        <div className="min-h-screen bg-background flex flex-col">
          <div className="container mx-auto px-2 pt-8 pb-2 md:px-4 md:pt-8 md:pb-4">
            <div className="w-full max-w-3xl mx-auto space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAnswers({});
                    setMarkedForReview(new Set());
                    setCurrentPageIndex(0);
                    setTimeLeft(durationMinutes * 60);
                    setMode("exam");
                  }}
                  className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
                >
                  <RotateCw className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>আবার পরীক্ষা দিন</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPracticeModalOpen(true)}
                  className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
                >
                  <ListChecks className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>ভুল গুলোর প্রাকটিস</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/practice")}
                  className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
                >
                  <Home className="h-4 w-4 text-primary shrink-0" />
                  <span>প্র্যাকটিস তালিকা</span>
                </Button>
              </div>

              {/* Score Card */}
              <Card className="border shadow-md overflow-hidden bg-card bg-gradient-to-r from-primary/10 to-primary-shift/5 dark:from-primary/20 dark:to-primary-shift/10">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-3 text-center sm:text-left flex-1">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                          প্র্যাকটিস পরীক্ষার ফলাফল
                        </h1>
                        <p className="text-muted-foreground text-xs mt-1">
                          {examQuestions.length} প্রশ্ন • {durationMinutes} মিনিট
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
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:left leading-tight">
                        সঠিক উত্তর
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-success font-sans text-center xl:left">
                      {correctAnswers}
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:left leading-tight">
                      নম্বর: {marksFromCorrect.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:left leading-tight">
                        ভুল উত্তর
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive font-sans text-center xl:left">
                      {wrongAnswers}
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:left leading-tight">
                      {negativeMarks > 0 ? "-" : ""}
                      {negativeMarks.toFixed(2)} মার্ক
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-warning">
                      <HelpCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:left leading-tight">
                        চেষ্টা করেননি
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-warning font-sans text-center xl:left">
                      {unattempted}
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:left leading-tight">
                      মার্ক নেই
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-2.5 sm:p-4 md:p-6 space-y-1 md:space-y-2 flex flex-col justify-between h-full">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-1 md:gap-2 text-primary">
                      <Zap className="h-4 w-4 md:h-5 md:w-5 shrink-0 mx-auto xl:mx-0" />
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-center xl:left leading-tight">
                        নেগেটিভ
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary font-sans text-center xl:left">
                      {negativeMarks > 0 ? "-" : ""}
                      {negativeMarks.toFixed(2)}
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center xl:left leading-tight">
                      ভুলে ০.২৫
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
                                      {opt.option_text && <LatexRenderer html={opt.option_text} />}
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

                          {(q.explanation ||
                            (q.explanation_image && q.explanation_image.length > 0)) && (
                            <div className="mt-4 pb-4 p-4 bg-muted/50 rounded-lg text-sm">
                              <p className="font-semibold mb-1">ব্যাখ্যা:</p>
                              {q.explanation && <MarkdownRenderer content={q.explanation} />}
                              <ImageList images={q.explanation_image} alt="Explanation" />
                            </div>
                          )}

                          {(() => {
                            const paperName =
                              q.curriculum_papers?.name_bn ||
                              q.curriculum_papers?.name_en ||
                              q.section_name ||
                              q.section;
                            const chapterName = q.paper_chapters?.name || q.chapter_name;
                            const topicName = q.chapter_topics?.name || q.topic_name;

                            if (!paperName && !chapterName && !topicName) return null;

                            return (
                              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2 items-center">
                                {paperName && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 font-medium py-1 px-3 rounded-full flex items-center gap-1"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                                    {paperName}
                                  </Badge>
                                )}
                                {chapterName && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 font-medium py-1 px-3 rounded-full flex items-center gap-1"
                                  >
                                    <Layers className="w-3.5 h-3.5 mr-1" />
                                    {chapterName}
                                  </Badge>
                                )}
                                {topicName && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-teal-50/50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800 font-medium py-1 px-3 rounded-full flex items-center gap-1"
                                  >
                                    <FileText className="w-3.5 h-3.5 mr-1" />
                                    {topicName}
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
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
                <Button
                  onClick={() => {
                    setSelectedAnswers({});
                    setMarkedForReview(new Set());
                    setCurrentPageIndex(0);
                    setTimeLeft(durationMinutes * 60);
                    setMode("exam");
                  }}
                  className="flex-1 h-12"
                  size="lg"
                >
                  <PenLine className="h-4 w-4 mr-2" />
                  আবার পরীক্ষা দিন
                </Button>
              </div>
              <hr className="h-16 border-transparent" />
            </div>
          </div>
        </div>
      )}

      {/* Practice Wrong/Skipped Modal */}
      <Dialog open={practiceModalOpen} onOpenChange={setPracticeModalOpen}>
        <DialogContent className="sm:max-w-md font-bengali">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">ভুল ও স্কিপ প্রাকটিস</DialogTitle>
            <DialogDescription>আপনার পছন্দের প্রাকটিস অপশনটি নির্বাচন করুন:</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              variant="outline"
              className="justify-between items-center h-11 px-4 text-sm font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
              onClick={() => handleStartPractice("wrong")}
            >
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2 shrink-0" />
                <span>শুধু ভুল করা গুলোর প্রাকটিস</span>
              </div>
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 font-mono text-xs">
                {wrongQuestionIds.length} টি
              </Badge>
            </Button>

            <Button
              variant="outline"
              className="justify-between items-center h-11 px-4 text-sm font-medium hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 cursor-pointer"
              onClick={() => handleStartPractice("skipped")}
            >
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2 shrink-0" />
                <span>শুধু স্কিপ করা গুলোর প্রাকটিস</span>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 font-mono text-xs">
                {skippedQuestionIds.length} টি
              </Badge>
            </Button>

            <Button
              variant="outline"
              className="justify-between items-center h-11 px-4 text-sm font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 cursor-pointer"
              onClick={() => handleStartPractice("combined")}
            >
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 shrink-0" />
                <span>ভুল ও স্কিপ করা গুলোর প্রাকটিস</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-mono text-xs">
                {combinedQuestionIds.length} টি
              </Badge>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
