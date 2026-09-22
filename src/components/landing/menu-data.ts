import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CalendarCheck,
  BarChart,
  Landmark,
  Building2,
  School,
  MessageSquareText,
  BookMarked,
  FileSignature,
  Calculator,
  CheckCircle,
  NotebookPen,
  ListTodo,
  ChartLine,
  ListClock,
} from "lucide-react";

export const menuSections = [
  {
    title: "ড্যাসবোর্ড",
    items: [
      { to: "/dashboard", icon: "LayoutDashboard", label: "ড্যাসবোর্ড" },
      { to: "/dashboard/courses", icon: "BookOpen", label: "আমার কোর্স" },
      { to: "/dashboard/exams", icon: "FileText", label: "পরীক্ষাসমূহ" },
      { to: "/dashboard/history", icon: "ListClock", label: "হিস্ট্রি" },
      { to: "/dashboard/daily", icon: "CalendarCheck", label: "প্রতিদিনের টাস্ক" },
      { to: "/dashboard/reports", icon: "BarChart", label: "রিপোর্ট" },
      { to: "/dashboard/practice", icon: "ListTodo", label: "প্রাকটিস" },
    ],
  },
  {
    title: "তথ্যভান্ডার",
    items: [
      { to: "/public", icon: "Landmark", label: "পাবলিক ইউনিভার্সিটি" },
      { to: "/private", icon: "Building2", label: "প্রাইভেট ইউনিভার্সিটি" },
      { to: "/college", icon: "School", label: "কলেজ" },
      { to: "/subjects", icon: "MessageSquareText", label: "সাবজেক্ট রিভিউ" },
    ],
  },
  {
    title: "টুলস",
    items: [
      { to: "/syllabus-tracker", icon: "BookMarked", label: "সিলেবাস ট্র্যাকার" },
      { to: "/self-test", icon: "FileSignature", label: "সেলফ টেস্ট" },
      { to: "/gpa-calculator", icon: "Calculator", label: "জিপিএ ক্যালকুলেটর" },
      { to: "/eligibility-checker", icon: "CheckCircle", label: "এলিজিবিলিটি চেকার" },
      { to: "/dashboard/notes", icon: "NotebookPen", label: "নোটস" },
      { to: "/graph", icon: "ChartLine", label: "গ্রাফ সিমুলেটর" },
    ],
  },
];

export const headerIconMap: { [key: string]: React.ElementType } = {
  LayoutDashboard,
  BookOpen,
  FileText,
  CalendarCheck,
  BarChart,
  Landmark,
  Building2,
  School,
  MessageSquareText,
  BookMarked,
  FileSignature,
  Calculator,
  CheckCircle,
  NotebookPen,
  ListTodo,
  ChartLine,
  ListClock,
};
