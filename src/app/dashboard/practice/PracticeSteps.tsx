import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["বিষয়", "টপিক", "সেটিংস"];
const BN_NUMERALS = ["১", "২", "৩"];

export default function PracticeSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-start max-w-md mx-auto w-full">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < current;
        const isCurrent = step === current;
        return (
          <div key={label} className={cn("flex items-start", i < STEPS.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold transition-colors",
                  isCompleted && "bg-primary border-primary text-white",
                  isCurrent && "border-primary text-primary bg-primary/5 ring-4 ring-primary/10",
                  !isCompleted && !isCurrent && "border-border text-muted-foreground bg-card",
                )}
              >
                {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : BN_NUMERALS[i]}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCurrent ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mt-[15px] mx-2 rounded-full transition-colors",
                  isCompleted ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
