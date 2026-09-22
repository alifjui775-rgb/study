import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStats,
  getRecentExamResults,
  getUserEnrolledCoursesWithDetails,
} from "@/lib/queries";
import { Link } from "react-router-dom";
import dayjs from "@/lib/date-utils";
import {
  BookOpen,
  FileCheck,
  BadgePercent,
  Trophy,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Clock,
  ChevronRight,
  Award,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  // 1. Fetch Top Stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard-stats", user?.uid],
    queryFn: () => getDashboardStats(user!.uid),
    enabled: !!user?.uid,
    initialData: {
      enrolledCourses: 0,
      examsTaken: 0,
      averageScore: 0,
      bestScore: 0,
    },
  });

  // 2. Fetch Enrolled Courses with Joined Details
  const { data: enrolledCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["enrolled-courses-details", user?.uid],
    queryFn: () => getUserEnrolledCoursesWithDetails(user!.uid),
    enabled: !!user?.uid,
  });

  // 3. Fetch Recent Exam Results
  const { data: recentResults = [], isLoading: loadingResults } = useQuery({
    queryKey: ["recent-results", user?.uid],
    queryFn: () => getRecentExamResults(user!.uid),
    enabled: !!user?.uid,
  });

  const isLoading = authLoading || loadingStats || loadingCourses || loadingResults;

  if (isLoading) {
    return (
      <div className="space-y-8 font-bengali p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="h-16 w-1/3 bg-muted/40 animate-pulse rounded-2xl" />

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-3xl" />
          ))}
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 w-48 bg-muted/40 animate-pulse rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="h-56 bg-muted/40 animate-pulse rounded-3xl" />
              <div className="h-56 bg-muted/40 animate-pulse rounded-3xl" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 w-40 bg-muted/40 animate-pulse rounded-xl" />
            <div className="h-72 bg-muted/40 animate-pulse rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "কেনা কোর্স",
      value: stats.enrolledCourses,
      subtitle: "সক্রিয় এনরোলমেন্টস",
      icon: BookOpen,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "দেওয়া পরীক্ষা",
      value: stats.examsTaken,
      subtitle: "সম্পন্নকৃত টেস্টসমূহ",
      icon: FileCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "গড় নম্বর",
      value: stats.averageScore.toFixed(2),
      subtitle: "সকল পরীক্ষার এভারেজ",
      icon: BadgePercent,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "সেরা ফলাফল",
      value: stats.bestScore.toFixed(2),
      subtitle: "সর্বোচ্চ প্রাপ্ত নম্বর",
      icon: Trophy,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10 border-rose-500/20",
    },
  ];

  return (
    <div className="space-y-8 font-bengali p-2 md:p-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black gradient-text">
              স্বাগতম, {user?.name || "শিক্ষার্থী"}!
            </h1>
            <Sparkles className="size-5 text-amber-500 animate-pulse" />
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            আপনার পড়াশোনার অগ্রগতি, কোর্সসমূহ ও পরীক্ষার পারফরম্যান্স ওভারভিউ।
          </p>
        </div>
        {user?.roll && (
          <Badge
            variant="outline"
            className="font-mono text-sm px-4 py-1.5 rounded-2xl bg-primary/5 border-primary/20 text-primary shrink-0"
          >
            রোল: {String(user.roll).startsWith("SOT-") ? user.roll : `SOT-${user.roll}`}
          </Badge>
        )}
      </div>

      {/* 2. Top Stats Grid (2 Cols on Mobile, 4 Cols on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card
              key={i}
              className="rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group"
            >
              <CardContent className="p-5 md:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl md:text-3xl font-extrabold tracking-tight font-mono">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 hidden sm:block">
                    {stat.subtitle}
                  </p>
                </div>
                <div
                  className={`size-12 md:size-14 rounded-2xl border ${stat.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className={`size-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. Main Dashboard Grid (Courses on Left, Recent Results on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: My Courses (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="size-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">আমার কোর্সসমূহ</h2>
                <p className="text-xs text-muted-foreground">আপনি যেসব কোর্সে এনরোল করেছেন</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-xl px-3 py-1 font-semibold text-xs">
              {enrolledCourses.length} টি কোর্স
            </Badge>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {enrolledCourses.map((item) => {
                const course = item.courses;
                if (!course) return null;

                return (
                  <Card
                    key={course.id}
                    className="rounded-[32px] border shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group"
                  >
                    {/* Cover Image */}
                    <div className="w-full aspect-video relative overflow-hidden bg-muted">
                      {course.cover_url ? (
                        <img
                          src={course.cover_url}
                          alt={course.title}
                          className="absolute inset-0 h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-accent/50 font-bengali text-sm">
                          কোন ছবি নেই
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base md:text-lg font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        {course.short_description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {course.short_description}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <Link to={`/courses/${course.slug}`}>
                        <Button className="w-full rounded-[25px] font-bold text-sm gap-2 cursor-pointer shadow-xs hover:shadow-md transition-all group-hover:bg-primary">
                          <span>ক্লাসরুমে যান</span>
                          <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Empty State for Courses */
            <Card className="rounded-3xl border border-dashed p-8 md:p-12 text-center space-y-4 bg-muted/20">
              <div className="size-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <GraduationCap className="size-8" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-lg font-bold">আপনি এখনো কোনো কোর্সে এনরোল করেননি</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  আপনার কাঙ্ক্ষিত কোর্স খুঁজে নিয়ে দ্রুত প্রস্তুতি শুরু করুন।
                </p>
              </div>
              <Link to="/courses">
                <Button className="rounded-2xl font-bold px-6 py-5 gap-2 cursor-pointer shadow-sm hover:shadow-md">
                  <span>কোর্সসমূহ ব্রাউজ করুন</span>
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Right Column: Recent Results (1 Col Wide) */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Clock className="size-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">সাম্প্রতিক ফলাফল</h2>
                <p className="text-xs text-muted-foreground">আপনার শেষ দেওয়া পরীক্ষাগুলো</p>
              </div>
            </div>
          </div>

          <Card className="rounded-3xl border shadow-xs overflow-hidden">
            <CardContent className="p-0 divide-y divide-border">
              {recentResults.length > 0 ? (
                recentResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 md:p-5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold line-clamp-1">{result.exam_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {result.submitted_at
                          ? dayjs(result.submitted_at).format("DD MMM, YYYY")
                          : "N/A"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-primary/10 border-primary/20 text-primary"
                      >
                        {Number(result.score).toFixed(2)} Mark
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <Award className="size-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    এখনো কোনো পরীক্ষার ফলাফল পাওয়া যায়নি।
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
