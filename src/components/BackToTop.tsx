import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { getExamActive, subscribeExamActive } from "@/lib/exam-mode";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [examActive, setExamActive] = useState(getExamActive);
  const { pathname } = useLocation();

  useEffect(() => {
    return subscribeExamActive(() => setExamActive(getExamActive()));
  }, []);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Master QB chapter route has its own floating dock (5 segments: qb/master/:stream/:paper/:chapter)
  const isMasterQbChapter =
    pathname.startsWith("/qb/master/") &&
    pathname.split("/").filter(Boolean).length >= 5;

  // Pages with their own floating dock or during exam
  if (
    examActive ||
    pathname === "/subjects" ||
    pathname === "/calendar" ||
    pathname === "/syllabus-tracker" ||
    pathname.startsWith("/syllabus-tracker/") ||
    pathname === "/qb" ||
    pathname === "/courses" ||
    pathname === "/public" ||
    pathname.startsWith("/university/") ||
    pathname.startsWith("/college/") ||
    pathname.startsWith("/cluster/") ||
    isMasterQbChapter
  )
    return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-20 right-2 md:bottom-8 md:right-8 z-[60] p-3.5 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center justify-center ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
