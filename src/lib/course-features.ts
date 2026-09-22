import {
  ListTodo,
  CheckSquare,
  FileText,
  CheckCircle,
  TrendingUp,
  Timer,
  BookOpen,
  Users,
} from "lucide-react";

export interface CourseFeatureDefinition {
  title: string;
  description: string;
  icon: any;
  color: string;
}

export const ALL_COURSE_FEATURES: CourseFeatureDefinition[] = [
  {
    title: "To Do List Submission",
    description:
      "দিনের শুরুতেই যদি ঠিক করে নেয়া যায় আজ কি কি পড়বে, তাহলে ঐদিনের পড়াশোনার পুরো সময়টা ইফেক্টিভ পড়াশোনা হয়। তাই এই ব্যাচে আমরা প্রতিদিন তোমাদের To Do List জমা নিব। To Do List অনুযায়ী প্রতিদিনের পড়াশোনা খুবই গোছানো হবে ইনশাআল্লাহ, তোমার তৈরিকৃত To Do List দেখে আমাদের মেন্টর প্যানেলে নিয়মিত গাইড করবে তোমাকে, এতে তোমার Productivity বাড়বে কয়েকগুণ ইনশাআল্লাহ।",
    icon: ListTodo,
    color: "text-amber-500",
  },
  {
    title: "Task 01, 02 Submission",
    description:
      "MNR Study এর শিক্ষার্থীরা দিনকে ২ ভাগে করে নেয়। সকালে ঘুম থেকে উঠার পর হতে দুপুর ১ টা পর্যন্ত প্রথম ভাগ এবং এরপর হতে রাত ১০:৩০ পর্যন্ত দ্বিতীয় ভাগ। দিনের প্রথম ভাবে আমরা Task - 01 জমা নিই এবং ২য় ভাবে Task -02 জমা নিই। Task - 01 হলো তোমার তৈরিকৃত To Do List অনুযায়ী Complete করা দিনের ১ম ভাগের সময়ে সম্পন্ন করা পড়াশোনা। আর Task - 02 হলো দিনের ২য় ভাগে সম্পন্ন করা পড়াশোনা। Task জমা নিলে ফাঁকিবাজির সুযোগ থাকে না তাই প্রতিদিনের পড়াশোনা প্রতিদিনই শেষ হয়।",
    icon: CheckSquare,
    color: "text-indigo-500",
  },
  {
    title: "Custom Exam",
    description:
      "শিক্ষার্থীর তৈরিকৃত To Do List অনুযায়ী প্রতিটি চ্যাপ্টার থেকে প্রয়োজন মত Category (HSC/Medical/Varsity Ka,Kha) সিলেক্ট করে এক্সাম দিতে পারবে। প্রতি পরীক্ষায় ভুল হওয়া প্রশ্নগুলো আলাদা একটি সেকশনে জমা হতে থাকবে, শিক্ষার্থী প্রয়োজন মত ভুল হওয়া প্রশ্ন গুলো পুনরায় আলাদা ভাবে চর্চা করতে পারবে।",
    icon: FileText,
    color: "text-emerald-500",
  },
  {
    title: "Completed To Do List Submission",
    description:
      "সকালে ঘুম থেকে উঠে যেই To Do List তৈরি করে জমা দিয়েছিলে সারাদিন সেই To Do List অনুযায়ী পড়াশোনা, এক্সাম শেষ করে রাতে নির্দিষ্ট সময়ে Completed To Do List আমাদের ওয়েবসাইটে জমা দিবে। আমাদের Expert Mentor প্যানেল তোমার To Do List দেখে প্রয়োজনীয় গাইডলাইন দিবে যেন পরবর্তী দিনে আরোও ভাল করতে পার।",
    icon: CheckCircle,
    color: "text-rose-500",
  },
  {
    title: "Progress Report",
    description:
      "শিক্ষার্থীর তৈরি করা Incomplete To List জমা দেয়ার পর 15% Progress যোগ হবে। একই ভাবে Task 01 এর জন্য 25%, Task 02 এর জন্য 25% এবং বাকি 35% থাকবে Custom Exam গুলোতে প্রাপ্ত মার্কসে। যতগুলো Custom এক্সাম দেয়া হবে সেগুলো থেকে Percentage যোগ হতে থাকবে।",
    icon: TrendingUp,
    color: "text-sky-500",
  },
  {
    title: "Pomodoro Timer",
    description:
      "Pomodoro Timer তোমাকে পড়াশোনায় ফোকাস ধরে রাখতে সাহায্য করবে। এখানে 25 মিনিট করে সেশন নেয়া যায়, প্রতি 25 মিনিট পর পর 5 মিনিট ব্রেক নিয়ে পড়াশোনা করলে Output ভাল আসে, তাই আমরা Website এ Pomodoro Timer রেখেছি। পড়াশোনার পাশাপাশি অন্য কোথায় সময় নষ্ট হচ্ছে তা Track করে রাখতে পারবে আমাদের ওয়েবসাইটে।",
    icon: Timer,
    color: "text-orange-500",
  },
  {
    title: "Chapter Wise Question Bank",
    description:
      "সকল বোর্ডের প্রশ্ন, সকল বিশ্ববিদ্যালয়ের প্রশ্ন,মেডিকেল/ডেন্টাল/নার্সিং এর প্রশ্ন, ইঞ্জিনিয়ারিং গুচ্ছের প্রশ্ন, অনুশীলনীর প্রশ্ন এবং আরোও এডভান্স সব প্রশ্নের Digital Question Bank এর এক্সেস।",
    icon: BookOpen,
    color: "text-violet-500",
  },
  {
    title: "Smart Circle",
    description:
      "MNR Study তে তুমি এমন সব শিক্ষার্থী পাবে যারা পড়াশোনার প্রতি খুবই সিরিয়াস। এখানে প্রত্যেকে ১০/১৫ ঘন্টার বেশি পড়াশোনা করবে নিয়মিত। তাই অন্যদের দেখে তোমারও পড়তে ইচ্ছে হবে, আলাদা মোটিভেশন কাজ করবে।",
    icon: Users,
    color: "text-amber-500",
  },
];
