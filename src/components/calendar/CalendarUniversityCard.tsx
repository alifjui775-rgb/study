import React from "react";
import type { University } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface UniversityCardProps {
  university: University;
}

const CalendarUniversityCard = React.memo(function UniversityCard({
  university,
}: UniversityCardProps) {
  const isEnabled = ["du", "ru", "gst", "agri", "buet", "bmu", "bup", "ku"].includes(university.id);

  return (
    <div className="block bg-card border border-border rounded-xl shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 overflow-hidden dark:hover:bg-accent">
      <div className="p-3 flex items-center gap-4 text-left w-full">
        <img
          src={university.logo}
          alt={`${university.nameEn} logo`}
          className="w-10 h-10 object-contain"
        />
        <div className="flex flex-col flex-grow">
          <span className="mt-1 font-bold text-foreground">
            {university.nameBn} ({university.shortName})
          </span>
          <div className="flex items-center text-muted-foreground gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1 h-9 hover:text-accent-foreground px-0 text-muted-foreground hover:bg-transparent"
              disabled={!isEnabled}
            >
              <Link to={`${university.link}#Circular`}>
                <FileText />
                {isEnabled ? "সার্কুলার" : <s>সার্কুলার</s>}
              </Link>
            </Button>
            <span className="text-muted-foreground/50">|</span>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1 h-9 hover:text-accent-foreground px-0 text-muted-foreground hover:bg-transparent"
              disabled={!isEnabled}
            >
              <Link to={`${university.link}#QuestionBank`}>
                <BookOpen />
                {isEnabled ? "প্রশ্নব্যাংক" : <s>প্রশ্নব্যাংক</s>}
              </Link>
            </Button>
            <span className="text-muted-foreground/50">|</span>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 hover:text-primary px-0 text-muted-foreground hover:bg-transparent"
              disabled={!isEnabled}
            >
              <Link to={university.link}>
                {isEnabled ? "বিস্তারিত" : <s>বিস্তারিত</s>} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CalendarUniversityCard;
