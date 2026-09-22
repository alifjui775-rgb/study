import { useState, useMemo, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Course } from "@/lib/types";
import { Plus } from "lucide-react";
import { deleteCourse } from "@/lib/actions";
import { CourseAdminCard } from "@/components/CourseAdminCard";
import { getCourseBatches, getCourseCategories } from "@/lib/queries";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy-load the modals: they pull in Tiptap/editor-vendor and
// browser-image-compression, which otherwise get preloaded with the route chunk
// even though they are only needed once a dialog is opened. The modules use
// named exports, so map them onto the default export React.lazy expects.
const AddCourseModal = lazy(() =>
  import("@/components/AddCourseModal").then((m) => ({ default: m.AddCourseModal })),
);
const EditCourseModal = lazy(() =>
  import("@/components/EditCourseModal").then((m) => ({ default: m.EditCourseModal })),
);

export function CoursesClient({ initialCourses }: { initialCourses: Course[] }) {
  // Defensive: never assume the parent supplied an array.
  const courses = initialCourses ?? [];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pendingCourseToDelete, setPendingCourseToDelete] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { data: batches } = useQuery({
    queryKey: ["course-batches"],
    queryFn: getCourseBatches,
  });

  const { data: categories } = useQuery({
    queryKey: ["course-categories"],
    queryFn: getCourseCategories,
  });

  const filterOptions = useMemo(() => {
    const options = [{ id: "all", name: "সবগুলো" }];

    if (categories) {
      categories.forEach((cat) => {
        options.push({ id: `cat_${cat.id}`, name: cat.name });
      });
    }

    if (batches) {
      const currentBatch = batches.find((b) => b.is_current);
      let targetYears: number[] = [];

      if (currentBatch && currentBatch.year) {
        targetYears = [currentBatch.year, currentBatch.year - 1, currentBatch.year - 2];
      }

      const matchedBatches = batches.filter((batch) => {
        return !currentBatch || (batch.year && targetYears.includes(batch.year));
      });

      matchedBatches.sort((a, b) => {
        if (a.is_current) return -1;
        if (b.is_current) return 1;
        return b.year - a.year;
      });

      matchedBatches.forEach((batch) => {
        options.push({ id: `batch_${batch.id}`, name: batch.name });
      });
    }

    return options;
  }, [categories, batches]);

  const filteredCourses = useMemo(() => {
    if (activeFilter === "all") {
      return courses;
    }

    const isCategory = activeFilter.startsWith("cat_");
    const filterId = activeFilter.replace("cat_", "").replace("batch_", "");

    return courses.filter((course) => {
      if (!course) return false;
      if (isCategory) {
        return Array.isArray(course.category_ids) && course.category_ids.includes(filterId);
      } else {
        return Array.isArray(course.batch_ids) && course.batch_ids.includes(filterId);
      }
    });
  }, [courses, activeFilter]);

  const handleDeleteCourse = (courseId: string) => {
    setPendingCourseToDelete(courseId);
    setIsDeleteOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsEditModalOpen(true);
  };

  const handleDeleteCourseConfirmed = async () => {
    if (!pendingCourseToDelete) return;

    const formData = new FormData();
    formData.append("id", pendingCourseToDelete);
    const result = await deleteCourse(formData);

    if (result.success) {
      toast({
        title: "কোর্স সফলভাবে মুছে ফেলা হয়েছে",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    } else {
      toast({
        title: "কোর্স মুছে ফেলতে সমস্যা হয়েছে",
        description: result.message,
        variant: "destructive",
      });
    }

    setIsDeleteOpen(false);
    setPendingCourseToDelete(null);
  };

  return (
    <div className="container mx-auto p-2 md:p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle>কোর্স পরিচালনা</CardTitle>
            <CardDescription>আপনার বিদ্যমান কোর্সগুলো পরিচালনা করুন এবং নতুন কোর্স যুক্ত করুন।</CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> নতুন কোর্স
          </Button>
        </CardHeader>
        <CardContent>
          {filterOptions.length > 1 && (
            <div className="mb-6">
              <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
                <TabsList className="h-auto p-1 bg-muted rounded-xl flex-wrap justify-start">
                  {filterOptions.map((option) => (
                    <TabsTrigger
                      key={option.id}
                      value={option.id}
                      className="px-5 py-2 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                    >
                      {option.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <CourseAdminCard
                key={course.id}
                course={course}
                onEdit={handleEditCourse}
                onDelete={handleDeleteCourse}
              />
            ))}
            {filteredCourses.length === 0 && (
              <p className="text-muted-foreground col-span-full">কোনো কোর্স পাওয়া যায়নি।</p>
            )}
          </div>
        </CardContent>
      </Card>
      <hr className="h-8 border-transparent" />

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddCourseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </Suspense>
      )}

      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setPendingCourseToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>কোর্স মুছে ফেলার নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি সত্যিই এই কোর্সটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourseConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isEditModalOpen && (
        <Suspense fallback={null}>
          <EditCourseModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingCourse(null);
            }}
            course={editingCourse}
          />
        </Suspense>
      )}
    </div>
  );
}
