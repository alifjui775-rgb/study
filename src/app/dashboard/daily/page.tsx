import { useState, useMemo } from "react";
import { PageHeader, LoadingSpinner as CustomLoader } from "@/components";
import {
  getEnrolledBatches,
  checkAttendance,
  markAttendance,
  getDailyTasks,
  submitTask,
  getLiveExams,
  getUserActivityHistory,
} from "@/lib/daily-supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Send,
  AlertTriangle,
  Trophy,
  RotateCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import ActivityHeatmapCalendar from "@/components/daily/ActivityHeatmapCalendar";
import MidnightCountdown from "@/components/daily/MidnightCountdown";

interface BatchInfo {
  id: string;
  name: string;
  attendance?: boolean;
  task?: boolean;
  group_study?: boolean;
  battle?: boolean;
  custom_exam?: boolean;
}

interface TaskStatus {
  course_id: string;
  mandatory_done: boolean;
  optional_done: boolean;
  todo_done: boolean;
  mandatory_url: string;
  optional_url: string;
  todo_url: string;
}

interface DailyExam {
  id: string;
  name: string;
  batchName?: string;
  slug?: string | null;
  score?: number | null;
}

const toBengaliDigits = (value: number) =>
  String(value)
    .padStart(2, "0")
    .replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export default function DailyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [urls, setUrls] = useState<
    Record<string, { mandatory: string; optional: string; todo: string }>
  >({});

  // Query for enrolled batches
  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ["batches", "enrolled", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      return (await getEnrolledBatches(user.uid)) as BatchInfo[];
    },
    enabled: !!user?.uid && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Stable id list — prevents needless queryKey churn between renders
  const batchIds = useMemo(() => batches.map((b) => b.id), [batches]);

  // Query for attendance status
  const { data: attendanceMarked = false } = useQuery({
    queryKey: ["attendance", "today", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return false;
      return await checkAttendance(user.uid, dayjs().format("YYYY-MM-DD"));
    },
    enabled: !!user?.uid && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const { data: activityHistory = {} } = useQuery({
    queryKey: ["activity-history", user?.uid],
    queryFn: () => getUserActivityHistory(user!.uid),
    enabled: !!user?.uid && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Consolidated query for tasks and exams across all batches
  const {
    data: dailyData = {
      taskStatus: {} as Record<string, TaskStatus>,
      liveExams: [] as DailyExam[],
    },
    isLoading: loadingDaily,
  } = useQuery({
    queryKey: ["daily-tasks", user?.uid, batchIds],
    queryFn: async () => {
      const status: Record<string, TaskStatus> = {};
      const date = dayjs().format("YYYY-MM-DD");

      const taskPromises = batches.map((batch) => getDailyTasks(user!.uid, batch.id, date));

      const tasksResults = await Promise.all(taskPromises);

      tasksResults.forEach((taskData, index) => {
        const batch = batches[index];
        if (taskData) {
          status[batch.id] = {
            course_id: batch.id,
            mandatory_done: !!taskData.mandatory_url,
            optional_done: !!taskData.optional_url,
            todo_done: !!taskData.todo_url,
            mandatory_url: taskData.mandatory_url || "",
            optional_url: taskData.optional_url || "",
            todo_url: taskData.todo_url || "",
          };
        } else {
          status[batch.id] = {
            course_id: batch.id,
            mandatory_done: false,
            optional_done: false,
            todo_done: false,
            mandatory_url: "",
            optional_url: "",
            todo_url: "",
          };
        }
      });

      const liveExamsData = await getLiveExams(batches.map((b) => b.id));

      // Fetch student exam attempts for live exams
      const examScores: Record<string, number | null> = {};
      if (liveExamsData.length > 0 && user?.uid) {
        const { data: attempts } = await supabase
          .from("student_exams")
          .select("exam_id, score")
          .eq("student_id", user.uid)
          .in(
            "exam_id",
            liveExamsData.map((e) => e.id),
          );

        if (attempts) {
          attempts.forEach((a: any) => {
            examScores[a.exam_id] = a.score;
          });
        }
      }

      const liveExams = liveExamsData.map((e) => ({
        id: e.id,
        name: e.name,
        batchName: batches.find((b) => b.id === e.course_id)?.name,
        slug: e.courses?.slug ?? null,
        score: examScores[e.id] ?? null,
      }));

      return { taskStatus: status, liveExams };
    },
    enabled: batchIds.length > 0 && !!user?.uid && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Attendance Mutation
  const attendanceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not found");
      const attendanceBatches = batches.filter((b) => b.attendance !== false).map((b) => b.id);
      await markAttendance(user.uid, dayjs().format("YYYY-MM-DD"), attendanceBatches);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance", "today", user?.uid],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-history", user?.uid],
      });
      toast({
        title: "উপস্থিতি নিশ্চিত করা হয়েছে",
        description: "আজকের জন্য আপনার সকল ব্যাচে উপস্থিতি সফলভাবে রেকর্ড করা হয়েছে।",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "উপস্থিতি নিশ্চিত করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  // Task Submission Mutation
  const taskMutation = useMutation({
    mutationFn: async ({
      courseId,
      type,
      url,
    }: {
      courseId: string;
      type: "mandatory" | "optional" | "todo";
      url: string;
    }) => {
      if (!user?.uid) throw new Error("User not found");
      await submitTask(user.uid, courseId, dayjs().format("YYYY-MM-DD"), type, url);
      return { courseId, type, url };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["daily-tasks", user?.uid, batchIds],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-history", user?.uid],
      });
      const typeLabels = {
        mandatory: "আজকের কাজ",
        optional: "যতটুকু হয়েছে",
        todo: "যতটুকু বাকি",
      };
      toast({
        title: "টাস্ক জমা হয়েছে",
        description: `${typeLabels[data.type]} টাস্ক সফলভাবে জমা দেওয়া হয়েছে।`,
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "টাস্ক জমা দিতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  const handleTaskSubmit = (courseId: string, type: "mandatory" | "optional" | "todo") => {
    const url = urls[courseId]?.[type];
    if (!url) {
      toast({
        title: "লিঙ্ক প্রয়োজন",
        description: "অনুগ্রহ করে টাস্কের লিঙ্ক প্রদান করুন।",
        variant: "destructive",
      });
      return;
    }
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error();
      }
    } catch {
      toast({
        title: "সঠিক লিঙ্ক দিন",
        description: "শুধুমাত্র http বা https লিঙ্ক গ্রহণযোগ্য (যেমন: https://drive.google.com/...)",
        variant: "destructive",
      });
      return;
    }
    taskMutation.mutate({ courseId, type, url });
  };

  // Unified first-load gate. Root cause of the old "double refresh":
  // between auth resolving and `batches` arriving, `daily-tasks` was DISABLED
  // (empty batchIds), so its isLoading was false and the page flashed its
  // empty state before flipping back to a loader once batches landed.
  const pageLoading =
    authLoading ||
    (!!user?.uid && loadingBatches) ||
    (!!user?.uid && batchIds.length > 0 && loadingDaily);

  if (pageLoading) return <CustomLoader />;

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      <PageHeader
        title="প্রতিদিনের কাজ ও এটেন্ডেন্স"
        description="প্রতিদিন একবার এটেন্ডেন্স দিন এবং আপনার ব্যাচ ভিত্তিক টাস্ক জমা দিন।"
      />

      <MidnightCountdown />

      {/* Attendance Section */}
      {batches.some((b) => b.attendance !== false) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2
                className={`h-6 w-6 ${attendanceMarked ? "text-green-500" : "text-primary"}`}
              />
              আজকের উপস্থিতি
            </CardTitle>
            <CardDescription>এক ক্লিকেই আপনার সকল এনরোল করা ব্যাচে উপস্থিতি নিশ্চিত করুন।</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceMarked ? (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">আপনি আজকে উপস্থিত আছেন!</span>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 text-lg font-bold shadow-lg shadow-primary/20"
                onClick={() => attendanceMutation.mutate()}
                disabled={attendanceMutation.isPending}
              >
                {attendanceMutation.isPending ? "প্রসেসিং..." : "উপস্থিতি নিশ্চিত করুন"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Exam Alerts */}
      {dailyData.liveExams.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2 px-2 text-purple-600">
            <AlertTriangle className="h-5 w-5" />
            আজকের পরীক্ষা
          </h2>
          {dailyData.liveExams.map((exam) => (
            <Card key={exam.id} className="border-purple-200 bg-purple-50 dark:bg-purple-900/10">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-purple-700 dark:text-purple-300">{exam.name}</h3>
                    <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                      ব্যাচ: {exam.batchName}
                    </p>
                    {exam.score !== null && exam.score !== undefined && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                          স্কোর: {toBengaliDigits(exam.score)}
                        </span>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-xs">
                          সম্পন্ন
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {exam.score === null || exam.score === undefined ? (
                      <Link
                        to={
                          exam.slug
                            ? `/courses/${exam.slug}/exams/${exam.id}`
                            : `/dashboard/exams/${exam.id}`
                        }
                      >
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          পরীক্ষা দিন
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Link
                          to={
                            exam.slug
                              ? `/courses/${exam.slug}/exams/${exam.id}/leaderboard`
                              : `/dashboard/exams/${exam.id}`
                          }
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-300 text-purple-700 hover:bg-purple-100"
                          >
                            <Trophy className="h-4 w-4 mr-1" />
                            লিডারবোর্ড
                          </Button>
                        </Link>
                        <Link
                          to={
                            exam.slug
                              ? `/courses/${exam.slug}/exams/${exam.id}?retake=true`
                              : `/dashboard/exams/${exam.id}?retake=true`
                          }
                        >
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <RotateCw className="h-4 w-4 mr-1" />
                            আবার দিন
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tasks Section */}
      {batches.some((b) => b.task !== false) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 px-2">
            <Send className="h-5 w-5 text-primary" />
            ব্যাচ ভিত্তিক টাস্ক সাবমিশন
          </h2>

          {batches.filter((b) => b.task !== false).length > 0 ? (
            <div className="grid gap-4">
              {batches
                .filter((b) => b.task !== false)
                .map((batch) => {
                  const status = dailyData.taskStatus[batch.id];
                  return (
                    <Card key={batch.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="text-lg">{batch.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        {/* Mandatory Task */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold flex items-center gap-2">
                              {status?.mandatory_done ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              আজকের কাজ
                              <Badge
                                variant="outline"
                                className="text-[10px] text-red-500 border-red-200"
                              >
                                Today's Work
                              </Badge>
                            </label>
                            {status?.mandatory_done && (
                              <span className="text-xs text-green-600 font-medium">সম্পন্ন</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="লিংক দিন"
                                className="pl-9"
                                value={
                                  status?.mandatory_done
                                    ? status.mandatory_url
                                    : urls[batch.id]?.mandatory || ""
                                }
                                onChange={(e) =>
                                  setUrls((prev) => ({
                                    ...prev,
                                    [batch.id]: {
                                      ...(prev[batch.id] || {
                                        mandatory: "",
                                        optional: "",
                                        todo: "",
                                      }),
                                      mandatory: e.target.value,
                                    },
                                  }))
                                }
                                disabled={status?.mandatory_done}
                              />
                            </div>
                            {!status?.mandatory_done && (
                              <Button
                                onClick={() => handleTaskSubmit(batch.id, "mandatory")}
                                disabled={
                                  taskMutation.isPending &&
                                  taskMutation.variables?.courseId === batch.id &&
                                  taskMutation.variables?.type === "mandatory"
                                }
                              >
                                {taskMutation.isPending &&
                                taskMutation.variables?.courseId === batch.id &&
                                taskMutation.variables?.type === "mandatory"
                                  ? "..."
                                  : "জমা দিন"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Optional Task */}
                        <div className="space-y-3 pt-2 border-t border-dashed">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold flex items-center gap-2">
                              {status?.optional_done ? (
                                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              যতটুকু হয়েছে
                              <Badge
                                variant="outline"
                                className="text-[10px] text-blue-500 border-blue-200"
                              >
                                Total Work Done
                              </Badge>
                            </label>
                            {status?.optional_done && (
                              <span className="text-xs text-green-600 font-medium">সম্পন্ন</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="লিংক দিন"
                                className="pl-9"
                                value={
                                  status?.optional_done
                                    ? status.optional_url
                                    : urls[batch.id]?.optional || ""
                                }
                                onChange={(e) =>
                                  setUrls((prev) => ({
                                    ...prev,
                                    [batch.id]: {
                                      ...(prev[batch.id] || {
                                        mandatory: "",
                                        optional: "",
                                        todo: "",
                                      }),
                                      optional: e.target.value,
                                    },
                                  }))
                                }
                                disabled={status?.optional_done}
                              />
                            </div>
                            {!status?.optional_done && (
                              <Button
                                variant="secondary"
                                onClick={() => handleTaskSubmit(batch.id, "optional")}
                                disabled={
                                  taskMutation.isPending &&
                                  taskMutation.variables?.courseId === batch.id &&
                                  taskMutation.variables?.type === "optional"
                                }
                              >
                                {taskMutation.isPending &&
                                taskMutation.variables?.courseId === batch.id &&
                                taskMutation.variables?.type === "optional"
                                  ? "..."
                                  : "জমা দিন"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* To Do Task */}
                        <div className="space-y-3 pt-2 border-t border-dashed">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold flex items-center gap-2">
                              {status?.todo_done ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              যতটুকু বাকি
                              <Badge
                                variant="outline"
                                className="text-[10px] text-green-500 border-green-200"
                              >
                                To Do
                              </Badge>
                            </label>
                            {status?.todo_done && (
                              <span className="text-xs text-green-600 font-medium">সম্পন্ন</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="লিংক দিন"
                                className="pl-9"
                                value={
                                  status?.todo_done ? status.todo_url : urls[batch.id]?.todo || ""
                                }
                                onChange={(e) =>
                                  setUrls((prev) => ({
                                    ...prev,
                                    [batch.id]: {
                                      ...(prev[batch.id] || {
                                        mandatory: "",
                                        optional: "",
                                        todo: "",
                                      }),
                                      todo: e.target.value,
                                    },
                                  }))
                                }
                                disabled={status?.todo_done}
                              />
                            </div>
                            {!status?.todo_done && (
                              <Button
                                variant="outline"
                                onClick={() => handleTaskSubmit(batch.id, "todo")}
                                disabled={
                                  taskMutation.isPending &&
                                  taskMutation.variables?.courseId === batch.id &&
                                  taskMutation.variables?.type === "todo"
                                }
                              >
                                {taskMutation.isPending &&
                                taskMutation.variables?.courseId === batch.id &&
                                taskMutation.variables?.type === "todo"
                                  ? "..."
                                  : "জমা দিন"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed">
              <p className="text-muted-foreground">কোনো ব্যাচে টাস্ক সক্রিয় নেই।</p>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>বিগত দিনের কার্যকলাপ</CardTitle>
          <CardDescription>
            চলতি ও পূর্ববর্তী দুই মাসের অ্যাক্টিভিটি হিটম্যাপ — রং গাঢ় হলে সেদিন তত বেশি কাজ হয়েছে। যেকোনো দিনে
            ক্লিক করে বিস্তারিত দেখুন।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityHeatmapCalendar
            activities={activityHistory}
            courses={batches.map((b) => ({ id: b.id, name: b.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
