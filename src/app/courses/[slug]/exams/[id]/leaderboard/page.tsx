import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCourseBySlug, getCourseCurriculum, getUserCourseEnrollment } from "@/lib/queries";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Exam } from "@/lib/types";
import { Trophy, Medal, Award, RefreshCw } from "lucide-react";

export const runtime = "edge";

interface LeaderboardEntry {
  roll: string;
  rawRoll: string;
  score: number;
  submitted_at: string;
}

export default function ExamLeaderboardPage() {
  const { user } = useAuth();
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const exam_id = id as string;
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 1. Fetch Course Info
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => getCourseBySlug(slug!),
    enabled: !!slug,
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

  // 2. Fetch Exam Details
  useEffect(() => {
    if (!exam_id) return;
    supabase
      .from("exams")
      .select("*")
      .is("deleted_at", null)
      .eq("id", exam_id)
      .single()
      .then(({ data }) => {
        if (data) setExam(data);
      });
  }, [exam_id]);

  // 3. Fetch Top 100 Leaderboard Results strictly by score DESC, submitted_at ASC
  const fetchLeaderboard = async () => {
    if (!exam_id) return;
    setLoadingData(true);
    try {
      let { data, error } = await supabase
        .from("student_exams")
        .select("score, submitted_at, study_student!inner(roll)")
        .eq("exam_id", exam_id)
        .neq("status", "ongoing")
        .order("score", { ascending: false })
        .order("submitted_at", { ascending: true })
        .limit(100);

      if (error) {
        // Fallback for users relationship schema
        const fallback = await supabase
          .from("student_exams")
          .select("score, submitted_at, users!inner(roll)")
          .eq("exam_id", exam_id)
          .neq("status", "ongoing")
          .order("score", { ascending: false })
          .order("submitted_at", { ascending: true })
          .limit(100);

        data = fallback.data as any;
        error = fallback.error;
      }

      if (data) {
        setLeaderboard(
          data.map((item: any) => {
            const raw = item.study_student?.roll || item.users?.roll || item.roll || "";
            const str = String(raw).trim();
            const formatted = str ? (str.startsWith("SOT-") ? str : `SOT-${str}`) : "SOT-000000";
            return {
              score: Number(item.score || 0),
              submitted_at: item.submitted_at,
              roll: formatted,
              rawRoll: str,
            };
          }),
        );
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "লিডারবোর্ড লোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [exam_id]);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="inline-flex items-center gap-1.5 font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs shadow-2xs">
          <Trophy className="size-3.5 fill-amber-500" />
          <span>১ম (1st)</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="inline-flex items-center gap-1.5 font-bold text-slate-400 bg-slate-500/10 border border-slate-500/30 px-3 py-1 rounded-full text-xs shadow-2xs">
          <Medal className="size-3.5 fill-slate-400" />
          <span>২য় (2nd)</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-600 bg-amber-700/10 border border-amber-700/30 px-3 py-1 rounded-full text-xs shadow-2xs">
          <Award className="size-3.5 fill-amber-700 dark:fill-amber-600" />
          <span>৩য় (3rd)</span>
        </div>
      );
    }
    return <span className="font-semibold text-xs text-muted-foreground px-2 py-0.5">#{rank}</span>;
  };

  const getRowStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return "bg-primary/10 border-l-4 border-l-primary font-bold";
    }
    if (rank === 1) {
      return "bg-amber-500/5 border-l-4 border-l-amber-500 font-medium";
    }
    if (rank === 2) {
      return "bg-slate-500/5 border-l-4 border-l-slate-400 font-medium";
    }
    if (rank === 3) {
      return "bg-amber-700/5 border-l-4 border-l-amber-700 font-medium";
    }
    return "";
  };

  const isLoadingPage = isLoadingCourse || isLoadingEnrollment || isLoadingCurriculum;

  if (isLoadingPage) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return null;
  }

  return (
    <CoursePlayerLayout
      course={course}
      curriculum={curriculum || []}
      activeItemId={exam_id}
      itemTitle={exam?.name || "Leaderboard"}
    >
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-6 font-bengali">
        {/* Top Header */}
        <div className="bg-card border rounded-2xl md:rounded-3xl p-6 shadow-xs space-y-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold font-bengali gradient-text">
            {exam?.name || "মেধা তালিকা"}
          </h1>
          <p className="text-sm text-muted-foreground font-bengali">
            {course.title} — শীর্ষ ফলাফল তালিকা (Top 100)
          </p>
        </div>

        {/* Simplified Leaderboard Card */}
        <Card className="rounded-2xl md:rounded-3xl border shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl font-bold font-bengali flex items-center gap-2">
                  <Trophy className="size-5 text-amber-500" />
                  পরীক্ষার মেধা তালিকা
                </CardTitle>
                <CardDescription className="text-xs md:text-sm font-bengali">
                  পজিশন, রোল নম্বর এবং অর্জিত নম্বরের তালিকা
                </CardDescription>
              </div>

              <button
                onClick={fetchLeaderboard}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`size-4 ${loadingData ? "animate-spin" : ""}`} />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {loadingData ? (
              <div className="space-y-3 p-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between h-12 bg-muted/30 animate-pulse rounded-xl px-4"
                  >
                    <div className="w-16 h-5 bg-muted/50 rounded-md" />
                    <div className="w-32 h-5 bg-muted/50 rounded-md" />
                    <div className="w-16 h-5 bg-muted/50 rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-24 text-center font-bold">Position</TableHead>
                    <TableHead className="font-bold">Roll Number</TableHead>
                    <TableHead className="text-right font-bold w-32">Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.length > 0 ? (
                    leaderboard.map((item, index) => {
                      const rank = index + 1;
                      const userRollStr = user?.roll ? String(user.roll).trim() : "";
                      const isCurrentUser =
                        !!userRollStr &&
                        (item.rawRoll === userRollStr ||
                          item.roll === userRollStr ||
                          item.roll === `SOT-${userRollStr}`);

                      return (
                        <TableRow
                          key={`${item.roll}-${index}`}
                          className={getRowStyle(rank, isCurrentUser)}
                        >
                          {/* 1. Position */}
                          <TableCell className="text-center">{renderRankBadge(rank)}</TableCell>

                          {/* 2. Roll Number */}
                          <TableCell className="font-mono text-sm font-semibold tracking-wide">
                            <span className="inline-flex items-center gap-2">
                              {item.roll}
                              {isCurrentUser && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 px-2 bg-primary/20 text-primary border-primary/30 font-bengali"
                                >
                                  আপনি
                                </Badge>
                              )}
                            </span>
                          </TableCell>

                          {/* 3. Marks */}
                          <TableCell className="text-right font-bold text-sm md:text-base text-primary font-mono">
                            {Number(item.score).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-36 text-center text-muted-foreground">
                        <div className="space-y-1">
                          <p className="text-base font-semibold font-bengali">
                            এখনো কেউ এই পরীক্ষায় অংশগ্রহণ করেনি।
                          </p>
                          <p className="text-xs font-sans text-muted-foreground">
                            No one has submitted this exam yet.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </CoursePlayerLayout>
  );
}
