import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchExamQuestions,
  type AdaptedQuestion,
  type SubjectInfo,
} from "@/lib/fetchExamQuestions";
import { startOrGetStudentExam, autoSaveAnswer, submitFinalExam } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { getCourseBySlug, getCourseCurriculum, getUserCourseEnrollment } from "@/lib/queries";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Alert as AlertComponent,
  AlertDescription as AlertDescriptionComponent,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import dayjs from "@/lib/date-utils";
import { useAuth } from "@/context/AuthContext";
import type { Exam, Question } from "@/lib/types";
import {
  QUESTIONS_PER_PAGE,
  QUESTIONS_PER_PAGE_MOBILE,
  CRITICAL_TIME_THRESHOLD,
  TIMER_CLASSES,
  BREAKPOINTS,
} from "@/lib/examConstants";
import { ExamInstructions } from "@/components/ExamInstruction";
import LatexRenderer from "@/components/LatexRenderer";
import {
  Loader2,
  Clock,
  Flag,
  ArrowLeft,
  Eye,
  ArrowRight,
  Send,
  CheckCircle2,
  BookOpen,
  Zap,
  ListChecks,
  HelpCircle,
  AlertCircle,
  CircleQuestionMark,
  TriangleAlert,
} from "lucide-react";

export const runtime = "edge";

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

// Subject name lookup is now dynamic via subjectMap from fetchExamQuestions

function SubjectSelectionScreen({
  exam,
  onStart,
  questionCount,
  subjectMap,
}: {
  exam: Exam;
  onStart: (selectedSubjects: string[]) => void;
  questionCount: number;
  subjectMap: Map<string, SubjectInfo>;
}) {
  const mandatorySubjects = exam.mandatory_subjects || [];
  const optionalSubjects = exam.optional_subjects || [];
  const totalSubjectsToAnswer = exam.total_subjects || 0;

  const groupedMandatoryDisciplines = useMemo(() => {
    const groups: Record<
      string,
      { discipline_name: string; paper_ids: string[]; icon_url?: string | null }
    > = {};
    mandatorySubjects.forEach((pId) => {
      const info = subjectMap.get(pId);
      const dId = info?.discipline_id || `no-discipline-${pId}`;
      const dName = info?.discipline_name_bn || info?.name_bn || info?.name_en || pId;
      if (!groups[dId]) {
        groups[dId] = { discipline_name: dName, paper_ids: [], icon_url: info?.icon_url };
      }
      groups[dId].paper_ids.push(pId);
    });
    return Object.entries(groups).map(([id, data]) => ({
      discipline_id: id,
      ...data,
    }));
  }, [mandatorySubjects, subjectMap]);

  const groupedOptionalDisciplines = useMemo(() => {
    const groups: Record<
      string,
      { discipline_name: string; paper_ids: string[]; icon_url?: string | null }
    > = {};
    optionalSubjects.forEach((pId) => {
      const info = subjectMap.get(pId);
      const dId = info?.discipline_id || `no-discipline-${pId}`;
      const dName = info?.discipline_name_bn || info?.name_bn || info?.name_en || pId;
      if (!groups[dId]) {
        groups[dId] = { discipline_name: dName, paper_ids: [], icon_url: info?.icon_url };
      }
      groups[dId].paper_ids.push(pId);
    });
    return Object.entries(groups).map(([id, data]) => ({
      discipline_id: id,
      ...data,
    }));
  }, [optionalSubjects, subjectMap]);

  const numMandatoryDisciplines = groupedMandatoryDisciplines.length;
  const numToSelectFromOptional = totalSubjectsToAnswer - numMandatoryDisciplines;

  const [selectedOptionalDisciplines, setSelectedOptionalDisciplines] = useState<string[]>([]);

  const handleOptionalSelect = (disciplineId: string) => {
    setSelectedOptionalDisciplines((prev) => {
      if (prev.includes(disciplineId)) {
        return prev.filter((d) => d !== disciplineId);
      }
      if (prev.length < numToSelectFromOptional) {
        return [...prev, disciplineId];
      }
      return prev;
    });
  };

  const canStart = selectedOptionalDisciplines.length === numToSelectFromOptional;

  const handleStartClick = () => {
    if (canStart) {
      const finalSelectedPapers: string[] = [...mandatorySubjects];
      selectedOptionalDisciplines.forEach((dId) => {
        const group = groupedOptionalDisciplines.find((g) => g.discipline_id === dId);
        if (group) {
          finalSelectedPapers.push(...group.paper_ids);
        }
      });
      onStart(finalSelectedPapers);
    }
  };

  const parseDateField = (keys: string[]) => {
    const examRecord = exam as Record<string, unknown> | null;
    for (const k of keys) {
      const v = examRecord ? examRecord[k] : undefined;
      if (!v) continue;
      const d = dayjs(String(v));
      if (d.isValid()) return d;
    }
    return null;
  };

  const startDate = parseDateField(["start_at", "start_time", "starts_at", "start", "startDate"]);
  const endDate = parseDateField(["end_at", "end_time", "ends_at", "end", "endDate"]);
  const isPractice = exam?.is_practice;
  const practiceUnlockDate = endDate ? endDate.add(18, "hour") : null;
  const isAutoPractice = practiceUnlockDate ? dayjs().isAfter(practiceUnlockDate) : false;
  const isEffectivePractice = isPractice || isAutoPractice;

  const getExamTypeLabel = () => {
    if (isEffectivePractice) return "প্রাকটিস";
    const now = dayjs();
    if (startDate && now.isBefore(startDate)) return "আপকামিং";
    if (endDate && now.isAfter(endDate)) return "শেষ হয়েছে";
    return "লাইভ";
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <Card className="w-full max-w-2xl mx-auto overflow-hidden">
        <div className="flex flex-col space-y-1.5 p-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{exam.name}</h1>
              <p className="text-sm text-muted-foreground">প্রাকটিস পরীক্ষা</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CircleQuestionMark className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">মোট প্রশ্ন</p>
                <p className="font-bold">{questionCount} টি</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">সময়কাল</p>
                <p className="font-bold">{exam.duration_minutes} মিনিট</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">প্রতিটি প্রশ্ন</p>
                <p className="font-bold">{exam.marks_per_question || 1} মার্ক</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">নেগেটিভ</p>
                <p className="font-bold">{exam.negative_marks_per_wrong || 0} মার্ক</p>
              </div>
            </div>
          </div>

          {numMandatoryDisciplines > 0 && (
            <div>
              <h3 className="font-semibold mb-2">বাধ্যতামূলক বিষয়</h3>
              <div className="grid grid-cols-2 gap-4">
                {groupedMandatoryDisciplines.map((disc) => (
                  <div
                    key={disc.discipline_id}
                    className="flex items-center space-x-2 p-3 rounded-md border"
                  >
                    {disc.icon_url ? (
                      <img
                        src={disc.icon_url}
                        alt={disc.discipline_name}
                        className="h-5 w-5 rounded object-cover shrink-0"
                      />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="flex-1 text-sm font-medium">{disc.discipline_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {numToSelectFromOptional > 0 && groupedOptionalDisciplines.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">
                ঐচ্ছিক বিষয় (যেকোনো {numToSelectFromOptional}টি)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {groupedOptionalDisciplines.map((disc) => {
                  const isChecked = selectedOptionalDisciplines.includes(disc.discipline_id);
                  const isDisabled =
                    !isChecked && selectedOptionalDisciplines.length >= numToSelectFromOptional;
                  return (
                    <div
                      key={disc.discipline_id}
                      className={`flex items-center space-x-2 p-3 rounded-md border ${isDisabled ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        id={disc.discipline_id}
                        checked={isChecked}
                        onCheckedChange={() => handleOptionalSelect(disc.discipline_id)}
                        disabled={isDisabled}
                      />
                      {disc.icon_url ? (
                        <img
                          src={disc.icon_url}
                          alt={disc.discipline_name}
                          className="h-5 w-5 rounded object-cover shrink-0"
                        />
                      ) : null}
                      <Label
                        htmlFor={disc.discipline_id}
                        className={`flex-1 ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {disc.discipline_name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            role="alert"
            className="relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground text-foreground bg-warning/10 border-warning/30"
          >
            <TriangleAlert className="h-4 w-4" />
            <div className="[&_p]:leading-relaxed text-sm pl-7">
              <strong>গুরুত্বপূর্ণ:</strong> একবার উত্তর নির্বাচন করলে পরিবর্তন করা যাবে না। সময় শেষ হলে পরীক্ষা
              স্বয়ংক্রিয়ভাবে জমা হবে।
            </div>
          </div>

          <Button
            onClick={handleStartClick}
            disabled={!canStart}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground border border-transparent hover:bg-background hover:text-primary hover:border-primary focus-visible:bg-background focus-visible:text-primary focus-visible:border-primary rounded-md px-8 w-full h-12 text-lg"
          >
            <Send className="h-5 w-5 mr-2" />
            পরীক্ষা শুরু করুন
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ExamPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const exam_id = id as string;
  const router = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authContextLoading } = useAuth();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [allQuestions, setAllQuestions] = useState<AdaptedQuestion[]>([]);
  const [questions, setQuestions] = useState<AdaptedQuestion[]>([]);
  const [subjectMap, setSubjectMap] = useState<Map<string, SubjectInfo>>(new Map());
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: number;
  }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [isRetake, setIsRetake] = useState(false);
  /** The student_exams.id for the current session. Set when the exam starts. */
  const [studentExamId, setStudentExamId] = useState<string | null>(null);

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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const questionsPerPage = isMobile ? QUESTIONS_PER_PAGE_MOBILE : QUESTIONS_PER_PAGE;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = currentPageIndex * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentPageQuestions = questions.slice(startIndex, endIndex);

  /**
   * Creates (or retrieves) the student_exams session row in the DB.
   * Called at the moment the student begins the exam.
   */
  const startSession = useCallback(async () => {
    if (!user) return; // guest — no session needed
    const result = await startOrGetStudentExam(exam_id, user.uid);
    if (result.success && result.studentExamId) {
      setStudentExamId(result.studentExamId);
      if (result.alreadySubmitted) {
        setIsRetake(true);
      }
    } else {
      console.warn("Could not start exam session:", result.message);
    }
  }, [exam_id, user]);

  const handleSubmitExam = useCallback(async () => {
    setIsSubmitting(true);
    let correctAnswers = 0;
    let wrongAnswers = 0;

    questions.forEach((q) => {
      const selectedOptIndex = selectedAnswers[q.id!];
      if (selectedOptIndex !== undefined) {
        if (selectedOptIndex === q.answer) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      }
    });

    const marksPerQuestion = exam?.marks_per_question || 1;
    const negativeMarksPerWrong = exam?.negative_marks_per_wrong || 0;
    const finalScore = correctAnswers * marksPerQuestion - wrongAnswers * negativeMarksPerWrong;

    if (isRetake) {
      // Retake or Practice mode - save to session storage
      sessionStorage.setItem(
        "retake_data_" + exam_id,
        JSON.stringify({
          answers: selectedAnswers,
          question_ids: questions.map((q) => q.id).filter(Boolean),
          stats: {
            score: finalScore,
            correct_answers: correctAnswers,
            wrong_answers: wrongAnswers,
            unattempted: questions.length - Object.keys(selectedAnswers).length,
          },
        }),
      );
      toast({ title: "প্র্যাকটিস পরীক্ষা শেষ হয়েছে!" });
    } else if (user && studentExamId) {
      // Official exam mode - save to DB
      const result = await submitFinalExam(studentExamId, {
        score: finalScore,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        unattempted: questions.length - Object.keys(selectedAnswers).length,
      });

      if (result.success) {
        toast({ title: "পরীক্ষা সফলভাবে জমা হয়েছে!" });
      } else {
        console.error("submitFinalExam error:", result.message);
        toast({
          title: "স্কোর জমা দিতে সমস্যা হয়েছে",
          description: result.message || "অনুগ্রহ করে আবার চেষ্টা করুন",
          variant: "destructive",
        });
      }
    }

    setSubmitted(true);
    const newParams = new URLSearchParams(searchParams);
    if (isRetake) {
      newParams.set("retake", "true");
    }
    const solveUrl = `/courses/${slug}/exams/${exam_id}/solve?${newParams.toString()}`;
    router(solveUrl);
  }, [
    exam_id,
    slug,
    exam,
    questions,
    selectedAnswers,
    user,
    studentExamId,
    isRetake,
    toast,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!submitted && timeLeft !== null && !isSubmitting && examStarted) {
      if (timeLeft <= 1) {
        handleSubmitExam();
      }

      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [submitted, timeLeft, isSubmitting, examStarted, handleSubmitExam]);

  const showTimeWarning = useMemo(() => {
    if (timeLeft === null || exam?.duration_minutes === undefined) return false;
    const tenPercentTime = exam.duration_minutes * 60 * 0.1;
    return timeLeft <= tenPercentTime && timeLeft > 60;
  }, [timeLeft, exam?.duration_minutes]);

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

  useEffect(() => {
    if (
      !loading &&
      timeLeft === null &&
      exam?.duration_minutes &&
      examStarted &&
      !searchParams.get("start_custom") // Don't start timer automatically for normal exams
    ) {
      setTimeLeft(exam.duration_minutes * 60);
    }
  }, [loading, timeLeft, exam, examStarted, searchParams]);

  useEffect(() => {
    if (exam_id) {
      fetchExam();
    }
  }, [exam_id]);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (authContextLoading || !exam) return;

      setAuthLoading(true);

      try {
        if (!exam.course_id) {
          setIsAuthorized(true);
          return;
        }

        if (!user) {
          setIsAuthorized(false);
          return;
        }

        const { data: enrollment, error } = await supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", user.uid)
          .eq("course_id", exam.course_id)
          .eq("status", true)
          .maybeSingle();

        if (error || !enrollment) {
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthorization();
  }, [user?.uid, exam, authContextLoading, router]);

  const handleStartCustomExam = useCallback(() => {
    const customSections = searchParams.get("sections")?.split(",");
    const customDuration = searchParams.get("duration");

    if (customSections && customDuration && allQuestions.length > 0) {
      // sections are now paper_id UUIDs
      const filteredQuestions = allQuestions.filter(
        (q) => q.section && customSections.includes(q.section),
      );
      setQuestions(filteredQuestions);
      setTimeLeft(parseInt(customDuration, 10) * 60);
      setExamStarted(true);
      startSession();
    }
  }, [searchParams, allQuestions, startSession]);

  useEffect(() => {
    if (searchParams.get("start_custom") === "true" && allQuestions.length > 0) {
      handleStartCustomExam();
    }
  }, [searchParams, allQuestions, handleStartCustomExam]);

  const handleStartPracticeExam = useCallback(() => {
    if (allQuestions.length === 0 || !exam_id) return;

    const practiceDataStr = sessionStorage.getItem("practice_questions_" + exam_id);
    if (!practiceDataStr) return;

    try {
      const practiceData = JSON.parse(practiceDataStr);
      const targetIds: string[] = practiceData.ids || [];

      if (targetIds.length > 0) {
        const filtered = allQuestions.filter((q) => q.id && targetIds.includes(q.id));
        if (filtered.length > 0) {
          setQuestions(filtered);

          const totalExamDuration = exam?.duration_minutes || 30;
          const totalQCount = allQuestions.length || 1;
          const propDuration = Math.max(
            5,
            Math.round((totalExamDuration * filtered.length) / totalQCount),
          );

          setTimeLeft(propDuration * 60);
          setIsRetake(true);
          setExamStarted(true);
        }
      }
    } catch (e) {
      console.error("Error parsing practice data:", e);
    }
  }, [allQuestions, exam_id, exam?.duration_minutes]);

  useEffect(() => {
    if (searchParams.get("start_practice") === "true" && allQuestions.length > 0) {
      handleStartPracticeExam();
    }
  }, [searchParams, allQuestions, handleStartPracticeExam]);

  // Scroll to top anchor when page changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const anchor = document.getElementById("exam-top-anchor");
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentPageIndex]);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .is("deleted_at", null)
        .eq("id", exam_id)
        .single();

      if (examError) {
        console.error("Error fetching exam:", examError);
        setLoading(false);
        return;
      }

      setExam(examData);

      // Fetch questions from Supabase relational tables via adapter
      const { questions: adaptedQuestions, subjectMap: sMap } = await fetchExamQuestions(exam_id);

      // Also fetch names for subjects defined in the exam but missing from sMap (e.g., 0 questions added yet)
      const allSubjectIds = [
        ...(examData.mandatory_subjects || []),
        ...(examData.optional_subjects || []),
      ];

      const missingSubjectIds = allSubjectIds.filter((id: string) => !sMap.has(id));
      if (missingSubjectIds.length > 0) {
        const { data: missingSubjects, error: missingErr } = await supabase
          .from("curriculum_papers")
          .select("id, name_en, name_bn, discipline_id, study_disciplines(name_bn, icon_url)")
          .in("id", missingSubjectIds);

        if (!missingErr && missingSubjects) {
          missingSubjects.forEach((sub: any) => {
            sMap.set(sub.id, {
              paper_id: sub.id,
              name_en: sub.name_en,
              name_bn: sub.name_bn || sub.name_en,
              discipline_id: sub.discipline_id || undefined,
              discipline_name_bn: sub.study_disciplines?.name_bn || undefined,
              icon_url: sub.study_disciplines?.icon_url || undefined,
            });
          });
        }
      }

      if (adaptedQuestions.length > 0) {
        setSubjectMap(sMap);

        const finalQuestions = examData.shuffle_questions
          ? shuffleArray(adaptedQuestions)
          : adaptedQuestions;
        setAllQuestions(finalQuestions);

        if (!examData.total_subjects) {
          setQuestions(finalQuestions);
        }
      } else {
        toast({
          title: "প্রশ্ন লোড করতে সমস্যা হয়েছে",
          description: "অনুগ্রহ করে পরে আবার চেষ্টা করুন",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error in fetchExam:", err);
      toast({
        title: "প্রশ্ন লোড করতে সমস্যা হয়েছে",
        description: err instanceof Error ? err.message : "অনুগ্রহ করে পরে আবার চেষ্টা করুন",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = useCallback(
    (question: AdaptedQuestion, optionIndex: number) => {
      const questionId = question.id;
      // Lock the answer once it's selected.
      if (selectedAnswers[questionId] !== undefined) {
        return;
      }

      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: optionIndex,
      }));
      setMarkedForReview((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });

      // Auto-save: fire-and-forget to the DB (only when logged in and session exists)
      if (user && studentExamId && !isRetake) {
        const selectedOptionId = question.option_ids[optionIndex];
        const isCorrect = optionIndex === question.answer;
        autoSaveAnswer(
          studentExamId,
          user.uid,
          questionId,
          selectedOptionId ? [selectedOptionId] : [],
          isCorrect,
        ).catch((err) => console.error("autoSaveAnswer failed:", err));
      }
    },
    [selectedAnswers, user, studentExamId, isRetake],
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
      unattemptedCount: questions.length - Object.keys(selectedAnswers).length,
    }),
    [selectedAnswers, questions.length],
  );

  const handleStartSubjectSelectionExam = (selectedSubjects: string[]) => {
    const parseDateField = (keys: string[]) => {
      const examRecord = exam as Record<string, unknown> | null;
      for (const k of keys) {
        const v = examRecord ? examRecord[k] : undefined;
        if (!v) continue;
        const d = dayjs(String(v));
        if (d.isValid()) return d;
      }
      return null;
    };
    const now = dayjs();
    const examStartDate = parseDateField(["start_at", "start_time", "starts_at"]);
    const examEndDate = parseDateField(["end_at", "end_time", "ends_at"]);
    const practiceUnlockDate = examEndDate ? examEndDate.add(18, "hour") : null;
    const isAutoPractice = practiceUnlockDate ? now.isAfter(practiceUnlockDate) : false;
    const isEffectivePractice = exam?.is_practice || isAutoPractice;

    const allowStart =
      isEffectivePractice ||
      ((!examStartDate || now.isAfter(examStartDate) || now.isSame(examStartDate)) &&
        (!examEndDate || now.isBefore(examEndDate) || now.isSame(examEndDate)));

    if (!allowStart) {
      if (examStartDate && now.isBefore(examStartDate)) {
        toast({
          title: "পরীক্ষা এখনও শুরু হয়নি",
          description: `এই পরীক্ষা ${examStartDate.format("DD MMMM, YYYY hh:mm A")} থেকে শুরু হবে।`,
        });
      } else if (examEndDate && now.isAfter(examEndDate)) {
        const unlockDate = examEndDate.add(18, "hour");
        const remainingMinutes = Math.max(0, unlockDate.diff(now, "minute"));
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;
        const timeStr =
          hours > 0 ? `${hours} ঘণ্টা ${minutes > 0 ? `${minutes} মিনিট` : ""}` : `${minutes} মিনিট`;
        toast({
          title: "পরীক্ষার সময় শেষ",
          description: `পরীক্ষার সময় শেষ! প্রাকটিস মোড ${timeStr} পর অন হবে।`,
          variant: "destructive",
        });
      }
      return;
    }

    const filteredQuestions = allQuestions.filter(
      (q) => q.section && selectedSubjects.includes(q.section),
    );
    setQuestions(filteredQuestions);
    setTimeLeft((exam?.duration_minutes || 0) * 60);
    setExamStarted(true);
    if (isAutoPractice) setIsRetake(true);
    startSession();
  };

  const getAnswerStatus = (questionId: string) => {
    if (markedForReview.has(questionId)) return "marked";
    if (selectedAnswers[questionId] !== undefined) return "attempted";
    return "unattempted";
  };

  if (loading || isLoadingCourse || isLoadingEnrollment || isLoadingCurriculum || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <CoursePlayerLayout
        course={course}
        curriculum={curriculum || []}
        activeItemId={exam_id}
        itemTitle={exam?.name || "Exam"}
      >
        <div className="container mx-auto p-2 md:p-4 text-center mt-10">
          <Card className="max-w-md mx-auto border-destructive/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-destructive">অনুমতি নেই</CardTitle>
              <CardDescription>এই পরীক্ষায় অংশগ্রহণের জন্য আপনার অনুমতি নেই।</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router(`/courses/${slug}`)}
                className="mt-6 w-full"
                variant="outline"
              >
                ফিরে যান
              </Button>
            </CardContent>
          </Card>
        </div>
      </CoursePlayerLayout>
    );
  }

  const showGuestWarning = !user && isAuthorized;

  const isCustomExam = !!exam?.total_subjects && exam.total_subjects > 0;

  if (!examStarted) {
    const parseDateField = (keys: string[]) => {
      const examRecord = exam as Record<string, unknown> | null;
      for (const k of keys) {
        const v = examRecord ? examRecord[k] : undefined;
        if (!v) continue;
        const d = dayjs(String(v));
        if (d.isValid()) return d;
      }
      return null;
    };

    const startDate = parseDateField(["start_at", "start_time", "starts_at", "start", "startDate"]);
    const endDate = parseDateField(["end_at", "end_time", "ends_at", "end", "endDate"]);

    const now = dayjs();
    const practiceUnlockDate = endDate ? endDate.add(18, "hour") : null;
    const isAutoPractice = practiceUnlockDate ? now.isAfter(practiceUnlockDate) : false;
    const isEffectivePractice = exam?.is_practice || isAutoPractice;

    const allowStart =
      isEffectivePractice ||
      ((!startDate || now.isAfter(startDate) || now.isSame(startDate)) &&
        (!endDate || now.isBefore(endDate) || now.isSame(endDate)));

    const handleStart = () => {
      if (!allowStart) {
        if (startDate && now.isBefore(startDate)) {
          toast({
            title: "পরীক্ষা এখনও শুরু হয়নি",
            description: `এই পরীক্ষা ${startDate.format("DD MMMM, YYYY hh:mm A")} থেকে শুরু হবে। অনুগ্রহ করে তখন আসুন।`,
          });
        } else if (endDate && now.isAfter(endDate)) {
          const unlockDate = endDate.add(18, "hour");
          const remainingMinutes = Math.max(0, unlockDate.diff(now, "minute"));
          const hours = Math.floor(remainingMinutes / 60);
          const minutes = remainingMinutes % 60;
          const timeStr =
            hours > 0
              ? `${hours} ঘণ্টা ${minutes > 0 ? `${minutes} মিনিট` : ""}`
              : `${minutes} মিনিট`;
          toast({
            title: "পরীক্ষার সময় শেষ",
            description: `পরীক্ষার সময় শেষ! প্রাকটিস মোড ${timeStr} পর অন হবে।`,
            variant: "destructive",
          });
        } else {
          toast({ title: "শুরু করা সম্ভব নয়", variant: "destructive" });
        }
        return;
      }
      setQuestions(allQuestions);
      setTimeLeft((exam?.duration_minutes || 0) * 60);
      setExamStarted(true);
      if (isAutoPractice) setIsRetake(true);
      startSession();
    };

    if (isCustomExam) {
      return (
        <CoursePlayerLayout
          course={course}
          curriculum={curriculum || []}
          activeItemId={exam_id}
          itemTitle={exam?.name || "Exam"}
        >
          <SubjectSelectionScreen
            exam={exam!}
            onStart={handleStartSubjectSelectionExam}
            questionCount={allQuestions.length}
            subjectMap={subjectMap}
          />
        </CoursePlayerLayout>
      );
    }

    return (
      <CoursePlayerLayout
        course={course}
        curriculum={curriculum || []}
        activeItemId={exam_id}
        itemTitle={exam?.name || "Exam"}
      >
        <div className="min-h-full bg-background flex flex-col font-bengali">
          {showGuestWarning && (
            <div className="bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-medium sticky top-0 z-50 shadow-sm">
              <span className="flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                আপনি গেস্ট মোডে আছেন। আপনার পরীক্ষার ফলাফল সংরক্ষণ করা হবে না।
              </span>
            </div>
          )}
          <div className="container mx-auto p-2 md:p-4">
            {!isEffectivePractice && (startDate || endDate) && (
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center text-center gap-2">
                    <div className="space-y-1 text-sm">
                      {startDate && now.isBefore(startDate) && (
                        <div>
                          <strong>শুরুর সময়:</strong> {startDate.format("DD MMMM, YYYY hh:mm A")}
                        </div>
                      )}
                      {endDate && (
                        <div>
                          <strong>সম্ভাব্য শেষ সময়:</strong> {endDate.format("DD MMMM, YYYY hh:mm A")}
                        </div>
                      )}
                      {!startDate && !endDate && (
                        <div>এই পরীক্ষার কোনো নির্দিষ্ট সময়সীমা সেট করা হয়নি।</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!allowStart && startDate && now < startDate && (
                        <div className="text-xs text-muted-foreground">
                          পরীক্ষা শুরু হওয়ার আগে আপনার এখানে ফিরে আসতে হবে।
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <ExamInstructions
              exam={exam}
              onStartExam={handleStart}
              questionCount={questions.length}
            />
          </div>
        </div>
      </CoursePlayerLayout>
    );
  }

  return (
    <CoursePlayerLayout
      course={course}
      curriculum={curriculum || []}
      activeItemId={exam_id}
      itemTitle={exam?.name || "Exam"}
    >
      <div className="min-h-screen bg-background flex flex-col font-bengali">
        {/* Sticky Header / Timer */}{" "}
        <div className="container mx-auto p-2 md:p-4 md:pb-8">
          <div id="exam-top-anchor" className="h-0 w-0 m-0 p-0 absolute" aria-hidden="true" />
          <div>
            <div className="sticky top-0 z-10 py-4 bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <BookOpen className="h-5 w-5" />
                  <p className="text-xs text-muted-foreground">
                    পৃষ্ঠা {currentPageIndex + 1} / {totalPages}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs md:text-sm font-semibold">
                    {attemptedCount}/{questions.length}
                  </span>
                </div>
              </div>
              <Progress value={(attemptedCount / questions.length) * 100} className="mt-3 h-1" />
            </div>
            {showGuestWarning && (
              <AlertComponent variant="destructive" className="mb-4">
                <AlertDescriptionComponent>
                  আপনি অতিথি হিসেবে এই পাবলিক পরীক্ষায় অংশগ্রহণ করছেন — আপনার ফলাফল সংরক্ষিত হবে না। স্কোর
                  সংরক্ষণ করতে অনুগ্রহ করে{" "}
                  <Link to="/login" className="underline">
                    লগইন
                  </Link>{" "}
                  বা{" "}
                  <Link to="/register" className="underline">
                    নিবন্ধন
                  </Link>{" "}
                  করুন।
                </AlertDescriptionComponent>
              </AlertComponent>
            )}

            <Tabs defaultValue="questions" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-6">
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>প্রশ্ন</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="questions" className="space-y-6">
                {currentPageQuestions.map((question, pageIndex) => {
                  const globalIndex = startIndex + pageIndex;
                  const status = getAnswerStatus(question.id!);
                  const isAnswered = selectedAnswers[question.id!] !== undefined;

                  return (
                    <Card
                      key={question.id}
                      id={`question-${question.id}`}
                      className="overflow-hidden"
                    >
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
                                {question.question && <LatexRenderer html={question.question} />}
                              </span>
                              {question.question_image && question.question_image.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
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
                          <Button
                            variant={status === "marked" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toggleMarkForReview(question.id!)}
                            className={status === "marked" ? "bg-warning" : ""}
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 p-3">
                        <div className="space-y-3">
                          <div className="space-y-3">
                            {(Array.isArray(question.options)
                              ? question.options
                              : Object.values(question.options || ({} as Record<string, string>))
                            ).map((option: any, optionIndex: number) => {
                              const bengaliLetters = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
                              const letter =
                                bengaliLetters[optionIndex] ||
                                String.fromCharCode(65 + optionIndex);

                              const isSelected = selectedAnswers[question.id!] === optionIndex;

                              return (
                                <label
                                  key={optionIndex}
                                  className="group flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border-2 transition-all min-h-[48px]"
                                >
                                  <div
                                    className="flex-shrink-0 pt-0.5"
                                    onClick={(e) => {
                                      if (isAnswered) return;
                                      e.preventDefault();
                                      handleAnswerSelect(question, optionIndex);
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
                                    value={optionIndex.toString()}
                                    checked={isSelected}
                                    readOnly
                                    className="hidden"
                                  />
                                  <div className="flex-1 flex flex-col items-start justify-center text-sm md:text-base font-medium break-words text-foreground">
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
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <footer
                  id="exam-navigation"
                  className="flex justify-between items-center gap-4 pt-4 mt-6"
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
        {timeLeft !== null && (
          <div className="fixed bottom-8 left-0 right-0 z-50 px-4 flex items-end justify-between bg-transparent pointer-events-none">
            <div
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all text-lg shadow-lg ${
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

            <Button
              onClick={() => setShowReviewDialog(true)}
              variant="default"
              className="pointer-events-auto h-11 w-11 rounded-full shadow-lg"
              aria-label="পর্যালোচনা খুলুন"
            >
              <Eye className="h-6 w-6" />
            </Button>
          </div>
        )}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                সমস্ত প্রশ্ন পর্যালোচলা
              </DialogTitle>
              <DialogDescriptionComponent>
                এক নজরে আপনার পরীক্ষার অবস্থা দেখুন।
              </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto p-1">
              {questions.map((question, index) => {
                const status = getAnswerStatus(question.id!);
                let statusClass = "bg-muted hover:bg-muted/80";
                if (status === "attempted") {
                  statusClass = "bg-success/80 hover:bg-success text-white";
                } else if (status === "marked") {
                  statusClass = "bg-warning/80 hover:bg-warning text-white";
                }
                return (
                  <Button
                    key={question.id}
                    variant="outline"
                    className={`h-10 w-10 rounded-full ${statusClass}`}
                    onClick={() => {
                      const page = Math.floor(index / questionsPerPage);
                      setCurrentPageIndex(page);
                      setShowReviewDialog(false);
                      setTimeout(() => {
                        document
                          .getElementById(`question-${question.id}`)
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
          </DialogContent>
        </Dialog>
      </div>
    </CoursePlayerLayout>
  );
}
