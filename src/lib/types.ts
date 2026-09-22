export type User = {
  uid: string;
  name: string;
  roll?: string; // nullable in DB
  pass?: string;
  enrolled_batches: string[];
  created_at: string;
  email?: string;
  avatar_url?: string | null;
  mnr_id?: string;
  is_admin?: boolean;
  is_instructor?: boolean;
  is_qb_user?: boolean;
  loginMethod?: "local" | "mnr_id";
};

export interface UserFormResult extends User {
  pass?: string;
}

export type Admin = {
  uid: string;
  username: string;
  role: "admin" | "moderator";
  created_at: string;
};

export type Batch = {
  id: string;
  name: string;
  year: number;
  is_current: boolean;
};

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
};

export type Exam = {
  id: string;
  name: string;
  description?: string | null;
  course_name?: string | null;
  course_id?: string | null; // For Course Curriculum linking
  section_id?: string | null; // For Course Curriculum linking
  subsection_id?: string | null; // For Course Curriculum linking
  duration_minutes?: number;
  marks_per_question?: number;
  negative_marks_per_wrong?: number;
  /** @deprecated Will be removed once all pages migrate to exam_questions junction table */
  file_id?: string;
  exam_type?: "mcq" | "written" | "cq" | null;
  is_practice?: boolean;
  type?: "live" | "practice";
  category?: string;
  shuffle_questions?: boolean;
  shuffle_sections_only?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  total_subjects?: number | null;
  mandatory_subjects?: string[] | null; // uuid[] in DB
  optional_subjects?: string[] | null; // uuid[] in DB
  sequence_order?: number;
  created_at: string;
  questions?: Question[];
};

export type Question = {
  id?: string;
  exam_id?: string;
  file_id?: string;
  question: string;
  options: string[] | Record<string, string>;
  answer: number | string;
  correct?: string;
  explanation?: string | null;
  type?: string | null;
  section?: string | null;
  order_index?: number;
  created_at?: string;
};

export type StudentExam = {
  id?: string;
  exam_id: string;
  student_id: string;
  score?: number | null; // nullable in DB
  correct_answers?: number;
  wrong_answers?: number;
  unattempted?: number;
  submitted_at?: string;
  marks_per_question?: number;
};

export type ServerActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T | T[] | null;
};

export type StudentAttendance = {
  id: string;
  student_id: string;
  course_id: string;
  created_at: string;
};

export type StudentTask = {
  id: string;
  student_id: string;
  course_id: string;
  task_date: string;
  mandatory_url?: string | null;
  optional_url?: string | null;
  todo_url?: string | null;
  created_at: string;
};

export type ActivityData = {
  date: string;
  present: boolean;
  mandatory_done: boolean;
  optional_done: boolean;
  todo_done: boolean;
};

export type CourseStatus = "draft" | "published" | "archived";

export type Course = {
  id: string;
  admin_id: string;
  title: string;
  slug: string;
  short_description?: string | null;
  details?: any | null; // JSONB
  cover_url?: string | null;
  youtube_url?: string | null;
  price_regular: number;
  price_discounted?: number | null;
  discount_ends_at?: string | null;
  discount_max_limit?: number | null;
  batch_ids?: string[] | null;
  category_ids?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  validity_days?: number | null;
  routine_url?: string | null;
  features?: string[] | null;
  faq?: { question: string; answer: string }[] | null;
  status: CourseStatus;
  created_at: string;
  attendance?: boolean | null;
  task?: boolean | null;
  group_study?: boolean | null;
  battle?: boolean | null;
  custom_exam?: boolean | null;
  group_link?: string | null;
};

export type CourseInstruction = {
  id: string;
  course_id: string;
  section_id: string;
  subsection_id?: string | null;
  title: string;
  details: string;
  sequence_order: number;
  date: string;
  is_public?: boolean;
  item_type: "instruction";
};

export type CourseClass = {
  id: string;
  course_id: string;
  section_id: string;
  subsection_id?: string | null;
  title: string;
  video_url?: string | null;
  notes?: string | null;
  is_live: boolean;
  sequence_order: number;
  date: string;
  item_type: "class";
};

export type CoursePoll = {
  id: string;
  course_id: string;
  section_id: string;
  subsection_id?: string | null;
  title: string;
  poll_system_id: string;
  sequence_order: number;
  date: string;
  item_type: "poll";
};

export type CourseAssignment = {
  id: string;
  course_id: string;
  section_id: string;
  subsection_id?: string | null;
  title: string;
  instructions?: any | null; // JSONB
  due_date?: string | null;
  sequence_order: number;
  date: string;
  item_type: "assignment";
};

export type CourseFile = {
  id: string;
  course_id: string;
  section_id: string;
  subsection_id?: string | null;
  title: string;
  file_url: string;
  description?: string | null;
  sequence_order: number;
  date: string;
  is_public?: boolean;
  item_type: "file";
};

// Exam is already defined above, but we will augment it in CourseItem.
// We'll also update the base Exam type below.

export type CourseItem =
  | CourseInstruction
  | CourseClass
  | CoursePoll
  | CourseAssignment
  | CourseFile
  | (Exam & { item_type: "exam" });

export type CourseSubsection = {
  id: string;
  section_id: string;
  title: string;
  description?: string | null;
  sequence_order: number;
  is_open?: boolean;
  items?: CourseItem[];
};

export type CourseSection = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  sequence_order: number;
  is_open?: boolean;
  subsections?: CourseSubsection[]; // For frontend nested structure
  items?: CourseItem[];
};

export type CourseWithCurriculum = Course & {
  sections: CourseSection[];
};

export type CourseCategory = {
  id: string;
  name: string;
};

// --- Syllabus Tracker ---
export type CurriculumPaper = {
  id: string;
  name_en: string;
  short_code?: string | null;
  name_bn?: string | null;
  discipline_id?: string | null;
  icon_url?: string | null;
};

export type PaperChapter = {
  id: string;
  paper_id: string;
  serial?: number | null;
  name: string;
  short_code?: string | null;
};

export type ChapterTopic = {
  id: string;
  paper_id: string;
  chapter_id: string;
  serial?: number | null;
  name: string;
};

export type PaperChapterWithTopics = PaperChapter & {
  topics: ChapterTopic[];
};

export type CurriculumPaperWithChapters = CurriculumPaper & {
  chapters: PaperChapterWithTopics[];
  group_ids?: string[]; // Mapping to groups
};

export type Group = {
  id: string;
  name_en: string;
  name_bn: string;
};
