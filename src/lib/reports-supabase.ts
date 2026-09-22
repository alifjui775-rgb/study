import { supabase } from "@/lib/supabase";
import { Batch } from "@/lib/types";

export interface ReportItem {
  uid: string;
  name: string;
  roll: string;
  present: boolean;
  mandatory_done: boolean;
  optional_done: boolean;
  todo_done: boolean;
  mandatory_url: string | null;
  optional_url: string | null;
  todo_url: string | null;
  exams: { name: string; score: number }[];
}

export const getReportCourseOptions = async (): Promise<{ id: string; name: string }[]> => {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses for reports:", error);
    return [];
  }
  return (data || []).map((c) => ({ id: c.id, name: c.title }));
};

export const getReports = async (courseId: string, date: string): Promise<ReportItem[]> => {
  // 1. Get users enrolled in this course
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("uid, name, roll, enrolled_batches")
    .contains("enrolled_batches", [courseId]);

  if (userError || !users) {
    console.error("Error fetching users:", userError);
    return [];
  }

  // 2. Get attendance for this course and date
  const { data: attendance } = await supabase
    .from("student_attendance")
    .select("student_id, created_at")
    .eq("course_id", courseId)
    .gte("created_at", `${date}T00:00:00.000Z`)
    .lte("created_at", `${date}T23:59:59.999Z`);

  // 3. Get tasks for this course and date
  const { data: tasks } = await supabase
    .from("student_tasks")
    .select("student_id, mandatory_url, optional_url, todo_url")
    .eq("course_id", courseId)
    .eq("task_date", date);

  // 4. Get exam submissions for this date
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: examSubmissions } = await supabase
    .from("student_exams")
    .select(`
      student_id,
      correct_answers,
      wrong_answers,
      exams!inner (
        name,
        batch_id,
        marks_per_question,
        negative_marks_per_wrong
      )
    `)
    .eq("exams.batch_id", courseId)
    .gte("submitted_at", startOfDay)
    .lte("submitted_at", endOfDay);

  type ExamSubmissionData = {
    student_id: string;
    correct_answers: number | null;
    wrong_answers: number | null;
    exams: {
      name: string;
      batch_id: string | null;
      marks_per_question: number | null;
      negative_marks_per_wrong: number | null;
    } | null;
  };

  // Map data to users
  const reportData = users.map((user) => {
    const userAttendance = attendance?.find((a) => a.student_id === user.uid);
    const userTask = tasks?.find((t) => t.student_id === user.uid);

    // Cast examSubmissions to the expected shape since the complex join return type inference can be tricky
    const userExams =
      (examSubmissions as unknown as ExamSubmissionData[])
        ?.filter((s) => s.student_id === user.uid)
        .map((s) => {
          const marksPerQuestion = s.exams?.marks_per_question || 1;
          const negativeMarks = s.exams?.negative_marks_per_wrong || 0;
          const score =
            (s.correct_answers || 0) * marksPerQuestion - (s.wrong_answers || 0) * negativeMarks;
          return {
            name: s.exams?.name || "Unknown",
            score: score,
          };
        }) || [];

    return {
      uid: user.uid,
      name: user.name || "Unknown",
      roll: user.roll || "N/A",
      present: !!userAttendance,
      mandatory_done: !!userTask?.mandatory_url,
      optional_done: !!userTask?.optional_url,
      todo_done: !!userTask?.todo_url,
      mandatory_url: userTask?.mandatory_url || null,
      optional_url: userTask?.optional_url || null,
      todo_url: userTask?.todo_url || null,
      exams: userExams,
    };
  });

  return reportData;
};
