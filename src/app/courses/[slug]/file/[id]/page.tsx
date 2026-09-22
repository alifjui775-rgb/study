import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Download } from "lucide-react";
import {
  getCourseBySlug,
  getCourseCurriculum,
  getCourseFile,
  getUserCourseEnrollment,
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { CoursePlayerLayout } from "@/components/CoursePlayerLayout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DynamicMediaViewer } from "@/components/DynamicMediaViewer";
import { Button } from "@/components/ui/button";

export default function FilePage() {
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

  const { data: file, isLoading: isLoadingFile } = useQuery({
    queryKey: ["file", id],
    queryFn: () => getCourseFile(id!),
    enabled: !!id,
  });

  const isEnrolled = !!enrollment;
  const isPublic = !!file?.is_public;
  const isAccessible = isEnrolled || isPublic;

  useEffect(() => {
    if (course && file && !isLoadingFile && !isLoadingEnrollment) {
      if (!isAccessible) {
        if (!user) {
          navigate(`/login?redirect=/courses/${slug}/file/${id}`);
        } else {
          navigate(`/courses/${slug}`);
        }
      }
    }
  }, [course, file, isAccessible, isLoadingFile, isLoadingEnrollment, user, navigate, slug, id]);

  const isLoading =
    isLoadingCourse || isLoadingFile || (!!user && isLoadingEnrollment) || isLoadingCurriculum;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!course || !file || !isAccessible) {
    return null; // Will redirect or show 404
  }

  return (
    <>
      <Helmet>
        <title>{`${file.title} | ${course.title}`}</title>
      </Helmet>

      <CoursePlayerLayout
        course={course}
        curriculum={curriculum || []}
        activeItemId={file.id}
        itemTitle={file.title}
      >
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {/* Header section */}
          <div className="bg-card border rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold font-bengali gradient-text">
              {file.title}
            </h1>

            {file.description && (
              <div
                className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:font-bengali font-bengali text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: file.description }}
              />
            )}

            <div className="pt-2">
              <Button
                onClick={() => window.open(file.file_url, "_blank")}
                className="gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
              >
                <Download className="size-4" />
                Download File
              </Button>
            </div>
          </div>

          {/* Viewer Section */}
          <DynamicMediaViewer fileUrl={file.file_url} />
        </div>
      </CoursePlayerLayout>
    </>
  );
}
