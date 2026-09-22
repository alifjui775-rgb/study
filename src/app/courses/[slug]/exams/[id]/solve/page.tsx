import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchExamQuestions, type AdaptedQuestion } from "@/lib/fetchExamQuestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCourseBySlug, getCourseCurriculum, getUserCourseEnrollment } from "@/lib/queries";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { Exam } from "@/lib/types";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import dayjs, { formatDateTimeBn } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Zap,
  Layers,
  FileText,
  Tag,
  Flag,
  Trophy,
  RotateCw,
  Settings,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const runtime = "edge";

/** Shape of a row from student_exam_answers */
interface RawAnswerRow {
  mcq_id: string;
  selected_options: string[]; // uuid[] of selected option IDs
  is_correct: boolean;
}

export default function SolvePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const exam_id = id as string;
  const router = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [allQuestions, setAllQuestions] = useState<AdaptedQuestion[]>([]);
  const [questions, setQuestions] = useState<AdaptedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedUserAnswers, setLoadedUserAnswers] = useState<{
    [key: string]: number;
  } | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");

  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);

  // Fetch course details
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => getCourseBySlug(slug!),
    enabled: !!slug && !!user,
  });

  const { data: enrollment, isLoading: isLoadingEnrollment } = useQuery({
    queryKey: ["enrollment", user?.uid, course?.id],
    queryFn: () => getUserCourseEnrollment(user!.uid, course!.id),
    enabled: !!user && !!course?.id,
  });

  const { data: curriculum, isLoading: isLoadingCurriculum } = useQuery({
    queryKey: ["curriculum", course?.id],
    queryFn: () => getCourseCurriculum(course!.id),
    enabled: !!course?.id,
  });

  useEffect(() => {
    if (exam_id) {
      fetchExamAndAnswers();
    }
  }, [exam_id, user, searchParams]);

  const fetchExamAndAnswers = async () => {
    setLoading(true);
    try {
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .is("deleted_at", null)
        .eq("id", exam_id)
        .single();

      if (examError) {
        toast({
          title:
            "\u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u09be \u09b2\u09cb\u09a1 \u0995\u09b0\u09a4\u09c7 \u09b8\u09ae\u09b8\u09cd\u09af\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7",
          variant: "destructive",
        });
        return;
      }
      setExam(examData);

      const { questions: adaptedQuestions } = await fetchExamQuestions(exam_id);
      if (adaptedQuestions.length > 0) {
        setAllQuestions(adaptedQuestions);
      } else {
        toast({
          title:
            "\u09aa\u09cd\u09b0\u09b6\u09cd\u09a8 \u09b2\u09cb\u09a1 \u0995\u09b0\u09a4\u09c7 \u09b8\u09ae\u09b8\u09cd\u09af\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7",
          variant: "destructive",
        });
      }

      const isRetake = searchParams.get("retake") === "true";

      if (isRetake && exam_id) {
        const retakeDataStr = sessionStorage.getItem("retake_data_" + exam_id);
        if (retakeDataStr) {
          try {
            const retakeData = JSON.parse(retakeDataStr);
            setLoadedUserAnswers(retakeData.answers);
            if (
              retakeData.question_ids &&
              Array.isArray(retakeData.question_ids) &&
              retakeData.question_ids.length > 0
            ) {
              const practiceFiltered = adaptedQuestions.filter(
                (q) => q.id && retakeData.question_ids.includes(q.id),
              );
              setQuestions(practiceFiltered);
            }
            setLoading(false);
            return; // EARLY RETURN! Bypass the DB fetch.
          } catch (e) {
            console.error("Error parsing retake data:", e);
          }
        }
      }

      // Load user answers from the new two-table schema
      if (user?.uid && exam_id) {
        // 1. Find the most recent student_exams row for this student+exam
        const { data: sessionData, error: sessionError } = await supabase
          .from("student_exams")
          .select("id, status, submitted_at")
          .eq("student_id", user.uid)
          .eq("exam_id", exam_id)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionError) {
          console.error("Error fetching student session:", sessionError);
        }

        if (sessionData) {
          // 2. Fetch all individual answer rows for this session
          const { data: answerRows, error: answersError } = await supabase
            .from("student_exam_answers")
            .select("mcq_id, selected_options, is_correct")
            .eq("student_exam_id", sessionData.id);

          if (answersError) {
            console.error("Error fetching answers:", answersError);
          }

          if (sessionData.submitted_at) {
            setSubmittedAt(sessionData.submitted_at);
          }

          if (answerRows) {
            const answerMap: { [key: string]: number } = {};
            for (const row of answerRows as RawAnswerRow[]) {
              if (!row.selected_options || row.selected_options.length === 0) continue;
              const question = adaptedQuestions.find((q) => q.id === row.mcq_id);
              if (!question) continue;
              const selectedOptionId = row.selected_options[0];
              const optionIndex = question.option_ids.indexOf(selectedOptionId);
              if (optionIndex !== -1) {
                answerMap[row.mcq_id] = optionIndex;
              }
            }
            setLoadedUserAnswers(Object.keys(answerMap).length > 0 ? answerMap : null);
          }
        } else {
          setLoadedUserAnswers(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isRetake = searchParams.get("retake") === "true";
    if (isRetake) {
      const retakeDataStr = sessionStorage.getItem("retake_data_" + exam_id);
      if (retakeDataStr) {
        try {
          const retakeData = JSON.parse(retakeDataStr);
          if (
            retakeData.question_ids &&
            Array.isArray(retakeData.question_ids) &&
            retakeData.question_ids.length > 0
          ) {
            const practiceFiltered = allQuestions.filter(
              (q) => q.id && retakeData.question_ids.includes(q.id),
            );
            setQuestions(practiceFiltered);
            return;
          }
        } catch (e) {
          console.error("Error parsing retake data:", e);
        }
      }
    }

    const customSectionsParam = searchParams.get("sections");
    if (customSectionsParam) {
      const customSections = customSectionsParam.split(",");
      const filtered = allQuestions.filter((q) => q.section && customSections.includes(q.section));
      setQuestions(filtered);
    } else {
      setQuestions(allQuestions);
    }
  }, [allQuestions, searchParams, exam_id]);

  const { correctAnswers, wrongAnswers, unattempted, finalScore, negativeMarks, marksFromCorrect } =
    useMemo(() => {
      if (!loadedUserAnswers || questions.length === 0) {
        return {
          correctAnswers: 0,
          wrongAnswers: 0,
          unattempted: 0,
          finalScore: 0,
          negativeMarks: 0,
          marksFromCorrect: 0,
        };
      }
      let correct = 0;
      let wrong = 0;
      const answeredIds = Object.keys(loadedUserAnswers);

      questions.forEach((q) => {
        if (q.id && answeredIds.includes(q.id)) {
          if (loadedUserAnswers[q.id] === q.answer) {
            correct++;
          } else {
            wrong++;
          }
        }
      });

      const unattemptedCount = questions.length - (correct + wrong);
      const marksPerQuestion = exam?.marks_per_question || 1;
      const negativeMarksPerWrong = exam?.negative_marks_per_wrong || 0;
      const score = correct * marksPerQuestion - wrong * negativeMarksPerWrong;
      const totalNegative = wrong * negativeMarksPerWrong;

      return {
        correctAnswers: correct,
        wrongAnswers: wrong,
        unattempted: unattemptedCount,
        finalScore: score,
        negativeMarks: totalNegative,
        marksFromCorrect: correct * marksPerQuestion,
      };
    }, [loadedUserAnswers, questions, exam]);

  const { wrongQuestionIds, skippedQuestionIds, combinedQuestionIds } = useMemo(() => {
    if (allQuestions.length === 0) {
      return { wrongQuestionIds: [], skippedQuestionIds: [], combinedQuestionIds: [] };
    }

    const answeredIds = loadedUserAnswers ? Object.keys(loadedUserAnswers) : [];
    const wrong: string[] = [];
    const skipped: string[] = [];

    allQuestions.forEach((q) => {
      if (!q.id) return;
      if (answeredIds.includes(q.id)) {
        if (loadedUserAnswers && loadedUserAnswers[q.id] !== q.answer) {
          wrong.push(q.id);
        }
      } else {
        skipped.push(q.id);
      }
    });

    return {
      wrongQuestionIds: wrong,
      skippedQuestionIds: skipped,
      combinedQuestionIds: [...wrong, ...skipped],
    };
  }, [allQuestions, loadedUserAnswers]);

  const handleStartPractice = (mode: "wrong" | "skipped" | "combined") => {
    let targetIds: string[] = [];
    let modeTitle = "";

    if (mode === "wrong") {
      targetIds = wrongQuestionIds;
      modeTitle = "ভুল করা প্রশ্ন প্রাকটিস";
      if (targetIds.length === 0) {
        toast({ title: "আপনার কোনো ভুল উত্তর নেই!", description: "চমৎকার কাজ!" });
        return;
      }
    } else if (mode === "skipped") {
      targetIds = skippedQuestionIds;
      modeTitle = "স্কিপ করা প্রশ্ন প্রাকটিস";
      if (targetIds.length === 0) {
        toast({
          title: "আপনার কোনো স্কিপ করা প্রশ্ন নেই!",
          description: "আপনি সব প্রশ্নের উত্তর দিয়েছিলেন।",
        });
        return;
      }
    } else {
      targetIds = combinedQuestionIds;
      modeTitle = "ভুল ও স্কিপ প্রশ্ন প্রাকটিস";
      if (targetIds.length === 0) {
        toast({
          title: "আপনার কোনো ভুল বা স্কিপ করা প্রশ্ন নেই!",
          description: "আপনি সব প্রশ্নের সঠিক উত্তর দিয়েছেন।",
        });
        return;
      }
    }

    setPracticeModalOpen(false);

    sessionStorage.setItem(
      "practice_questions_" + exam_id,
      JSON.stringify({
        ids: targetIds,
        mode: mode,
        title: modeTitle,
      }),
    );

    router(`/courses/${slug}/exams/${exam_id}?start_practice=true`);
  };

  const filteredQuestions = useMemo(() => {
    if (filter === "all" || !loadedUserAnswers) {
      return questions;
    }

    return questions.filter((question) => {
      const userAnswer = loadedUserAnswers[question.id!];
      const isSkipped = userAnswer === undefined;
      const isCorrect = userAnswer === question.answer;

      if (filter === "correct") {
        return !isSkipped && isCorrect;
      }
      if (filter === "wrong") {
        return !isSkipped && !isCorrect;
      }
      if (filter === "skipped") {
        return isSkipped;
      }
      return false;
    });
  }, [filter, questions, loadedUserAnswers]);

  if (loading || isLoadingCourse || isLoadingEnrollment || isLoadingCurriculum) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return null;
  }

  if (!exam || questions.length === 0) {
    return (
      <CoursePlayerLayout
        course={course}
        curriculum={curriculum || []}
        activeItemId={exam_id}
        itemTitle={exam?.name || "Solve"}
      >
        <p className="p-6 text-center">কোনো সমাধান পাওয়া যায়নি।</p>
      </CoursePlayerLayout>
    );
  }

  const totalNegativeMarksFromWrong = wrongAnswers * (exam?.negative_marks_per_wrong || 0);

  const totalMarks = questions.length * (exam?.marks_per_question || 1);

  const pieData = [
    { name: "সঠিক উত্তর", value: correctAnswers, color: "#22c55e" },
    { name: "ভুল উত্তর", value: wrongAnswers, color: "#ef4444" },
    { name: "চেষ্টা করেননি", value: unattempted, color: "#eab308" },
  ];

  return (
    <CoursePlayerLayout
      course={course}
      curriculum={curriculum || []}
      activeItemId={exam_id}
      itemTitle={exam?.name || "Solve"}
    >
      <div className="min-h-screen bg-background flex flex-col font-bengali">
        <div className="container mx-auto p-2 md:p-4 md:pb-8">
          <div className="w-full max-w-3xl mx-auto space-y-4">
            {/* 4 Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router(`/courses/${slug}/exams/${exam_id}/leaderboard`)}
                className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                <span>লিডারবোর্ড</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router(`/courses/${slug}/exams/${exam_id}?retake=true`)}
                className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
              >
                <RotateCw className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>আবার পরীক্ষা দিন</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router(`/courses/${slug}/exams/${exam_id}/custom`)}
                className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
              >
                <Settings className="h-4 w-4 text-foreground shrink-0" />
                <span>কাস্টম পরীক্ষা</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setPracticeModalOpen(true)}
                className="rounded-full bg-background hover:bg-muted border border-border h-9 px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs text-foreground cursor-pointer"
              >
                <ListChecks className="h-4 w-4 text-rose-500 shrink-0" />
                <span>ভুল গুলোর প্রাকটিস</span>
              </Button>
            </div>

            <Card className="border shadow-md overflow-hidden bg-card bg-gradient-to-r from-primary/10 to-primary-shift/5 dark:from-primary/20 dark:to-primary-shift/10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Left Column: Exam info & score */}
                  <div className="space-y-3 text-center sm:text-left flex-1">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                        {exam?.name}
                      </h1>
                      {submittedAt && (
                        <p className="text-muted-foreground text-xs mt-1">
                          সাবমিট: {formatDateTimeBn(submittedAt, "D/M/YYYY, h:mm:ss A")}
                        </p>
                      )}
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

                  {/* Right Column: Compact Donut Chart */}
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
                    {totalNegativeMarksFromWrong > 0 ? "-" : ""}
                    {totalNegativeMarksFromWrong.toFixed(2)} মার্ক
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
                    ভুলে {exam?.negative_marks_per_wrong || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Alert
              className={`mb-8 border ${
                finalScore >= questions.length * 0.75
                  ? "bg-success/10 border-success/30 text-foreground"
                  : finalScore >= questions.length * 0.5
                    ? "bg-warning/10 border-warning/30 text-foreground"
                    : "bg-destructive/10 border-destructive/30 text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <AlertDescription className="text-sm mb-8" style={{ marginBottom: "2rem" }}>
                <strong>ফিডব্যাক:</strong>{" "}
                {finalScore >= questions.length * 0.75
                  ? " চমৎকার! আপনি খুব ভালো করেছেন। এই মানের পরীক্ষা চালিয়ে যান।"
                  : finalScore >= questions.length * 0.5
                    ? " ভালো! আরও বেশি অনুশীলন করুন এবং পরবর্তী পরীক্ষায় আরও ভালো করতে পারবেন।"
                    : " আরও বেশি মনোযোগ দিয়ে পড়ুন এবং পরবর্তী পরীক্ষায় আরও ভালো করুন।"}{" "}
                ।
              </AlertDescription>
            </Alert>

            <div className="space-y-6 mt-8">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-center">
                  <h2 className="text-2xl font-bold">বিস্তারিত ফলাফল</h2>
                  <div className="flex items-center gap-2 p-1 bg-muted rounded-md">
                    <Button
                      size="sm"
                      variant={filter === "all" ? "default" : "ghost"}
                      onClick={() => setFilter("all")}
                    >
                      সবগুলো
                    </Button>
                    <Button
                      size="sm"
                      variant={filter === "correct" ? "default" : "ghost"}
                      onClick={() => setFilter("correct")}
                    >
                      সঠিক
                    </Button>
                    <Button
                      size="sm"
                      variant={filter === "wrong" ? "default" : "ghost"}
                      onClick={() => setFilter("wrong")}
                    >
                      ভুল
                    </Button>
                    <Button
                      size="sm"
                      variant={filter === "skipped" ? "default" : "ghost"}
                      onClick={() => setFilter("skipped")}
                    >
                      স্কিপ
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question, qIdx) => {
                  const userAnswer = loadedUserAnswers
                    ? loadedUserAnswers[question.id!]
                    : undefined;
                  const correctAnswer = question.answer;
                  const isCorrect = userAnswer === correctAnswer;
                  const isSkipped = userAnswer === undefined;

                  return (
                    <Card
                      key={question.id}
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
                              {isCorrect && !isSkipped ? "সঠিক" : isSkipped ? "উত্তর করা হয়নি" : "ভুল"}
                            </Badge>
                            <div className="text-lg font-semibold">
                              <span className="mr-2 inline-block">{qIdx + 1}.</span>
                              <span className="inline">
                                {question.question && <LatexRenderer html={question.question} />}
                              </span>
                              {question.question_image && question.question_image.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 ml-6">
                                  {question.question_image.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Question"
                                      className="max-h-60 rounded-md border object-contain"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {user?.uid && question.id && (
                            <ReportQuestionModal
                              questionId={question.id}
                              questionType={question.type || "mcq"}
                              studentId={user.uid}
                              buttonClassName="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3">
                          {(Array.isArray(question.options)
                            ? question.options
                            : Object.values(question.options || {})
                          ).map((option: any, optIdx: number) => {
                            const isSelected = userAnswer === optIdx;
                            const isRightAnswer = correctAnswer === optIdx;
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
                              <div key={optIdx} className={cn(optionClass)}>
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
                                    {bengaliLetters[optIdx] || String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <div className="flex-1 flex flex-col items-start justify-center text-sm md:text-base font-medium break-words">
                                    {typeof option === "object" ? (
                                      <>
                                        {option.text && <LatexRenderer html={option.text} />}
                                        {option.image && option.image.length > 0 && (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {option.image.map((img: string, idx: number) => (
                                              <img
                                                key={idx}
                                                src={img}
                                                alt="Option"
                                                className="max-h-40 rounded-md border object-contain"
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <LatexRenderer html={option as string} />
                                    )}
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

                        {(question.explanation ||
                          (question.explanation_image &&
                            question.explanation_image.length > 0)) && (
                          <div className="mt-4 pb-4 p-4 bg-muted/50 rounded-lg text-sm">
                            <p className="font-semibold mb-1">ব্যাখ্যা:</p>
                            {question.explanation && <MarkdownRenderer content={question.explanation} />}
                            {question.explanation_image &&
                              question.explanation_image.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {question.explanation_image.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Explanation"
                                      className="max-h-60 rounded-md border object-contain"
                                    />
                                  ))}
                                </div>
                              )}
                          </div>
                        )}

                        {(question.section_name ||
                          question.chapter_name ||
                          question.topic_name ||
                          question.type_name) && (
                          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2 items-center">
                            {question.section_name && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                              >
                                <BookOpen className="w-3 h-3 mr-1" />
                                {question.section_name}
                              </Badge>
                            )}
                            {question.chapter_name && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                              >
                                <Layers className="w-3 h-3 mr-1" />
                                {question.chapter_name}
                              </Badge>
                            )}
                            {question.topic_name && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-teal-50/50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                {question.topic_name}
                              </Badge>
                            )}
                            {question.type_name && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-purple-50/50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {question.type_name}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    এই ক্যাটাগরিতে কোনো প্রশ্ন পাওয়া যায়নি।
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-3 pt-4 mt-6 pb-4 md:pb-8">
              <Button
                onClick={() => router(-1)}
                variant="outline"
                className="flex-1 h-12"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                পিছনে যান
              </Button>
              <Button onClick={() => router(`/courses/${slug}`)} className="flex-1 h-12" size="lg">
                <BookOpen className="h-4 w-4 mr-2" />
                ড্যাশবোর্ডে যান
              </Button>
            </div>
            <hr className="h-16 border-transparent" />
          </div>
        </div>
      </div>

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
    </CoursePlayerLayout>
  );
}
