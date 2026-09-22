// =============================================================================
// Admin — Subjects & Course Management Page
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Helmet } from "react-helmet-async";
import { TiptapEditor } from "@/components/TiptapEditor";
import {
  fetchDegreePrograms,
  insertDegreeProgram,
  updateDegreeProgram,
  deleteDegreeProgram,
  fetchStudyDisciplines,
  insertStudyDiscipline,
  updateStudyDiscipline,
  deleteStudyDiscipline,
  fetchCurriculumPapers,
  insertCurriculumPaper,
  updateCurriculumPaper,
  deleteCurriculumPaper,
  fetchGroups,
  fetchStudyLevels,
  fetchFaculties,
} from "@/lib/admin-crud-queries";
import {
  degreeProgramFormSchema,
  studyDisciplineSchema,
  curriculumPaperSchema,
  type DegreeProgramRow,
  type DegreeProgramFormValues,
  type StudyDisciplineRow,
  type StudyDisciplineFormValues,
  type CurriculumPaperRow,
  type CurriculumPaperFormValues,
  type StudyLevelRow,
} from "@/lib/admin-crud-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  BookMarked,
  GraduationCap,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Database,
  Link2,
} from "lucide-react";

import { PaperSyllabusManager } from "./PaperSyllabusManager";
import { FacultyManager } from "./FacultyManager";
import { DynamicIcon } from "@/components/DynamicIcon";

const QUERY_KEY_DEGREE_PROGRAMS = "admin-degree-programs";
const QUERY_KEY_DISCIPLINES = "admin-study-disciplines";
const QUERY_KEY_PAPERS = "admin-curriculum-papers";
const QUERY_KEY_GROUPS = "admin-groups";

export default function AdminSubjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("university");
  const [degreeSubTab, setDegreeSubTab] = useState<string>("subjects");

  // --- Groups query ---
  const { data: groups = [] } = useQuery({
    queryKey: [QUERY_KEY_GROUPS],
    queryFn: fetchGroups,
  });

  // --- Study Levels query ---
  const { data: studyLevels = [] } = useQuery({
    queryKey: ["admin-study-levels"],
    queryFn: fetchStudyLevels,
  });

  // --- Faculties query (for degree form dropdown) ---
  const { data: activeFaculties = [] } = useQuery({
    queryKey: ["admin-faculties"],
    queryFn: fetchFaculties,
  });

  // ===========================================================================
  // Tab 1: University Degree Programs (degree_programs)
  // ===========================================================================
  const [uniSearch, setUniSearch] = useState("");
  const [uniSheetOpen, setUniSheetOpen] = useState(false);
  const [editingUni, setEditingUni] = useState<DegreeProgramRow | null>(null);
  const [deleteUniTarget, setDeleteUniTarget] = useState<DegreeProgramRow | null>(null);
  const [uniPage, setUniPage] = useState(1);
  const uniPageSize = 20;

  const {
    data: uniResult,
    isLoading: uniLoading,
    isError: uniError,
    error: uniErr,
  } = useQuery({
    queryKey: [QUERY_KEY_DEGREE_PROGRAMS, uniPage, uniSearch],
    queryFn: () => fetchDegreePrograms(uniPage, uniPageSize, uniSearch),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const uniSubjects = uniResult?.data || [];
  const uniTotalCount = uniResult?.count || 0;
  const uniTotalPages = Math.ceil(uniTotalCount / uniPageSize);

  useEffect(() => {
    setUniPage(1);
  }, [uniSearch]);

  const uniForm = useForm<DegreeProgramFormValues>({
    resolver: zodResolver(degreeProgramFormSchema) as any,
    defaultValues: {
      slug: "",
      short_name: "",
      full_name_en: "",
      full_name_bn: null,
      description: null,
      review: null,
      review_sources: [],
      faculty_id: null,
      lucide_icon_name: null,
    },
  });

  const {
    fields: sourceFields,
    append: appendSource,
    remove: removeSource,
  } = useFieldArray({
    control: uniForm.control,
    name: "review_sources" as any,
  });

  useEffect(() => {
    if (uniSheetOpen) {
      if (editingUni) {
        uniForm.reset({
          slug: editingUni.slug,
          short_name: editingUni.short_name ?? "",
          full_name_en: editingUni.full_name_en,
          full_name_bn: editingUni.full_name_bn,
          description: editingUni.description,
          review: editingUni.review ?? null,
          review_sources: editingUni.review_sources ?? [],
          faculty_id: editingUni.faculty_id ?? null,
          lucide_icon_name: editingUni.lucide_icon_name ?? null,
        });
      } else {
        uniForm.reset({
          slug: "",
          short_name: "",
          full_name_en: "",
          full_name_bn: null,
          description: null,
          review: null,
          review_sources: [],
          faculty_id: null,
          lucide_icon_name: null,
        });
      }
    }
  }, [uniSheetOpen, editingUni, uniForm]);

  const insertUniMut = useMutation({
    mutationFn: insertDegreeProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEGREE_PROGRAMS] });
      toast({ title: "✅ বিশ্ববিদ্যালয় ডিগ্রি প্রোগ্রাম যোগ করা হয়েছে" });
      setUniSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateUniMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DegreeProgramFormValues }) =>
      updateDegreeProgram(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEGREE_PROGRAMS] });
      toast({ title: "✅ বিশ্ববিদ্যালয় ডিগ্রি প্রোগ্রাম আপডেট হয়েছে" });
      setUniSheetOpen(false);
      setEditingUni(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteUniMut = useMutation({
    mutationFn: deleteDegreeProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEGREE_PROGRAMS] });
      toast({ title: "🗑️ বিশ্ববিদ্যালয় ডিগ্রি প্রোগ্রাম মুছে ফেলা হয়েছে" });
      setDeleteUniTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onUniSubmit = uniForm.handleSubmit((values) => {
    if (editingUni) {
      updateUniMut.mutate({ id: editingUni.id, values });
    } else {
      insertUniMut.mutate(values);
    }
  });

  const filteredUni = uniSubjects.filter((s) => {
    if (!uniSearch) return true;
    const q = uniSearch.toLowerCase();
    return (
      (s.short_name && s.short_name.toLowerCase().includes(q)) ||
      (s.full_name_en && s.full_name_en.toLowerCase().includes(q)) ||
      (s.full_name_bn && s.full_name_bn.toLowerCase().includes(q)) ||
      (s.slug && s.slug.toLowerCase().includes(q))
    );
  });

  // ===========================================================================
  // Tab 2: Admission Subjects (study_disciplines)
  // ===========================================================================
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [disciplineSheetOpen, setDisciplineSheetOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState<StudyDisciplineRow | null>(null);
  const [deleteDisciplineTarget, setDeleteDisciplineTarget] = useState<StudyDisciplineRow | null>(
    null,
  );

  const {
    data: studyDisciplines = [],
    isLoading: disciplineLoading,
    isError: disciplineError,
    error: disciplineErr,
  } = useQuery({
    queryKey: [QUERY_KEY_DISCIPLINES],
    queryFn: fetchStudyDisciplines,
    staleTime: 2 * 60 * 1000,
  });

  const disciplineForm = useForm<StudyDisciplineFormValues>({
    resolver: zodResolver(studyDisciplineSchema) as any,
    defaultValues: {
      name_en: "",
      name_bn: "",
      short_code: "",
      level_id: null,
      group_ids: [],
    },
  });

  useEffect(() => {
    if (disciplineSheetOpen) {
      if (editingDiscipline) {
        disciplineForm.reset({
          name_en: editingDiscipline.name_en,
          name_bn: editingDiscipline.name_bn || "",
          short_code: editingDiscipline.short_code || "",
          level_id: editingDiscipline.level_id || null,
          group_ids: editingDiscipline.group_ids || [],
        });
      } else {
        disciplineForm.reset({
          name_en: "",
          name_bn: "",
          short_code: "",
          level_id: null,
          group_ids: [],
        });
      }
    }
  }, [disciplineSheetOpen, editingDiscipline, disciplineForm]);

  const insertDisciplineMut = useMutation({
    mutationFn: insertStudyDiscipline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DISCIPLINES] });
      queryClient.invalidateQueries({ queryKey: ["admin-subjects-list"] });
      toast({ title: "✅ বিষয় যোগ করা হয়েছে" });
      setDisciplineSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateDisciplineMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StudyDisciplineFormValues }) =>
      updateStudyDiscipline(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DISCIPLINES] });
      queryClient.invalidateQueries({ queryKey: ["admin-subjects-list"] });
      toast({ title: "✅ বিষয় আপডেট হয়েছে" });
      setDisciplineSheetOpen(false);
      setEditingDiscipline(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteDisciplineMut = useMutation({
    mutationFn: deleteStudyDiscipline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DISCIPLINES] });
      queryClient.invalidateQueries({ queryKey: ["admin-subjects-list"] });
      toast({ title: "🗑️ বিষয় মুছে ফেলা হয়েছে" });
      setDeleteDisciplineTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onDisciplineSubmit = disciplineForm.handleSubmit((values) => {
    if (editingDiscipline) {
      updateDisciplineMut.mutate({ id: editingDiscipline.id, values });
    } else {
      insertDisciplineMut.mutate(values);
    }
  });

  const filteredDisciplines = studyDisciplines.filter((s) => {
    if (!disciplineSearch) return true;
    const q = disciplineSearch.toLowerCase();
    return (
      (s.name_en && s.name_en.toLowerCase().includes(q)) ||
      (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
      (s.short_code && s.short_code.toLowerCase().includes(q))
    );
  });

  // ===========================================================================
  // ===========================================================================
  // Tab 3: Curriculum Papers (curriculum_papers)
  // ===========================================================================
  const [paperSearch, setPaperSearch] = useState("");
  const [paperSheetOpen, setPaperSheetOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<CurriculumPaperRow | null>(null);
  const [deletePaperTarget, setDeletePaperTarget] = useState<CurriculumPaperRow | null>(null);
  const [syllabusPaperTarget, setSyllabusPaperTarget] = useState<CurriculumPaperRow | null>(null);

  const {
    data: curriculumPapers = [],
    isLoading: paperLoading,
    isError: paperError,
    error: paperErr,
  } = useQuery({
    queryKey: [QUERY_KEY_PAPERS],
    queryFn: fetchCurriculumPapers,
    staleTime: 2 * 60 * 1000,
  });

  const paperForm = useForm<CurriculumPaperFormValues>({
    resolver: zodResolver(curriculumPaperSchema) as any,
    defaultValues: {
      name_en: "",
      name_bn: null,
      short_code: null,
      discipline_id: null,
      group_ids: [],
    },
  });

  useEffect(() => {
    if (paperSheetOpen) {
      if (editingPaper) {
        paperForm.reset({
          name_en: editingPaper.name_en,
          name_bn: editingPaper.name_bn,
          short_code: editingPaper.short_code,
          discipline_id: editingPaper.discipline_id,
          group_ids: editingPaper.group_ids || [],
        });
      } else {
        paperForm.reset({
          name_en: "",
          name_bn: null,
          short_code: null,
          discipline_id: null,
          group_ids: [],
        });
      }
    }
  }, [paperSheetOpen, editingPaper, paperForm]);

  const insertPaperMut = useMutation({
    mutationFn: insertCurriculumPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PAPERS] });
      toast({ title: "✅ পেপার যোগ করা হয়েছে" });
      setPaperSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updatePaperMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CurriculumPaperFormValues }) =>
      updateCurriculumPaper(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PAPERS] });
      toast({ title: "✅ পেপার আপডেট হয়েছে" });
      setPaperSheetOpen(false);
      setEditingPaper(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deletePaperMut = useMutation({
    mutationFn: deleteCurriculumPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PAPERS] });
      toast({ title: "🗑️ পেপার মুছে ফেলা হয়েছে" });
      setDeletePaperTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onPaperSubmit = paperForm.handleSubmit((values) => {
    if (editingPaper) {
      updatePaperMut.mutate({ id: editingPaper.id, values });
    } else {
      insertPaperMut.mutate(values);
    }
  });

  const filteredPapers = curriculumPapers.filter((s) => {
    if (!paperSearch) return true;
    const q = paperSearch.toLowerCase();
    return (
      (s.name_en && s.name_en.toLowerCase().includes(q)) ||
      (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
      (s.short_code && s.short_code.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <Helmet>
        <title>সাবজেক্ট ও বিষয় ব্যবস্থাপনা — অ্যাডমিন</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* --- Header Section --- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-bengali flex items-center gap-2">
              <BookMarked className="h-6 w-6 text-primary" />
              সাবজেক্ট ও বিষয় ব্যবস্থাপনা
            </h1>
            <p className="text-sm text-muted-foreground font-bengali mt-1">
              ডিগ্রি, ভর্তি পরীক্ষার বিষয় এবং পেপার সমূহ পরিচালনা করুন।
            </p>
          </div>
        </div>

        {/* --- Main Tabs --- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted rounded-xl">
            <TabsTrigger
              value="university"
              className="font-bengali flex items-center gap-1.5 rounded-lg"
            >
              <GraduationCap className="h-4 w-4" />
              ডিগ্রি
            </TabsTrigger>
            <TabsTrigger
              value="admission"
              className="font-bengali flex items-center gap-1.5 rounded-lg"
            >
              <BookMarked className="h-4 w-4" />
              বিষয়
            </TabsTrigger>
            <TabsTrigger value="hsc" className="font-bengali flex items-center gap-1.5 rounded-lg">
              <GraduationCap className="h-4 w-4" />
              পেপার
            </TabsTrigger>
          </TabsList>

          {/* ===================================================================
              Tab 1 Content: University Degrees (with nested sub-tabs)
             =================================================================== */}
          <TabsContent value="university" className="space-y-5 outline-none">
            <Tabs value={degreeSubTab} onValueChange={setDegreeSubTab} className="space-y-5">
              <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted rounded-xl">
                <TabsTrigger value="subjects" className="font-bengali text-sm rounded-lg">
                  সাবজেক্ট
                </TabsTrigger>
                <TabsTrigger value="faculties" className="font-bengali text-sm rounded-lg">
                  অনুষদ
                </TabsTrigger>
              </TabsList>

              {/* ── Sub-tab: Subjects (existing degree programs) ── */}
              <TabsContent value="subjects" className="space-y-5 outline-none">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  {/* Search input */}
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ডিগ্রি খুঁজুন..."
                      className="pl-9 font-bengali h-9"
                      value={uniSearch}
                      onChange={(e) => setUniSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setEditingUni(null);
                      setUniSheetOpen(true);
                    }}
                    className="gap-2 w-full sm:w-auto h-9"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-bengali text-sm">নতুন ডিগ্রি</span>
                  </Button>
                </div>

                {uniLoading ? (
                  <LoadingSpinner message="ডিগ্রি লোড হচ্ছে..." />
                ) : uniError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                    <p className="text-destructive font-bengali">
                      তথ্য আনতে সমস্যা: {uniErr instanceof Error ? uniErr.message : "Unknown"}
                    </p>
                  </div>
                ) : filteredUni.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-bengali">কোনো সাবজেক্ট পাওয়া যায়নি।</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mobile list view */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                      {filteredUni.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                {s.short_name}
                              </span>
                              <h3 className="font-bold text-sm text-foreground mt-1.5">
                                {s.full_name_en}
                              </h3>
                              {s.full_name_bn && (
                                <p className="text-xs text-muted-foreground font-bengali mt-0.5">
                                  {s.full_name_bn}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {s.lucide_icon_name ? (
                                <>
                                  <DynamicIcon
                                    iconName={s.lucide_icon_name}
                                    className="h-4 w-4 text-muted-foreground"
                                  />
                                  <span>{s.lucide_icon_name}</span>
                                </>
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                            <div>
                              Slug:{" "}
                              <code className="bg-muted px-1 rounded text-[11px]">{s.slug}</code>
                            </div>
                            {s.faculties && (
                              <div className="font-bengali">
                                অনুষদ:{" "}
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] font-semibold">
                                  {s.faculties.name_bn}
                                </span>
                              </div>
                            )}
                            {s.review && (
                              <div className="flex items-center gap-1 mt-0.5">
                                রিভিউ:
                                <a
                                  href={`/subjects/${s.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                                >
                                  ভিজিট করুন
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <span className="text-xs text-muted-foreground font-bengali">
                              অ্যাকশন:
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => {
                                  setEditingUni(s);
                                  setUniSheetOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="text-xs font-bengali">সম্পাদনা</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => setDeleteUniTarget(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="text-xs font-bengali">মুছুন</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table view */}
                    <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14 font-bengali">#</TableHead>
                            <TableHead className="font-bengali">কোড</TableHead>
                            <TableHead>Full Name (EN)</TableHead>
                            <TableHead className="font-bengali">আইকন</TableHead>
                            <TableHead className="font-bengali">নাম (বাংলা)</TableHead>
                            <TableHead className="font-bengali">অনুষদ</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead className="font-bengali">রিভিউ</TableHead>
                            <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUni.map((s, idx) => (
                            <TableRow
                              key={s.id}
                              className="group hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="text-xs text-muted-foreground">
                                {(uniPage - 1) * uniPageSize + idx + 1}
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-sm">{s.short_name}</span>
                              </TableCell>
                              <TableCell className="text-sm">{s.full_name_en}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {s.lucide_icon_name ? (
                                    <>
                                      <DynamicIcon
                                        iconName={s.lucide_icon_name}
                                        className="h-4 w-4 text-muted-foreground"
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {s.lucide_icon_name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm font-bengali text-muted-foreground">
                                {s.full_name_bn || "—"}
                              </TableCell>
                              <TableCell className="font-bengali text-sm">
                                {s.faculties ? (
                                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold border border-primary/20">
                                    {s.faculties.name_bn}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {s.slug}
                                </code>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {s.review ? (
                                    <a
                                      href={`/subjects/${s.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-primary hover:bg-primary/10"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingUni(s);
                                      setUniSheetOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => setDeleteUniTarget(s)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="border-t border-border px-4 py-2.5">
                        <p className="text-xs text-muted-foreground font-bengali">
                          মোট: {filteredUni.length} / {uniTotalCount} সাবজেক্ট (পৃষ্ঠা {uniPage}/
                          {uniTotalPages || 1})
                        </p>
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    {uniTotalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                        <span className="text-sm text-muted-foreground font-bengali">
                          পৃষ্ঠা {uniPage} / {uniTotalPages} (মোট {uniTotalCount} টি বিষয়)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-bengali"
                            onClick={() => setUniPage((p) => Math.max(1, p - 1))}
                            disabled={uniPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            পূর্ববর্তী
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-bengali"
                            onClick={() => setUniPage((p) => Math.min(uniTotalPages, p + 1))}
                            disabled={uniPage === uniTotalPages}
                          >
                            পরবর্তী
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── Sub-tab: Faculties (new CRUD) ── */}
              <TabsContent value="faculties" className="space-y-5 outline-none">
                <FacultyManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ===================================================================
              Tab 2 Content: Admission Subjects
             =================================================================== */}
          <TabsContent value="admission" className="space-y-5 outline-none">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="বিষয় খুঁজুন..."
                  className="pl-9 font-bengali h-9"
                  value={disciplineSearch}
                  onChange={(e) => setDisciplineSearch(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  setEditingDiscipline(null);
                  setDisciplineSheetOpen(true);
                }}
                className="gap-2 w-full sm:w-auto h-9"
              >
                <Plus className="h-4 w-4" />
                <span className="font-bengali text-sm">নতুন বিষয়</span>
              </Button>
            </div>

            {disciplineLoading ? (
              <LoadingSpinner message="বিষয় লোড হচ্ছে..." />
            ) : disciplineError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-destructive font-bengali">
                  তথ্য আনতে সমস্যা:{" "}
                  {disciplineErr instanceof Error ? disciplineErr.message : "Unknown"}
                </p>
              </div>
            ) : filteredDisciplines.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <BookMarked className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-bengali">কোনো সাবজেক্ট পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile list view */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredDisciplines.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {s.short_code || "—"}
                          </span>
                          <h3 className="font-bold text-sm text-foreground mt-1.5">{s.name_en}</h3>
                          {s.name_bn && (
                            <p className="text-xs text-muted-foreground font-bengali mt-0.5">
                              {s.name_bn}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div>
                          <span className="font-bengali font-semibold">লেভেল:</span>{" "}
                          <span className="font-bengali bg-muted px-1.5 py-0.5 rounded text-[11px]">
                            {studyLevels.find((l) => l.id === s.level_id)?.name || "—"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bengali font-semibold">গ্রুপসমূহ:</span>
                          {s.group_ids && s.group_ids.length > 0 ? (
                            s.group_ids.map((gid) => {
                              const group = groups.find((g) => g.id === gid);
                              return group ? (
                                <Badge
                                  key={gid}
                                  variant="secondary"
                                  className="font-bengali text-[10px] py-0 px-1.5"
                                >
                                  {group.name_bn}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-bengali">
                              সকল গ্রুপ (Common)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => {
                              setEditingDiscipline(s);
                              setDisciplineSheetOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="text-xs font-bengali">সম্পাদনা</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setDeleteDisciplineTarget(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bengali">মুছুন</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14 font-bengali">#</TableHead>
                        <TableHead className="font-bengali">নাম (বাংলা)</TableHead>
                        <TableHead>Name (English)</TableHead>
                        <TableHead className="font-bengali">সংক্ষিপ্ত কোড</TableHead>
                        <TableHead className="font-bengali">লেভেল</TableHead>
                        <TableHead className="font-bengali">সংশ্লিষ্ট গ্রুপসমূহ</TableHead>
                        <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDisciplines.map((s, idx) => (
                        <TableRow key={s.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-sm font-bengali">
                            {s.name_bn || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{s.name_en}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {s.short_code || "—"}
                            </code>
                          </TableCell>
                          <TableCell className="font-bengali text-sm">
                            {studyLevels.find((l) => l.id === s.level_id)?.name || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <div className="flex flex-wrap gap-1.5">
                              {s.group_ids && s.group_ids.length > 0 ? (
                                s.group_ids.map((gid) => {
                                  const group = groups.find((g) => g.id === gid);
                                  return group ? (
                                    <Badge
                                      key={gid}
                                      variant="secondary"
                                      className="font-bengali text-[10px] py-0 px-1.5"
                                    >
                                      {group.name_bn}
                                    </Badge>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-xs text-muted-foreground italic font-bengali">
                                  সকল গ্রুপ (Common)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingDiscipline(s);
                                  setDisciplineSheetOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteDisciplineTarget(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t border-border px-4 py-2.5">
                    <p className="text-xs text-muted-foreground font-bengali">
                      মোট: {filteredDisciplines.length} টি বিষয়
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===================================================================
              Tab 3 Content: HSC Subjects
             =================================================================== */}
          <TabsContent value="hsc" className="space-y-5 outline-none">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="পেপার খুঁজুন..."
                  className="pl-9 font-bengali h-9"
                  value={paperSearch}
                  onChange={(e) => setPaperSearch(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  setEditingPaper(null);
                  setPaperSheetOpen(true);
                }}
                className="gap-2 w-full sm:w-auto h-9"
              >
                <Plus className="h-4 w-4" />
                <span className="font-bengali text-sm">নতুন পেপার</span>
              </Button>
            </div>

            {paperLoading ? (
              <LoadingSpinner message="পেপার লোড হচ্ছে..." />
            ) : paperError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-destructive font-bengali">
                  তথ্য আনতে সমস্যা: {paperErr instanceof Error ? paperErr.message : "Unknown"}
                </p>
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-bengali">কোনো সাবজেক্ট পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile list view */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredPapers.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {s.short_code || "—"}
                          </span>
                          <h3 className="font-bold text-sm text-foreground mt-1.5">{s.name_en}</h3>
                          {s.name_bn && (
                            <p className="text-xs text-muted-foreground font-bengali mt-0.5">
                              {s.name_bn}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div>
                          <span className="font-bengali font-semibold">সংশ্লিষ্ট বিষয়:</span>{" "}
                          <span className="font-bengali bg-muted px-1.5 py-0.5 rounded text-[11px]">
                            {(() => {
                              const disc = studyDisciplines.find((d) => d.id === s.discipline_id);
                              return disc ? disc.name_bn || disc.name_en : "—";
                            })()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bengali font-semibold">গ্রুপসমূহ:</span>
                          {s.group_ids && s.group_ids.length > 0 ? (
                            s.group_ids.map((gid) => {
                              const group = groups.find((g) => g.id === gid);
                              return group ? (
                                <Badge
                                  key={gid}
                                  variant="secondary"
                                  className="font-bengali text-[10px] py-0 px-1.5"
                                >
                                  {group.name_bn}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-bengali">
                              সকল গ্রুপ (Common)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-primary"
                            onClick={() => setSyllabusPaperTarget(s)}
                          >
                            <Database className="h-3.5 w-3.5" />
                            <span className="text-xs font-bengali">সিলেবাস</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => {
                              setEditingPaper(s);
                              setPaperSheetOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="text-xs font-bengali">সম্পাদনা</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setDeletePaperTarget(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bengali">মুছুন</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14 font-bengali">#</TableHead>
                        <TableHead className="font-bengali">নাম (বাংলা)</TableHead>
                        <TableHead>Name (English)</TableHead>
                        <TableHead className="font-bengali">সংক্ষিপ্ত কোড</TableHead>
                        <TableHead className="font-bengali">সংশ্লিষ্ট বিষয়</TableHead>
                        <TableHead className="font-bengali">সংশ্লিষ্ট গ্রুপসমূহ</TableHead>
                        <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPapers.map((s, idx) => (
                        <TableRow key={s.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-sm font-bengali">
                            {s.name_bn || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{s.name_en}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {s.short_code || "—"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const disc = studyDisciplines.find((d) => d.id === s.discipline_id);
                              return disc ? (
                                <span className="font-bengali text-sm font-medium">
                                  {disc.name_bn || disc.name_en}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic font-bengali">
                                  —
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <div className="flex flex-wrap gap-1.5">
                              {s.group_ids && s.group_ids.length > 0 ? (
                                s.group_ids.map((gid) => {
                                  const group = groups.find((g) => g.id === gid);
                                  return group ? (
                                    <Badge
                                      key={gid}
                                      variant="secondary"
                                      className="font-bengali text-[10px] py-0 px-1.5"
                                    >
                                      {group.name_bn}
                                    </Badge>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-xs text-muted-foreground italic font-bengali">
                                  সকল গ্রুপ (Common)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary"
                                onClick={() => setSyllabusPaperTarget(s)}
                              >
                                <Database className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingPaper(s);
                                  setPaperSheetOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeletePaperTarget(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t border-border px-4 py-2.5">
                    <p className="text-xs text-muted-foreground font-bengali">
                      মোট: {filteredPapers.length} টি পেপার
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===================================================================
          University Sheets & Confirmation Dialogs
         =================================================================== */}
      <Sheet
        open={uniSheetOpen}
        onOpenChange={(open) => {
          setUniSheetOpen(open);
          if (!open) setEditingUni(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editingUni ? "ডিগ্রি সম্পাদনা" : "নতুন ডিগ্রি"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              বিশ্ববিদ্যালয়ের অনার্স পর্যায়ের কোর্স/ডিগ্রি সাবজেক্টের তথ্য পরিচালনা করুন।
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-6">
            <Form {...uniForm}>
              <form id="uni-subject-form" onSubmit={onUniSubmit} className="space-y-5 py-5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  পরিচিতি
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={uniForm.control}
                    name="short_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">কোড / সংক্ষিপ্ত</FormLabel>
                        <FormControl>
                          <Input placeholder="CSE" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={uniForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="cse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={uniForm.control}
                  name="full_name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name (English) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Computer Science and Engineering" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uniForm.control}
                  name="full_name_bn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নাম (বাংলা)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="কম্পিউটার বিজ্ঞান ও প্রকৌশল"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uniForm.control}
                  name="faculty_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">অনুষদ (Faculty)</FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? null : parseInt(val, 10))
                        }
                        value={
                          field.value !== null && field.value !== undefined
                            ? String(field.value)
                            : "none"
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="font-bengali">
                            <SelectValue placeholder="অনুষদ নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" className="font-bengali">
                            কোনটি নয়
                          </SelectItem>
                          {activeFaculties.map((f) => (
                            <SelectItem key={f.id} value={String(f.id)} className="font-bengali">
                              {f.name_bn} ({f.name_en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uniForm.control}
                  name="lucide_icon_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">আইকনের নাম (Lucide Icon Name)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <DynamicIcon
                                iconName={field.value}
                                className="h-4 w-4 text-muted-foreground"
                              />
                            </div>
                            <Input
                              placeholder="e.g. BookOpen, GraduationCap"
                              {...field}
                              value={field.value ?? ""}
                              className="pl-9 font-mono text-sm"
                            />
                          </div>
                          {field.value && (
                            <div className="flex items-center justify-center h-9 w-9 rounded-md border border-border bg-muted/30 shrink-0">
                              <DynamicIcon
                                iconName={field.value}
                                className="h-5 w-5 text-foreground"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground font-bengali">
                        lucide-react থেকে আইকনের নাম লিখুন।{" "}
                        <a
                          href="https://lucide.dev/icons/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          সকল আইকন দেখুন
                        </a>
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  অতিরিক্ত তথ্য
                </p>
                <FormField
                  control={uniForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">বিবরণ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="সাবজেক্টের সাধারণ বিবরণ..."
                          rows={3}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── Review Content (Tiptap HTML) ── */}
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2">
                  Review Content (Rich Text / HTML)
                </p>
                <FormField
                  control={uniForm.control}
                  name="review"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">রিভিউ কন্টেন্ট (Tiptap Editor)</FormLabel>
                      <FormControl>
                        <TiptapEditor
                          value={field.value ?? ""}
                          onChange={(val) => field.onChange(val)}
                          placeholder="সাবজেক্টের রিভিউ কন্টেন্ট লিখুন বা HTML পেস্ট করুন..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── Review Sources ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                      Review Sources
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => appendSource({ title: "", url: "" })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Source
                    </Button>
                  </div>

                  {sourceFields.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No sources added yet. Click "Add Source" to add one.
                    </p>
                  )}

                  <div className="space-y-2.5">
                    {sourceFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              Title
                            </label>
                            <Input
                              placeholder="e.g. CSE Syllabus 2024"
                              {...uniForm.register(`review_sources.${index}.title` as any)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Link2 className="h-3 w-3" /> URL
                            </label>
                            <Input
                              placeholder="https://..."
                              {...uniForm.register(`review_sources.${index}.url` as any)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0 mt-5"
                          onClick={() => removeSource(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </Form>
          </ScrollArea>
          <Separator />
          <div className="px-6 py-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUniSheetOpen(false)}
              disabled={insertUniMut.isPending || updateUniMut.isPending}
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              form="uni-subject-form"
              disabled={insertUniMut.isPending || updateUniMut.isPending}
            >
              {(insertUniMut.isPending || updateUniMut.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingUni ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteUniTarget}
        onOpenChange={(open) => !open && setDeleteUniTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি{" "}
              <strong>
                {deleteUniTarget?.short_name} ({deleteUniTarget?.full_name_en})
              </strong>{" "}
              সাবজেক্টটি মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUniTarget && deleteUniMut.mutate(deleteUniTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteUniMut.isPending}
            >
              {deleteUniMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================================
          Admission Subject Sheets & Confirmation Dialogs
         =================================================================== */}
      <Sheet
        open={disciplineSheetOpen}
        onOpenChange={(open) => {
          setDisciplineSheetOpen(open);
          if (!open) setEditingDiscipline(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editingDiscipline ? "বিষয় সম্পাদনা" : "নতুন বিষয়"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              বিশ্ববিদ্যালয় ভর্তি পরীক্ষার যোগ্যতা ও ইউনিট রিকোয়ারমেন্টসে ব্যবহারের জন্য বিষয় পরিচালনা করুন।
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-6">
            <Form {...disciplineForm}>
              <form id="adm-subject-form" onSubmit={onDisciplineSubmit} className="space-y-5 py-5">
                <FormField
                  control={disciplineForm.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Physics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={disciplineForm.control}
                  name="name_bn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নাম (বাংলা)</FormLabel>
                      <FormControl>
                        <Input placeholder="পদার্থবিজ্ঞান" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={disciplineForm.control}
                  name="short_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">সংক্ষিপ্ত কোড</FormLabel>
                      <FormControl>
                        <Input placeholder="PHY" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={disciplineForm.control}
                  name="level_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">লেভেল (Study Level)</FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? null : parseInt(val, 10))
                        }
                        value={
                          field.value !== null && field.value !== undefined
                            ? String(field.value)
                            : "none"
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="font-bengali">
                            <SelectValue placeholder="লেভেল নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" className="font-bengali">
                            কোনোটিই নয়
                          </SelectItem>
                          {studyLevels.map((lvl) => (
                            <SelectItem
                              key={lvl.id}
                              value={String(lvl.id)}
                              className="font-bengali"
                            >
                              {lvl.name} ({lvl.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Group Checkboxes Section */}
                <FormField
                  control={disciplineForm.control}
                  name="group_ids"
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel className="font-bengali flex items-center gap-1.5 text-sm font-semibold">
                          <Layers className="h-4 w-4 text-primary" />
                          সংশ্লিষ্ট গ্রুপসমূহ (Related Groups)
                        </FormLabel>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {groups.map((group) => (
                          <FormField
                            key={group.id}
                            control={disciplineForm.control}
                            name="group_ids"
                            render={({ field }) => {
                              const checked = field.value?.includes(group.id) || false;
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border border-border bg-card/50 p-3 hover:bg-muted/40 transition-all cursor-pointer">
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(checkedState) => {
                                        const currentVal = field.value || [];
                                        if (checkedState) {
                                          field.onChange([...currentVal, group.id]);
                                        } else {
                                          field.onChange(
                                            currentVal.filter((id) => id !== group.id),
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs font-semibold font-bengali cursor-pointer select-none">
                                    {group.name_bn} ({group.name_en})
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </ScrollArea>
          <Separator />
          <div className="px-6 py-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisciplineSheetOpen(false)}
              disabled={insertDisciplineMut.isPending || updateDisciplineMut.isPending}
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              form="adm-subject-form"
              disabled={insertDisciplineMut.isPending || updateDisciplineMut.isPending}
            >
              {(insertDisciplineMut.isPending || updateDisciplineMut.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingDiscipline ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteDisciplineTarget}
        onOpenChange={(open) => !open && setDeleteDisciplineTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি{" "}
              <strong>{deleteDisciplineTarget?.name_bn || deleteDisciplineTarget?.name_en}</strong>{" "}
              বিষয়টি মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDisciplineTarget && deleteDisciplineMut.mutate(deleteDisciplineTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteDisciplineMut.isPending}
            >
              {deleteDisciplineMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================================
          HSC Subject Sheets & Confirmation Dialogs
         =================================================================== */}
      <Sheet
        open={paperSheetOpen}
        onOpenChange={(open) => {
          setPaperSheetOpen(open);
          if (!open) setEditingPaper(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editingPaper ? "পেপার সম্পাদনা" : "নতুন পেপার"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              সিলেবাস ও চ্যাপ্টার ট্র্যাকিংয়ের জন্য পেপার পরিচালনা করুন।
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-6">
            <Form {...paperForm}>
              <form id="paper-subject-form" onSubmit={onPaperSubmit} className="space-y-5 py-5">
                <FormField
                  control={paperForm.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Higher Math 1st Paper" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paperForm.control}
                  name="name_bn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নাম (বাংলা)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="উচ্চতর গণিত ১ম পত্র"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paperForm.control}
                  name="short_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">সংক্ষিপ্ত কোড</FormLabel>
                      <FormControl>
                        <Input placeholder="m1" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paperForm.control}
                  name="discipline_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">
                        সংশ্লিষ্ট ডিসিপ্লিন (Study Discipline)
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="font-bengali">
                            <SelectValue placeholder="ডিসিপ্লিন নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {studyDisciplines.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="font-bengali">
                              {d.name_bn || d.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Group Checkboxes Section */}
                <FormField
                  control={paperForm.control}
                  name="group_ids"
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel className="font-bengali flex items-center gap-1.5 text-sm font-semibold">
                          <Layers className="h-4 w-4 text-primary" />
                          সংশ্লিষ্ট গ্রুপসমূহ (Related Groups)
                        </FormLabel>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {groups.map((group) => (
                          <FormField
                            key={group.id}
                            control={paperForm.control}
                            name="group_ids"
                            render={({ field }) => {
                              const checked = field.value?.includes(group.id) || false;
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border border-border bg-card/50 p-3 hover:bg-muted/40 transition-all cursor-pointer">
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(checkedState) => {
                                        const currentVal = field.value || [];
                                        if (checkedState) {
                                          field.onChange([...currentVal, group.id]);
                                        } else {
                                          field.onChange(
                                            currentVal.filter((id) => id !== group.id),
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs font-semibold font-bengali cursor-pointer select-none">
                                    {group.name_bn} ({group.name_en})
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </ScrollArea>
          <Separator />
          <div className="px-6 py-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaperSheetOpen(false)}
              disabled={insertPaperMut.isPending || updatePaperMut.isPending}
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              form="paper-subject-form"
              disabled={insertPaperMut.isPending || updatePaperMut.isPending}
            >
              {(insertPaperMut.isPending || updatePaperMut.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingPaper ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deletePaperTarget}
        onOpenChange={(open) => !open && setDeletePaperTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deletePaperTarget?.name_bn || deletePaperTarget?.name_en}</strong>{" "}
              পেপারটি মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePaperTarget && deletePaperMut.mutate(deletePaperTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deletePaperMut.isPending}
            >
              {deletePaperMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaperSyllabusManager
        paperId={syllabusPaperTarget?.id || null}
        paperName={syllabusPaperTarget?.name_en || ""}
        onClose={() => setSyllabusPaperTarget(null)}
      />
    </>
  );
}
