"use client";

import { useState } from "react";
import { CourseSection, CourseSubsection, CourseItem } from "@/lib/types";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  TextInitial,
  PlayCircle,
  CircleCheckBig,
  BarChart2,
  BookOpen,
  Folders,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface CoursePlayerSidebarProps {
  courseSlug: string;
  curriculum: any[];
  activeItemId?: string;
  onCloseMobile?: () => void;
}

export function CoursePlayerSidebar({
  courseSlug,
  curriculum,
  activeItemId,
  onCloseMobile,
}: CoursePlayerSidebarProps) {
  // Expand all sections by default if there's only a few, or just the one containing the active item.
  // For simplicity, expand all initially.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    curriculum.reduce((acc, section) => ({ ...acc, [section.id]: true }), {}),
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const renderItemIcon = (type: CourseItem["item_type"]) => {
    switch (type) {
      case "instruction":
        return <TextInitial className="size-4" />;
      case "class":
        return <PlayCircle className="size-4" />;
      case "exam":
        return <CircleCheckBig className="size-4" />;
      case "poll":
        return <BarChart2 className="size-4" />;
      case "assignment":
        return <BookOpen className="size-4" />;
      case "file":
        return <Folders className="size-4" />;
      default:
        return <TextInitial className="size-4" />;
    }
  };

  const renderItemTypeName = (type: CourseItem["item_type"]) => {
    switch (type) {
      case "instruction":
        return "Reading";
      case "class":
        return "Video";
      case "exam":
        return "Exam";
      case "poll":
        return "Poll";
      case "assignment":
        return "Assignment";
      case "file":
        return "File";
      default:
        return "Item";
    }
  };

  const getHref = (item: CourseItem) => {
    if (item.item_type === "instruction") {
      return `/courses/${courseSlug}/instruction/${item.id}`;
    }
    const typeMap: Record<string, string> = { exam: "exams", class: "classes" };
    return `/courses/${courseSlug}/${typeMap[item.item_type] || item.item_type}/${item.id}`;
  };

  const renderItem = (item: CourseItem) => {
    const isActive = item.id === activeItemId;
    // Mock completion status (to be hooked up to DB later)
    const isCompleted = false;

    return (
      <Link
        key={item.id}
        to={getHref(item)}
        onClick={() => onCloseMobile?.()}
        className={cn(
          "flex items-start gap-3 p-3 transition-colors relative group",
          isActive ? "bg-muted" : "hover:bg-muted/50",
        )}
      >
        {/* Active border indicator */}
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
        )}

        <div className="mt-0.5 shrink-0 text-muted-foreground">
          {renderItemIcon(item.item_type)}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {(item as any).title || (item as any).name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{renderItemTypeName(item.item_type)}</p>
        </div>
      </Link>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-card border-r">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-card z-10">
        <h2 className="font-semibold text-base font-bengali">কোর্স কারিকুলাম</h2>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-2 space-y-1">
          {curriculum.map((section) => {
            const isExpanded = expandedSections[section.id];

            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-sm font-bengali truncate">
                      {section.title}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-1 ml-2 border-l border-border/50 flex flex-col">
                    {/* Section direct items */}
                    {section.items?.map((item: any) => renderItem(item))}

                    {/* Subsections */}
                    {section.subsections?.map((sub: any) => (
                      <div key={sub.id} className="mt-2 pl-4">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {sub.title}
                        </div>
                        <div className="flex flex-col">
                          {sub.items?.map((item: any) => renderItem(item))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
