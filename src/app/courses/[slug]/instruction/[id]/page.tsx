import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  getCourseBySlug,
  getCourseCurriculum,
  getCourseInstruction,
  getUserCourseEnrollment,
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function InstructionPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const { data: instruction, isLoading: isLoadingInstruction } = useQuery({
    queryKey: ["instruction", id],
    queryFn: () => getCourseInstruction(id!),
    enabled: !!id,
  });

  const isEnrolled = !!enrollment;
  const isPublic = !!instruction?.is_public;
  const isAccessible = isEnrolled || isPublic;

  useEffect(() => {
    if (course && instruction && !isLoadingInstruction && !isLoadingEnrollment) {
      if (!isAccessible) {
        if (!user) {
          navigate(`/login?redirect=/courses/${slug}/instruction/${id}`);
        } else {
          navigate(`/courses/${slug}`);
        }
      }
    }
  }, [
    course,
    instruction,
    isAccessible,
    isLoadingInstruction,
    isLoadingEnrollment,
    user,
    navigate,
    slug,
    id,
  ]);

  const isLoading =
    isLoadingCourse ||
    isLoadingInstruction ||
    (!!user && isLoadingEnrollment) ||
    isLoadingCurriculum;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!course || !instruction || !isAccessible) {
    return null; // Will redirect or show 404
  }

  return (
    <>
      <Helmet>
        <title>{`${instruction.title} | ${course.title}`}</title>
      </Helmet>

      <CoursePlayerLayout
        course={course}
        curriculum={curriculum || []}
        activeItemId={instruction.id}
        itemTitle={instruction.title}
      >
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
          <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-bold font-bengali gradient-text mb-6">
              {instruction.title}
            </h1>

            <div
              className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-bengali font-bengali"
              dangerouslySetInnerHTML={{ __html: instruction.details }}
            />
          </div>
        </div>
      </CoursePlayerLayout>
    </>
  );
}
