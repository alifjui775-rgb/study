import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { fetchExamQuestions, type SubjectInfo } from "@/lib/fetchExamQuestions";
import { LoadingSpinner, PageHeader } from "@/components";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { useAuth } from "@/context/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getExamById,
  getCourseBySlug,
  getCourseCurriculum,
  getUserCourseEnrollment,
} from "@/lib/queries";

export default function CustomExamPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const exam_id = id as string;
  const router = useNavigate();
  const { toast } = useToast();

  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>("30");

  const { data: exam, isLoading: loadingExam } = useQuery({
    queryKey: ["exam", exam_id],
    queryFn: () => getExamById(exam_id),
    enabled: !!exam_id,
  });

  const { user } = useAuth();

  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => getCourseBySlug(slug!),
    enabled: !!slug && !!user,
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

  const { data: availableSubjects = [], isLoading: loadingSections } = useQuery({
    queryKey: ["exam-subjects", exam_id, exam?.mandatory_subjects, exam?.optional_subjects],
    queryFn: async () => {
      if (!exam_id) return [];
      const { subjectMap } = await fetchExamQuestions(exam_id);

      const allSubjectIds = [
        ...(exam?.mandatory_subjects || []),
        ...(exam?.optional_subjects || []),
      ];
      const missingIds = allSubjectIds.filter((sId) => !subjectMap.has(sId));

      if (missingIds.length > 0) {
        const { data: missingPapers } = await supabase
          .from("curriculum_papers")
          .select("id, name_en, name_bn, discipline_id, study_disciplines(name_bn, icon_url)")
          .in("id", missingIds);

        (missingPapers || []).forEach((p: any) => {
          subjectMap.set(p.id, {
            paper_id: p.id,
            name_en: p.name_en,
            name_bn: p.name_bn || p.name_en,
            discipline_id: p.discipline_id,
            discipline_name_bn: p.study_disciplines?.name_bn,
            icon_url: p.study_disciplines?.icon_url,
          });
        });
      }

      return Array.from(subjectMap.values());
    },
    enabled: !!exam_id && !loadingExam,
  });

  // Select all subjects by default when availableSubjects load
  useState(() => {
    if (availableSubjects.length > 0 && selectedSections.length === 0) {
      setSelectedSections(availableSubjects.map((s) => s.paper_id));
    }
  });

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId],
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedSections.length === availableSubjects.length) {
      setSelectedSections([]);
    } else {
      setSelectedSections(availableSubjects.map((s) => s.paper_id));
    }
  };

  const handleStartExam = () => {
    if (selectedSections.length === 0) {
      toast({
        title: "অনুগ্রহ করে কমপক্ষে একটি বিষয় নির্বাচন করুন",
        variant: "destructive",
      });
      return;
    }
    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      toast({
        title: "অনুগ্রহ করে একটি সঠিক সময় দিন",
        variant: "destructive",
      });
      return;
    }

    const query = new URLSearchParams({
      start_custom: "true",
      sections: selectedSections.join(","),
      duration: duration,
    }).toString();

    router(`/courses/${slug}/exams/${exam_id}?${query}`);
  };

  if (
    loadingExam ||
    loadingSections ||
    isLoadingCourse ||
    isLoadingEnrollment ||
    isLoadingCurriculum
  ) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return null;
  }

  const allSelected =
    availableSubjects.length > 0 && selectedSections.length === availableSubjects.length;

  return (
    <CoursePlayerLayout
      course={course}
      curriculum={curriculum || []}
      activeItemId={exam_id}
      itemTitle={exam?.name || "Custom Exam"}
    >
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl font-bengali min-h-screen">
        <PageHeader title="কাস্টম পরীক্ষা তৈরি করুন" description={exam?.name || ""} />
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-sm font-bold">বিষয় নির্বাচন করুন</h3>
              {availableSubjects.length > 0 && (
                <div
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors text-xs font-semibold text-primary"
                >
                  <Checkbox checked={allSelected} onCheckedChange={handleToggleSelectAll} />
                  <span>সবগুলো সিলেক্ট করুন</span>
                </div>
              )}
            </div>
            {availableSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                এই পরীক্ষার জন্য কোনো বিষয় পাওয়া যায়নি।
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                {availableSubjects.map((sub) => (
                  <div
                    key={sub.paper_id}
                    onClick={() => handleSectionSelect(sub.paper_id)}
                    className="flex items-center space-x-2 p-2.5 sm:p-3 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      id={sub.paper_id}
                      checked={selectedSections.includes(sub.paper_id)}
                      onCheckedChange={() => handleSectionSelect(sub.paper_id)}
                    />
                    {sub.icon_url ? (
                      <img
                        src={sub.icon_url}
                        alt={sub.name_bn}
                        className="w-6 h-6 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 shrink-0">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <Label
                      htmlFor={sub.paper_id}
                      className="flex-1 cursor-pointer font-medium text-xs sm:text-sm truncate"
                    >
                      {sub.name_bn || sub.name_en}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-bold">
              পরীক্ষার সময় (মিনিট)
            </Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 30"
              min="1"
            />
          </div>

          <div
            role="alert"
            className="relative w-full rounded-lg border p-4 text-foreground bg-warning/10 border-warning/30"
          >
            <TriangleAlert className="h-4 w-4 absolute left-4 top-4" />
            <div className="[&_p]:leading-relaxed text-sm pl-7">
              <strong>গুরুত্বপূর্ণ:</strong> একবার উত্তর নির্বাচন করলে পরিবর্তন করা যাবে না। সময় শেষ হলে পরীক্ষা
              স্বয়ংক্রিয়ভাবে জমা হবে।
            </div>
          </div>
          <Button
            onClick={handleStartExam}
            className="w-full"
            disabled={availableSubjects.length === 0}
          >
            পরীক্ষা শুরু করুন
          </Button>
        </div>
        <hr className="h-16 border-transparent" />
      </div>
    </CoursePlayerLayout>
  );
}
