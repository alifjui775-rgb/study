import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ArrowLeft, Loader2 } from "lucide-react";
import type {
  PaperWithChapters,
  PracticeSelection,
  PracticeExamPayload,
} from "./PracticeTopicSelection";
import PracticeSteps from "./PracticeSteps";

interface Props {
  papers: PaperWithChapters[];
  disciplineNames: Record<string, string>;
  selection: PracticeSelection;
  onBack: () => void;
  payload: PracticeExamPayload;
  onUpdatePayload: (updater: (prev: PracticeExamPayload) => PracticeExamPayload) => void;
  onStartExam: () => void;
  isStarting: boolean;
}

type ChapterSummary = { name: string; label: string };
type PaperSummary = { name: string; chapters: ChapterSummary[]; wholeSelected: boolean };
type DisciplineSummary = { name: string; papers: PaperSummary[] };

/** Convert Bengali numerals (০-৯) and decimal separator (٫) to English equivalents. */
const parseLocalizedNumber = (val: string): number => {
  const engVal = val
    .replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d).toString())
    .replace(/٫/g, "."); // Bengali decimal separator → English dot
  return Number(engVal);
};

export default function PracticeSettings({
  papers,
  disciplineNames,
  selection,
  onBack,
  payload,
  onUpdatePayload,
  onStartExam,
  isStarting,
}: Props) {
  const [showSelectedTopics, setShowSelectedTopics] = useState(false);

  const [questionCountText, setQuestionCountText] = useState<string>(
    payload.questionCount ? String(payload.questionCount) : "25",
  );
  const [timeMinutesText, setTimeMinutesText] = useState<string>(
    payload.timeMinutes ? String(payload.timeMinutes) : "30",
  );
  const [negativeMarkText, setNegativeMarkText] = useState<string>(
    payload.negativeMark !== undefined && payload.negativeMark !== null
      ? String(payload.negativeMark)
      : "0.25",
  );

  const summary = useMemo<DisciplineSummary[]>(() => {
    const groups: DisciplineSummary[] = [];
    for (const p of papers) {
      const hasChapters = p.chapters.length > 0;
      const paperWholeSelected = !hasChapters && selection.emptyPaperIds.has(p.id);
      const chapters = p.chapters
        .map((ch): ChapterSummary | null => {
          if (ch.topics.length === 0) {
            return selection.emptyChapterIds.has(ch.id) ? { name: ch.name, label: "সকল" } : null;
          }
          const selected = ch.topics.filter((t) => selection.topicIds.has(t.id));
          if (selected.length === 0) return null;
          const isAll = selected.length === ch.topics.length;
          return {
            name: ch.name,
            label: isAll ? "সকল" : `${selected.length}টি টপিক`,
          };
        })
        .filter((c): c is ChapterSummary => c !== null);
      if (!paperWholeSelected && chapters.length === 0) continue;

      const dName = disciplineNames[p.discipline_id] || p.name_bn || p.name_en;
      let group = groups.find((g) => g.name === dName);
      if (!group) {
        group = { name: dName, papers: [] };
        groups.push(group);
      }
      group.papers.push({
        name: p.name_bn || p.name_en,
        chapters,
        wholeSelected: paperWholeSelected,
      });
    }
    return groups;
  }, [papers, disciplineNames, selection]);

  return (
    <div className="space-y-5">
      <PracticeSteps current={3} />

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        আবার টপিক সিলেক্ট করুন
      </button>

      <Tabs defaultValue="mcq" className="w-full">
        <TabsList className="h-auto p-1 bg-muted rounded-xl w-full">
          <TabsTrigger
            value="mcq"
            className="flex-1 px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            MCQ
          </TabsTrigger>
          <TabsTrigger
            value="written"
            className="flex-1 px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            Written
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground">প্রশ্ন সংখ্যা</label>
              <Input
                type="text"
                inputMode="numeric"
                value={questionCountText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^[\d০-৯]*$/.test(raw)) return;
                  setQuestionCountText(raw);
                  if (raw.trim() === "") {
                    onUpdatePayload((prev) => ({ ...prev, questionCount: 0 }));
                    return;
                  }
                  const val = parseLocalizedNumber(raw);
                  if (!isNaN(val) && val >= 0) {
                    onUpdatePayload((prev) => ({
                      ...prev,
                      questionCount: val > 200 ? 200 : val,
                    }));
                  }
                }}
                onBlur={() => {
                  const val = parseLocalizedNumber(questionCountText);
                  if (isNaN(val) || val <= 0) {
                    setQuestionCountText("25");
                    onUpdatePayload((prev) => ({ ...prev, questionCount: 25 }));
                  } else {
                    const capped = val > 200 ? 200 : val;
                    setQuestionCountText(String(capped));
                  }
                }}
                className="rounded-xl h-11 text-sm font-semibold"
              />
              {payload.questionCount > 200 && (
                <p className="text-xs text-destructive">সর্বচ্চ প্রশ্ন সংখ্যা ২০০ টি</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground">সময় (মিনিট)</label>
              <Input
                type="text"
                inputMode="numeric"
                value={timeMinutesText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^[\d০-৯]*$/.test(raw)) return;
                  setTimeMinutesText(raw);
                  if (raw.trim() === "") {
                    onUpdatePayload((prev) => ({ ...prev, timeMinutes: 0 }));
                    return;
                  }
                  const val = parseLocalizedNumber(raw);
                  if (!isNaN(val) && val >= 0) {
                    onUpdatePayload((prev) => ({ ...prev, timeMinutes: val }));
                  }
                }}
                onBlur={() => {
                  const val = parseLocalizedNumber(timeMinutesText);
                  if (isNaN(val) || val <= 0) {
                    setTimeMinutesText("30");
                    onUpdatePayload((prev) => ({ ...prev, timeMinutes: 30 }));
                  } else {
                    setTimeMinutesText(String(val));
                  }
                }}
                className="rounded-xl h-11 text-sm font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground">নেগিভ মার্ক</label>
              <Input
                type="text"
                inputMode="decimal"
                value={negativeMarkText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^[\d০-৯]*[.٫]?[\d০-৯]*$/.test(raw)) return;
                  setNegativeMarkText(raw);
                  if (raw.trim() === "" || raw === "." || raw === "٫") {
                    onUpdatePayload((prev) => ({ ...prev, negativeMark: 0 }));
                    return;
                  }
                  const val = parseLocalizedNumber(raw);
                  if (!isNaN(val) && val >= 0) {
                    onUpdatePayload((prev) => ({ ...prev, negativeMark: val }));
                  }
                }}
                onBlur={() => {
                  const val = parseLocalizedNumber(negativeMarkText);
                  if (isNaN(val) || val < 0) {
                    setNegativeMarkText("0");
                    onUpdatePayload((prev) => ({ ...prev, negativeMark: 0 }));
                  } else {
                    setNegativeMarkText(String(val));
                  }
                }}
                className="rounded-xl h-11 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSelectedTopics(!showSelectedTopics)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold">সিলেক্টেড টপিকস দেখতে এখানে ট্যাপ করো</span>
              {showSelectedTopics ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {showSelectedTopics && (
              <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
                {summary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">কোনো টপিক সিলেক্ট করা হয়নি।</p>
                ) : (
                  summary.map((group) => (
                    <div key={group.name} className="space-y-2">
                      <h4 className="text-sm font-bold text-primary">{group.name}</h4>
                      <div className="ml-1 border-l-2 border-border pl-4 space-y-2">
                        {group.papers.map((paper) => (
                          <div key={paper.name} className="space-y-1">
                            <span className="text-sm font-semibold block">
                              {paper.name}
                              {paper.wholeSelected && (
                                <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium align-middle">
                                  সকল
                                </span>
                              )}
                            </span>
                            <div className="space-y-0.5">
                              {paper.chapters.map((ch) => (
                                <p key={ch.name} className="text-sm text-muted-foreground">
                                  {ch.name}:{" "}
                                  <span className="text-foreground font-medium">{ch.label}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isStarting}
            onClick={onStartExam}
            className={cn(
              "w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm",
              "hover:bg-primary/90 transition-all shadow-md",
              isStarting && "opacity-70 cursor-not-allowed",
            )}
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                প্রশ্ন লোড হচ্ছে...
              </span>
            ) : (
              "পরীক্ষা শুরু করুন"
            )}
          </button>
        </TabsContent>

        <TabsContent value="written" className="mt-5">
          <p className="text-sm text-muted-foreground text-center py-10 leading-relaxed">
            আমরা এখনও লিখিত পরীক্ষার সিস্টেম নিয়ে কাজ করি নি। এই নিয়ে কাজ করলে পরবর্তীতে এখানে লিখিত পরীক্ষা
            দিতে পারবেন।
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
