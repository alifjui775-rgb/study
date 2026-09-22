import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  GraduationCap,
  Landmark,
  MessageSquareText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

const ActionCard = ({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
}) => (
  <Link to={href} aria-label={label} className="block">
    <Card className="py-3.5 px-1 sm:py-5 sm:px-3 rounded-xl shadow-sm hover:shadow-md hover:bg-accent hover:scale-105 text-center text-card-foreground flex flex-col justify-center items-center w-full transition-all duration-300">
      <CardContent className="!p-0 flex flex-col items-center w-full">
        {icon}
        <p className="font-bold text-[11px] sm:text-sm md:text-base leading-tight break-keep">
          {label}
        </p>
      </CardContent>
    </Card>
  </Link>
);

export function FeatureGrid() {
  const features = [
    {
      href: "/calendar",
      icon: <CalendarDays className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-1 sm:mb-2" />,
      label: "ক্যালেন্ডার",
    },
    {
      href: "/qb",
      icon: <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-1 sm:mb-2" />,
      label: "প্রশ্নব্যাংক",
    },
    {
      href: "/courses",
      icon: <GraduationCap className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-1 sm:mb-2" />,
      label: "কোর্স",
    },
    {
      href: "/eligibility-checker",
      icon: <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-1 sm:mb-2" />,
      label: "এলিজিবিলিটি চেকার",
    },
    {
      href: "/public",
      icon: <Landmark className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-1 sm:mb-2" />,
      label: "পাবলিক ইউনিভার্সিটি",
    },
    {
      href: "/subjects",
      icon: (
        <MessageSquareText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-1 sm:mb-2" />
      ),
      label: "সাবজেক্ট রিভিউ",
    },
  ];

  return (
    <div className="mt-8 grid grid-cols-3 gap-2.5 sm:gap-6 max-w-2xl mx-auto">
      {features.map((feature, idx) => (
        <div
          key={feature.href}
          style={{ animationDelay: `${idx * 100}ms` }}
          className="animate-in fade-in"
        >
          <ActionCard {...feature} />
        </div>
      ))}
    </div>
  );
}
