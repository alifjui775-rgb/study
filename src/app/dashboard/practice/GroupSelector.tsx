import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getAllGroups, getStudyStudent } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (groupId: string) => void;
}

export default function GroupSelector({ value, onChange }: Props) {
  const { user } = useAuth();
  const [defaultSet, setDefaultSet] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: getAllGroups,
  });

  const { data: studyStudent } = useQuery({
    queryKey: ["study-student", user?.uid],
    queryFn: () => getStudyStudent(user!.uid),
    enabled: !!user?.uid,
  });

  useEffect(() => {
    if (defaultSet) return;
    if (studyStudent?.group_id && groups.length > 0) {
      if (!value) onChange(studyStudent.group_id);
      setDefaultSet(true);
    }
  }, [studyStudent, groups, defaultSet, value, onChange]);

  return (
    <div className="space-y-2.5">
      <label className="text-sm font-bold text-foreground">বিভাগ সিলেক্ট করুন</label>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => onChange(group.id)}
              className={cn(
                "flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none text-center relative w-full",
                value === group.id
                  ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                  : "border-border bg-card hover:bg-accent text-muted-foreground",
              )}
            >
              <span className="text-xs sm:text-sm truncate w-full">{group.name_bn}</span>
              {value === group.id && (
                <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center text-white p-0.5">
                  <Check className="h-2 w-2 stroke-[3]" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
