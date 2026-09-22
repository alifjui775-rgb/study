import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  PlaySquare,
  Image as ImageIcon,
  FileText,
  Video,
  ClipboardList,
  BarChart,
  BookOpen,
  FileArchive,
  ListPlus,
  Copy,
  TextInitial,
  Folders,
  CircleCheckBig,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useInstructorAuth } from "@/context/InstructorAuthContext";
import {
  deleteCourseSection,
  deleteCourseSubsection,
  deleteCourseInstruction,
  deleteCourseClass,
  deleteExam,
  deleteCoursePoll,
  deleteCourseAssignment,
  deleteCourseFile,
} from "@/lib/actions";

import { EditCourseModal } from "@/components/EditCourseModal";
import { AddEditSectionModal } from "@/components/AddEditSectionModal";
import { AddEditSubsectionModal } from "@/components/AddEditSubsectionModal";
import { AddEditInstructionModal } from "@/components/AddEditInstructionModal";
import { AddEditClassModal } from "@/components/AddEditClassModal";
import { AddEditExamModal } from "@/components/AddEditExamModal";
import { AddEditPollModal } from "@/components/AddEditPollModal";
import { AddEditAssignmentModal } from "@/components/AddEditAssignmentModal";
import { AddEditFileModal } from "@/components/AddEditFileModal";

import { useQueryClient } from "@tanstack/react-query";
import type {
  CourseWithCurriculum,
  CourseSection,
  CourseSubsection,
  CourseItem,
} from "@/lib/types";

export function CourseDetailsClient({
  course,
  papers,
}: {
  course: CourseWithCurriculum;
  papers: any[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { instructor } = useInstructorAuth();

  const handleCopyExamLink = (examId: string) => {
    const examUrl = `${window.location.origin}/courses/${course.slug}/exams/${examId}`;
    navigator.clipboard.writeText(examUrl);
    toast({
      title: "লিংক কপি হয়েছে",
      description: "পরীক্ষার লিংক আপনার ক্লিপবোর্ডে কপি করা হয়েছে।",
    });
  };

  // Modals state
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null);

  const [isSubsectionModalOpen, setIsSubsectionModalOpen] = useState(false);
  const [activeSectionIdForSubsection, setActiveSectionIdForSubsection] = useState<string>("");
  const [editingSubsection, setEditingSubsection] = useState<CourseSubsection | null>(null);

  // Item Modals state
  const [itemTarget, setItemTarget] = useState<{ sectionId: string; subsectionId: string | null }>({
    sectionId: "",
    subsectionId: null,
  });

  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<any>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<any>(null);

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);

  // Accordion state for sections - open by default if is_open is true
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    course.sections?.forEach((section) => {
      if (section.is_open) {
        initial[section.id] = true;
      }
    });
    return initial;
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই সেকশনটি মুছে ফেলতে চান? এর ভেতরের সকল সাবসেকশনও মুছে যাবে।"))
      return;
    const formData = new FormData();
    formData.append("id", sectionId);
    const result = await deleteCourseSection(formData);
    if (result.success) {
      toast({ title: "সেকশন মুছে ফেলা হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", course.id] });
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
  };

  const handleDeleteSubsection = async (subsectionId: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই সাবসেকশনটি মুছে ফেলতে চান?")) return;
    const formData = new FormData();
    formData.append("id", subsectionId);
    const result = await deleteCourseSubsection(formData);
    if (result.success) {
      toast({ title: "সাবসেকশন মুছে ফেলা হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", course.id] });
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (item: CourseItem) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই আইটেমটি মুছে ফেলতে চান?")) return;

    const formData = new FormData();
    formData.append("id", item.id);
    let result;

    if (item.item_type === "instruction") result = await deleteCourseInstruction(formData);
    else if (item.item_type === "class") result = await deleteCourseClass(formData);
    else if (item.item_type === "exam") result = await deleteExam(formData);
    else if (item.item_type === "poll") result = await deleteCoursePoll(formData);
    else if (item.item_type === "assignment") result = await deleteCourseAssignment(formData);
    else if (item.item_type === "file") result = await deleteCourseFile(formData);

    if (result?.success) {
      toast({ title: "আইটেম মুছে ফেলা হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", course.id] });
    } else {
      toast({
        title: "সমস্যা হয়েছে",
        description: result?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const openAddItem = (type: string, sectionId: string, subsectionId: string | null = null) => {
    setItemTarget({ sectionId, subsectionId });
    if (type === "instruction") {
      setEditingInstruction(null);
      setIsInstructionModalOpen(true);
    } else if (type === "class") {
      setEditingClass(null);
      setIsClassModalOpen(true);
    } else if (type === "exam") {
      setEditingExam(null);
      setIsExamModalOpen(true);
    } else if (type === "poll") {
      setEditingPoll(null);
      setIsPollModalOpen(true);
    } else if (type === "assignment") {
      setEditingAssignment(null);
      setIsAssignmentModalOpen(true);
    } else if (type === "file") {
      setEditingFile(null);
      setIsFileModalOpen(true);
    }
  };

  const openEditItem = (
    item: CourseItem,
    sectionId: string,
    subsectionId: string | null = null,
  ) => {
    setItemTarget({ sectionId, subsectionId });
    if (item.item_type === "instruction") {
      setEditingInstruction(item);
      setIsInstructionModalOpen(true);
    } else if (item.item_type === "class") {
      setEditingClass(item);
      setIsClassModalOpen(true);
    } else if (item.item_type === "exam") {
      setEditingExam(item);
      setIsExamModalOpen(true);
    } else if (item.item_type === "poll") {
      setEditingPoll(item);
      setIsPollModalOpen(true);
    } else if (item.item_type === "assignment") {
      setEditingAssignment(item);
      setIsAssignmentModalOpen(true);
    } else if (item.item_type === "file") {
      setEditingFile(item);
      setIsFileModalOpen(true);
    }
  };

  const renderItemIcon = (type: string) => {
    switch (type) {
      case "instruction":
        return <TextInitial className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      case "class":
        return <Video className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case "exam":
        return <CircleCheckBig className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case "poll":
        return <BarChart className="h-4 w-4 text-purple-500 flex-shrink-0" />;
      case "assignment":
        return <BookOpen className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      case "file":
        return <Folders className="h-4 w-4 text-cyan-500 flex-shrink-0" />;
      default:
        return <TextInitial className="h-4 w-4 flex-shrink-0" />;
    }
  };

  const renderItemTypeName = (type: string) => {
    switch (type) {
      case "instruction":
        return "ইন্সট্রাকশন";
      case "class":
        return "ক্লাস";
      case "exam":
        return "এক্সাম";
      case "poll":
        return "পোল";
      case "assignment":
        return "অ্যাসাইনমেন্ট";
      case "file":
        return "ফাইল";
      default:
        return type;
    }
  };

  const renderItemsList = (
    items: CourseItem[] = [],
    sectionId: string,
    subsectionId: string | null = null,
  ) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-2 mt-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 bg-background border rounded-md hover:bg-muted/50 transition-colors gap-2 overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {renderItemIcon(item.item_type)}
              <div className="min-w-0 flex-1">
                <h5 className="text-sm font-medium break-words whitespace-normal">
                  {item.item_type === "exam" ? item.name : (item as any).title}
                </h5>

                <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5 flex-wrap">
                  <span>{renderItemTypeName(item.item_type)}</span>
                  <span>•</span>
                  <span>ক্রম: {(item as any).sequence_order || 0}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.item_type === "exam" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  type="button"
                  title="লিংক কপি করুন"
                  onClick={() => handleCopyExamLink(item.id)}
                >
                  <Copy className="h-4 w-4 text-emerald-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => openEditItem(item, sectionId, subsectionId)}
              >
                <Pencil className="h-3 w-3 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDeleteItem(item)}
              >
                <Trash2 className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const AddItemDropdown = ({
    sectionId,
    subsectionId = null,
    className = "mt-2",
  }: {
    sectionId: string;
    subsectionId?: string | null;
    className?: string;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-full border-dashed", className)}>
          <Plus className="mr-2 h-4 w-4" /> আইটেম যোগ করুন
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => openAddItem("instruction", sectionId, subsectionId)}>
          <TextInitial className="mr-2 h-4 w-4" /> ইন্সট্রাকশন
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAddItem("class", sectionId, subsectionId)}>
          <Video className="mr-2 h-4 w-4" /> ক্লাস
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAddItem("exam", sectionId, subsectionId)}>
          <CircleCheckBig className="mr-2 h-4 w-4" /> এক্সাম
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAddItem("poll", sectionId, subsectionId)}>
          <BarChart className="mr-2 h-4 w-4" /> পোল
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAddItem("assignment", sectionId, subsectionId)}>
          <BookOpen className="mr-2 h-4 w-4" /> অ্যাসাইনমেন্ট
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAddItem("file", sectionId, subsectionId)}>
          <Folders className="mr-2 h-4 w-4" /> ফাইল
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-6 pb-20">
      {/* Course Header Section */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3 aspect-video bg-muted rounded-md overflow-hidden relative border flex items-center justify-center">
            {course.cover_url ? (
              <img
                src={course.cover_url}
                alt={course.title}
                className="w-full h-full object-cover object-center"
              />
            ) : course.youtube_url ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <PlaySquare className="h-12 w-12 text-white opacity-80" />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="h-10 w-10 mb-2" />
                <span>কোনো কভার ছবি নেই</span>
              </div>
            )}
            <Badge
              className="absolute top-2 right-2"
              variant={
                course.status === "published"
                  ? "default"
                  : course.status === "draft"
                    ? "secondary"
                    : "destructive"
              }
            >
              {course.status}
            </Badge>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
              <CardDescription className="text-sm break-all">
                Slug: {course.slug} | মূল্য:{" "}
                {course.price_discounted ? (
                  <>
                    <span className="line-through text-muted-foreground mr-2">
                      ৳{course.price_regular}
                    </span>
                    <span className="text-green-600 font-bold">৳{course.price_discounted}</span>
                  </>
                ) : (
                  <span className="font-bold">৳{course.price_regular}</span>
                )}
              </CardDescription>
            </div>

            {course.short_description && (
              <p className="text-sm text-muted-foreground">{course.short_description}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={() => setIsEditCourseOpen(true)} size="sm">
                <Pencil className="mr-2 h-4 w-4" /> Edit Details
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Curriculum / Sections */}
      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-xl font-bold">কোর্স কারিকুলাম</h2>
        <Button
          onClick={() => {
            setEditingSection(null);
            setIsSectionModalOpen(true);
          }}
          size="sm"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" /> সেকশন যোগ করুন
        </Button>
      </div>

      <div className="space-y-4">
        {course.sections && course.sections.length > 0 ? (
          course.sections.map((section) => (
            <Card key={section.id} className="overflow-hidden border-border/50">
              <div className="flex items-center justify-between p-4 bg-muted/40 border-b gap-2 overflow-hidden">
                <div
                  className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                  onClick={() => toggleSection(section.id)}
                >
                  {expandedSections[section.id] ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <h3 className="font-semibold text-base break-words">{section.title}</h3>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                        ক্রম: {section.sequence_order}
                      </span>
                    </div>
                    {section.description && (
                      <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-10 sm:w-10"
                    onClick={() => {
                      setEditingSection(section);
                      setIsSectionModalOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-10 sm:w-10"
                    onClick={() => handleDeleteSection(section.id)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* Section Content */}
              {expandedSections[section.id] && (
                <div className="p-4 bg-background/50 space-y-4">
                  {/* Direct Section Items */}
                  {renderItemsList(section.items, section.id)}

                  {/* Subsections List */}
                  <div className="space-y-3">
                    {section.subsections &&
                      section.subsections.length > 0 &&
                      section.subsections.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-muted/20 border rounded-md overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3 bg-muted/30 border-b gap-2 overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="h-2 w-2 rounded-full bg-primary/50 shrink-0"></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <h4 className="text-sm font-medium break-words">{sub.title}</h4>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    ক্রম: {sub.sequence_order}
                                  </span>
                                </div>
                                {sub.description && (
                                  <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                                    {sub.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setActiveSectionIdForSubsection(section.id);
                                  setEditingSubsection(sub);
                                  setIsSubsectionModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteSubsection(sub.id)}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-2 bg-background/50">
                            {renderItemsList(sub.items, section.id, sub.id)}
                            <AddItemDropdown sectionId={section.id} subsectionId={sub.id} />
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setActiveSectionIdForSubsection(section.id);
                        setEditingSubsection(null);
                        setIsSubsectionModalOpen(true);
                      }}
                      size="sm"
                      variant="secondary"
                      className="flex-1 border-dashed"
                    >
                      <Plus className="mr-2 h-4 w-4" /> সাবসেকশন
                    </Button>
                    <div className="flex-1">
                      <AddItemDropdown sectionId={section.id} className="mt-0" />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">এই কোর্সে এখনও কোনো সেকশন যোগ করা হয়নি।</p>
              <Button
                onClick={() => {
                  setEditingSection(null);
                  setIsSectionModalOpen(true);
                }}
              >
                প্রথম সেকশন যোগ করুন
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <EditCourseModal
        isOpen={isEditCourseOpen}
        onClose={() => setIsEditCourseOpen(false)}
        course={course}
      />
      <AddEditSectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        courseId={course.id}
        section={editingSection}
      />
      <AddEditSubsectionModal
        isOpen={isSubsectionModalOpen}
        onClose={() => setIsSubsectionModalOpen(false)}
        courseId={course.id}
        sectionId={activeSectionIdForSubsection}
        subsection={editingSubsection}
      />

      {/* Item Modals */}
      <AddEditInstructionModal
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        courseId={course.id}
        sectionId={itemTarget.sectionId}
        subsectionId={itemTarget.subsectionId}
        instruction={editingInstruction}
      />
      <AddEditClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        courseId={course.id}
        sectionId={itemTarget.sectionId}
        subsectionId={itemTarget.subsectionId}
        courseClass={editingClass}
      />
      <AddEditExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        courseId={course.id}
        sectionId={itemTarget.sectionId}
        subsectionId={itemTarget.subsectionId}
        exam={editingExam}
        papers={papers}
      />
      <AddEditPollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        courseId={course.id}
        sectionId={itemTarget.sectionId}
        subsectionId={itemTarget.subsectionId}
        poll={editingPoll}
      />
      <AddEditAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        courseId={course.id}
        sectionId={itemTarget.sectionId}
        subsectionId={itemTarget.subsectionId}
        assignment={editingAssignment}
      />
      <AddEditFileModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        courseId={course.id}
        sectionId={itemTarget.sectionId}
        subsectionId={itemTarget.subsectionId}
        file={editingFile}
      />
    </div>
  );
}
