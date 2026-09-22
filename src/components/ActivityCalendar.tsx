import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { getUserActivityForMonth } from "@/lib/queries";
import { useState } from "react";
import dayjs from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { DayProps } from "react-day-picker";

interface ActivityCalendarProps {
  courseId: string;
  userId: string;
}

export function ActivityCalendar({ courseId, userId }: ActivityCalendarProps) {
  const [month, setMonth] = useState(new Date());

  const { data: activityData } = useQuery({
    queryKey: ["activity", userId, courseId, month.getFullYear(), month.getMonth()],
    queryFn: () =>
      getUserActivityForMonth(userId, courseId, month.getFullYear(), month.getMonth() + 1),
    enabled: !!userId && !!courseId,
  });

  const DayWithDots = (props: DayProps) => {
    const dayStr = dayjs(props.day.date).format("YYYY-MM-DD");
    const activity = activityData?.[dayStr];

    const isPast = dayjs(props.day.date).isBefore(dayjs(), "day");

    let dotColorClass = "";
    let dotCount = 0;

    if (activity) {
      dotCount =
        (activity.present ? 1 : 0) +
        (activity.mandatory_done ? 1 : 0) +
        (activity.optional_done ? 1 : 0) +
        (activity.todo_done ? 1 : 0);
    }

    if (dotCount === 1) dotColorClass = "bg-muted-foreground/20";
    else if (dotCount === 2) dotColorClass = "bg-progress-yellow";
    else if (dotCount === 3) dotColorClass = "bg-progress-light-green";
    else if (dotCount >= 4) dotColorClass = "bg-progress-green";
    else if (isPast) dotColorClass = "bg-destructive/50";

    return (
      <div className="relative flex flex-col items-center h-full w-full justify-center">
        <span>{props.day.date.getDate()}</span>
        {dotColorClass && (
          <div className="absolute bottom-1 flex gap-0.5 mt-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", dotColorClass)}></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Calendar
      month={month}
      onMonthChange={setMonth}
      modifiersClassNames={{
        today: "border-primary rounded-md",
      }}
      components={{
        Day: DayWithDots,
      }}
      className="w-full"
    />
  );
}
