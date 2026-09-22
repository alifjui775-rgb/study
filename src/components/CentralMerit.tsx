import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Users } from "lucide-react";

interface CentralMeritEntry {
  student_id: string;
  roll: string;
  total_exams: number;
  exams_taken: number;
  total_score: number;
  avg_score: number;
}

async function fetchCentralMerit(courseId: string): Promise<CentralMeritEntry[]> {
  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("id")
    .is("deleted_at", null)
    .eq("course_id", courseId);

  if (examsError || !exams || exams.length === 0) return [];

  const examIds = exams.map((e) => e.id);

  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("status", true);

  if (enrollError || !enrollments || enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);

  const { data: studentExams, error: seError } = await supabase
    .from("student_exams")
    .select("student_id, exam_id, score")
    .in("exam_id", examIds)
    .in("student_id", studentIds)
    .eq("status", "submitted");

  const { data: students } = await supabase
    .from("study_student")
    .select("id, roll")
    .in("id", studentIds);

  const studentMap = new Map<string, { roll: string }>();
  (students || []).forEach((s) => {
    const rollStr = s.roll ? String(s.roll) : "";
    studentMap.set(s.id, { roll: rollStr });
  });

  if (seError || !studentExams || studentExams.length === 0) {
    return studentIds.map((sid) => {
      const info = studentMap.get(sid) || { roll: "" };
      return {
        student_id: sid,
        roll: info.roll,
        total_exams: exams.length,
        exams_taken: 0,
        total_score: 0,
        avg_score: 0,
      };
    });
  }

  const aggMap = new Map<string, { exams_taken: number; total_score: number }>();
  studentExams.forEach((se) => {
    const existing = aggMap.get(se.student_id) || { exams_taken: 0, total_score: 0 };
    aggMap.set(se.student_id, {
      exams_taken: existing.exams_taken + 1,
      total_score: existing.total_score + (se.score || 0),
    });
  });

  const totalExams = exams.length;
  const result: CentralMeritEntry[] = studentIds.map((sid) => {
    const agg = aggMap.get(sid) || { exams_taken: 0, total_score: 0 };
    const info = studentMap.get(sid) || { roll: "" };
    return {
      student_id: sid,
      roll: info.roll,
      total_exams: totalExams,
      exams_taken: agg.exams_taken,
      total_score: agg.total_score,
      avg_score: agg.exams_taken > 0 ? agg.total_score / agg.exams_taken : 0,
    };
  });

  result.sort((a, b) => b.total_score - a.total_score);

  return result;
}

function renderRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="inline-flex items-center gap-1 font-bold text-amber-500">
        <Trophy className="size-3.5 fill-amber-500" />
        <span>১ম</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="inline-flex items-center gap-1 font-bold text-slate-400">
        <Medal className="size-3.5 fill-slate-400" />
        <span>২য়</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-600">
        <Award className="size-3.5 fill-amber-700 dark:fill-amber-600" />
        <span>৩য়</span>
      </div>
    );
  }
  return <span className="font-semibold text-sm text-muted-foreground">{rank}</span>;
}

interface CentralMeritProps {
  courseId: string;
  currentUserId?: string;
}

export default function CentralMerit({ courseId, currentUserId }: CentralMeritProps) {
  const [page, setPage] = useState(1);
  const perPage = 20;
  const { data: meritList = [], isLoading } = useQuery({
    queryKey: ["central-merit", courseId],
    queryFn: () => fetchCentralMerit(courseId),
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 md:p-8 overflow-hidden relative shadow-xs">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-muted rounded animate-pulse" />
            <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (meritList.length === 0) return null;

  const totalPages = Math.ceil(meritList.length / perPage);
  const paged = meritList.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-card border border-border rounded-2xl md:rounded-3xl overflow-hidden relative shadow-xs">
      <div className="flex items-center justify-between p-4 md:p-6 pb-0 md:pb-0">
        <div className="flex items-center gap-2">
          <Trophy className="h-4.5 w-4.5 md:h-5 md:w-5 text-primary" />
          <h3 className="font-black text-lg md:text-xl text-primary font-bengali">লিডারবোর্ড</h3>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] md:text-[11px] font-bold bg-primary/10 text-primary border-primary/20 font-bengali px-2 py-0.5"
        >
          <Users className="w-3 h-3 mr-1" />
          {meritList.length} জন
        </Badge>
      </div>

      <div className="p-4 md:p-6 pt-2 md:pt-3">
        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                  র‍্যাংক
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                  রোল
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                  স্কোর
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                  এক্সাম
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {paged.map((item, index) => {
                const rank = (page - 1) * perPage + index + 1;
                const isCurrentUser = currentUserId === item.student_id;
                return (
                  <tr
                    key={item.student_id}
                    className={`border-b transition-colors hover:bg-muted/50 ${isCurrentUser ? "bg-primary/5" : ""}`}
                  >
                    <td className="p-4 align-middle text-center font-medium">{renderRankBadge(rank)}</td>
                    <td className="p-4 align-middle text-center font-mono text-xs font-semibold tracking-wide">
                      <span className="inline-flex items-center gap-1.5">
                        {item.roll
                          ? item.roll.startsWith("SOT-")
                            ? item.roll
                            : `SOT-${item.roll}`
                          : "—"}
                        {isCurrentUser && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] py-0 px-1.5 bg-primary/20 text-primary border-primary/30 font-bengali"
                          >
                            আপনি
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-center font-bold">
                      {item.total_score > 0 ? item.total_score.toFixed(2) : "—"}
                    </td>
                    <td className="p-4 align-middle text-center text-sm text-muted-foreground font-semibold">
                      {item.exams_taken}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 min-w-8 px-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
