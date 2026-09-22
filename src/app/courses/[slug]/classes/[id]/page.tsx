import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  getCourseBySlug,
  getCourseClass,
  getCourseCurriculum,
  getUserCourseEnrollment,
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { VideoPlayer } from "@/components/VideoPlayer";

export default function ClassPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const videoParam = searchParams.get("v");

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

  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: ["class", id],
    queryFn: () => getCourseClass(id!),
    enabled: !!id,
  });

  const isEnrolled = !!enrollment;
  const isLive = !!classData?.is_live;
  const isAccessible = isEnrolled || isLive;

  useEffect(() => {
    if (course && classData && !isLoadingClass && !isLoadingEnrollment) {
      if (!isAccessible) {
        if (!user) {
          navigate(`/login?redirect=/courses/${slug}/classes/${id}`);
        } else {
          navigate(`/courses/${slug}`);
        }
      }
    }
  }, [
    course,
    classData,
    isAccessible,
    isLoadingClass,
    isLoadingEnrollment,
    user,
    navigate,
    slug,
    id,
  ]);

  const isLoading =
    isLoadingCourse ||
    isLoadingClass ||
    (!!user && isLoadingEnrollment) ||
    isLoadingCurriculum;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!course || !classData || !isAccessible) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{`${classData.title} | ${course.title}`}</title>
      </Helmet>

      <CoursePlayerLayout
        course={course}
        curriculum={curriculum || []}
        activeItemId={classData.id}
        itemTitle={classData.title}
      >
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          <VideoPlayer url={classData.video_url} activeVideoId={videoParam} />

          <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold font-bengali gradient-text">
              {classData.title}
            </h1>

            {classData.notes && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line font-bengali">
                  {classData.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </CoursePlayerLayout>
    </>
  );
}
