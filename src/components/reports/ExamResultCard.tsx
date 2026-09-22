import { memo } from "react";
import { Link } from "react-router-dom";
import dayjs from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, TrendingUp, AlertCircle, Trophy } from "lucide-react";
import type { StudentExamResult } from "@/lib/queries";

export interface ExamResultCardData extends StudentExamResult {
  score: number;
  totalMarks: number;
}

export const getScoreBadgeColor = (percentage: number) => {
  if (percentage >= 80) return "bg-green-100 text-green-800 border-green-300";
  if (percentage >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
  if (percentage >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
};

const getScoreFeedback = (percentage: number) => {
  if (percentage >= 80) return "চমৎকার পারফরম্যান্স!";
  if (percentage >= 60) return "ভালো পারফরম্যান্স";
  if (percentage >= 40) return "সন্তোষজনক";
  return "আরও অনুশীলন প্রয়োজন";
};

const getScoreFeedbackIcon = (percentage: number) => {
  if (percentage >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (percentage >= 60) return <TrendingUp className="h-5 w-5 text-blue-600" />;
  if (percentage >= 40) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
};

interface ExamResultCardProps {
  result: ExamResultCardData;
}

function ExamResultCard({ result }: ExamResultCardProps) {
  const percentage = result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{result.exam_name}</h3>
          <p className="text-sm text-muted-foreground">
            {dayjs(result.submitted_at).format("DD MMMM, YYYY hh:mm A")}
          </p>
        </div>
        <Badge className={`text-base px-3 py-1 ${getScoreBadgeColor(percentage)}`}>
          {result.score.toFixed(2)}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {getScoreFeedbackIcon(percentage)}
        <span className="text-sm font-medium">{getScoreFeedback(percentage)}</span>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">সঠিক</p>
          <p className="text-lg font-bold text-green-600">{result.correct_answers}</p>
        </div>
        <div>
          <p className="text-muted-foreground">ভুল</p>
          <p className="text-lg font-bold text-red-600">{result.wrong_answers}</p>
        </div>
        <div>
          <p className="text-muted-foreground">মোট মার্কস</p>
          <p className="text-lg font-bold text-gray-600">{result.totalMarks.toFixed(2)}</p>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Link to={`/dashboard/exams/${result.exam_id}/leaderboard`}>
          <Button variant="outline" size="sm">
            <Trophy className="h-4 w-4 mr-2" />
            লিডারবোর্ড
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default memo(ExamResultCard);
