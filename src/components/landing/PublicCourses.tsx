import { useState, useMemo, useEffect } from "react";
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
import { Filter, Check, Loader2, X, ArrowUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { enrollFreeCourse, createOrder } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

export function PublicCourses({ hideHeader = false }: { hideHeader?: boolean }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  if (!isLoading && (!courses || courses.length === 0)) {
    return null;
  }

  const toggleItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  // Filter batches based on 3-year logic (current batch year + previous 2 years)
  const filteredBatches = useMemo(() => {
    if (!batches) return [];

    const currentBatch = batches.find((b) => b.is_current);
    let targetYears: number[] = [];

    if (currentBatch && currentBatch.year) {
      targetYears = [currentBatch.year, currentBatch.year - 1, currentBatch.year - 2];
    }

    return batches.filter((batch) => {
      if (!currentBatch || (batch.year && targetYears.includes(batch.year))) {
        return true;
      }
      return false;
    });
  }, [batches]);

  // Filter courses based on selections
  const filteredCourses =
    (courses as Course[])?.filter((course) => {
      const matchCat =
        selectedCategories.length === 0 ||
        (course.category_ids && course.category_ids.some((id) => selectedCategories.includes(id)));
      const matchBatch =
        selectedBatches.length === 0 ||
        (course.batch_ids && course.batch_ids.some((id) => selectedBatches.includes(id)));
      const isFree = course.price_regular === 0 || course.price_discounted === 0;
      const matchPrice =
        selectedPrices.length === 0 ||
        (selectedPrices.includes("free") && isFree) ||
        (selectedPrices.includes("paid") && !isFree);

      return matchCat && matchBatch && matchPrice;
    }) || [];

  const FilterContentUI = () => (
    <div className="space-y-8 font-bengali">
      <div>
        <h4 className="font-semibold mb-4 text-lg border-b pb-2">ক্যাটাগরি</h4>
        <div className="space-y-3">
          {categories?.map((cat) => (
            <div key={cat.id} className="flex items-center space-x-3">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => toggleItem(setSelectedCategories, cat.id)}
              />
              <label
                htmlFor={`cat-${cat.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {cat.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-4 text-lg border-b pb-2">ব্যাচ</h4>
        <div className="space-y-3">
          {filteredBatches?.map((batch) => (
            <div key={batch.id} className="flex items-center space-x-3">
              <Checkbox
                id={`batch-${batch.id}`}
                checked={selectedBatches.includes(batch.id)}
                onCheckedChange={() => toggleItem(setSelectedBatches, batch.id)}
              />
              <label
                htmlFor={`batch-${batch.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {batch.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-4 text-lg border-b pb-2">কোর্সের ধরন</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="price-free"
              checked={selectedPrices.includes("free")}
              onCheckedChange={() => toggleItem(setSelectedPrices, "free")}
            />
            <label
              htmlFor="price-free"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              ফ্রি কোর্স
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="price-paid"
              checked={selectedPrices.includes("paid")}
              onCheckedChange={() => toggleItem(setSelectedPrices, "paid")}
            />
            <label
              htmlFor="price-paid"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              পেইড কোর্স
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const CourseCard = ({ course }: { course: Course }) => {
    const isEnrolled = userEnrollments?.includes(course.id);
    const phoneFilled = pendingOrderMap[course.id];
    const orderCount = orderCounts[course.id] || 0;
    const limitReached = !!course.discount_max_limit && orderCount >= course.discount_max_limit;
    const isDiscounted =
      course.price_discounted != null && course.price_discounted < course.price_regular && !limitReached;
    const remainingSlots = course.discount_max_limit ? course.discount_max_limit - orderCount : 0;

    return (
      <div className="group relative flex flex-col justify-between bg-card hover:bg-card/80 border border-border rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 font-bengali">
        <div className="w-full aspect-video relative">
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground bg-accent/50 text-sm">
              কোন ছবি নেই
            </div>
          )}
        </div>
        <div className="flex-1 p-5 flex flex-col justify-between gap-4 text-left">
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
                    <Check className="h-3 w-3 text-green-500 shrink-0" />{" "}
                    <span className="line-clamp-1">{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-dashed">
            <div className="flex flex-col items-start font-sans gap-1">
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
                  className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[25px] h-8 px-3 text-xs border-transparent font-bengali"
                >
                  কোর্সে প্রবেশ করুন
                </Link>
              ) : (
                <>
                  <Link
                    to={`/courses/${course.slug}`}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-[25px] h-8 px-3 text-xs font-bengali"
                  >
                    বিস্তারিত
                  </Link>
                  {course.price_discounted === 0 ||
                  (course.price_discounted == null && course.price_regular === 0) ? (
                    <button
                      onClick={() => handleEnrollFree(course.id, course.slug)}
                      disabled={enrollingCourseId === course.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[25px] h-8 px-3 text-xs border-transparent cursor-pointer font-bengali"
                    >
                      {enrollingCourseId === course.id ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        "ভর্তি হন"
                      )}
                    </button>
                    ) : phoneFilled ? (
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap border-[3px] font-medium rounded-[25px] h-8 px-3 text-xs border-yellow-200 bg-yellow-50 text-yellow-700 font-bengali cursor-not-allowed">
                      <Clock className="h-3 w-3" />
                      পেমেন্ট পেন্ডিং
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEnrollPaid(course)}
                      disabled={enrollingCourseId === course.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[25px] h-8 px-3 text-xs border-transparent cursor-pointer font-bengali"
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
    <>
      <section className={`w-full ${hideHeader ? "mt-4" : "mt-24"} mb-16 px-4 sm:px-8`}>
        <div className="max-w-7xl mx-auto">
          {!hideHeader && (
            <div className="text-center mb-10 font-bengali">
              <h2 className="text-3xl font-bold">
                আমাদের <span className="text-primary">কোর্সসমূহ</span>
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base mb-8">
                আপনার সেরা প্রস্তুতির জন্য যুক্ত হোন আমাদের কোর্সগুলোতে
              </p>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Mobile Filter Button */}
            <div className="lg:hidden w-full flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground font-bengali">
                মোট {filteredCourses.length} টি কোর্স
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="font-bengali">
                    <Filter className="mr-2 h-4 w-4" /> ফিল্টার করুন
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="overflow-y-auto w-[85%] sm:w-[350px]">
                  <SheetHeader className="mb-6 text-left">
                    <SheetTitle className="font-bengali text-xl flex items-center gap-2">
                      <Filter className="h-5 w-5" /> ফিল্টার
                    </SheetTitle>
                  </SheetHeader>
                  <FilterContentUI />
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filter Sidebar */}
            <div className="hidden lg:block w-64 shrink-0 sticky top-24 bg-card p-6 rounded-3xl shadow-xs border border-border">
              <div className="flex items-center gap-2 mb-6 text-lg font-bold font-bengali">
                <Filter className="h-5 w-5 text-primary" /> ফিল্টার করুন
              </div>
              <FilterContentUI />
            </div>

            {/* Courses Grid */}
            <div className="flex-1 w-full">
              <div className="hidden lg:block text-sm text-muted-foreground font-bengali mb-6 text-right">
                মোট {filteredCourses.length} টি কোর্স পাওয়া গেছে
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card
                      key={i}
                      className="rounded-[32px] overflow-hidden shadow-xs border border-border"
                    >
                      <Skeleton className="h-48 w-full rounded-none" />
                      <CardContent className="p-6 space-y-3">
                        <Skeleton className="h-7 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))
                ) : filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => <CourseCard key={course.id} course={course} />)
                ) : (
                  <div className="col-span-full py-20 text-muted-foreground font-bengali text-center bg-accent/20 rounded-3xl border border-dashed border-border">
                    <p className="text-xl font-semibold mb-2">কোনো কোর্স পাওয়া যায়নি</p>
                    <p className="text-sm">দয়া করে অন্য কোনো ফিল্টার নির্বাচন করুন।</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Progressive Floating Dock (Filter + Back to Top) ── */}
      <div
        className={`fixed bottom-20 right-3 md:bottom-8 md:right-8 z-[60] flex flex-col md:flex-row items-center rounded-full transition-all duration-500 ease-out ${
          isScrolled
            ? "bg-background/95 backdrop-blur-md border border-border shadow-xl p-1.5 md:p-2"
            : "bg-transparent border-transparent shadow-none p-0"
        }`}
      >
        {/* Animated Section (Up on mobile, Left on desktop) */}
        <div
          className={`flex flex-col md:flex-row items-center overflow-hidden transition-all duration-500 ease-out origin-bottom md:origin-right ${
            isScrolled
              ? "opacity-100 scale-100 max-h-[100px] md:max-w-[150px] mb-1.5 md:mb-0 md:mr-2"
              : "opacity-0 scale-50 max-h-0 md:max-h-[100px] max-w-[150px] md:max-w-0 pointer-events-none mb-0 md:mr-0"
          }`}
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all bg-primary/10 text-primary hover:bg-primary/20"
            aria-label="Back to top"
          >
            <ArrowUp className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </button>

          <div className="shrink-0 bg-border w-[22px] h-[1px] mt-1.5 md:w-[1px] md:h-6 md:mt-0 md:ml-2" />
        </div>

        {/* Primary Filter Button (Always Visible) */}
        <Popover open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-500 bg-primary text-primary-foreground hover:bg-background hover:border hover:border-primary hover:text-primary ${
                isScrolled
                  ? "w-9 h-9 md:w-10 md:h-10 shadow-sm"
                  : "w-12 h-12 md:w-14 md:h-14 shadow-xl"
              } ${filterMenuOpen ? "bg-primary/90" : ""}`}
              title="ফিল্টার"
              aria-label="ফিল্টার"
            >
              {filterMenuOpen ? (
                <X
                  className={`transition-all duration-500 ${
                    isScrolled ? "w-[18px] h-[18px] md:w-5 md:h-5" : "w-6 h-6"
                  }`}
                />
              ) : (
                <Filter
                  className={`transition-all duration-500 ${
                    isScrolled ? "w-[18px] h-[18px] md:w-5 md:h-5" : "w-6 h-6"
                  }`}
                />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={12}
            avoidCollisions={true}
            collisionPadding={16}
            className="w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-xs z-[100] max-h-[65vh] md:max-h-[70vh] overflow-y-auto overscroll-contain shadow-2xl rounded-2xl p-4 font-bengali"
          >
            <FilterContentUI />
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
