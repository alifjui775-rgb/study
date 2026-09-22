import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getUserEnrolledCoursesWithDetails } from "@/lib/queries";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, GraduationCap, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingSpinner } from "@/components";

export default function DashboardCourses() {
  const { user, loading: authLoading } = useAuth();

  const { data: enrolledCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["enrolled-courses-details", user?.uid],
    queryFn: () => getUserEnrolledCoursesWithDetails(user!.uid),
    enabled: !!user?.uid,
  });

  if (authLoading || loadingCourses) {
    return <LoadingSpinner message="আপনার কোর্সসমূহ লোড হচ্ছে..." />;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="আমার কোর্সসমূহ" description="আপনি যেসব কোর্সে এনরোল করেছেন, সব এক জায়গায়।" />
        <Badge variant="secondary" className="rounded-xl px-3 py-1 font-semibold text-xs mt-2">
          {enrolledCourses.length} টি কোর্স
        </Badge>
      </div>

      {enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
  );
}
