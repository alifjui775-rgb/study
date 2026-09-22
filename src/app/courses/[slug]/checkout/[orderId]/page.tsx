import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCourseBySlug, getCourseOrderCount } from "@/lib/queries";
import { updateOrderPayment } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  CreditCard,
  Loader2,
  CheckCircle,
  Copy,
  Check,
  ShoppingCart,
  Package,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { GroupLinkConfirmation } from "@/components/GroupLinkConfirmation";
import type { Database } from "@/lib/database.types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  brandName: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  subImage: string;
  ussdCode: string;
  personalNumber: string;
}[] = [
  {
    value: "bkash",
    label: "বিকাশ",
    brandName: "bKash",
    icon: "/icon/bkash.svg",
    color: "text-pink-600",
    borderColor: "border-pink-600",
    bgColor: "bg-pink-600",
    subImage: "/images/bkash-smd.webp",
    ussdCode: "*247#",
    personalNumber: "01306769336",
  },
  {
    value: "nagad",
    label: "নগদ",
    brandName: "Nagad",
    icon: "/icon/nagad.svg",
    color: "text-orange-600",
    borderColor: "border-orange-600",
    bgColor: "bg-orange-600",
    subImage: "/images/nagad-smd.webp",
    ussdCode: "*167#",
    personalNumber: "01306769336",
  },
  {
    value: "rocket",
    label: "রকেট",
    brandName: "Rocket",
    icon: "/icon/rocket.svg",
    color: "text-[#89288F]",
    borderColor: "border-[#89288F]",
    bgColor: "bg-[#89288F]",
    subImage: "/images/rocket-smd.webp",
    ussdCode: "*322#",
    personalNumber: "013067693360",
  },
];

const STEPS = [
  { id: 1, label: "কোর্স সামারি", icon: ShoppingCart },
  { id: 2, label: "পেমেন্ট", icon: CreditCard },
  { id: 3, label: "সম্পন্ন", icon: Package },
];

export default function CheckoutPage() {
  const { slug = "", orderId = "" } = useParams<{ slug: string; orderId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Fetch course
  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course-details", slug],
    queryFn: () => getCourseBySlug(slug),
    enabled: !!slug,
  });

  // Fetch order
  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch order count for discount limit check
  const { data: orderCount = 0 } = useQuery({
    queryKey: ["course-order-count", course?.id],
    queryFn: () => getCourseOrderCount(course!.id),
    enabled: !!course?.id,
  });

  // Pricing
  const limitReached = !!course?.discount_max_limit && orderCount >= course.discount_max_limit;
  const isDiscounted =
    course?.price_discounted != null && course.price_discounted < course.price_regular && !limitReached;
  const currentPrice = isDiscounted ? course.price_discounted! : (course?.price_regular ?? 0);
  const discountPercent = isDiscounted
    ? Math.round(((course.price_regular - course.price_discounted!) / course.price_regular) * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast({
        title: "সেন্ডার নম্বর দিন",
        description: "যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বর লিখুন।",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const result = await updateOrderPayment(orderId, paymentMethod, phoneNumber.trim());
    setSubmitting(false);

    if (result.success) {
      setOrderSuccess(true);
    } else {
      toast({
        title: "❌ সমস্যা হয়েছে",
        description: result.message || "পেমেন্ট তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === paymentMethod);

  // Phone validation: 01[3-9] + 8 digits = 11 digits
  const isValidPhone = /^01[3-9]\d{8}$/.test(phoneNumber.trim());

  // Loading state
  if (loadingCourse || loadingOrder) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="তথ্য লোড হচ্ছে..." />
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (!course || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">অর্ডার বা কোর্স খুঁজে পাওয়া যায়নি।</p>
          <Link to="/courses">
            <Button variant="outline">সকল কোর্স দেখুন</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Success state
  if (orderSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
        <Header />
        <main className="flex-1 container max-w-2xl mx-auto p-4 py-8 space-y-6">
          {/* Back link */}
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            কোর্সে ফিরে যান
          </Link>

          {/* Step Indicator - Step 3 */}
          <div className="flex items-center justify-center gap-2 py-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.id <= 3
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:inline ${
                        step.id <= 3 ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-8 h-0.5 ${
                        step.id < 3 ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Single Success Card */}
          <Card className="overflow-hidden border-border/50">
            <CardContent className="p-6 space-y-5">
              {/* Payment Success */}
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold">পেমেন্ট রিকুয়েস্ট সম্পন্ন!</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    আপনার পেমেন্টের রিকুয়েস্ট সফলভাবে পাঠানো হয়েছে। অনুগ্রহ করে কনফার্মেশন করার জন্যে কিছুটা সময় দিন।
                  </p>
                </div>
              </div>

              {/* Course + Amount */}
              <div className="space-y-2">
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">কোর্স</span>
                  <span className="text-sm font-bold">{course.title}</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">পরিমাণ</span>
                  <span className="text-lg font-black text-primary">৳{currentPrice}</span>
                </div>
              </div>

              {/* Divider */}
              {course.group_link && <div className="border-t" />}

              {/* Group Link */}
              {course.group_link && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">নিচের গ্রুপে যুক্ত হয়ে নিন</h3>
                    <p className="text-sm text-muted-foreground">
                      এই কোর্সটি এই টেলিগ্রাম গ্রুপের মাধ্যমে পরিচালনা করা হবে।
                      কোর্সের সকল আপডেট এই গ্রুপে আলোচনা করা হবে ইনশাআল্লাহ।
                    </p>
                  </div>
                  <a href={course.group_link} target="_blank" rel="noopener noreferrer" className="w-full block">
                    <Button className="w-full gap-2" size="lg">
                      <ExternalLink className="h-4 w-4" />
                      গ্রুপে যোগ দিন
                    </Button>
                  </a>
                </div>
              )}

              {/* No group link - go to course */}
              {!course.group_link && (
                <Button
                  onClick={() => navigate(`/courses/${course.slug}`)}
                  className="w-full h-14 text-base font-bold rounded-xl"
                  size="lg"
                >
                  কোর্সে প্রবেশ করুন
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Header />
      <main className="flex-1 container max-w-2xl mx-auto p-4 py-8 space-y-6">
        {/* Back link */}
        <Link
          to={`/courses/${course.slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          কোর্সে ফিরে যান
        </Link>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.id <= 2
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      step.id <= 2 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step.id < 2 ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Course Summary */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                কোর্স সামারি
              </CardTitle>
              {isDiscounted && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                  {discountPercent}% ছাড়
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {course.cover_url && (
                <img
                  src={course.cover_url}
                  alt={course.title}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 ring-2 ring-border/50"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base leading-tight">{course.title}</h3>
                {course.short_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {course.short_description}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">মোট মূল্য</span>
              <div className="text-right">
                {isDiscounted && (
                  <span className="text-sm text-destructive line-through mr-2">
                    ৳{course.price_regular}
                  </span>
                )}
                <span className="text-2xl font-black text-primary">৳{currentPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              পেমেন্ট তথ্য
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Method */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">পেমেন্ট মাধ্যম বাছাই করুন</Label>
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? `${method.borderColor} bg-background shadow-md scale-[1.02]`
                            : "border-border hover:border-primary/30 bg-background/50"
                        }`}
                      >
                        <img
                          src={method.icon}
                          alt={method.label}
                          className="h-8 w-8 object-contain"
                        />
                        <span className={`text-sm font-bold ${method.color}`}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedMethod && (
                  <img
                    src={selectedMethod.subImage}
                    alt={paymentMethod}
                    className="w-full rounded-xl border border-border/50"
                  />
                )}

                {/* Instruction */}
                {selectedMethod && (
                  <div className={`${selectedMethod.bgColor} text-white p-5 space-y-4 rounded-xl`}>
                    <h3 className="text-lg font-bold">নির্দেশনা</h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm leading-relaxed">
                      <li>
                        আপনার <span className="font-bold">{selectedMethod.brandName}</span> অ্যাপ
                        অথবা <span className="font-bold">{selectedMethod.ussdCode}</span> কোড
                        ডায়াল করে Send Money অপশনে যান।
                      </li>
                      <li>
                        নিচের নাম্বারটি টাইপ করুন এবং{" "}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(currentPrice));
                            setCopiedAmount(true);
                            setTimeout(() => setCopiedAmount(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 font-black text-white bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-0.5 transition-colors cursor-pointer"
                          title="কপি করুন"
                        >
                          ৳{currentPrice}
                          {copiedAmount ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-white/70" />
                          )}
                        </button>{" "}
                        সেন্ড মানি করুন।
                      </li>
                    </ol>

                    <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-white/80 mb-1">
                          {selectedMethod.brandName} Personal Number
                        </p>
                        <p className="text-2xl font-black text-white tracking-wide">
                          {selectedMethod.personalNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedMethod.personalNumber);
                          setCopiedNumber(true);
                          setTimeout(() => setCopiedNumber(false), 2000);
                        }}
                        className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {copiedNumber ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <Copy className="h-5 w-5 text-white/70" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  সেন্ডার নম্বর
                  <span className="text-muted-foreground font-normal ml-1">
                    (নিজের হলে নিজের, দোকান থেকে হলে দোকানের নম্বর)
                  </span>
                </Label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value
                      .replace(/[০১২৩৪৫৬৭৮৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
                      .replace(/\D/g, "");
                    setPhoneNumber(val);
                  }}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
                {phoneNumber.length > 0 && !isValidPhone && (
                  <p className="text-xs text-destructive mt-1">
                    ১১ ডিজিটের বাংলাদেশি নম্বর দিন (01XXXXXXXXX)
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting || !isValidPhone}
                className="w-full h-14 text-base font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    প্রসেস হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    ৳{currentPrice} পেমেন্ট কনফার্ম করুন
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
