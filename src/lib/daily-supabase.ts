import { supabase } from "@/lib/supabase";
import dayjs from "@/lib/date-utils";
import { StudentTask, Exam } from "@/lib/types";

export const getEnrolledBatches = async (
  userId: string,
): Promise<
  {
    id: string;
    name: string;
    attendance?: boolean;
    task?: boolean;
    group_study?: boolean;
    battle?: boolean;
    custom_exam?: boolean;
  }[]
> => {
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .is("deleted_at", null);

  if (enrollError || !enrollments || enrollments.length === 0) {
    return [];
  }

  const courseIds = enrollments.map((e) => e.course_id);

  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id, title, attendance, task, group_study, battle, custom_exam")
    .is("deleted_at", null)
    .in("id", courseIds)
    .eq("status", "published");

  if (courseError) {
    console.error("Error fetching enrolled courses:", courseError);
    return [];
  }

  return (courses || []).map((c) => ({
    id: c.id,
    name: c.title,
    attendance: c.attendance,
    task: c.task,
    group_study: c.group_study,
    battle: c.battle,
    custom_exam: c.custom_exam,
  }));
};

export const checkAttendance = async (userId: string, date: string): Promise<boolean> => {
  const start = dayjs(date).startOf("day").toISOString();
  const end = dayjs(date).endOf("day").toISOString();

  const { data, error } = await supabase
    .from("student_attendance")
    .select("id")
    .eq("student_id", userId)
    .gte("created_at", start)
    .lte("created_at", end)
    .limit(1);

  if (error) {
    console.error("Error checking attendance:", error);
    return false;
  }
  return !!data && data.length > 0;
};

export const markAttendance = async (userId: string, date: string, courseIds: string[]) => {
  if (courseIds.length === 0) return;

  const inserts = courseIds.map((courseId) => ({
    student_id: userId,
    course_id: courseId,
  }));

  const { error } = await supabase.from("student_attendance").insert(inserts);

  if (error) throw error;
};

export const getDailyTasks = async (
  userId: string,
  courseId: string,
  date: string,
): Promise<StudentTask | null> => {
  const { data, error } = await supabase
    .from("student_tasks")
    .select("*")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .eq("task_date", date)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching tasks:", error);
  }

  return data;
};

export const submitTask = async (
  userId: string,
  courseId: string,
  date: string,
  type: "mandatory" | "optional" | "todo",
  url: string,
) => {
  const existing = await getDailyTasks(userId, courseId, date);

  const updateData: Partial<StudentTask> = {
    student_id: userId,
    course_id: courseId,
    task_date: date,
  };

  if (existing) {
    updateData.id = existing.id;
    if (type === "mandatory") {
      updateData.mandatory_url = url;
    } else if (type === "optional") {
      updateData.optional_url = url;
    } else if (type === "todo") {
      updateData.todo_url = url;
    }
  } else {
    if (type === "mandatory") {
      updateData.mandatory_url = url;
    } else if (type === "optional") {
      updateData.optional_url = url;
    } else if (type === "todo") {
      updateData.todo_url = url;
    }
  }

  const { error } = await supabase
    .from("student_tasks")
    .upsert(updateData, { onConflict: "student_id, course_id, task_date" });

  if (error) throw error;
};

export interface LiveExam extends Exam {
  courses?: { slug: string | null } | null;
}

export const getLiveExams = async (courseIds: string[]): Promise<LiveExam[]> => {
  if (courseIds.length === 0) return [];
  const now = dayjs().toISOString();

  const { data, error } = await supabase
    .from("exams")
    .select("*, courses(slug)")
    .is("deleted_at", null)
    .in("course_id", courseIds)
    .lte("start_at", now)
    .gte("end_at", now);

  if (error) {
    console.error("Error fetching live exams:", error);
    return [];
  }

  return (data as LiveExam[]) || [];
};

export interface DayExamDetail {
  name: string;
  score: number | null;
}

export interface DayCourseDetail {
  courseId: string;
  attendanceDone: boolean;
  mandatorySubmitted: boolean;
  optionalSubmitted: boolean;
  todoSubmitted: boolean;
  exams: DayExamDetail[];
}

export interface DayActivity {
  date: string;
  totalScore: number;
  activeCourses: string[];
  courses: Record<string, DayCourseDetail>;
}

export const getUserActivityHistory = async (
  userId: string,
): Promise<Record<string, DayActivity>> => {
  // 3-month window: [current - 2, current - 1, current]
  const windowStart = dayjs().subtract(2, "month").startOf("month");
  const windowEnd = dayjs().endOf("month");

  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .is("deleted_at", null);

  if (enrollError || !enrollments || enrollments.length === 0) {
    return {};
  }
  const courseIds = enrollments.map((e) => e.course_id);

  const [attendanceRes, tasksRes, examsRes] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("created_at, course_id")
      .eq("student_id", userId)
      .in("course_id", courseIds)
      .gte("created_at", windowStart.startOf("day").toISOString())
      .lte("created_at", windowEnd.endOf("day").toISOString()),
    supabase
      .from("student_tasks")
      .select("task_date, mandatory_url, optional_url, todo_url, course_id")
      .eq("student_id", userId)
      .in("course_id", courseIds)
      .gte("task_date", windowStart.format("YYYY-MM-DD"))
      .lte("task_date", windowEnd.format("YYYY-MM-DD")),
    supabase
      .from("student_exams")
      .select("submitted_at, score, exams(name, course_id)")
      .eq("student_id", userId)
      .gte("submitted_at", windowStart.startOf("day").toISOString())
      .lte("submitted_at", windowEnd.endOf("day").toISOString()),
  ]);

  if (attendanceRes.error) throw attendanceRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (examsRes.error) throw examsRes.error;

  const byDate: Record<string, DayActivity> = {};

  const ensureDay = (dateStr: string): DayActivity => {
    if (!byDate[dateStr]) {
      byDate[dateStr] = {
        date: dateStr,
        totalScore: 0,
        activeCourses: [],
        courses: {},
      };
    }
    return byDate[dateStr];
  };

  const ensureCourse = (day: DayActivity, courseId: string): DayCourseDetail => {
    if (!day.courses[courseId]) {
      day.courses[courseId] = {
        courseId,
        attendanceDone: false,
        mandatorySubmitted: false,
        optionalSubmitted: false,
        todoSubmitted: false,
        exams: [],
      };
      day.activeCourses.push(courseId);
    }
    return day.courses[courseId];
  };

  (attendanceRes.data || []).forEach((row: { created_at: string; course_id: string }) => {
    const day = ensureDay(dayjs(row.created_at).format("YYYY-MM-DD"));
    const course = ensureCourse(day, row.course_id);
    course.attendanceDone = true;
    day.totalScore += 1;
  });

  (tasksRes.data || []).forEach(
    (row: {
      task_date: string;
      mandatory_url: string | null;
      optional_url: string | null;
      todo_url: string | null;
      course_id: string;
    }) => {
      const day = ensureDay(row.task_date);
      const course = ensureCourse(day, row.course_id);

      let urls = 0;
      if (row.mandatory_url) {
        course.mandatorySubmitted = true;
        urls += 1;
      }
      if (row.optional_url) {
        course.optionalSubmitted = true;
        urls += 1;
      }
      if (row.todo_url) {
        course.todoSubmitted = true;
        urls += 1;
      }
      day.totalScore += urls;
    },
  );

  type ExamRow = {
    submitted_at: string;
    score: number | null;
    exams: { name: string; course_id: string | null } | null;
  };
  ((examsRes.data || []) as unknown as ExamRow[]).forEach((row) => {
    if (!row.submitted_at) return;
    const day = ensureDay(dayjs(row.submitted_at).format("YYYY-MM-DD"));
    // Exams without a course are grouped under a public-exam sentinel ("")
    const courseId = row.exams?.course_id || "";
    const course = ensureCourse(day, courseId);
    course.exams.push({
      name: row.exams?.name || "অজানা পরীক্ষা",
      score: row.score,
    });
    day.totalScore += 1;
  });

  return byDate;
};
