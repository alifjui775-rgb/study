import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { addQuestionToExam, removeQuestionFromExam } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, LoadingSpinner, RecheckQuestionModal } from "@/components";
import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ExamsFilter, { FilterState } from "../../ExamsFilter";
import {
  ArrowLeft,
  Plus,
  Minus,
  Search,
  Loader2,
  GripVertical,
  BookOpen,
  GraduationCap,
  Layers,
  FileText,
  CheckCircle2,
  XCircle,
  Trash2,
  History,
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

interface ExamQuestionUsage {
  exam_id: string;
  exams: {
    name: string;
    courses: {
      title: string;
    } | null;
  } | null;
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
  exam_questions: ExamQuestionUsage[];
}

// ─── Helper: HTML stripper for question text preview ──────────────────

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
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

async function fetchMcqQuestionsServer(
  page: number,
  pageSize: number,
  searchTerm: string,
  filter: string,
  linkedIds: Set<string>,
  filterState: FilterState,
) {
  let qbFilesSelect = `
    id, set_id,
    batches (*)
  `;

  if (filterState.institution_ids.length > 0) {
    qbFilesSelect += `, universities!inner(*)`;
  } else {
    qbFilesSelect += `, universities(*)`;
  }

  if (filterState.category_ids.length > 0) {
    qbFilesSelect += `, institution_sub_categories!inner(*)`;
  } else {
    qbFilesSelect += `, institution_sub_categories(*)`;
  }

  const isQbFilesInner =
    filterState.institution_ids.length > 0 || filterState.category_ids.length > 0;

  let query = supabase.from("questions_mcq").select(
    `
      id, question, question_image, explanation, explanation_image, type_id, paper_id,
      question_options (id, option_text, option_image, is_correct),
      qb_files${isQbFilesInner ? "!inner" : ""} (
        ${qbFilesSelect}
      ),
      curriculum_papers (name_bn),
      paper_chapters (name),
      exam_questions (
        exam_id,
        exams (
          name,
          courses (title)
        )
      )
    `,
    { count: "exact" },
  );

  if (filter === "added") {
    if (linkedIds.size > 0) {
      query = query.in("id", Array.from(linkedIds));
    } else {
      query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    }
  } else if (filter === "not_added") {
    if (linkedIds.size > 0) {
      query = query.not("id", "in", `(${Array.from(linkedIds).join(",")})`);
    }
  }

  if (searchTerm) {
    query = query.ilike("question", `%${searchTerm}%`);
  }

  if (filterState.institution_ids.length > 0) {
    query = query.in("qb_files.universities.id", filterState.institution_ids);
  }
  if (filterState.category_ids.length > 0) {
    query = query.in("qb_files.institution_sub_categories.id", filterState.category_ids);
  }
  if (filterState.paper_ids.length > 0) {
    query = query.in("paper_id", filterState.paper_ids);
  }
  if (filterState.chapter_ids.length > 0) {
    query = query.in("chapter_id", filterState.chapter_ids);
  }
  if (filterState.type_ids.length > 0) {
    query = query.in("type_id", filterState.type_ids);
  }

  // Filter by usage status (used in any exam vs unused)
  if (filterState.usage_status === "used") {
    query = query.not("exam_questions", "is", null);
  } else if (filterState.usage_status === "unused") {
    query = query.is("exam_questions", null);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const normalizedData = (data || []).map((q: any) => ({
    ...q,
    qb_files: Array.isArray(q.qb_files) ? q.qb_files[0] || null : q.qb_files || null,
    curriculum_papers: Array.isArray(q.curriculum_papers)
      ? q.curriculum_papers[0] || null
      : q.curriculum_papers || null,
    paper_chapters: Array.isArray(q.paper_chapters)
      ? q.paper_chapters[0] || null
      : q.paper_chapters || null,
    question_options: Array.isArray(q.question_options) ? q.question_options : [],
    exam_questions: Array.isArray(q.exam_questions) ? q.exam_questions : [],
  })) as QuestionWithMeta[];

  return { data: normalizedData, count };
}

// ─── Component ───────────────────────────────────────────────────────

export default function AddExamQuestionsPage() {
  const { course_id, exam_id } = useParams<{ course_id: string; exam_id: string }>();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toggleFilter, setToggleFilter] = useState<"all" | "added" | "not_added">("all");
  const [filterState, setFilterState] = useState<FilterState>({
    category_ids: [],
    institution_ids: [],
    paper_ids: [],
    chapter_ids: [],
    type_ids: [],
    usage_status: "all",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Track which questions are linked to THIS exam (local state for instant UI feedback)
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());


  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [toggleFilter, filterState]);

  // Initial load for exam details and linked IDs
  useEffect(() => {
    if (!exam_id) return;
    const loadInit = async () => {
      try {
        const examData = await fetchExam(exam_id);
        setExam(examData);

        const { data: linkedData, error: linkedErr } = await supabase
          .from("exam_questions")
          .select("mcq_id")
          .eq("exam_id", exam_id);

        if (!linkedErr && linkedData) {
          const ids = new Set<string>();
          linkedData.forEach((d) => {
            if (d.mcq_id) ids.add(d.mcq_id);
          });
          setLinkedIds(ids);
        }
      } catch (err) {
        console.error(err);
        toast({ title: "ডেটা লোড করতে ব্যর্থ", variant: "destructive" });
      } finally {
        setInitialLoad(false);
      }
    };
    loadInit();
  }, [exam_id, toast]);

  // Fetch paginated questions from server
  useEffect(() => {
    if (!exam_id || !exam || initialLoad) return;
    const loadQuestions = async () => {
      setLoading(true);
      try {
        if (exam.exam_type === "mcq") {
          const { data, count } = await fetchMcqQuestionsServer(
            currentPage,
            ITEMS_PER_PAGE,
            debouncedSearch,
            toggleFilter,
            linkedIds,
            filterState,
          );
          setQuestions(data);
          setTotalCount(count || 0);
        }
      } catch (err) {
        console.error(err);
        toast({ title: "প্রশ্ন লোড করতে ব্যর্থ", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [exam_id, exam, initialLoad, currentPage, debouncedSearch, toggleFilter, filterState]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedQuestions = questions;

  // ─── Add / Remove Handlers ────────────────────────────────────────

  const handleAdd = async (questionId: string) => {
    if (!exam_id || !exam) return;
    setActionLoading(questionId);
    const result = await addQuestionToExam(exam_id, questionId, exam.exam_type || "mcq");
    if (result.success) {
      setLinkedIds((prev) => new Set(prev).add(questionId));
      toast({ title: "প্রশ্ন যোগ করা হয়েছে" });
    } else {
      toast({
        title: "যোগ করতে ব্যর্থ",
        description: result.message,
        variant: "destructive",
      });
    }
    setActionLoading(null);
  };

  const handleRemove = async (questionId: string) => {
    if (!exam_id || !exam) return;
    setActionLoading(questionId);
    const result = await removeQuestionFromExam(exam_id, questionId, exam.exam_type || "mcq");
    if (result.success) {
      setLinkedIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      toast({ title: "প্রশ্ন সরানো হয়েছে" });
    } else {
      toast({
        title: "সরাতে ব্যর্থ",
        description: result.message,
        variant: "destructive",
      });
    }
    setActionLoading(null);
  };

  // ─── Counts ───────────────────────────────────────────────────────

  const addedCount = linkedIds.size;

  // ─── Render ───────────────────────────────────────────────────────

  if (initialLoad) {
    return <LoadingSpinner message="তথ্য লোড হচ্ছে..." />;
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-destructive">পরীক্ষা খুঁজে পাওয়া যায়নি।</p>
      </div>
    );
  }

  const examTypeLabel =
    exam.exam_type === "written" ? "Written" : exam.exam_type === "cq" ? "CQ" : "MCQ";

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/instructor/courses/${course_id}/exams/${exam_id}/manage`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <PageHeader title={exam.name} description="পরীক্ষায় প্রশ্ন যুক্ত করুন" />
        </div>
        <Badge variant="secondary" className="text-sm gap-1.5 px-3 py-1">
          <FileText className="w-3.5 h-3.5" />
          {examTypeLabel}
        </Badge>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="font-medium">
            যোগ করা: <span className="text-green-600">{addedCount}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">মোট প্রশ্ন: {totalCount}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          ফলাফল: {totalCount} টি
        </div>
      </div>

      <ExamsFilter onFilterChange={setFilterState} />

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {(
            [
              { key: "all", label: "সব" },
              { key: "added", label: "যোগ করা" },
              { key: "not_added", label: "যোগ হয়নি" },
            ] as const
          ).map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={toggleFilter === key ? "default" : "outline"}
              onClick={() => setToggleFilter(key)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">প্রশ্ন লোড হচ্ছে...</p>
        </div>
      ) : paginatedQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
          <Search className="w-10 h-10 opacity-40" />
          <p className="text-sm">কোনো প্রশ্ন পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedQuestions.map((q, i) => {
            const index = (currentPage - 1) * ITEMS_PER_PAGE + i;
            const isLinked = linkedIds.has(q.id);
            const isLoading = actionLoading === q.id;
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
                className={cn(
                  "group overflow-hidden transition-all duration-200 border",
                  isLinked
                    ? "border-green-200 dark:border-green-900 bg-green-50/20 dark:bg-green-950/10"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700",
                )}
              >
                <CardContent className="p-4 sm:p-6 space-y-4 relative pr-14">
                  {/* ট্যাগ ও ব্যাজ সেকশন */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="font-mono">
                      #{index + 1}
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

                  {/* মূল প্রশ্ন এবং বাটন */}
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
                      {isLinked ? (
                        <button
                          className="text-destructive/80 hover:text-destructive transition-colors p-1 bg-destructive/10 hover:bg-destructive/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          title="সরান"
                          disabled={isLoading}
                          onClick={() => handleRemove(q.id)}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white transition-colors p-1 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="যোগ করুন"
                          disabled={isLoading}
                          onClick={() => handleAdd(q.id)}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* অপশনগুলো */}
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

                  {/* ব্যাখ্যা (Explanation) */}
                  {(q.explanation || (q.explanation_image && q.explanation_image.length > 0)) && (
                    <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-lg space-y-2">
                      <h4 className="text-xs font-bold text-amber-700">ব্যাখ্যা (Explanation)</h4>
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

                  {/* পূর্ববর্তী ব্যবহার (Previous Usage) */}
                  {q.exam_questions && q.exam_questions.length > 0 && (
                    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                      <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        পূর্ববর্তী ব্যবহার (Used In)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {q.exam_questions.map((eq, idx) => {
                          const examObj = Array.isArray(eq.exams) ? eq.exams[0] : eq.exams;
                          const examName = examObj?.name;
                          const courseObj = Array.isArray(examObj?.courses)
                            ? examObj?.courses[0]
                            : examObj?.courses;
                          const courseTitle = courseObj?.title;

                          if (!examName && !courseTitle) return null;

                          const label =
                            courseTitle && examName
                              ? `${courseTitle} - ${examName}`
                              : examName || courseTitle || "";

                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs font-normal py-0.5 px-2"
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            পূর্ববর্তী
          </Button>

          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2)
              ) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              } else if (page === currentPage - 3 || page === currentPage + 3) {
                return (
                  <span key={page} className="px-1 text-muted-foreground">
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            পরবর্তী
          </Button>
        </div>
      )}

      {/* Bottom spacer */}
      <hr className="h-16 border-transparent" />
    </div>
  );
}
