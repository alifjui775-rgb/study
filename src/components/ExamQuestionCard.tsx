import React from "react";
import type { Question } from "@/lib/types";
import { RadioGroup } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOUCH_TARGETS } from "@/lib/examConstants";
import { ReportQuestionModal } from "@/components/ReportQuestionModal";
import { Flag } from "lucide-react";

interface Props {
  question: Question;
  globalIndex: number;
  selectedAnswer?: number | undefined;
  onSelect: (questionId: string, optionIndex: number) => void;
  questionType?: "mcq" | "written" | "cq" | string;
  studentId?: string;
  showReportButton?: boolean;
}

export default function ExamQuestionCard({
  question,
  globalIndex,
  selectedAnswer,
  onSelect,
  questionType = "mcq",
  studentId,
  showReportButton = false,
}: Props) {
  const { images } = (() => {
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(question.question || "")) !== null) {
      images.push(match[1]);
    }

    return { images };
  })();

  return (
    <Card id={`question-${question.id}`} className="mb-6">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="font-semibold">প্রশ্ন {globalIndex + 1}</CardTitle>
          {showReportButton && studentId && (
            <ReportQuestionModal
              questionId={question.id || ""}
              questionType={questionType}
              studentId={studentId}
              buttonClassName="h-7 w-7"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-3">
        {images.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            {images.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`Question ${globalIndex + 1}`}
                className="max-w-full h-auto rounded border"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ))}
          </div>
        )}

        <RadioGroup
          value={question.id && selectedAnswer !== undefined ? String(selectedAnswer) : ""}
          onValueChange={(value) => onSelect(question.id || "", parseInt(value))}
        >
          <div className="space-y-3">
            {(Array.isArray(question.options)
              ? question.options
              : Object.values(question.options || ({} as Record<string, string>))
            ).map((option: string, optionIndex: number) => {
              const bengaliLetters = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
              const letter = bengaliLetters[optionIndex] || String.fromCharCode(65 + optionIndex);

              return (
                <label
                  key={optionIndex}
                  className={`flex items-start space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[${TOUCH_TARGETS.normal}px] ${
                    selectedAnswer === optionIndex
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    <div
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${
                        selectedAnswer === optionIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-muted/30 text-foreground"
                      }`}
                    >
                      {letter}
                    </div>
                  </div>

                  <input
                    type="radio"
                    value={optionIndex.toString()}
                    id={`q${question.id}-o${optionIndex}`}
                    checked={selectedAnswer === optionIndex}
                    onChange={() => onSelect(question.id || "", optionIndex)}
                    className="hidden"
                  />

                  <span className="flex-1 text-sm md:text-base font-medium break-words">
                    <span dangerouslySetInnerHTML={{ __html: option }} />
                  </span>
                </label>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
