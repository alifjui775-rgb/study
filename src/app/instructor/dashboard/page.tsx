import { useQuery } from "@tanstack/react-query";
import { useInstructorAuth } from "@/context/InstructorAuthContext";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components";
import { BookOpen, Users, BarChart4 } from "lucide-react";

export default function InstructorDashboardPage() {
  const { instructor } = useInstructorAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["instructor-stats", instructor?.uid],
    queryFn: async () => {
      if (!instructor?.uid) return { courseCount: 0, studentCount: 0, pendingCount: 0 };

      // 1. Count courses
      const { count: courseCount } = await supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);

      // 2. Count enrolled students (across all courses)
      const { count: studentCount } = await supabase
        .from("enrollments")
        .select("student_id", { count: "exact", head: true })
        .eq("status", true);

      // 3. Count pending orders
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .is("deleted_at", null);

      return {
        courseCount: courseCount ?? 0,
        studentCount: studentCount ?? 0,
        pendingCount: pendingCount ?? 0,
      };
    },
    enabled: !!instructor?.uid,
  });

  if (isLoading) return <LoadingSpinner message="ড্যাশবোর্ড লোড হচ্ছে..." />;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold">স্বাগতম, {instructor?.name}!</h2>
        <p className="text-muted-foreground mt-1">ইন্সট্রাক্টর ড্যাশবোর্ডে আপনাকে স্বাগতম।</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">মোট কোর্স</p>
            <p className="text-2xl font-bold">{stats?.courseCount ?? 0}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">মোট শিক্ষার্থী</p>
            <p className="text-2xl font-bold">{stats?.studentCount ?? 0}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <BarChart4 className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">পেন্ডিং রিপোর্ট</p>
            <p className="text-2xl font-bold">{stats?.pendingCount ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
