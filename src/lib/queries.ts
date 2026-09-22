import { supabase } from "@/lib/supabase";
import type { Batch, Exam, StudentExam, User, ActivityData, Note } from "@/lib/types";
import dayjs from "./date-utils";

// --- Enrollments ---
export const getUserEnrollmentsList = async (userId: string) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", true);
  if (error) return [];
  return data.map((d: { course_id: string }) => d.course_id);
};

export const getUserCourseEnrollment = async (userId: string, courseId: string) => {
  if (!userId || !courseId) return null;
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .eq("status", true)
    .maybeSingle();
  if (error) return null;
  return data;
};

// --- Course Order Counts (for discount_max_limit) ---
export const getCourseOrderCount = async (courseId: string): Promise<number> => {
  if (!courseId) return 0;
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .in("status", ["pending", "approved"])
    .is("deleted_at", null);
  if (error) return 0;
  return count ?? 0;
};

export const getAllCourseOrderCounts = async (): Promise<Record<string, number>> => {
  const { data, error } = await supabase
    .from("orders")
    .select("course_id")
    .in("status", ["pending", "approved"])
    .is("deleted_at", null);
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  data.forEach((o) => {
    counts[o.course_id] = (counts[o.course_id] || 0) + 1;
  });
  return counts;
};

// --- Exams ---

export const getAllAccessibleExams = async (userId: string): Promise<Exam[]> => {
  let enrolledCourseIds: string[] = [];

  if (userId) {
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", userId)
      .eq("status", true);

    if (!enrollmentsError && enrollmentsData) {
      enrolledCourseIds = enrollmentsData.map((e) => e.course_id);
    }
  }

  let query = supabase.from("exams").select("*, courses(slug)").is("deleted_at", null);

  if (enrolledCourseIds.length > 0) {
    // Show exams for enrolled courses OR global exams (course_id is null)
    query = query.or(`course_id.in.(${enrolledCourseIds.join(",")}),course_id.is.null`);
  } else {
    // If not enrolled in any course, only show global exams
    query = query.is("course_id", null);
  }

  const { data: exams, error: examsError } = await query.order("created_at", {
    ascending: false,
  });

  if (examsError) {
    console.error("Error fetching exams:", examsError);
    return [];
  }

  return (exams || []).map((e: any) => ({
    ...e,
    course_slug: e.courses?.slug || e.course_slug || "general",
  }));
};

export const getStudentExamResults = async (
  userId: string,
  examIds: string[],
): Promise<Record<string, StudentExam>> => {
  if (!userId || examIds.length === 0) return {};

  const { data: studentAttempts, error } = await supabase
    .from("student_exams")
    .select("*")
    .eq("student_id", userId)
    .in("exam_id", examIds);

  if (error) {
    console.error("Error fetching student exam results:", error);
    return {};
  }

  const lookup: Record<string, StudentExam> = {};
  (studentAttempts || []).forEach((r: StudentExam) => {
    lookup[r.exam_id] = r;
  });

  return lookup;
};

// --- Results Page Queries ---

export interface StudentExamResult {
  id: string;
  exam_id: string;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  submitted_at: string;
  exam_name: string;
  marks_per_question: number;
  negative_marks_per_wrong: number;
  course_id: string | null;
  course_title: string | null;
}

export const getAllStudentResults = async (userId: string): Promise<StudentExamResult[]> => {
  if (!userId) return [];

  // Single relational query: student_exams -> exams -> courses
  const { data, error } = await supabase
    .from("student_exams")
    .select(
      `id,
       exam_id,
       correct_answers,
       wrong_answers,
       unattempted,
       submitted_at,
       exams!inner (
         name,
         marks_per_question,
         negative_marks_per_wrong,
         course_id,
         courses ( title )
       )`,
    )
    .eq("student_id", userId)
    .is("exams.deleted_at", null)
    .order("submitted_at", { ascending: true });

  if (error) throw error;

  type JoinedRow = {
    id: string;
    exam_id: string;
    correct_answers: number | null;
    wrong_answers: number | null;
    unattempted: number | null;
    submitted_at: string | null;
    exams: {
      name: string;
      marks_per_question: number | null;
      negative_marks_per_wrong: number | null;
      course_id: string | null;
      courses: { title: string } | null;
    } | null;
  };

  return ((data || []) as unknown as JoinedRow[]).map((row) => ({
    id: row.id,
    exam_id: row.exam_id,
    correct_answers: row.correct_answers ?? 0,
    wrong_answers: row.wrong_answers ?? 0,
    unattempted: row.unattempted ?? 0,
    submitted_at: row.submitted_at as string,
    exam_name: row.exams?.name || "অজানা পরীক্ষা",
    marks_per_question: row.exams?.marks_per_question || 1,
    negative_marks_per_wrong: row.exams?.negative_marks_per_wrong ?? 0,
    course_id: row.exams?.course_id || null,
    course_title: row.exams?.courses?.title || null,
  }));
};

export interface DailyActivity {
  present: boolean;
  examTaken: boolean;
  tasksCompleted: number;
}

export const getAttendanceHistory = async (userId: string): Promise<Map<string, DailyActivity>> => {
  if (!userId) return new Map();

  // Preferred path: single RPC round-trip computed on the DB.
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_student_activity_history", {
    p_student_id: userId,
  });

  if (!rpcError && rpcData) {
    const map = new Map<string, DailyActivity>();
    (
      rpcData as {
        activity_date: string;
        present: boolean;
        exam_taken: boolean;
        tasks_completed: number;
      }[]
    ).forEach((row) => {
      map.set(String(row.activity_date).slice(0, 10), {
        present: row.present,
        examTaken: row.exam_taken,
        tasksCompleted: Number(row.tasks_completed) || 0,
      });
    });
    return map;
  }

  // Fallback: parallel client-side aggregation (same schema rules).
  const thirtyDaysAgo = dayjs().subtract(30, "days").format("YYYY-MM-DD");

  const [attendanceRes, examsRes, tasksRes] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("created_at")
      .eq("student_id", userId)
      .gte("created_at", dayjs(thirtyDaysAgo).startOf("day").toISOString()),
    supabase
      .from("student_exams")
      .select("submitted_at")
      .eq("student_id", userId)
      .gte("submitted_at", `${thirtyDaysAgo}T00:00:00.000Z`),
    supabase
      .from("student_tasks")
      .select("task_date, mandatory_url, optional_url, todo_url")
      .eq("student_id", userId)
      .gte("task_date", thirtyDaysAgo),
  ]);

  if (attendanceRes.error || examsRes.error || tasksRes.error) {
    console.error(
      "Error fetching activity history:",
      attendanceRes.error,
      examsRes.error,
      tasksRes.error,
    );
    return new Map();
  }

  return buildActivityMap(attendanceRes.data || [], examsRes.data || [], tasksRes.data || []);
};

const buildActivityMap = (
  attendance: { created_at: string }[],
  exams: { submitted_at: string | null }[],
  tasks: {
    task_date: string;
    mandatory_url: string | null;
    optional_url: string | null;
    todo_url: string | null;
  }[],
): Map<string, DailyActivity> => {
  const activityMap = new Map<string, DailyActivity>();

  for (let i = 0; i < 30; i++) {
    const dateStr = dayjs().subtract(i, "days").format("YYYY-MM-DD");
    activityMap.set(dateStr, { present: false, examTaken: false, tasksCompleted: 0 });
  }

  attendance.forEach((record) => {
    const dateStr = dayjs(record.created_at).format("YYYY-MM-DD");
    const activity = activityMap.get(dateStr);
    if (activity) activity.present = true;
  });

  exams.forEach((record) => {
    if (!record.submitted_at) return;
    const dateStr = dayjs(record.submitted_at).format("YYYY-MM-DD");
    const activity = activityMap.get(dateStr);
    if (activity) activity.examTaken = true;
  });

  tasks.forEach((record) => {
    const activity = activityMap.get(record.task_date);
    if (activity) {
      let completed = 0;
      if (record.mandatory_url) completed++;
      if (record.optional_url) completed++;
      if (record.todo_url) completed++;
      activity.tasksCompleted += completed;
    }
  });

  return activityMap;
};

// --- Dashboard Queries ---

export interface DashboardStats {
  enrolledCourses: number;
  examsTaken: number;
  averageScore: number;
  bestScore: number;
}

export interface EnrolledCourseWithDetails {
  course_id: string;
  enrolled_at: string;
  courses: {
    id: string;
    title: string;
    slug: string;
    cover_url?: string | null;
    short_description?: string | null;
  } | null;
}

export const getUserEnrolledCoursesWithDetails = async (
  userId: string,
): Promise<EnrolledCourseWithDetails[]> => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, enrolled_at, courses(id, title, slug, cover_url, short_description)")
    .eq("student_id", userId)
    .eq("status", true);

  if (error) {
    console.error("Error fetching enrolled courses with details:", error);
    return [];
  }
  return (data as unknown as EnrolledCourseWithDetails[]) || [];
};

export const getDashboardStats = async (userId: string): Promise<DashboardStats> => {
  if (!userId) return { enrolledCourses: 0, examsTaken: 0, averageScore: 0, bestScore: 0 };

  // Fetch count of active enrollments
  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", true);

  const enrolledCount = enrollmentsData?.length || 0;

  // Fetch exam attempts
  const { data: results } = await supabase
    .from("student_exams")
    .select(`
      score,
      correct_answers,
      wrong_answers,
      status,
      exams (
        marks_per_question,
        negative_marks_per_wrong
      )
    `)
    .eq("student_id", userId)
    .neq("status", "ongoing");

  const processedResults = ((results as any[]) || []).map((r) => {
    if (r.score !== undefined && r.score !== null) {
      return Number(r.score);
    }
    const marksPerQuestion = r.exams?.marks_per_question || 1;
    const negativeMarks = r.exams?.negative_marks_per_wrong || 0;
    return (r.correct_answers || 0) * marksPerQuestion - (r.wrong_answers || 0) * negativeMarks;
  });

  const examsTaken = processedResults.length;
  const averageScore =
    examsTaken > 0 ? processedResults.reduce((sum, s) => sum + s, 0) / examsTaken : 0;
  const bestScore = examsTaken > 0 ? Math.max(...processedResults) : 0;

  return {
    enrolledCourses: enrolledCount,
    examsTaken,
    averageScore,
    bestScore,
  };
};

export const getRecentExamResults = async (userId: string) => {
  if (!userId) return [];
  const { data: results, error } = await supabase
    .from("student_exams")
    .select(`
      id,
      score,
      correct_answers,
      wrong_answers,
      submitted_at,
      status,
      exams (
        id,
        name,
        marks_per_question,
        negative_marks_per_wrong
      )
    `)
    .eq("student_id", userId)
    .neq("status", "ongoing")
    .order("submitted_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching recent exam results:", error);
    return [];
  }

  return ((results as any[]) || []).map((r) => {
    const marksPerQuestion = r.exams?.marks_per_question || 1;
    const negativeMarks = r.exams?.negative_marks_per_wrong || 0;
    const score =
      r.score !== undefined && r.score !== null
        ? Number(r.score)
        : (r.correct_answers || 0) * marksPerQuestion - (r.wrong_answers || 0) * negativeMarks;

    return {
      id: r.id,
      exam_name: r.exams?.name || "পরীক্ষা",
      score,
      submitted_at: r.submitted_at,
    };
  });
};
export const getPublicCourses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const getCourseBySlug = async (slug: string) => {
  if (!slug) return null;

  let { data, error } = await supabase
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    const { data: dataById } = await supabase
      .from("courses")
      .select("*")
      .is("deleted_at", null)
      .eq("id", slug)
      .maybeSingle();
    data = dataById;
  }

  if (error && !data) {
    console.error("Error fetching course by slug:", error);
    throw error;
  }

  return data as import("@/lib/types").Course | null;
};

export const getCourseCurriculum = async (courseId: string) => {
  if (!courseId) return [];

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("*")
    .is("deleted_at", null)
    .eq("course_id", courseId)
    .order("sequence_order", { ascending: true });

  if (sectionsError || !sections || sections.length === 0) return [];

  const { data: subsections } = await supabase
    .from("subsections")
    .select("*")
    .is("deleted_at", null)
    .in(
      "section_id",
      sections.map((s) => s.id),
    )
    .order("sequence_order", { ascending: true });

  // Fetch items (only titles and types needed for public view)
  const [
    { data: instructions },
    { data: classes },
    { data: exams },
    { data: assignments },
    { data: files },
  ] = await Promise.all([
    supabase
      .from("instructions")
      .select("id, title, section_id, subsection_id, sequence_order, is_public")
      .is("deleted_at", null)
      .eq("course_id", courseId),
    supabase
      .from("classes")
      .select("id, title, section_id, subsection_id, sequence_order")
      .is("deleted_at", null)
      .eq("course_id", courseId),
    supabase
      .from("exams")
      .select("id, name, section_id, subsection_id, sequence_order")
      .is("deleted_at", null)
      .eq("course_id", courseId),
    supabase
      .from("assignments")
      .select("id, title, section_id, subsection_id, sequence_order")
      .eq("course_id", courseId),
    supabase
      .from("course_files")
      .select("id, title, section_id, subsection_id, sequence_order, file_url, is_public")
      .is("deleted_at", null)
      .eq("course_id", courseId),
  ]);

  type PublicItem = {
    id: string;
    title: string;
    name?: string;
    item_type: string;
    section_id: string;
    subsection_id?: string | null;
    sequence_order: number;
    is_public?: boolean;
  };

  let allItems: PublicItem[] = [];
  if (instructions)
    allItems = [
      ...allItems,
      ...instructions.map((i) => ({
        id: i.id,
        title: i.title,
        item_type: "instruction",
        section_id: i.section_id,
        subsection_id: i.subsection_id,
        sequence_order: i.sequence_order || 0,
        is_public: i.is_public,
      })),
    ];
  if (classes)
    allItems = [
      ...allItems,
      ...classes.map((c) => ({
        id: c.id,
        title: c.title,
        item_type: "class",
        section_id: c.section_id,
        subsection_id: c.subsection_id,
        sequence_order: c.sequence_order || 0,
      })),
    ];
  if (exams)
    allItems = [
      ...allItems,
      ...exams.map((e) => ({
        id: e.id,
        title: e.name,
        name: e.name,
        item_type: "exam",
        section_id: e.section_id,
        subsection_id: e.subsection_id,
        sequence_order: e.sequence_order || 0,
      })),
    ];
  if (assignments)
    allItems = [
      ...allItems,
      ...assignments.map((a) => ({
        id: a.id,
        title: a.title,
        item_type: "assignment",
        section_id: a.section_id,
        subsection_id: a.subsection_id,
        sequence_order: a.sequence_order || 0,
      })),
    ];
  if (files)
    allItems = [
      ...allItems,
      ...files.map((f) => ({
        id: f.id,
        title: f.title,
        item_type: "file",
        file_url: f.file_url,
        section_id: f.section_id,
        subsection_id: f.subsection_id,
        sequence_order: f.sequence_order || 0,
        is_public: f.is_public,
      })),
    ];

  allItems.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

  return sections.map((section) => {
    const sectionSubs = (subsections || [])
      .filter((sub) => sub.section_id === section.id)
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

    return {
      id: section.id,
      title: section.title,
      description: section.description,
      is_open: section.is_open,
      items: allItems.filter((item) => item.section_id === section.id && !item.subsection_id),
      subsections: sectionSubs.map((sub) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        is_open: sub.is_open,
        items: allItems.filter((item) => item.subsection_id === sub.id),
      })),
    };
  });
};
export const getEnrolledCourses = async (userId: string) => {
  if (!userId) return [];

  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", true);

  if (enrollError || !enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id);

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .in("id", courseIds);

  if (error) throw error;
  return data || [];
};

export const getUserActivityForMonth = async (
  userId: string,
  courseId: string,
  year: number,
  month: number,
): Promise<Record<string, ActivityData>> => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).getDate();
  const lastDate = `${year}-${String(month).padStart(2, "0")}-${endDate}`;

  const startIso = dayjs(startDate).startOf("day").toISOString();
  const endIso = dayjs(lastDate).endOf("day").toISOString();

  const [attendanceRes, tasksRes] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("created_at")
      .eq("student_id", userId)
      .eq("course_id", courseId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("student_tasks")
      .select("task_date, mandatory_url, optional_url, todo_url")
      .eq("student_id", userId)
      .eq("course_id", courseId)
      .gte("task_date", startDate)
      .lte("task_date", lastDate),
  ]);

  if (attendanceRes.error) throw attendanceRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const activities: Record<string, ActivityData> = {};

  (attendanceRes.data || []).forEach((item) => {
    const dateStr = dayjs(item.created_at).format("YYYY-MM-DD");
    if (!activities[dateStr]) {
      activities[dateStr] = {
        date: dateStr,
        present: false,
        mandatory_done: false,
        optional_done: false,
        todo_done: false,
      };
    }
    activities[dateStr].present = true;
  });

  (tasksRes.data || []).forEach((item) => {
    if (!activities[item.task_date]) {
      activities[item.task_date] = {
        date: item.task_date,
        present: false,
        mandatory_done: false,
        optional_done: false,
        todo_done: false,
      };
    }
    activities[item.task_date].mandatory_done = !!item.mandatory_url;
    activities[item.task_date].optional_done = !!item.optional_url;
    activities[item.task_date].todo_done = !!item.todo_url;
  });

  return activities;
};

// --- Profile Queries ---

export const getUpcomingExams = async (userId: string): Promise<Exam[]> => {
  if (!userId) return [];

  let enrolledBatchIds: string[] = [];
  const { data: userData } = await supabase
    .from("users")
    .select("enrolled_batches")
    .eq("uid", userId)
    .single();

  if (userData) {
    enrolledBatchIds = userData.enrolled_batches || [];
  }

  let examQuery = supabase.from("exams").select("*").is("deleted_at", null);

  if (enrolledBatchIds.length > 0) {
    examQuery = examQuery.or(`course_id.in.(${enrolledBatchIds.join(",")}),course_id.is.null`);
  } else {
    examQuery = examQuery.is("course_id", null);
  }

  const { data: exams, error } = await examQuery
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return exams || [];
};

export const updateUserProfile = async (userId: string, name: string) => {
  const { error } = await supabase.from("users").update({ name: name.trim() }).eq("uid", userId);

  if (error) throw error;
};

export const getStudyUser = async (userId: string) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("study_user")
    .select("is_admin, is_instructor, is_qb_user")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching study_user:", error);
    return null;
  }
  return data;
};

// --- Profile Academic Info Queries ---

export const getStudyStudent = async (userId: string) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("study_student")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching study_student:", error);
    return null;
  }
  return data;
};

export const updateStudyStudent = async (userId: string, payload: Record<string, unknown>) => {
  const { error } = await supabase
    .from("study_student")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
};

export const getAllBatches = async () => {
  const { data, error } = await supabase
    .from("batches")
    .select("id, name, year")
    .is("deleted_at", null)
    .order("year", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getAllGroups = async () => {
  const { data, error } = await supabase.from("groups").select("id, name_bn").order("name_en");

  if (error) throw error;
  return data || [];
};

// --- Public Stats Queries ---

export const getPublicStats = async () => {
  const [{ count: coursesCount }, { count: examsCount }, { count: studentsCount }] =
    await Promise.all([
      supabase.from("courses").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("exams").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("users").select("*", { count: "exact", head: true }),
    ]);

  return {
    courses: coursesCount || 0,
    exams: examsCount || 0,
    students: studentsCount || 0,
  };
};

// --- Admin Queries ---

export const getAdminUsers = async (page: number, searchTerm: string, usersPerPage: number) => {
  const from = (page - 1) * usersPerPage;
  const to = from + usersPerPage - 1;

  let query = supabase.from("users").select("*", { count: "exact" });

  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);
  }

  query = query.order("created_at", { ascending: false, nullsFirst: false }).range(from, to);

  const { data: usersData, error: usersErr, count } = await query;
  if (usersErr) throw usersErr;

  if (!usersData || usersData.length === 0) {
    return { users: [], count };
  }

  const uids = usersData.map((u: any) => u.uid);
  const emails = usersData.map((u: any) => u.email).filter(Boolean);

  const { data: studentsData } = await supabase
    .from("students")
    .select("uid, name, roll, enrolled_batches")
    .in("uid", uids);

  const { data: studyUsersData } = await supabase
    .from("study_user")
    .select("id, email, name")
    .in("email", emails);

  const studyUserMap = new Map((studyUsersData || []).map((u: any) => [u.email, u.id]));
  const studyUserIds = [...studyUserMap.values()];

  const { data: studyStudentsData } = await supabase
    .from("study_student")
    .select("id, roll")
    .in("id", studyUserIds.length > 0 ? studyUserIds : ["__none__"]);

  const studentMap = new Map((studentsData || []).map((s: any) => [s.uid, s]));
  const studyStudentMap = new Map((studyStudentsData || []).map((s: any) => [s.id, s]));

  const users = usersData.map((row: any) => {
    const student = studentMap.get(row.uid) as any;
    const studyUserId = studyUserMap.get(row.email);
    const studyStudent = studyUserId ? (studyStudentMap.get(studyUserId) as any) : null;
    const roll = student?.roll || (studyStudent?.roll != null ? String(studyStudent.roll) : "");
    const name = student?.name || row.full_name || row.username || "";
    const batches = student?.enrolled_batches || row.enrolled_batches || [];
    return {
      uid: row.uid,
      name,
      roll,
      pass: row.pass,
      enrolled_batches: batches,
      created_at: row.created_at,
      email: row.email,
      avatar_url: row.avatar_url,
      mnr_id: row.mnr_id,
      is_admin: row.is_admin,
      is_instructor: row.is_instructor,
      is_qb_user: row.is_qb_user,
      loginMethod: row.loginMethod,
      _rollNum: parseInt(roll) || 0,
    } as User;
  });

  users.sort((a: any, b: any) => b._rollNum - a._rollNum);
  users.forEach((u: any) => delete u._rollNum);

  return { users, count };
};

export const getExamById = async (examId: string) => {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .is("deleted_at", null)
    .eq("id", examId)
    .single();
  if (error) throw error;
  return data as Exam;
};

export const getUserByRoll = async (roll: string) => {
  const { data, error } = await supabase.from("users").select("*").eq("roll", roll.trim()).single();
  if (error) return null;
  return data as User;
};

export const getAdminCourses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const getAdminCourseDetails = async (courseId: string) => {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .eq("id", courseId)
    .single();

  if (courseError) throw courseError;

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("*")
    .is("deleted_at", null)
    .eq("course_id", courseId)
    .order("sequence_order", { ascending: true });

  if (sectionsError) throw sectionsError;

  const { data: subsections, error: subsectionsError } = await supabase
    .from("subsections")
    .select("*")
    .is("deleted_at", null)
    .in("section_id", sections.map((s) => s.id) || [])
    .order("sequence_order", { ascending: true });

  if (subsectionsError && sections.length > 0) throw subsectionsError;

  // Fetch Items
  const [
    { data: instructions },
    { data: classes },
    { data: exams },
    { data: polls },
    { data: assignments },
    { data: files },
  ] = await Promise.all([
    supabase.from("instructions").select("*").is("deleted_at", null).eq("course_id", courseId),
    supabase.from("classes").select("*").is("deleted_at", null).eq("course_id", courseId),
    supabase.from("exams").select("*").is("deleted_at", null).eq("course_id", courseId),
    supabase.from("polls").select("*").is("deleted_at", null).eq("course_id", courseId),
    supabase.from("assignments").select("*").eq("course_id", courseId),
    supabase.from("course_files").select("*").is("deleted_at", null).eq("course_id", courseId),
  ]);

  // Combine and format items
  let allItems: import("@/lib/types").CourseItem[] = [];

  if (instructions)
    allItems = [
      ...allItems,
      ...instructions.map((i) => ({ ...i, item_type: "instruction" as const })),
    ];
  if (classes)
    allItems = [...allItems, ...classes.map((c) => ({ ...c, item_type: "class" as const }))];
  if (exams) allItems = [...allItems, ...exams.map((e) => ({ ...e, item_type: "exam" as const }))];
  if (polls) allItems = [...allItems, ...polls.map((p) => ({ ...p, item_type: "poll" as const }))];
  if (assignments)
    allItems = [
      ...allItems,
      ...assignments.map((a) => ({ ...a, item_type: "assignment" as const })),
    ];
  if (files) allItems = [...allItems, ...files.map((f) => ({ ...f, item_type: "file" as const }))];

  // Sort items by sequence_order first, then by date or created_at
  allItems.sort((a, b) => {
    const orderA = (a as any).sequence_order || 0;
    const orderB = (b as any).sequence_order || 0;

    if (orderA !== orderB) return orderA - orderB;

    const timeA = new Date((a as any).date || (a as any).created_at || 0).getTime();
    const timeB = new Date((b as any).date || (b as any).created_at || 0).getTime();
    return timeA - timeB;
  });

  const sortedSections = [...(sections || [])].sort(
    (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0),
  );

  const structuredSections = sortedSections.map((section) => {
    const sectionSubsections = (subsections || [])
      .filter((sub) => sub.section_id === section.id)
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

    // Items that belong directly to this section (subsection_id is null)
    const sectionItems = allItems.filter(
      (item) => item.section_id === section.id && !item.subsection_id,
    );

    // Attach items to subsections
    const structuredSubsections = sectionSubsections.map((sub) => ({
      ...sub,
      items: allItems.filter((item) => item.subsection_id === sub.id),
    }));

    return {
      ...section,
      subsections: structuredSubsections,
      items: sectionItems,
    };
  });

  return {
    ...course,
    sections: structuredSections,
  } as import("@/lib/types").CourseWithCurriculum;
};

// --- Settings Queries ---
export const getCourseBatches = async () => {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data as import("@/lib/types").Batch[];
};

export const getCourseCategories = async () => {
  const { data, error } = await supabase.from("course_categories").select("*").order("name");
  if (error) throw error;
  return data as import("@/lib/types").CourseCategory[];
};

// --- Syllabus Tracker Queries ---
export interface SyllabusDataResponse {
  papers: import("@/lib/types").CurriculumPaperWithChapters[];
  groups: import("@/lib/types").Group[];
}

export const getSyllabusData = async (): Promise<SyllabusDataResponse> => {
  const [subjectsRes, chaptersRes, topicsRes, groupsRes, paperGroupsRes] = await Promise.all([
    supabase.from("curriculum_papers").select("*, study_disciplines(icon_url)").order("name_en"),
    supabase.from("paper_chapters").select("*").order("serial", { ascending: true, nullsFirst: false }),
    supabase.from("chapter_topics").select("*").order("serial", { ascending: true, nullsFirst: false }),
    supabase.from("groups").select("*").order("name_en"),
    supabase.from("paper_groups").select("*"),
  ]);

  if (subjectsRes.error) throw subjectsRes.error;
  if (chaptersRes.error) throw chaptersRes.error;
  if (topicsRes.error) throw topicsRes.error;
  if (groupsRes.error) throw groupsRes.error;
  if (paperGroupsRes.error) throw paperGroupsRes.error;

  const subjects = subjectsRes.data;
  const chapters = chaptersRes.data;
  const topics = topicsRes.data;
  const groups = groupsRes.data;
  const paperGroups = paperGroupsRes.data;

  // Build a map of paperId -> groupIds[]
  const paperGroupsMap: Record<string, string[]> = {};
  (paperGroups || []).forEach((pg) => {
    if (!paperGroupsMap[pg.paper_id]) {
      paperGroupsMap[pg.paper_id] = [];
    }
    paperGroupsMap[pg.paper_id].push(pg.group_id);
  });

  const papers = (subjects || []).map((subject) => ({
    ...subject,
    icon_url: subject.study_disciplines?.icon_url ?? null,
    group_ids: paperGroupsMap[subject.id] || [],
    chapters: (chapters || [])
      .filter((ch) => ch.paper_id === subject.id)
      .map((chapter) => ({
        ...chapter,
        topics: (topics || []).filter((t) => t.chapter_id === chapter.id),
      })),
  }));

  return {
    papers,
    groups: groups || [],
  };
};

export const getCourseInstruction = async (instructionId: string) => {
  const { data, error } = await supabase
    .from("instructions")
    .select("*")
    .is("deleted_at", null)
    .eq("id", instructionId)
    .single();

  if (error) {
    console.error("Error fetching instruction:", error);
    return null;
  }
  return data;
};

export const getCourseFile = async (fileId: string) => {
  const { data, error } = await supabase
    .from("course_files")
    .select("*")
    .is("deleted_at", null)
    .eq("id", fileId)
    .single();

  if (error) {
    console.error("Error fetching file:", error);
    return null;
  }
  return data;
};

export const getCourseClass = async (classId: string) => {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .is("deleted_at", null)
    .eq("id", classId)
    .single();

  if (error) {
    console.error("Error fetching class:", error);
    return null;
  }
  return data;
};

// --- Central Merit List ---
export interface CentralMeritEntry {
  student_id: string;
  roll: string;
  total_exams: number;
  exams_taken: number;
  total_score: number;
  avg_score: number;
}

export const getCourseCentralMerit = async (courseId: string): Promise<CentralMeritEntry[]> => {
  if (!courseId) return [];

  // 1. Get all exam IDs for this course
  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("id")
    .is("deleted_at", null)
    .eq("course_id", courseId);

  if (examsError || !exams || exams.length === 0) return [];

  const examIds = exams.map((e) => e.id);

  // 2. Get all enrolled student IDs for this course
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("status", true);

  if (enrollError || !enrollments || enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);

  // 3. Get all submitted exam results for these students and exams
  const { data: studentExams, error: seError } = await supabase
    .from("student_exams")
    .select("student_id, exam_id, score")
    .in("exam_id", examIds)
    .in("student_id", studentIds)
    .eq("status", "submitted");

  if (seError || !studentExams || studentExams.length === 0) {
    // Return all enrolled students with zero scores
    const { data: studentData } = await supabase
      .from("study_student")
      .select("id, roll")
      .in("id", studentIds);

    return (studentData || []).map((s) => ({
      student_id: s.id,
      roll: s.roll ? String(s.roll) : "",
      total_exams: exams.length,
      exams_taken: 0,
      total_score: 0,
      avg_score: 0,
    }));
  }

  // 4. Get student info
  const { data: studentData } = await supabase
    .from("study_student")
    .select("id, roll")
    .in("id", studentIds);

  const studentMap = new Map<string, { roll: string }>();
  (studentData || []).forEach((s) => {
    studentMap.set(s.id, { roll: s.roll ? String(s.roll) : "" });
  });

  // 5. Aggregate scores per student
  const aggMap = new Map<string, { exams_taken: number; total_score: number }>();
  studentExams.forEach((se) => {
    const existing = aggMap.get(se.student_id) || { exams_taken: 0, total_score: 0 };
    aggMap.set(se.student_id, {
      exams_taken: existing.exams_taken + 1,
      total_score: existing.total_score + (se.score || 0),
    });
  });

  // 6. Build final list with all enrolled students
  const totalExams = exams.length;
  const result: CentralMeritEntry[] = studentIds.map((sid) => {
    const agg = aggMap.get(sid) || { exams_taken: 0, total_score: 0 };
    const info = studentMap.get(sid) || { roll: "" };
    return {
      student_id: sid,
      roll: info.roll,
      total_exams: totalExams,
      exams_taken: agg.exams_taken,
      total_score: agg.total_score,
      avg_score: agg.exams_taken > 0 ? agg.total_score / agg.exams_taken : 0,
    };
  });

  // 7. Sort by avg_score descending, then by exams_taken descending
  result.sort((a, b) => {
    if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
    if (b.exams_taken !== a.exams_taken) return b.exams_taken - a.exams_taken;
    return a.roll.localeCompare(b.roll);
  });

  return result;
};

// --- Instructor Orders ---
export const getInstructorOrders = async (instructorId: string) => {
  if (!instructorId) return [];

  // 1. Fetch all active orders with course info (instructors see all courses)
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id,
      amount,
      payment_method,
      phone_number,
      status,
      created_at,
      updated_at,
      user_id,
      notes,
      course_id,
      courses ( id, title, slug, admin_id )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Error fetching instructor orders:", ordersError);
    return [];
  }

  if (!orders || orders.length === 0) return [];

  // 2. Fetch user info for all unique user_ids
  const userIds = [...new Set(orders.map((o) => o.user_id))];
  const { data: users } = await supabase
    .from("study_user")
    .select("id, name, email")
    .in("id", userIds);

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  // 3. Merge
  return orders.map((order) => ({
    ...order,
    study_user: userMap.get(order.user_id) || null,
  }));
};
