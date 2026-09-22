import { CoursesClient } from "./CoursesClient";
import { getAdminCourses } from "@/lib/queries";
import type { Course } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components";

export default function InstructorCoursesPage() {
  const {
    data: courses,
    isPending,
    error,
  } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: getAdminCourses,
  });

  // `isPending` (not `isLoading`) is true whenever there is no data yet — even
  // when the query is paused/offline and `isLoading` is false. Using `isLoading`
  // let `courses` be undefined and crashed CoursesClient.
  if (isPending) {
    return <LoadingSpinner message="কোর্স লোড হচ্ছে..." />;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("কোর্স আনতে সমস্যা হয়েছে:", error);
    return <p>কোর্স আনতে সমস্যা হয়েছে: {message}</p>;
  }

  return <CoursesClient initialCourses={(courses ?? []) as Course[]} />;
}
