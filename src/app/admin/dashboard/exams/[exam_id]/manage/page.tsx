import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { removeQuestionFromExam } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, LoadingSpinner, RecheckQuestionModal } from "@/components";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  GraduationCap,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { Exam } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────

interface McqOption {
  id: string;
  option_text: string;
  option_image?: string[] | null;
  is_correct: boolean;
}

interface QuestionFile {
  id: string;
  set_id: string | null;
  universities: Record<string, any> | null;
  batches: Record<string, any> | null;
  institution_sub_categories: Record<string, any> | null;
}

interface QuestionWithMeta {
  id: string;
  question: string;
  question_image?: string[] | null;
  explanation?: string | null;
  explanation_image?: string[] | null;
  type_id: string | null;
  question_options: McqOption[];
  qb_files: QuestionFile | null;
  curriculum_papers: { name_bn: string } | null;
  paper_chapters: { name: string } | null;
}

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

// ─── Supabase Fetchers ───────────────────────────────────────────────

async function fetchExam(examId: string) {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .is("deleted_at", null)
    .eq("id", examId)
    .single();
  if (error) throw error;
  return data as Exam;
}

async function fetchLinkedQuestions(examId: string): Promise<QuestionWithMeta[]> {
  // Fetch linked MCQ IDs for this exam
  const { data: linkedData, error: linkedErr } = await supabase
    .from("exam_questions")
    .select("mcq_id")
    .eq("exam_id", examId);

  if (linkedErr) throw linkedErr;

  const ids = (linkedData || []).map((d) => d.mcq_id).filter(Boolean) as string[];

  if (ids.length === 0) return [];

  // Fetch full question data for those IDs
  const { data, error } = await supabase
    .from("questions_mcq")
    .select(
      `
      id, question, question_image, explanation, explanation_image, type_id,
      question_options (id, option_text, option_image, is_correct),
      qb_files (
        id, set_id,
        universities(*),
        batches(*),
        institution_sub_categories(*)
      ),
      curriculum_papers (name_bn),
      paper_chapters (name)
    `,
    )
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((q: any) => ({
    ...q,
    qb_files: Array.isArray(q.qb_files) ? q.qb_files[0] || null : q.qb_files || null,
    curriculum_papers: Array.isArray(q.curriculum_papers)
      ? q.curriculum_papers[0] || null
      : q.curriculum_papers || null,
    paper_chapters: Array.isArray(q.paper_chapters)
      ? q.paper_chapters[0] || null
      : q.paper_chapters || null,
    question_options: Array.isArray(q.question_options) ? q.question_options : [],
  })) as QuestionWithMeta[];
}

// ─── Component ───────────────────────────────────────────────────────

export default function ManageExamQuestionsPage() {
  const { course_id, exam_id } = useParams<{ course_id: string; exam_id: string }>();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<QuestionWithMeta | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Load Data ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!exam_id) return;
    setLoading(true);
    try {
      const [examData, questionsData] = await Promise.all([
        fetchExam(exam_id),
        fetchLinkedQuestions(exam_id),
      ]);
      setExam(examData);
      setQuestions(questionsData);
    } catch (err) {
      console.error(err);
      toast({ title: "ডেটা লোড করতে ব্যর্থ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [exam_id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Delete Handler ───────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!exam_id || !exam || !deleteTarget) return;
    setDeleteLoading(true);
    const result = await removeQuestionFromExam(exam_id, deleteTarget.id, exam.exam_type || "mcq");
    if (result.success) {
      setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      toast({ title: "প্রশ্নটি পরীক্ষা থেকে সরিয়ে দেওয়া হয়েছে" });
    } else {
      toast({ title: "সরাতে ব্যর্থ", description: result.message, variant: "destructive" });
    }
    setDeleteLoading(false);
    setDeleteTarget(null);
  };

  // ─── Helpers ──────────────────────────────────────────────────────

  const examTypeLabel =
    exam?.exam_type === "written" ? "Written" : exam?.exam_type === "cq" ? "CQ" : "MCQ";

  // ─── Loading State ────────────────────────────────────────────────

  if (loading) {
    return <LoadingSpinner message="তথ্য লোড হচ্ছে..." />;
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-destructive">পরীক্ষা খুঁজে পাওয়া যায়নি।</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/instructor/courses/${course_id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <PageHeader title={exam.name} description="পরীক্ষার প্রশ্ন ম্যানেজ করুন" />
        </div>
        <Badge variant="secondary" className="text-sm gap-1.5 px-3 py-1">
          <FileText className="w-3.5 h-3.5" />
          {examTypeLabel}
        </Badge>
      </div>

      {/* Stats Bar + Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="font-medium">
              যোগ করা: <span className="text-green-600 font-bold">{questions.length}</span>
            </span>
          </div>
        </div>

        {/* Add Questions Button */}
        <Link to={`/instructor/courses/${course_id}/exams/${exam_id}/add`}>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            প্রশ্ন যুক্ত করুন
          </Button>
        </Link>
      </div>

      {/* Question List */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-8 h-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">এই পরীক্ষায় এখনও কোনো প্রশ্ন যোগ করা হয়নি।</p>
          <Link to={`/instructor/courses/${course_id}/exams/${exam_id}/add`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              প্রথম প্রশ্নটি যুক্ত করুন
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const uniObj = q.qb_files?.universities;
            const batchObj = q.qb_files?.batches;
            const catObj = q.qb_files?.institution_sub_categories;

            const uniName = uniObj?.name_bn || uniObj?.name_en || uniObj?.name || uniObj?.title;
            const batchName = getBatchDisplay(batchObj);
            const catName = catObj?.name_bn || catObj?.name_en || catObj?.name || catObj?.title;
            const paperName = q.curriculum_papers?.name_bn;
            const chapterName = q.paper_chapters?.name;

            return (
              <Card
                key={q.id}
                className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
              >
                <CardContent className="p-4 sm:p-6 space-y-4 relative pr-14">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="font-mono">
                      #{i + 1}
                    </Badge>
                    {uniName && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50/50 text-blue-700 border-blue-200"
                      >
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {uniName}
                      </Badge>
                    )}
                    {batchName && (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50/50 text-indigo-700 border-indigo-200"
                      >
                        {batchName}
                      </Badge>
                    )}
                    {catName && (
                      <Badge
                        variant="outline"
                        className="bg-teal-50/50 text-teal-700 border-teal-200"
                      >
                        {catName}
                      </Badge>
                    )}
                    {paperName && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50/50 text-emerald-700 border-emerald-200"
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        {paperName}
                      </Badge>
                    )}
                    {chapterName && (
                      <Badge
                        variant="outline"
                        className="bg-purple-50/50 text-purple-700 border-purple-200"
                      >
                        <Layers className="w-3 h-3 mr-1" />
                        {chapterName}
                      </Badge>
                    )}
                  </div>

                  {/* Question and Delete Button */}
                  <div className="flex items-start gap-3">
                    <div className="text-base sm:text-lg font-medium leading-relaxed">
                      {q.question && <LatexRenderer html={q.question} />}
                      {!q.question && (!q.question_image || q.question_image.length === 0) && (
                        <span className="text-muted-foreground italic text-sm">
                          (প্রশ্নের টেক্সট বা ছবি নেই)
                        </span>
                      )}
                      {q.question_image && q.question_image.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {q.question_image.map((img, idx) => (
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
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5">
                      <RecheckQuestionModal
                        questionId={q.id}
                        questionType={exam?.exam_type || "mcq"}
                      />
                      <button
                        className="text-destructive/70 hover:text-destructive transition-colors p-1 bg-destructive/5 hover:bg-destructive/10 rounded-md"
                        title="প্রশ্নটি সরিয়ে দিন"
                        onClick={() => setDeleteTarget(q)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  {q.question_options && q.question_options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {q.question_options.map((opt, oi) => (
                        <div
                          key={opt.id}
                          className={cn(
                            "p-2 sm:p-3 rounded-md border flex items-start gap-2 sm:gap-3 transition-all shadow-sm",
                            opt.is_correct
                              ? "bg-green-100 border-green-400 text-green-950 font-medium"
                              : "bg-background border-border",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold border shadow-sm",
                              opt.is_correct
                                ? "bg-green-700 text-white border-green-800"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {String.fromCharCode(2453 + oi)}
                          </span>
                          <div className="flex-1 text-xs sm:text-sm pt-0.5 space-y-2">
                            {opt.option_text && <LatexRenderer html={opt.option_text} />}
                            {opt.option_image && opt.option_image.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {opt.option_image.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt="Option"
                                    className="max-h-32 rounded-md border object-contain"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {(q.explanation || (q.explanation_image && q.explanation_image.length > 0)) && (
                    <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-lg space-y-2">
                      <h4 className="text-xs font-bold text-amber-900">ব্যাখ্যা (Explanation)</h4>
                      {q.explanation && (
                        <MarkdownRenderer
                          className="text-sm text-amber-950"
                          content={q.explanation}
                        />
                      )}
                      {q.explanation_image && q.explanation_image.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {q.explanation_image.map((img, idx) => (
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom spacer */}
      <hr className="h-16 border-transparent" />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              প্রশ্নটি সরিয়ে দেবেন?
            </AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে এই প্রশ্নটি পরীক্ষা{" "}
              <span className="font-semibold text-foreground">"{exam?.name}"</span> থেকে সরিয়ে দিতে
              চান? এই অ্যাকশনটি পরে পুনরায় প্রশ্ন যোগ করে ঠিক করা যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
            >
              {deleteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              হ্যাঁ, সরিয়ে দিন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
