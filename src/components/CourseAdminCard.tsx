import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Course } from "@/lib/types";
import dayjs from "@/lib/date-utils";
import { Pencil, Trash2 } from "lucide-react";

interface CourseAdminCardProps {
  course: Course;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

export function CourseAdminCard({ course, onEdit, onDelete }: CourseAdminCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col">
      {course.cover_url ? (
        <div className="relative aspect-video w-full">
          <img
            src={course.cover_url}
            alt={course.title}
            className="w-full h-full object-cover object-center"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No Cover Image</p>
        </div>
      )}
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription>
          {course.short_description
            ? course.short_description.substring(0, 60) +
              (course.short_description.length > 60 ? "..." : "")
            : "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-grow">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              course.status === "published"
                ? "bg-green-500/20 text-green-700"
                : course.status === "draft"
                  ? "bg-yellow-500/20 text-yellow-700"
                  : "bg-gray-500/20 text-gray-700"
            }`}
          >
            {course.status === "published"
              ? "পাবলিশড"
              : course.status === "draft"
                ? "ড্রাফট"
                : "আর্কাইভ"}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
            ৳ {course.price_discounted ?? course.price_regular}
          </span>
        </div>
        <div className="text-sm text-muted-foreground pt-2">
          তৈরি হয়েছে: {course.created_at ? dayjs(course.created_at).format("DD MMMM, YYYY") : "N/A"}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between mt-auto">
        <Link to={`/instructor/courses/${course.id}`}>
          <Button variant="outline" size="sm">
            বিস্তারিত
          </Button>
        </Link>
        <div className="space-x-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit?.(course)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete?.(course.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
