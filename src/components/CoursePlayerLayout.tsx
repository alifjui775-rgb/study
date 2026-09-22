"use client";

import { useState } from "react";
import { Course, CourseSection } from "@/lib/types";
import { CoursePlayerSidebar } from "./CoursePlayerSidebar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ArrowLeft, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

interface CoursePlayerLayoutProps {
  course: Course;
  curriculum: any[];
  activeItemId?: string;
  itemTitle: string;
  children: React.ReactNode;
}

export function CoursePlayerLayout({
  course,
  curriculum,
  activeItemId,
  itemTitle,
  children,
}: CoursePlayerLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 shrink-0 border-r bg-card">
        <CoursePlayerSidebar
          courseSlug={course.slug}
          curriculum={curriculum}
          activeItemId={activeItemId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b bg-card flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/courses/${course.slug}`}>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                title="Back to Course"
              >
                <ArrowLeft className="size-5" />
              </Button>
            </Link>

            <h1 className="font-semibold text-sm md:text-base truncate">{itemTitle}</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-80">
                <SheetTitle className="sr-only">Course Curriculum Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate through course materials
                </SheetDescription>
                <CoursePlayerSidebar
                  courseSlug={course.slug}
                  curriculum={curriculum}
                  activeItemId={activeItemId}
                  onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
            {/* Future: Previous/Next buttons can go here */}
          </div>
        </header>

        {/* Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto bg-background text-foreground relative flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
