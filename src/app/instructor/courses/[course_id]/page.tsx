import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components";
import { getAdminCourseDetails } from "@/lib/queries";
import { CourseDetailsClient } from "./CourseDetailsClient";
import { supabase } from "@/lib/supabase";

async function getPapers() {
  const { data, error } = await supabase
    .from("curriculum_papers")
    .select("id, name_bn, name_en, short_code")
    .order("name_en", { ascending: true });
  return data || [];
}

export default function InstructorCourseDetailsPage() {
  const { course_id } = useParams<{ course_id: string }>();

  const {
    data: course,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-course-details", course_id],
    queryFn: async () => {
      if (!course_id) throw new Error("Course ID is missing");
      return await getAdminCourseDetails(course_id);
    },
    enabled: !!course_id,
  });

  const { data: papers, isLoading: loadingPapers } = useQuery({
    queryKey: ["admin-curriculum-papers"],
    queryFn: getPapers,
  });

  if (isLoading || loadingPapers) {
    return <LoadingSpinner message="তথ্য লোড হচ্ছে..." />;
  }

  if (error || !course) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <p>কোর্সের তথ্য আনতে সমস্যা হয়েছে: {message}</p>;
  }

  return <CourseDetailsClient course={course} papers={papers || []} />;
}
