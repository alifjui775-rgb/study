import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface TestPaperCardProps {
  title: string;
  subtitle?: string;
  logo: string;
  href: string;
  bgColor: string;
}

const TestPaperCard: React.FC<TestPaperCardProps> = ({
  title,
  subtitle,
  logo,
  href,
  bgColor: _bgColor,
}) => {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <div
        className={cn(
          "relative w-full h-56 sm:h-64 text-center font-bold rounded-md p-4 flex flex-col justify-between items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border",
          "bg-card hover:border-primary/50",
        )}
      >
        <div>
          <div
            className={cn(
              "bg-accent dark:bg-[#757575] rounded-full p-2 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 shadow-inner mx-auto",
            )}
          >
            <img
              src={logo}
              alt={`${title} logo`}
              className="object-contain w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
          <h3 className="text-sm sm:text-base text-card-foreground">{title}</h3>
        </div>
        {subtitle && (
          <div className="w-full">
            <hr className="my-2 border-border/50" />
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5 font-normal">
              <Sparkles size={12} />
              {subtitle}
            </p>
          </div>
        )}
      </div>
    </a>
  );
};

export default TestPaperCard;
