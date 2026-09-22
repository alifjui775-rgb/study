import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/lib/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { enrollFreeCourse, createOrder } from "@/lib/actions";
import { GroupLinkConfirmation } from "@/components/GroupLinkConfirmation";
import {
  getCourseBySlug,
  getCourseCategories,
  getCourseCurriculum,
  getUserCourseEnrollment,
  getCourseOrderCount,
} from "@/lib/queries";
import { ALL_COURSE_FEATURES } from "@/lib/course-features";
import {
  Star,
  Share2,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  MessageCircle,
  Home,
  ChevronRight,
  ChevronDown,
  Loader2,
  ArrowLeft,
  Sparkles,
  Check,
  Flame,
  BookMarked,
  ShieldCheck,
  Clock,
  Users,
  Target,
  ListTodo,
  CheckSquare,
  FileText,
  CheckCircle,
  TrendingUp,
  Timer,
  Download,
  Video,
  ClipboardList,
  GraduationCap,
  Lock,
  LayoutList,
  FileArchive,
  TextInitial,
  Folders,
  CircleCheckBig,
  Trophy,
  RotateCcw,
  Sliders,
} from "lucide-react";
import CentralMerit from "@/components/CentralMerit";

// Feature Icons Mapping for Accordion items
const FEATURE_ICONS = [
  Flame,
  BookMarked,
  ShieldCheck,
  Clock,
  Sparkles,
  Users,
  Target,
  CheckCircle2,
];

const STATIC_FEATURES = [
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

const STATIC_FAQS = [
  {
    question: "এই ব্যাচে কি ক্লাস নেয়া হবে?",
    answer:
      "না, এটা মেন্টরশিপ প্রোগ্রাম। তবে ইউটিউব থেকে কোন চ্যাপ্টারে কোন ক্লাস করলে ভাল হবে সাজেশন নিতে পারবে মেন্টরদের থেকে",
  },
  { question: "ডাউট সলভ গ্রুপ থাকবে?", answer: "হ্যাঁ, প্রতিটি ব্যাচের জন্য আলাদা ডাউট সলভিং গ্রুপ রয়েছে।" },
  { question: "ভর্তি ফি রিফান্ড করা হয়?", answer: "না, ভর্তি ফি অফেরতযোগ্য।" },
  {
    question: "এই কোর্স নিয়ে আর কিছু জানতে চাও?",
    answer:
      "SOT Academy Admin (https://t.me/SOT_AC) টেলিগ্রাম আইডিতে বা 01305769336 (https://wa.me/8801305769336) নাম্বারে হোয়াটসঅ্যাপে ম্যাসেজ দাও।",
  },
];

// ── Skeleton Loader ──────────────────────────────────────────────────────────
function CourseDetailsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 lg:p-10 animate-pulse space-y-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-5 w-64 bg-muted rounded-md" />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-video w-full bg-muted rounded-2xl" />
          <div className="h-6 w-28 bg-muted rounded-lg" />
          <div className="h-10 w-3/4 bg-muted rounded-xl" />
          <div className="h-5 w-40 bg-muted rounded-md" />
          <div className="space-y-3 pt-6">
            <div className="h-6 w-36 bg-muted rounded-md" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-5/6 bg-muted rounded" />
            <div className="h-4 w-4/6 bg-muted rounded" />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4">
          <div className="h-96 w-full bg-muted rounded-[32px]" />
        </div>
      </div>
    </div>
  );
}

// ── Not Found State ──────────────────────────────────────────────────────────
function CourseNotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
        <BookOpen className="size-12" />
      </div>
      <h1 className="text-3xl font-black mb-3">কোর্সটি খুঁজে পাওয়া যায়নি!</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 font-bengali">
        দুঃখিত, <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">{slug}</code> স্লাগ
        নিয়ে কোনো কোর্স পাওয়া যায়নি।
      </p>
      <Link to="/courses">
        <Button size="lg" className="rounded-2xl font-black px-8 gap-2">
          <ArrowLeft className="h-4 w-4" />
          সকল কোর্স দেখুন
        </Button>
      </Link>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolling, setEnrolling] = useState(false);
  const [freeEnrollSuccess, setFreeEnrollSuccess] = useState(false);

  // Fetch course details
  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["course-details", slug],
    queryFn: () => getCourseBySlug(slug),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch categories for label lookup
  const { data: categories } = useQuery({
    queryKey: ["course-categories"],
    queryFn: getCourseCategories,
  });

  // Fetch curriculum sections
  const { data: curriculum = [] } = useQuery({
    queryKey: ["course-curriculum", course?.id],
    queryFn: () => getCourseCurriculum(course!.id),
    enabled: !!course?.id,
    staleTime: 5 * 60 * 1000,
  });

  // State for expanded curriculum sections and subsections
  const [expandedCurrSections, setExpandedCurrSections] = useState<Record<string, boolean>>({});
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});

  // Fetch enrollment status
  const { data: userEnrollment } = useQuery({
    queryKey: ["user-course-enrollment", user?.uid, course?.id],
    queryFn: () => getUserCourseEnrollment(user!.uid, course!.id),
    enabled: !!user?.uid && !!course?.id,
  });

  const isEnrolled = !!userEnrollment;

  // Check if user has a pending order for this course
  const { data: pendingOrder } = useQuery({
    queryKey: ["pending-order", user?.uid, course?.id],
    queryFn: async () => {
      if (!user?.uid || !course?.id) return null;
      const { data } = await supabase
        .from("orders")
        .select("id, phone_number")
        .eq("user_id", user.uid)
        .eq("course_id", course.id)
        .in("status", ["pending", "approved"])
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.uid && !!course?.id,
  });

  const hasPendingOrder = !!pendingOrder;
  const hasPendingWithPhone = hasPendingOrder && pendingOrder?.phone_number?.trim();

  // Fetch order count for discount limit check
  const { data: orderCount = 0 } = useQuery({
    queryKey: ["course-order-count", course?.id],
    queryFn: () => getCourseOrderCount(course!.id),
    enabled: !!course?.id,
  });

  // Fetch user completed exam submissions
  const { data: userSubmissions = [] } = useQuery({
    queryKey: ["user-completed-exams", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const { data, error } = await supabase
        .from("student_exams")
        .select("exam_id, status, score")
        .eq("student_id", user.uid)
        .eq("status", "submitted");
      if (error) {
        console.error("Error fetching user completed exams:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.uid,
    staleTime: 60 * 1000,
  });

  const completedExamMap = useMemo(() => {
    const map = new Map<string, { score: number | null }>();
    (userSubmissions as any[]).forEach((s) => {
      map.set(s.exam_id, { score: s.score });
    });
    return map;
  }, [userSubmissions]);

  const renderCurriculumItem = (item: any) => {
    const isAccessible = isEnrolled || !!item.is_public;
    const completedExam = item.item_type === "exam" ? completedExamMap.get(item.id) : null;
    const isCompletedExam = !!completedExam;
    const typeMap: Record<string, string> = { exam: "exams", class: "classes" };

    return (
      <div
        key={item.id}
        className="p-2 md:p-2.5 rounded-xl border border-border/40 bg-background/40 hover:bg-muted/30 transition-all duration-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="size-6 md:size-7 rounded-md bg-background border flex items-center justify-center shrink-0">
            {item.item_type === "class" && <Video className="size-3 md:size-3.5 text-red-500" />}
            {item.item_type === "exam" && (
              <CircleCheckBig className="size-3 md:size-3.5 text-green-500" />
            )}
            {item.item_type === "instruction" && (
              <TextInitial className="size-3 md:size-3.5 text-blue-500" />
            )}
            {item.item_type === "assignment" && (
              <BookOpen className="size-3 md:size-3.5 text-orange-500" />
            )}
            {item.item_type === "file" && <Folders className="size-3 md:size-3.5 text-cyan-500" />}
          </div>

          {isAccessible ? (
            <Link
              to={`/courses/${course!.slug}/${typeMap[item.item_type] || item.item_type}/${item.id}`}
              className="text-xs md:text-sm text-foreground/80 font-medium break-words whitespace-normal font-bengali hover:text-primary transition-colors flex-1"
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-xs md:text-sm text-foreground/80 font-medium break-words whitespace-normal font-bengali flex-1">
              {item.title}
            </span>
          )}

          {isCompletedExam && (
            <Badge
              variant="secondary"
              className="text-[10px] md:text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 ml-auto shrink-0 font-bengali px-2.5 py-0.5"
            >
              নম্বর: {completedExam.score ?? 0}
            </Badge>
          )}

          {item.is_public && !isEnrolled && !isCompletedExam && (
            <Badge
              variant="secondary"
              className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 ml-auto shrink-0 font-bengali"
            >
              ফ্রি প্রিভিউ
            </Badge>
          )}

          {!isAccessible && <Lock className="size-3 text-muted-foreground/40 shrink-0 ml-auto" />}
        </div>

        {/* Quick Action Buttons for Completed Exam */}
        {isAccessible && isCompletedExam && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pl-8.5 sm:pl-9.5">
            <Link
              to={`/courses/${course!.slug}/exams/${item.id}/solve`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 px-2.5 py-1 rounded-md transition-colors font-bengali"
            >
              <FileText className="size-3" />
              সমাধান ও ভুল/স্কিপ প্রাকটিস
            </Link>
            <Link
              to={`/courses/${course!.slug}/exams/${item.id}/leaderboard`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 px-2.5 py-1 rounded-md transition-colors font-bengali"
            >
              <Trophy className="size-3" />
              লিডারবোর্ড
            </Link>
            <Link
              to={`/courses/${course!.slug}/exams/${item.id}?retake=true`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 px-2.5 py-1 rounded-md transition-colors font-bengali"
            >
              <RotateCcw className="size-3" />
              আবার পরীক্ষা
            </Link>
            <Link
              to={`/courses/${course!.slug}/exams/${item.id}/custom`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 px-2.5 py-1 rounded-md transition-colors font-bengali"
            >
              <Sliders className="size-3" />
              কাস্টম পরীক্ষা
            </Link>
          </div>
        )}
      </div>
    );
  };

  // Parse structured details JSON if available
  const parsedDetails = (() => {
    if (!course?.details) return null;
    if (typeof course.details === "object") return course.details;
    try {
      return JSON.parse(course.details);
    } catch {
      return null;
    }
  })();

  // Extract description, features, faq
  const descriptionText =
    parsedDetails?.long_description ||
    (typeof course?.details === "string" ? course.details : null) ||
    course?.short_description ||
    "এই কোর্সটির সম্পর্কে এখনো বিস্তারিত বিবরণ যুক্ত করা হয়নি।";

  const featuresList: { title: string; description?: string; icon?: any; color?: string }[] =
    (() => {
      let titles: string[] = [];
      if (course?.features && Array.isArray(course.features) && course.features.length > 0) {
        titles = course.features;
      } else if (
        parsedDetails?.features &&
        Array.isArray(parsedDetails.features) &&
        parsedDetails.features.length > 0
      ) {
        titles = parsedDetails.features.map((f: any) =>
          typeof f === "string" ? f : f.title || "",
        );
      }

      if (titles.length > 0) {
        return titles.map((fTitle) => {
          const match = ALL_COURSE_FEATURES.find(
            (af) => af.title.trim().toLowerCase() === fTitle.trim().toLowerCase(),
          );
          if (match) return match;
          return {
            title: fTitle,
            description: "",
            icon: CheckCircle2,
            color: "text-primary",
          };
        });
      }

      return ALL_COURSE_FEATURES;
    })();

  const faqList: { question: string; answer: string }[] = (() => {
    if (parsedDetails?.faq && Array.isArray(parsedDetails.faq) && parsedDetails.faq.length > 0) {
      return parsedDetails.faq;
    }
    return STATIC_FAQS;
  })();

  // Category Badge Label
  const categoryLabel = (() => {
    if (!course) return "";
    if (parsedDetails?.category) return parsedDetails.category;
    if (course.category_ids && course.category_ids.length > 0 && categories) {
      const match = categories.find((c) => course.category_ids?.includes(c.id));
      if (match) return match.name;
    }
    return "ভার্সিটি প্রস্তুতি";
  })();

  // Pricing calculations
  const limitReached = !!course?.discount_max_limit && orderCount >= course.discount_max_limit;
  const isDiscounted =
    course?.price_discounted != null && course.price_discounted < course.price_regular && !limitReached;
  const currentPrice = isDiscounted ? course.price_discounted! : (course?.price_regular ?? 0);
  const isFree = currentPrice === 0;
  const remainingSlots = course?.discount_max_limit ? course.discount_max_limit - orderCount : 0;

  // Handle Enrollment
  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "লগইন করা প্রয়োজন",
        description: "কোর্সে ভর্তি হতে অনুগ্রহ করে আগে লগইন করুন।",
      });
      navigate("/login");
      return;
    }

    if (!course) return;

    if (isFree) {
      setEnrolling(true);
      const res = await enrollFreeCourse(course.id, user.uid);
      setEnrolling(false);

      if (res.success) {
        if (course.group_link) {
          setFreeEnrollSuccess(true);
        } else {
          toast({
            title: "🎉 অভিনন্দন!",
            description: "আপনি সফলভাবে কোর্সটিতে ভর্তি হয়েছেন।",
          });
          window.location.reload();
        }
      } else {
        toast({
          title: "❌ সমস্যা হয়েছে",
          description: res.message || "ভর্তি প্রক্রিয়ায় কোনো সমস্যা হয়েছে।",
          variant: "destructive",
        });
      }
    } else {
      // Paid course: create order then redirect to checkout
      setEnrolling(true);
      const result = await createOrder(user.uid, course.id, currentPrice);
      setEnrolling(false);

      if (result.success && result.orderId) {
        navigate(`/courses/${course.slug}/checkout/${result.orderId}`);
      } else {
        toast({
          title: "❌ সমস্যা হয়েছে",
          description: result.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে।",
          variant: "destructive",
        });
      }
    }
  };

  // Handle Share
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: course?.title || "Course Details",
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "🔗 লিংক কপি করা হয়েছে!",
        description: "কোর্সের লিংক ক্লিপবোর্ডে কপি করা হয়েছে।",
      });
    }
  };

  // Extract YouTube Video Embed ID
  const getYouTubeEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(course?.youtube_url);

  return (
    <>
      <Helmet>
        <title>
          {isLoading ? "লোড হচ্ছে..." : course ? `${course.title} | MNR Study` : "কোর্স পাওয়া যায়নি"}
        </title>
        {course?.short_description && (
          <meta name="description" content={course.short_description} />
        )}
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
        <Header />

        {/* Free enrollment success — show group link if available */}
        {freeEnrollSuccess && course?.group_link && (
          <main className="flex-1 flex items-center justify-center p-4">
            <GroupLinkConfirmation
              courseSlug={course.slug}
              groupLink={course.group_link}
              onDismiss={() => window.location.reload()}
            />
          </main>
        )}

        {!freeEnrollSuccess && (
        <main className="flex-1 w-full transition-all duration-300 ease-in-out relative">
          {isLoading ? (
            <CourseDetailsSkeleton />
          ) : isError || !course ? (
            <CourseNotFound slug={slug} />
          ) : (
            <div className="px-3 pt-6 sm:pt-8 pb-3 sm:px-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
              <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* ── Breadcrumb Navigation ── */}
                <div className="flex flex-col gap-4 mb-4 md:mb-6 mt-1 sm:mt-0">
                  <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1 md:gap-2 text-sm flex-wrap font-bengali"
                  >
                    <Link
                      to="/"
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-bold shrink-0 text-[13px]"
                    >
                      <Home className="size-3.5" />
                      <span>হোমপেজ</span>
                    </Link>

                    <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />

                    <Link
                      to="/courses"
                      className="text-muted-foreground hover:text-primary transition-colors font-bold text-[13px] truncate max-w-[120px] md:max-w-[200px]"
                    >
                      সকল কোর্স
                    </Link>

                    <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />

                    <span className="text-foreground font-black text-[13px] truncate max-w-[160px] md:max-w-[250px]">
                      {course.title}
                    </span>
                  </nav>
                </div>

                {/* ── Main Layout Grid ── */}
                <div className="w-full">
                  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 ${!isEnrolled ? "pb-40 lg:pb-0" : ""}`}>
                    {/* Left Column Details Area (lg:col-span-8) */}
                    <div className="lg:col-span-8 space-y-6 md:space-y-8">
                      <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 space-y-6 md:space-y-8 overflow-hidden relative shadow-xs">
                        {/* Cover Image / Video Section */}
                        <div className="space-y-4 md:space-y-6">
                          <div className="relative w-full aspect-video rounded-xl md:rounded-2xl overflow-hidden border border-border/50 bg-muted">
                            {youtubeEmbedUrl ? (
                              <iframe
                                src={youtubeEmbedUrl}
                                title={course.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : course.cover_url ? (
                              <img
                                src={course.cover_url}
                                alt={course.title}
                                className="w-full h-full object-cover object-center"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bengali">
                                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>

                          {/* Header Meta: Category Badge, Title & Share */}
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="inline-flex items-center bg-primary/10 text-primary font-black px-2.5 py-0.5 md:px-3 md:py-1 rounded-lg text-[9px] md:text-[10px] uppercase font-bengali">
                                {categoryLabel}
                              </div>
                              <button
                                onClick={handleShare}
                                className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-[10px] md:text-xs font-bold text-muted-foreground font-bengali"
                              >
                                <Share2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                <span>শেয়ার করুন</span>
                              </button>
                            </div>

                            <h1 className="text-xl md:text-2xl lg:text-4xl font-black leading-tight font-bengali gradient-text">
                              {course.title}
                            </h1>
                          </div>
                        </div>

                        {/* ── Course Description Section ── */}
                        <div className="pt-4 md:pt-6 border-t border-border/50">
                          <h3 className="font-black text-lg md:text-xl mb-3 md:mb-4 text-primary flex items-center gap-2 font-bengali">
                            <BookOpen className="h-4.5 w-4.5 md:h-5 md:w-5" />
                            কোর্সের বিবরণ
                          </h3>
                          {/<[a-z][\s\S]*>/i.test(descriptionText) ? (
                            <div
                              className="prose dark:prose-invert max-w-none font-bengali text-foreground/90 leading-relaxed text-sm md:text-base lg:text-lg prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5"
                              dangerouslySetInnerHTML={{ __html: descriptionText }}
                            />
                          ) : (
                            <div className="text-muted-foreground leading-relaxed text-sm md:text-base lg:text-lg space-y-3 md:space-y-4 font-bengali">
                              <div className="whitespace-pre-line">{descriptionText}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Course Curriculum Section ── */}
                      {curriculum.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden relative shadow-xs">
                          <div className="space-y-4 md:space-y-5">
                            <div className="flex items-center justify-between">
                              <h3 className="font-black text-lg md:text-xl text-primary flex items-center gap-2 font-bengali">
                                <LayoutList className="h-4.5 w-4.5 md:h-5 md:w-5" />
                                কোর্স কারিকুলাম
                              </h3>
                              <span className="text-[10px] md:text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg font-bengali">
                                {curriculum.length}টি সেকশন
                              </span>
                            </div>

                            <div className="space-y-2.5 md:space-y-3">
                              {curriculum.map((section, sIdx) => {
                                const isExpanded =
                                  expandedCurrSections[section.id] ?? section.is_open ?? false;
                                const totalItems =
                                  section.items.length +
                                  section.subsections.reduce(
                                    (acc: number, sub: any) => acc + sub.items.length,
                                    0,
                                  );

                                return (
                                  <div
                                    key={section.id}
                                    className="border border-border/60 rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300"
                                  >
                                    {/* Section Header */}
                                    <button
                                      onClick={() =>
                                        setExpandedCurrSections((prev) => ({
                                          ...prev,
                                          [section.id]: !isExpanded,
                                        }))
                                      }
                                      className="flex items-center justify-between w-full p-3 md:p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="min-w-0">
                                          <h4 className="font-bold text-[13px] md:text-sm text-foreground leading-tight truncate font-bengali">
                                            {section.title}
                                          </h4>
                                          {totalItems > 0 && (
                                            <p className="text-[10px] md:text-[11px] text-muted-foreground font-medium mt-0.5 font-bengali">
                                              {totalItems}টি কন্টেন্ট
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <ChevronDown
                                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                    </button>

                                    {/* Section Content */}
                                    {isExpanded && (
                                      <div className="p-3 md:p-4 pt-0 space-y-2 bg-background/50">
                                        {/* Direct section items */}
                                        {section.items.length > 0 && (
                                          <div className="space-y-1.5 pt-2 md:pt-3">
                                            {section.items.map(renderCurriculumItem)}
                                          </div>
                                        )}

                                        {/* Subsections */}
                                        {section.subsections.map((sub: any) => {
                                          const isSubExpanded =
                                            expandedSubsections[sub.id] ?? sub.is_open ?? false;

                                          return (
                                            <div
                                              key={sub.id}
                                              className="ml-2 md:ml-3 border-l-2 border-primary/15 pl-3 md:pl-4 py-1.5 space-y-1.5"
                                            >
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setExpandedSubsections((prev) => ({
                                                    ...prev,
                                                    [sub.id]: !isSubExpanded,
                                                  }))
                                                }
                                                className="flex items-center justify-between w-full text-left cursor-pointer group py-1"
                                              >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                  <div className="size-2 rounded-full bg-primary/40 shrink-0"></div>
                                                  <h5 className="text-xs md:text-[13px] font-bold text-foreground/70 font-bengali group-hover:text-primary transition-colors truncate">
                                                    {sub.title}
                                                  </h5>
                                                  {sub.items?.length > 0 && (
                                                    <span className="text-[10px] text-muted-foreground font-medium font-bengali shrink-0">
                                                      ({sub.items.length})
                                                    </span>
                                                  )}
                                                </div>
                                                <ChevronDown
                                                  className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isSubExpanded ? "rotate-180" : ""}`}
                                                />
                                              </button>

                                              {isSubExpanded &&
                                                sub.items &&
                                                sub.items.length > 0 && (
                                                  <div className="space-y-1.5 pt-1">
                                                    {sub.items.map((item: any) => {
                                                      const isAccessible =
                                                        isEnrolled || !!item.is_public;
                                                      const typeMap: Record<string, string> = { exam: "exams", class: "classes" };
                                                      const ItemWrapper = isAccessible
                                                        ? Link
                                                        : "div";
                                                      const itemProps = isAccessible
                                                        ? {
                                                            to: `/courses/${course!.slug}/${typeMap[item.item_type] || item.item_type}/${item.id}`,
                                                            className:
                                                              "flex items-center gap-2.5 p-2 md:p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group",
                                                          }
                                                        : {
                                                            className:
                                                              "flex items-center gap-2.5 p-2 md:p-2.5 rounded-lg hover:bg-muted/40 transition-colors",
                                                          };

                                                      return (
                                                        <ItemWrapper
                                                          key={item.id}
                                                          {...(itemProps as any)}
                                                        >
                                                          <div className="size-6 md:size-7 rounded-md bg-background border flex items-center justify-center shrink-0">
                                                            {item.item_type === "class" && (
                                                              <Video className="size-3 md:size-3.5 text-red-500" />
                                                            )}
                                                            {item.item_type === "exam" && (
                                                              <ClipboardList className="size-3 md:size-3.5 text-green-500" />
                                                            )}
                                                            {item.item_type === "instruction" && (
                                                              <FileText className="size-3 md:size-3.5 text-blue-500" />
                                                            )}
                                                            {item.item_type === "assignment" && (
                                                              <BookOpen className="size-3 md:size-3.5 text-orange-500" />
                                                            )}
                                                            {item.item_type === "file" && (
                                                              <FileArchive className="size-3 md:size-3.5 text-cyan-500" />
                                                            )}
                                                          </div>
                                                          <span className="text-xs md:text-sm text-foreground/80 font-medium break-words whitespace-normal font-bengali group-hover:text-primary transition-colors flex-1">
                                                            {item.title}
                                                          </span>
                                                          {item.is_public && !isEnrolled && (
                                                            <Badge
                                                              variant="secondary"
                                                              className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 ml-auto shrink-0 font-bengali"
                                                            >
                                                              ফ্রি প্রিভিউ
                                                            </Badge>
                                                          )}
                                                          {!isAccessible && (
                                                            <Lock className="size-3 text-muted-foreground/40 shrink-0 ml-auto" />
                                                          )}
                                                        </ItemWrapper>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Central Merit List (Enrolled Only — mobile) ── */}
                      {isEnrolled && course?.id && (
                        <div className="lg:hidden">
                          <CentralMerit courseId={course.id} currentUserId={user?.uid} />
                        </div>
                      )}

                      {/* ── Course Features Section (Accordions) ── */}
                      {!isEnrolled && featuresList.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden relative shadow-xs">
                          <div className="space-y-3 md:space-y-4">
                            <h3 className="font-black text-lg md:text-xl text-primary flex items-center gap-2 font-bengali">
                              <CheckCircle2 className="h-4.5 w-4.5 md:h-5 md:w-5" />
                              কোর্সের বিশেষত্ব
                            </h3>

                            <Accordion
                              type="single"
                              collapsible
                              className="w-full space-y-2 md:space-y-3 font-bengali"
                            >
                              {featuresList.map((feature, idx) => {
                                const IconComponent =
                                  feature.icon || FEATURE_ICONS[idx % FEATURE_ICONS.length];
                                return (
                                  <AccordionItem
                                    key={idx}
                                    value={`feature-${idx}`}
                                    className="border-none not-last:border-b"
                                  >
                                    <AccordionTrigger className="group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent text-left text-sm font-medium outline-hidden hover:no-underline p-2.5 md:p-4 bg-muted/30 rounded-xl md:rounded-2xl transition-all duration-300 data-[state=open]:bg-card">
                                      <div className="flex gap-3 md:gap-4 items-center">
                                        <div className="size-7 md:size-8 rounded-lg md:rounded-xl bg-background border flex items-center justify-center shrink-0 transition-all duration-300 group-data-[state=open]/accordion-trigger:scale-110">
                                          <IconComponent
                                            className={`size-3.5 md:size-4 ${feature.color || "text-primary"}`}
                                          />
                                        </div>
                                        <div className="font-bold text-[13px] md:text-sm text-foreground text-left leading-tight group-hover/accordion-trigger:text-primary transition-colors">
                                          {feature.title}
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    {feature.description && (
                                      <AccordionContent className="p-4 pt-2 text-muted-foreground text-xs md:text-sm leading-relaxed whitespace-pre-line">
                                        {feature.description}
                                      </AccordionContent>
                                    )}
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          </div>
                        </div>
                      )}

                      {/* ── FAQ Section (Accordions) ── */}
                      {!isEnrolled && faqList.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden relative shadow-xs">
                          <div className="space-y-3 md:space-y-4">
                            <h3 className="font-black text-lg md:text-xl text-primary flex items-center gap-2 font-bengali">
                              <HelpCircle className="h-4.5 w-4.5 md:h-5 md:w-5" />
                              সাধারণ জিজ্ঞাসা (FAQ)
                            </h3>

                            <Accordion
                              type="single"
                              collapsible
                              className="w-full space-y-2 md:space-y-3 font-bengali"
                            >
                              {faqList.map((item, idx) => (
                                <AccordionItem
                                  key={idx}
                                  value={`faq-${idx}`}
                                  className="border-none not-last:border-b"
                                >
                                  <AccordionTrigger className="group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent text-left text-sm font-medium outline-hidden hover:no-underline p-2.5 md:p-4 bg-muted/30 rounded-xl md:rounded-2xl transition-all duration-300 data-[state=open]:bg-card">
                                    <div className="flex gap-3 md:gap-4 items-center">
                                      <div className="size-7 md:size-8 rounded-lg md:rounded-xl bg-background border flex items-center justify-center shrink-0 transition-all duration-300 group-data-[state=open]/accordion-trigger:scale-110">
                                        <HelpCircle className="size-3.5 md:size-4 text-blue-500" />
                                      </div>
                                      <div className="font-bold text-[13px] md:text-sm text-foreground text-left leading-tight group-hover/accordion-trigger:text-primary transition-colors">
                                        {item.question}
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-4 pt-2 text-muted-foreground text-xs md:text-sm leading-relaxed">
                                    <div
                                      className="prose dark:prose-invert max-w-none text-xs md:text-sm text-muted-foreground leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1"
                                      dangerouslySetInnerHTML={{ __html: item.answer }}
                                    />
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column Sticky Sidebar (lg:col-span-4) */}
                    <div className="lg:col-span-4">
                      {!isEnrolled && (
                      <div className="relative lg:sticky lg:top-24 overflow-hidden border border-border bg-card rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
                        {/* Price Header */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline gap-2 font-bengali">
                            <span className="text-4xl md:text-5xl font-black text-foreground">
                              {isFree ? "ফ্রি" : `৳${currentPrice}`}
                            </span>
                            {isDiscounted && (
                              <span className="text-lg md:text-xl text-muted-foreground line-through font-bold opacity-40">
                                ৳{course.price_regular}
                              </span>
                            )}
                          </div>
                          {isDiscounted && course.discount_max_limit && remainingSlots > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 w-fit font-bengali">
                              ডিসকাউন্ট বাকি আছে {remainingSlots} জন
                            </span>
                          )}
                        </div>

                        {/* Desktop Actions */}
                        <div className="flex flex-col gap-3">
                          {isEnrolled ? (
                            <Button
                              size="lg"
                              disabled
                              className="w-full font-black text-lg h-16 rounded-2xl bg-muted text-muted-foreground cursor-not-allowed font-bengali gap-3 border border-border"
                            >
                              <CheckCircle className="h-6 w-6 text-green-500" />
                              আপনি এনরোল্ড আছেন
                            </Button>
                          ) : hasPendingWithPhone ? (
                            <Button
                              size="lg"
                              disabled
                              className="w-full font-black text-lg h-16 rounded-2xl bg-yellow-50 text-yellow-700 cursor-not-allowed font-bengali gap-3 border border-yellow-200"
                            >
                              <Clock className="h-6 w-6" />
                              পেমেন্ট পেন্ডিং
                            </Button>
                          ) : (
                            <Button
                              size="lg"
                              onClick={handleEnroll}
                              disabled={enrolling}
                              className="w-full font-black text-lg h-16 rounded-2xl shadow-lg shadow-primary/10 hover:shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground transition-all cursor-pointer font-bengali gap-3"
                            >
                              {enrolling ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                              ) : (
                                <CreditCard className="h-6 w-6" />
                              )}
                              {isFree ? "এখনই ফ্রি ভর্তি হন" : "এখনই এনরোল করুন"}
                            </Button>
                          )}

                          {course.routine_url && (
                            <a
                              href={course.routine_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full block"
                            >
                              <Button
                                variant="outline"
                                className="w-full h-14 md:h-16 text-base md:text-lg font-bold rounded-2xl font-bengali border-primary/20 hover:bg-primary/5 text-primary gap-2"
                              >
                                <Download className="h-5 w-5" />
                                রুটিন ডাউনলোড করুন
                              </Button>
                            </a>
                          )}
                        </div>

                        {/* WhatsApp Support Box */}
                        <a
                          href={`https://wa.me/8801306769336?text=${encodeURIComponent(
                            `আসসালামু আলাইকুম। আমি আপনাদের ${course.title} কোর্সটিতে এনরোল করতে আগ্রহী। কোর্স লিংক: ${window.location.href}`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 p-5 rounded-2xl bg-[#25D366]/5 border border-[#25D366]/20 text-center flex flex-col items-center gap-2 hover:bg-[#25D366]/10 transition-all group font-bengali"
                        >
                          <div className="flex items-center gap-2">
                            <MessageCircle className="size-5 text-[#25D366] group-hover:scale-110 transition-transform" />
                            <span className="text-[#25D366] font-black text-sm">
                              হোয়াটসঅ্যাপে মেসেজ দিন
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-muted-foreground leading-relaxed">
                            পেমেন্ট সংক্রান্ত যেকোনো সহায়তায় <br />
                            <span className="text-foreground font-black text-sm mt-1 block">
                              +৮৮০ ১৩০৬-৭৬৯৩৩৬
                            </span>
                          </p>
                        </a>
                      </div>
                      )}

                      {/* ── Central Merit List (Enrolled Only — desktop) ── */}
                      {isEnrolled && course?.id && (
                        <div className="hidden lg:block">
                          <CentralMerit courseId={course.id} currentUserId={user?.uid} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Fixed Mobile Bottom Bar (lg:hidden) ── */}
                {!isEnrolled && (
                  <div className="fixed bottom-[68px] md:bottom-0 left-0 right-0 p-4 mb-0 bg-background/80 backdrop-blur-xl border-t border-border z-[70] lg:hidden flex items-center justify-between gap-4 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-full duration-500 font-bengali">
                    <div className="flex flex-col">
                      {isDiscounted && (
                        <span className="text-[10px] text-destructive line-through font-bold opacity-50">
                          ৳{course.price_regular}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary leading-tight">
                          {isFree ? "ফ্রি" : `৳${currentPrice}`}
                        </span>
                        {course.validity_days && (
                          <span className="text-[10px] font-bold text-primary opacity-70">
                            / {course.validity_days} দিন
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 gap-2">
                      {course.routine_url && (
                        <a href={course.routine_url} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-xl border-primary/20 text-primary hover:bg-primary/10 shrink-0"
                            title="রুটিন ডাউনলোড করুন"
                          >
                            <Download className="h-5 w-5" />
                          </Button>
                        </a>
                      )}

                      {isEnrolled ? (
                        <Button
                          disabled
                          className="flex-1 h-12 rounded-xl text-base font-black bg-muted text-muted-foreground cursor-not-allowed font-bengali gap-2 border border-border"
                        >
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          এনরোল্ড
                        </Button>
                      ) : hasPendingWithPhone ? (
                        <Button
                          disabled
                          className="flex-1 h-12 rounded-xl text-base font-black bg-yellow-50 text-yellow-700 cursor-not-allowed font-bengali gap-2 border border-yellow-200"
                        >
                          <Clock className="h-5 w-5" />
                          পেমেন্ট পেন্ডিং
                        </Button>
                      ) : (
                        <Button
                          onClick={handleEnroll}
                          disabled={enrolling}
                          className="flex-1 h-12 rounded-xl text-base font-black shadow-lg shadow-primary/10 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:scale-95 transition-all font-bengali"
                        >
                          {enrolling ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : isFree ? (
                            "ফ্রি ভর্তি হন"
                          ) : (
                            "ভর্তি হন"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
        )}

        <Footer />
      </div>
    </>
  );
}
