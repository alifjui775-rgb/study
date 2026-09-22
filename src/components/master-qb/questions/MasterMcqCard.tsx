import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ImageList, SourceBadge, MasterFooterBadges } from "./shared";
import type { MasterQuestionItem } from "@/lib/master-qb-queries";

interface MasterMcqCardProps {
  question: MasterQuestionItem;
  index: number;
  user?: { uid: string } | null;
}

export default function MasterMcqCard({ question: q, index, user }: MasterMcqCardProps) {
  const options = q.question_options ?? q.options ?? [];

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge variant="secondary" className="font-mono">
              #{index + 1}
            </Badge>
            <SourceBadge source={q.source_info} />
          </div>
          {user?.uid && (
            <ReportQuestionModal
              questionId={q.id}
              questionType="mcq"
              studentId={user.uid}
              buttonClassName="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            />
          )}
        </div>

        <div className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
          {q.question && <LatexRenderer html={q.question} />}
          <ImageList images={q.question_image} alt="Question" />
        </div>

        {options.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {options.map((opt, oi) => (
              <div
                key={opt.id ?? oi}
                className={cn(
                  "p-2.5 sm:p-3.5 rounded-xl border flex items-start gap-2.5 sm:gap-3 transition-all shadow-sm",
                  opt.is_correct
                    ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 dark:border-emerald-500/60 text-emerald-950 dark:text-emerald-200 font-semibold"
                    : "bg-background/80 dark:bg-card/40 border-border/80 text-foreground hover:border-border",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold border shadow-sm",
                    opt.is_correct
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-700 dark:border-emerald-400"
                      : "bg-muted text-muted-foreground border-border/50",
                  )}
                >
                  {String.fromCharCode(2453 + oi)}
                </span>
                <div className="flex-1 text-xs sm:text-sm pt-0.5 space-y-2">
                  {opt.option_text && <LatexRenderer html={opt.option_text} />}
                  <ImageList images={opt.option_image} alt="Option" />
                </div>
              </div>
            ))}
          </div>
        )}

        {(q.explanation || (q.explanation_image && q.explanation_image.length > 0)) && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
              ব্যাখ্যা (Explanation)
            </h4>
            {q.explanation && (
              <MarkdownRenderer
                className="text-sm sm:text-base text-amber-950 dark:text-amber-200 leading-relaxed"
                content={q.explanation}
              />
            )}
            <ImageList images={q.explanation_image} alt="Explanation" />
          </div>
        )}

        <MasterFooterBadges
          paperName={q.paper_name}
          chapterName={q.chapter_name}
          topicName={q.topic_name}
          typeName={q.type_name}
        />
      </CardContent>
    </Card>
  );
}
