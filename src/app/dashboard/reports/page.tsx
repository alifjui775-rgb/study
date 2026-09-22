import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Loader2, AlertCircle, TrendingUp, BarChart, ChevronDown } from "lucide-react";
import dayjs from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { getAllStudentResults, getAttendanceHistory, type StudentExamResult } from "@/lib/queries";
import ConsistencyAreaChart from "@/components/reports/ConsistencyAreaChart";
import ScoreBarChart, { type ScoreChartPoint } from "@/components/reports/ScoreBarChart";
import ExamResultCard, { type ExamResultCardData } from "@/components/reports/ExamResultCard";

const PAGE_SIZE = 10;
const MAX_DAILY_PENALTY = 5;

const computeScore = (r: StudentExamResult) =>
  r.correct_answers * r.marks_per_question - r.wrong_answers * r.negative_marks_per_wrong;

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [sortBy, setSortBy] = useState<"recent" | "score">("recent");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const {
    data: rawResults = [],
    isLoading: loadingResults,
    error: resultsError,
  } = useQuery({
    queryKey: ["all-student-results", user?.uid],
    queryFn: () => getAllStudentResults(user?.uid || ""),
    enabled: !!user?.uid,
  });

  const { data: activityHistory = new Map(), isLoading: loadingAttendance } = useQuery({
    queryKey: ["attendance-history", user?.uid],
    queryFn: () => getAttendanceHistory(user?.uid || ""),
    enabled: !!user?.uid,
  });

  // Score recomputation from the single joined query (no extra fetches)
  const results: ExamResultCardData[] = useMemo(
    () =>
      rawResults.map((r) => ({
        ...r,
        score: computeScore(r),
        totalMarks: (r.correct_answers + r.wrong_answers + r.unattempted) * r.marks_per_question,
      })),
    [rawResults],
  );

  // Distinct course list derived from results itself (no separate query)
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    results.forEach((r) => {
      if (r.course_id && !map.has(r.course_id)) {
        map.set(r.course_id, r.course_title || "পাবলিক পরীক্ষা");
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [results]);

  // Filter + sort purely client-side; changing these never refetches
  const filteredSortedResults = useMemo(() => {
    const filtered =
      selectedCourseId === "all"
        ? results
        : results.filter((r) => r.course_id === selectedCourseId);

    return [...filtered].sort((a, b) =>
      sortBy === "score" ? b.score - a.score : dayjs(b.submitted_at).diff(dayjs(a.submitted_at)),
    );
  }, [results, selectedCourseId, sortBy]);

  const summary = useMemo(() => {
    const totalAttempts = filteredSortedResults.length;
    const averageScore =
      totalAttempts > 0
        ? filteredSortedResults.reduce((sum, r) => sum + r.score, 0) / totalAttempts
        : 0;
    const bestScore =
      totalAttempts > 0 ? Math.max(...filteredSortedResults.map((r) => r.score)) : 0;
    return { totalAttempts, averageScore, bestScore };
  }, [filteredSortedResults]);

  const chartData: ScoreChartPoint[] = useMemo(
    () =>
      filteredSortedResults
        .slice(0, 10)
        .reverse()
        .map((r) => ({
          name: dayjs(r.submitted_at).format("DD MMM"),
          score: r.score,
          examName: r.exam_name,
          batchName: r.course_title || "পাবলিক পরীক্ষা",
        })),
    [filteredSortedResults],
  );

  const consistencyData = useMemo(() => {
    const data: { date: string; name: string; score: number }[] = [];
    let score = 0;

    for (let i = 29; i >= 0; i--) {
      const date = dayjs().subtract(i, "days");
      const activity = activityHistory.get(date.format("YYYY-MM-DD"));

      const isActiveDay =
        activity && (activity.present || activity.examTaken || activity.tasksCompleted > 0);

      if (isActiveDay && activity) {
        let dailyGain = 0;
        if (activity.present) dailyGain += 1;
        if (activity.examTaken) dailyGain += 1;
        dailyGain += activity.tasksCompleted;
        score += dailyGain;
      } else {
        score = Math.max(0, score - MAX_DAILY_PENALTY);
      }

      data.push({
        date: date.format("YYYY-MM-DD"),
        name: date.format("D MMM"),
        score,
      });
    }
    return data;
  }, [activityHistory]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader title="রিপোর্ট" description="লোড হচ্ছে..." />
        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            লোড হচ্ছে...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader title="রিপোর্ট" description="" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>অনুগ্রহ করে লগইন করুন</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadingResults) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader title="রিপোর্ট" description="লোড হচ্ছে..." />
        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            ফলাফল লোড হচ্ছে...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultsError) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader title="রিপোর্ট" description="" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>ফলাফল আনতে ব্যর্থ</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader title="রিপোর্ট" description="আপনার পরীক্ষার ফলাফল এবং পরিসংখ্যান" />
        <EmptyState
          icon={<BarChart3 className="h-12 w-12 text-primary" />}
          title="কোনো ফলাফল পাওয়া যায়নি"
          description="এখনও কোনো পরীক্ষার ফলাফল নেই। পরীক্ষা দিন এবং আপনার ফলাফল দেখুন।"
        />
      </div>
    );
  }

  const visibleResults = filteredSortedResults.slice(0, visibleCount);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      <PageHeader title="রিপোর্ট" description="আপনার পরীক্ষার ফলাফল এবং পরিসংখ্যান" />

      {loadingAttendance ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              ধারাবাহিকতা চার্ট
            </CardTitle>
            <CardDescription>আপনার দৈনিক কার্যকলাপের উপর ভিত্তি করে ধারাবাহিকতার গ্রাফ</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsistencyAreaChart data={consistencyData} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Select
          value={selectedCourseId}
          onValueChange={(v) => {
            setSelectedCourseId(v);
            setVisibleCount(PAGE_SIZE);
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="কোর্স অনুযায়ী ফিল্টার করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল ব্যাচ</SelectItem>
            {courseOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">মোট পরীক্ষা</p>
              <p className="text-3xl font-bold text-primary">{summary.totalAttempts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">গড় স্কোর</p>
              <p className="text-3xl font-bold text-blue-600">{summary.averageScore.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">সর্বোচ্চ স্কোর</p>
              <p className="text-3xl font-bold text-green-600">{summary.bestScore.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Card */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="h-5 w-5 mr-2" />
              সাম্প্রতিক পরীক্ষার পারফরম্যান্স
            </CardTitle>
            <CardDescription>আপনার শেষ ১০টি পরীক্ষার স্কোর</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreBarChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>বিস্তারিত ফলাফল</CardTitle>
              <CardDescription>সব পরীক্ষার ফলাফল</CardDescription>
            </div>
            <Tabs
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v as "recent" | "score");
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <TabsList>
                <TabsTrigger value="recent">সাম্প্রতিক</TabsTrigger>
                <TabsTrigger value="score">স্কোর</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleResults.length > 0 ? (
              visibleResults.map((result) => <ExamResultCard key={result.id} result={result} />)
            ) : (
              <p className="text-center text-muted-foreground py-8">
                এই কোর্সের জন্য কোনো ফলাফল পাওয়া যায়নি।
              </p>
            )}

            {visibleCount < filteredSortedResults.length && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                  আরও দেখুন ({filteredSortedResults.length - visibleCount} টি বাকি)
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
