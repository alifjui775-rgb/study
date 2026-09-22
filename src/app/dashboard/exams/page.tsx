import { useMemo } from "react";
import dayjs from "@/lib/date-utils";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { ExamCard } from "@/components/ExamCard";
import type { Exam } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CalendarClock, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllAccessibleExams, getStudentExamResults } from "@/lib/queries";

export default function ExamsPage() {
  const { user, loading: authLoading } = useAuth();

  const { data: allExams = [], isLoading: loadingExams } = useQuery({
    queryKey: ["accessible-exams", user?.uid],
    queryFn: () => getAllAccessibleExams(user?.uid || ""),
    enabled: !authLoading,
  });

  const { data: results = {} } = useQuery({
    queryKey: ["exam-results", user?.uid, allExams.map((e) => e.id)],
    queryFn: () =>
      getStudentExamResults(
        user!.uid,
        allExams.map((e) => e.id),
      ),
    enabled: !!user?.uid && allExams.length > 0,
  });

  const { liveExams, practiceExams, upcomingExams } = useMemo(() => {
    const now = dayjs();
    const live: Exam[] = [];
    const practice: Exam[] = [];
    const upcoming: Exam[] = [];

    allExams.forEach((exam) => {
      const startTime = exam.start_at ? dayjs(exam.start_at) : null;
      const endTime = exam.end_at ? dayjs(exam.end_at) : null;

      // ৩। বর্তমান সময় start_at এর আগে হলে (ভবিষ্যতের তারিখ) আপকামিং
      if (startTime && now.isBefore(startTime)) {
        upcoming.push(exam);
      }
      // ২। is_practice যদি true হয়, তাহলে প্রাকটিস
      else if (exam.is_practice) {
        practice.push(exam);
      }
      // ১। বর্তমান সময় start_at আর end_at এর মাঝে হলে লাইভ
      else if (startTime && endTime && now.isAfter(startTime) && now.isBefore(endTime)) {
        live.push(exam);
      }
      // যদি সময় শেষ হয়ে যায় (now > end_at), তাহলে প্রাকটিস এ পাঠিয়ে দিই
      else if (endTime && now.isAfter(endTime)) {
        practice.push(exam);
      }
      // কোনো ডেট না থাকলে এবং practice না হলে বাই-ডিফল্ট লাইভ
      else {
        live.push(exam);
      }
    });

    return { liveExams: live, practiceExams: practice, upcomingExams: upcoming };
  }, [allExams]);

  if (authLoading || loadingExams) {
    return <LoadingSpinner message="আপনার পরীক্ষাগুলো লোড হচ্ছে..." />;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      <PageHeader title="পরীক্ষাসমূহ" description="আপনার ব্যাচের এবং পাবলিক পরীক্ষাগুলোর তালিকা।" />

      <Tabs defaultValue="live" className="w-full mb-8">
        <TabsList className="h-auto p-1 bg-muted rounded-xl flex-wrap justify-center max-w-lg mx-auto">
          <TabsTrigger
            value="live"
            className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <Zap className="h-4 w-4 mr-2" />
            লাইভ
          </TabsTrigger>
          <TabsTrigger
            value="practice"
            className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            প্রাকটিস
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            আপকামিং
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          {liveExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} result={results[exam.id]} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Zap className="h-12 w-12 text-primary" />}
              title="কোনো লাইভ পরীক্ষা নেই"
              description="বর্তমানে কোনো পরীক্ষা লাইভ নেই। অনুগ্রহ করে পরে আবার দেখুন।"
            />
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-6">
          {practiceExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practiceExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} result={results[exam.id]} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-primary" />}
              title="কোনো প্রাকটিস পরীক্ষা নেই"
              description="অনুশীলনের জন্য কোনো পরীক্ষা এখনো যুক্ত করা হয়নি।"
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} result={results[exam.id]} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarClock className="h-12 w-12 text-primary" />}
              title="কোনো আপকামিং পরীক্ষা নেই"
              description="শীঘ্রই নতুন পরীক্ষার সময়সূচী যুক্ত করা হবে।"
            />
          )}
        </TabsContent>
      </Tabs>
      <hr className="h-20 border-transparent" />
    </div>
  );
}
