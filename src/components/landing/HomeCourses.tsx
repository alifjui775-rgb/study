import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicCourses,
  getCourseBatches,
  getCourseCategories,
  getUserEnrollmentsList,
  getAllCourseOrderCounts,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import type { Course } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Loader2, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { enrollFreeCourse, createOrder } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export function HomeCourses() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEnrollFree = async (courseId: string, courseSlug: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setEnrollingCourseId(courseId);
    const result = await enrollFreeCourse(courseId, user.uid);
    setEnrollingCourseId(null);
    if (result.success) {
      navigate(`/courses/${courseSlug}`);
    } else {
      alert(result.message || "ভর্তি হতে সমস্যা হয়েছে।");
    }
  };

  const handleEnrollPaid = async (course: Course) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setEnrollingCourseId(course.id);
    const orderCount = orderCounts[course.id] || 0;
    const limitReached = !!course.discount_max_limit && orderCount >= course.discount_max_limit;
    const isDiscounted =
      course.price_discounted != null && course.price_discounted < course.price_regular && !limitReached;
    const currentPrice = isDiscounted ? course.price_discounted! : course.price_regular;
    const result = await createOrder(user.uid, course.id, currentPrice);
    setEnrollingCourseId(null);
    if (result.success && result.orderId) {
      navigate(`/courses/${course.slug}/checkout/${result.orderId}`);
    } else {
      toast({
        title: "❌ সমস্যা হয়েছে",
        description: result.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  const { data: courses, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["public-courses"],
    queryFn: getPublicCourses,
  });

  const { data: batches, isLoading: isBatchesLoading } = useQuery({
    queryKey: ["course-batches"],
    queryFn: getCourseBatches,
  });

  const { data: userEnrollments, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ["user-enrollments", user?.uid],
    queryFn: () => getUserEnrollmentsList(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: userPendingOrders = [] } = useQuery({
    queryKey: ["user-pending-orders", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const { data } = await supabase
        .from("orders")
        .select("course_id, phone_number")
        .eq("user_id", user.uid)
        .in("status", ["pending", "approved"])
        .is("deleted_at", null);
      return data || [];
    },
    enabled: !!user?.uid,
  });

  const pendingOrderMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    userPendingOrders.forEach((o) => {
      map[o.course_id] = !!(o.phone_number && o.phone_number.trim());
    });
    return map;
  }, [userPendingOrders]);

  const { data: orderCounts = {} } = useQuery({
    queryKey: ["course-order-counts"],
    queryFn: getAllCourseOrderCounts,
  });

  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["course-categories"],
    queryFn: getCourseCategories,
  });

  const isLoading = isCoursesLoading || isBatchesLoading || isCategoriesLoading;

  // Create unified filter options from categories and batches
  const filterOptions = useMemo(() => {
    const options = [{ id: "all", name: "সবগুলো" }];

    if (categories) {
      categories.forEach((cat) => {
        options.push({ id: `cat_${cat.id}`, name: cat.name });
      });
    }

    if (batches) {
      const currentBatch = batches.find((b) => b.is_current);
      let targetYears: number[] = [];

      if (currentBatch && currentBatch.year) {
        targetYears = [currentBatch.year, currentBatch.year - 1, currentBatch.year - 2];
      }

      batches.forEach((batch) => {
        // If currentBatch is found, only include batches whose year is in targetYears
        if (!currentBatch || (batch.year && targetYears.includes(batch.year))) {
          options.push({ id: `batch_${batch.id}`, name: batch.name });
        }
      });
    }

    return options;
  }, [categories, batches]);

  // Filter courses based on active tab
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    if (activeFilter === "all") {
      return courses as Course[];
    }

    const isCategory = activeFilter.startsWith("cat_");
    const filterId = activeFilter.replace("cat_", "").replace("batch_", "");

    return (courses as Course[]).filter((course) => {
      if (isCategory) {
        return course.category_ids?.includes(filterId);
      } else {
        return course.batch_ids?.includes(filterId);
      }
    });
  }, [courses, activeFilter]);

  if (!isLoading && (!courses || courses.length === 0)) {
    return null;
  }

  const CourseCard = ({ course }: { course: Course }) => {
    const orderCount = orderCounts[course.id] || 0;
    const limitReached = !!course.discount_max_limit && orderCount >= course.discount_max_limit;
    const isDiscounted =
      course.price_discounted != null && course.price_discounted < course.price_regular && !limitReached;
    const isFree = course.price_regular === 0 || course.price_discounted === 0;
    const isEnrolled = userEnrollments?.includes(course.id);
    const phoneFilled = pendingOrderMap[course.id];
    const remainingSlots = course.discount_max_limit ? course.discount_max_limit - orderCount : 0;

    return (
      <div className="group relative flex flex-col justify-between bg-card hover:bg-card/80 border border-border rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
        <div className="w-full aspect-video relative">
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-accent/50 font-bengali text-sm">
              কোন ছবি নেই
            </div>
          )}
        </div>
        <div className="flex-1 p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-lg font-bold mb-2 leading-tight">{course.title}</h3>
            </div>
            <p className="text-muted-foreground text-xs mb-4 line-clamp-3">
              {course.short_description || "এই কোর্সটির সম্পর্কে এখনো বিস্তারিত কিছু বলা হয়নি।"}
            </p>

            {course.features && course.features.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {course.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-500" /> {feature}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-dashed">
            <div className="flex flex-col items-start gap-1">
              {isDiscounted ? (
                <>
                  <span className="text-[10px] text-muted-foreground line-through">
                    ৳{course.price_regular}
                  </span>
                  <div className="text-base font-bold text-primary">৳{course.price_discounted}</div>
                </>
              ) : (
                <div className="text-base font-bold text-primary">
                  {course.price_regular === 0 ? "Free" : `৳${course.price_regular}`}
                </div>
              )}
              {isDiscounted && course.discount_max_limit && remainingSlots > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                  বাকি আছে {remainingSlots} জন
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {isEnrolled ? (
                <Link
                  to={`/courses/${course.slug}`}
                  className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[25px] h-8 px-2 text-xs border-transparent font-bengali"
                >
                  কোর্সে প্রবেশ করুন
                </Link>
              ) : (
                <>
                  <Link
                    to={`/courses/${course.slug}`}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-[25px] h-8 px-2 text-xs"
                  >
                    বিস্তারিত
                  </Link>
                  {course.price_discounted === 0 ||
                  (course.price_discounted == null && course.price_regular === 0) ? (
                    <button
                      onClick={() => handleEnrollFree(course.id, course.slug)}
                      disabled={enrollingCourseId === course.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[25px] h-8 px-2 text-xs border-transparent cursor-pointer"
                    >
                      {enrollingCourseId === course.id ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        "ভর্তি হন"
                      )}
                    </button>
                   ) : phoneFilled ? (
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap border-[3px] font-medium rounded-[25px] h-8 px-2 text-xs border-yellow-200 bg-yellow-50 text-yellow-700 font-bengali cursor-not-allowed">
                      <Clock className="h-3 w-3" />
                      পেমেন্ট পেন্ডিং
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEnrollPaid(course)}
                      disabled={enrollingCourseId === course.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[25px] h-8 px-2 text-xs border-transparent cursor-pointer"
                    >
                      {enrollingCourseId === course.id ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        "ভর্তি হন"
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="w-full mt-24 mb-16 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold font-bengali">
            আমাদের <span className="text-primary">কোর্সসমূহ</span>
          </h2>
          <p className="text-muted-foreground mt-3 font-bengali max-w-2xl mx-auto text-sm sm:text-base mb-8">
            আপনার সেরা প্রস্তুতির জন্য যুক্ত হোন আমাদের কোর্সগুলোতে
          </p>
        </div>

        {/* Tab Filters */}
        {!isLoading && filterOptions.length > 1 && (
          <div className="flex justify-center mb-12">
            <Tabs
              value={activeFilter}
              onValueChange={setActiveFilter}
              className="w-full flex justify-center"
            >
              <TabsList className="h-auto p-1 bg-muted rounded-xl flex-wrap justify-center max-w-full">
                {filterOptions.map((option) => (
                  <TabsTrigger
                    key={option.id}
                    value={option.id}
                    className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                  >
                    {option.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl overflow-hidden shadow-sm border border-border">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-6">
                  <Skeleton className="h-7 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : filteredCourses.length > 0 ? (
            filteredCourses.map((course) => <CourseCard key={course.id} course={course} />)
          ) : (
            <div className="col-span-full py-20 text-muted-foreground font-bengali text-center bg-accent/20 rounded-2xl border border-dashed border-border">
              <p className="text-xl font-semibold mb-2">কোনো কোর্স পাওয়া যায়নি</p>
              <p className="text-sm">দয়া করে অন্য কোনো ট্যাব নির্বাচন করুন।</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
