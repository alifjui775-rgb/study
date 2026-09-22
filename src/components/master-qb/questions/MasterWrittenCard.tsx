import LatexRenderer from "@/components/LatexRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageList, SourceBadge, MasterFooterBadges } from "./shared";
import type { MasterQuestionItem } from "@/lib/master-qb-queries";

interface MasterWrittenCardProps {
  question: MasterQuestionItem;
  index: number;
  user?: { uid: string } | null;
}

export default function MasterWrittenCard({ question: q, index, user }: MasterWrittenCardProps) {
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
              questionType="written"
              studentId={user.uid}
              buttonClassName="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            />
          )}
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">প্রশ্ন</h4>
          <div className="text-base sm:text-lg font-medium leading-relaxed text-foreground">
            {q.question && <LatexRenderer html={q.question} />}
            {!q.question && (!q.question_image || q.question_image.length === 0) && (
              <span className="text-muted-foreground italic text-sm">
                (প্রশ্নের টেক্সট বা ছবি নেই)
              </span>
            )}
            <ImageList images={q.question_image} alt="Question" />
          </div>
        </div>

        {(q.answer || (q.answer_image && q.answer_image.length > 0)) && (
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">
              উত্তর
            </h4>
            {q.answer && (
              <MarkdownRenderer
                className="text-sm sm:text-base text-emerald-950 dark:text-emerald-200 leading-relaxed"
                content={q.answer}
              />
            )}
            <ImageList images={q.answer_image} alt="Answer" />
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
