import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop({ className }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn("fixed right-4 md:right-8 bottom-[110px] md:bottom-[85px] z-[60]", className)}
    >
      <Button
        id="scrollToTopBtn"
        aria-label="উপরে যান"
        onClick={scrollToTop}
        className={cn(
          "h-10 w-10 rounded-full shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-300",
          isVisible
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-80 translate-y-5 pointer-events-none",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
