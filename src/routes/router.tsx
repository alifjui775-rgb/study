import { createBrowserRouter, Navigate, useParams } from "react-router-dom";

function RedirectToQbSlug() {
  const { slug, unitSlug, year } = useParams();
  if (slug && unitSlug && year) {
    return <Navigate to={`/qb/${slug}/${unitSlug}/${year}`} replace />;
  }
  if (slug && unitSlug) {
    return <Navigate to={`/qb/${slug}/${unitSlug}`} replace />;
  }
  return <Navigate to={slug ? `/qb/${slug}` : "/qb"} replace />;
}

function RedirectToCourseSlug() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/courses/${slug}` : "/courses"} replace />;
}

// Lazy load pages for code splitting
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import RootLayout from "@/layouts/RootLayout";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import DashboardLayoutWrapper from "@/layouts/DashboardLayout";
import AdminLayoutWrapper from "@/layouts/AdminLayout";
import AdminDashboardLayout from "@/layouts/AdminDashboardLayout";
import InstructorLayoutWrapper from "@/layouts/InstructorLayout";
import NotFound from "@/app/not-found/NotFound";

import { handleChunkLoadError } from "@/lib/chunk-error";

function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      if (handleChunkLoadError(error)) {
        return new Promise(() => {}) as any;
      }
      // Retry once after 300ms in case of minor network glitch
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        return await importFn();
      } catch (retryError) {
        if (handleChunkLoadError(retryError)) {
          return new Promise(() => {}) as any;
        }
        throw retryError;
      }
    }
  });
}

const LazyPage = (importFn: () => Promise<{ default: React.ComponentType<any> }>) => {
  const Component = lazyWithRetry(importFn);
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      // Public routes
      {
        index: true,
        element: LazyPage(() => import("@/app/page")),
      },
      {
        path: "about",
        element: LazyPage(() => import("@/app/about/page")),
      },
      {
        path: "course",
        element: <Navigate to="/courses" replace />,
      },
      {
        path: "courses",
        element: LazyPage(() => import("@/app/course/page")),
      },
      {
        path: "courses/:slug",
        element: LazyPage(() => import("@/app/courses/[slug]/page")),
      },
      {
        path: "courses/:slug/checkout/:orderId",
        element: LazyPage(() => import("@/app/courses/[slug]/checkout/[orderId]/page")),
      },
      {
        path: "courses/:slug/instruction/:id",
        element: LazyPage(() => import("@/app/courses/[slug]/instruction/[id]/page")),
      },
      {
        path: "courses/:slug/classes/:id",
        element: LazyPage(() => import("@/app/courses/[slug]/classes/[id]/page")),
      },
      {
        path: "courses/:slug/file/:id",
        element: LazyPage(() => import("@/app/courses/[slug]/file/[id]/page")),
      },
      {
        path: "courses/:slug/exams/:id",
        element: LazyPage(() => import("@/app/courses/[slug]/exams/[id]/page")),
      },
      {
        path: "courses/:slug/exams/:id/solve",
        element: LazyPage(() => import("@/app/courses/[slug]/exams/[id]/solve/page")),
      },
      {
        path: "courses/:slug/exams/:id/leaderboard",
        element: LazyPage(() => import("@/app/courses/[slug]/exams/[id]/leaderboard/page")),
      },
      {
        path: "courses/:slug/exams/:id/custom",
        element: LazyPage(() => import("@/app/courses/[slug]/exams/[id]/custom/page")),
      },
      {
        path: "course/:slug",
        element: <RedirectToCourseSlug />,
      },
      {
        path: "public",
        element: LazyPage(() => import("@/app/public/page")),
      },
      {
        path: "login",
        element: LazyPage(() => import("@/app/login/page")),
      },
      {
        path: "auth/callback",
        element: LazyPage(() => import("@/app/auth/callback/page")),
      },
      {
        path: "register",
        element: LazyPage(() => import("@/app/register/page")),
      },
      {
        path: "syllabus-tracker",
        children: [
          {
            index: true,
            element: LazyPage(() => import("@/app/syllabus-tracker/page")),
          },
          {
            path: ":categoryOrInstitution",
            children: [
              {
                index: true,
                element: LazyPage(
                  () => import("@/app/syllabus-tracker/[categoryOrInstitution]/page"),
                ),
              },
            ],
          },
        ],
      },
      {
        path: "self-test",
        element: LazyPage(() => import("@/app/self-test/page")),
      },
      {
        path: "gpa-calculator",
        element: LazyPage(() => import("@/app/gpa-calculator/page")),
      },
      {
        path: "graph",
        element: LazyPage(() => import("@/app/graph/page")),
      },
      {
        path: "eligibility-checker",
        element: LazyPage(() => import("@/app/eligibility-checker/page")),
      },
      {
        path: "calendar",
        element: LazyPage(() => import("@/app/calendar/page")),
      },
      {
        path: "qb",
        element: LazyPage(() => import("@/app/qb/page")),
      },
      {
        path: "qb/master",
        element: <Navigate to="/qb" replace />,
      },
      {
        path: "qb/master/:stream",
        element: LazyPage(() => import("@/app/qb/master/[stream]/page")),
      },
      {
        path: "qb/master/:stream/:paperShortCode",
        element: LazyPage(() => import("@/app/qb/master/[stream]/[paperShortCode]/page")),
      },
      {
        path: "qb/master/:stream/:paperShortCode/:chapterShortCode",
        element: LazyPage(
          () => import("@/app/qb/master/[stream]/[paperShortCode]/[chapterShortCode]/page"),
        ),
      },
      {
        path: "qb/:slug",
        element: LazyPage(() => import("@/app/qb/[slug]/page")),
      },
      {
        path: "qb/:slug/:unitSlug",
        element: LazyPage(() => import("@/app/qb/[slug]/[unitSlug]/page")),
      },
      {
        path: "qb/:slug/:unitSlug/:year",
        element: LazyPage(() => import("@/app/qb/[slug]/[unitSlug]/[year]/page")),
      },
      {
        path: "qb/:slug/:unitSlug/:year/exams",
        element: LazyPage(() => import("@/app/qb/[slug]/[unitSlug]/[year]/exams/page")),
      },
      {
        path: "question-bank",
        element: <Navigate to="/qb" replace />,
      },
      {
        path: "question-bank/:slug",
        element: <RedirectToQbSlug />,
      },
      {
        path: "question-bank/:slug/:unitSlug",
        element: <RedirectToQbSlug />,
      },
      {
        path: "question-bank/:slug/:unitSlug/:year",
        element: <RedirectToQbSlug />,
      },
      {
        path: "subjects",
        element: LazyPage(() => import("@/app/subjects/page")),
      },
      {
        path: "subject",
        element: <Navigate to="/subjects" replace />,
      },
      {
        path: "subjects/:slug",
        element: LazyPage(() => import("@/app/subject/[slug]/page")),
      },
      {
        path: "university/:slug",
        element: LazyPage(() => import("@/app/university/page")),
      },
      {
        path: "college",
        element: LazyPage(() => import("@/app/college/page")),
      },
      {
        path: "private",
        element: LazyPage(() => import("@/app/private/page")),
      },
      {
        path: "college/:slug",
        element: LazyPage(() => import("@/app/university/page")),
      },
      {
        path: "cluster/:slug",
        element: LazyPage(() => import("@/app/university/page")),
      },

      // Student dashboard routes
      {
        path: "dashboard",
        element: <DashboardLayoutWrapper />,
        children: [
          {
            index: true,
            element: LazyPage(() => import("@/app/dashboard/page")),
          },
          {
            path: "daily",
            element: LazyPage(() => import("@/app/dashboard/daily/page")),
          },
          {
            path: "courses",
            element: LazyPage(() => import("@/app/dashboard/courses/page")),
          },

          {
            path: "exams",
            children: [
              {
                index: true,
                element: LazyPage(() => import("@/app/dashboard/exams/page")),
              },
            ],
          },
          {
            path: "profile",
            element: <Navigate to="/profile" replace />,
          },
          {
            path: "reports",
            element: LazyPage(() => import("@/app/dashboard/reports/page")),
          },
          {
            path: "history",
            element: LazyPage(() => import("@/app/dashboard/history/page")),
          },
          {
            path: "notes",
            element: LazyPage(() => import("@/app/dashboard/notes/page")),
          },
          {
            path: "practice",
            element: LazyPage(() => import("@/app/dashboard/practice/page")),
          },
          {
            path: "practice/exam/:sessionId",
            element: LazyPage(() => import("@/app/dashboard/practice/exam/[sessionId]/page")),
          },
          {
            path: "practice/exam/:sessionId/solve",
            element: LazyPage(() => import("@/app/dashboard/practice/exam/[sessionId]/page")),
          },
        ],
      },

      // Profile route
      {
        path: "profile",
        element: LazyPage(() => import("@/app/profile/page")),
      },

      // Admin routes
      {
        path: "admin",
        element: <AdminLayoutWrapper />,
        children: [
          {
            path: "login",
            element: LazyPage(() => import("@/app/admin/login/page")),
          },
          {
            path: "dashboard",
            element: <AdminDashboardLayout />,
            children: [
              {
                index: true,
                element: LazyPage(() => import("@/app/admin/dashboard/page")),
              },
              {
                path: "users",
                element: LazyPage(() => import("@/app/admin/dashboard/users/page")),
              },
              {
                path: "courses",
                children: [
                  {
                    index: true,
                    element: <Navigate to="/instructor/courses" replace />,
                  },
                  {
                    path: ":course_id",
                    children: [
                      {
                        index: true,
                        element: <Navigate to="/instructor/courses" replace />,
                      },
                      {
                        path: "exams/:exam_id",
                        children: [
                          {
                            path: "results",
                            element: LazyPage(
                              () => import("@/app/admin/dashboard/exams/[exam_id]/results/page"),
                            ),
                          },
                          {
                            path: "questions",
                            element: LazyPage(
                              () => import("@/app/admin/dashboard/exams/[exam_id]/questions/page"),
                            ),
                          },
                          {
                            path: "manage",
                            element: LazyPage(
                              () => import("@/app/admin/dashboard/exams/[exam_id]/manage/page"),
                            ),
                          },
                          {
                            path: "add",
                            element: LazyPage(
                              () => import("@/app/admin/dashboard/exams/[exam_id]/add/page"),
                            ),
                          },
            ],
          },
        ],
      },
                ],
              },
              {
                path: "institutions",
                element: LazyPage(() => import("@/app/admin/dashboard/institutions/page")),
              },
              {
                path: "universities",
                children: [
                  {
                    index: true,
                    element: LazyPage(() => import("@/app/admin/dashboard/universities/page")),
                  },
                  {
                    path: ":universitySlug/manage",
                    element: LazyPage(
                      () => import("@/app/admin/dashboard/universities/[universityId]/manage/page"),
                    ),
                  },
                ],
              },
              {
                path: "colleges",
                children: [
                  {
                    index: true,
                    element: LazyPage(() => import("@/app/admin/dashboard/colleges/page")),
                  },
                  {
                    path: ":id/manage",
                    element: LazyPage(
                      () => import("@/app/admin/dashboard/colleges/[id]/manage/page"),
                    ),
                  },
                ],
              },
              {
                path: "clusters",
                children: [
                  {
                    index: true,
                    element: LazyPage(() => import("@/app/admin/dashboard/clusters/page")),
                  },
                  {
                    path: ":slug/manage",
                    element: LazyPage(
                      () => import("@/app/admin/dashboard/clusters/[id]/manage/page"),
                    ),
                  },
                ],
              },
              {
                path: "subjects",
                element: LazyPage(() => import("@/app/admin/dashboard/subjects/page")),
              },
              {
                path: "qb",
                element: LazyPage(() => import("@/app/admin/dashboard/qb/page")),
              },
              {
                path: "reports",
                element: LazyPage(() => import("@/app/admin/dashboard/reports/page")),
              },
              {
                path: "settings",
                element: LazyPage(() => import("@/app/admin/dashboard/settings/page")),
              },
              {
                path: "audit-logs",
                element: LazyPage(() => import("@/app/admin/audit-logs/page")),
              },
              {
                path: "recycle-bin",
                element: LazyPage(() => import("@/app/admin/recycle-bin/page")),
              },
            ],
          },
        ],
      },

      // Instructor routes
      {
        path: "instructor",
        element: <InstructorLayoutWrapper />,
        children: [
          {
            index: true,
            element: LazyPage(() => import("@/app/instructor/dashboard/page")),
          },
          {
            path: "dashboard",
            children: [
              {
                index: true,
                element: LazyPage(() => import("@/app/instructor/dashboard/page")),
              },
              {
                path: "students",
                element: LazyPage(() => import("@/app/instructor/dashboard/page")),
              },
              {
                path: "reports",
                element: LazyPage(() => import("@/app/instructor/dashboard/page")),
              },
              {
                path: "settings",
                element: LazyPage(() => import("@/app/instructor/dashboard/page")),
              },
            ],
          },
          {
            path: "courses",
            children: [
              {
                index: true,
                element: LazyPage(() => import("@/app/instructor/courses/page")),
              },
              {
                path: ":course_id",
                children: [
                  {
                    index: true,
                    element: LazyPage(
                      () => import("@/app/instructor/courses/[course_id]/page"),
                    ),
                  },
                  {
                    path: "exams/:exam_id",
                    children: [
                      {
                        path: "results",
                        element: LazyPage(
                          () => import("@/app/admin/dashboard/exams/[exam_id]/results/page"),
                        ),
                      },
                      {
                        path: "questions",
                        element: LazyPage(
                          () => import("@/app/admin/dashboard/exams/[exam_id]/questions/page"),
                        ),
                      },
                      {
                        path: "manage",
                        element: LazyPage(
                          () => import("@/app/admin/dashboard/exams/[exam_id]/manage/page"),
                        ),
                      },
                      {
                        path: "add",
                        element: LazyPage(
                          () => import("@/app/admin/dashboard/exams/[exam_id]/add/page"),
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: "payments",
            element: LazyPage(() => import("@/app/instructor/payments/page")),
          },
        ],
      },

      // 404 catch-all
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
