import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import PracticeSettings from "./PracticeSettings";
import PracticeSteps from "./PracticeSteps";

interface Props {
  disciplineIds: string[];
  disciplineNames: Record<string, string>;
  onBack: () => void;
  payload: PracticeExamPayload;
  onUpdatePayload: (updater: (prev: PracticeExamPayload) => PracticeExamPayload) => void;
  onStartExam: () => void;
  isStarting: boolean;
}

export type Paper = { id: string; name_bn: string | null; name_en: string; discipline_id: string };
type Chapter = { id: string; name: string; serial: number | null };
type Topic = { id: string; name: string; serial: number | null };
export type ChapterWithTopics = Chapter & { topics: Topic[] };
export type PaperWithChapters = Paper & { chapters: ChapterWithTopics[] };

export type PracticeSelection = {
  topicIds: Set<string>;
  emptyChapterIds: Set<string>;
  emptyPaperIds: Set<string>;
};

export type PracticeExamPayload = {
  topicIds: string[];
  chapterIds: string[];
  paperIds: string[];
  standardCodes: string[];
  questionCount: number;
  timeMinutes: number;
  negativeMark: number;
};

export function resolvePracticeExamPayload(
  papers: PaperWithChapters[],
  selection: PracticeSelection,
  settings: {
    questionCount: number;
    timeMinutes: number;
    negativeMark: number;
    standardCodes: string[];
  },
): PracticeExamPayload {
  const finalPaperIds: string[] = [];
  const finalChapterIds: string[] = [];
  const finalTopicIds: string[] = [];

  const rawTopicSet = new Set(selection.topicIds);
  const rawEmptyChapterSet = new Set(selection.emptyChapterIds);
  const rawEmptyPaperSet = new Set(selection.emptyPaperIds);

  for (const paper of papers) {
    const hasChapters = paper.chapters.length > 0;
    let isPaperFullySelected = false;

    if (!hasChapters) {
      isPaperFullySelected = rawEmptyPaperSet.has(paper.id);
    } else {
      isPaperFullySelected = paper.chapters.every((ch) => {
        if (ch.topics.length === 0) {
          return rawEmptyChapterSet.has(ch.id);
        }
        return ch.topics.length > 0 && ch.topics.every((t) => rawTopicSet.has(t.id));
      });
    }

    if (isPaperFullySelected) {
      finalPaperIds.push(paper.id);
      continue;
    }

    for (const ch of paper.chapters) {
      const hasTopics = ch.topics.length > 0;
      let isChapterFullySelected = false;

      if (!hasTopics) {
        isChapterFullySelected = rawEmptyChapterSet.has(ch.id);
      } else {
        isChapterFullySelected =
          ch.topics.length > 0 && ch.topics.every((t) => rawTopicSet.has(t.id));
      }

      if (isChapterFullySelected) {
        finalChapterIds.push(ch.id);
        continue;
      }

      if (hasTopics) {
        for (const t of ch.topics) {
          if (rawTopicSet.has(t.id)) {
            finalTopicIds.push(t.id);
          }
        }
      }
    }
  }

  return {
    topicIds: finalTopicIds,
    chapterIds: finalChapterIds,
    paperIds: finalPaperIds,
    standardCodes: settings.standardCodes,
    questionCount: settings.questionCount,
    timeMinutes: settings.timeMinutes,
    negativeMark: settings.negativeMark,
  };
}

const toBengaliNumber = (num: number | string) =>
  String(num).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export default function PracticeTopicSelection({
  disciplineIds,
  disciplineNames,
  onBack,
  payload,
  onUpdatePayload,
  onStartExam,
  isStarting,
}: Props) {
  const [selection, setSelection] = useState<PracticeSelection>({
    topicIds: new Set(),
    emptyChapterIds: new Set(),
    emptyPaperIds: new Set(),
  });
  const [showSettings, setShowSettings] = useState(false);

  const totalSelected =
    selection.topicIds.size + selection.emptyChapterIds.size + selection.emptyPaperIds.size;

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ["practice-papers-full", disciplineIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curriculum_papers")
        .select(`
          id, name_bn, name_en, discipline_id,
          paper_chapters(id, name, serial,
            chapter_topics(id, name, serial)
          )
        `)
        .in("discipline_id", disciplineIds);
      if (error) throw error;

      return ((data || []) as Record<string, unknown>[]).map((p): PaperWithChapters => ({
        id: p.id as string,
        name_bn: p.name_bn as string | null,
        name_en: p.name_en as string,
        discipline_id: p.discipline_id as string,
        chapters: ((p.paper_chapters as Record<string, unknown>[]) || [])
          .sort((a, b) => ((a.serial as number) ?? 0) - ((b.serial as number) ?? 0))
          .map((ch): ChapterWithTopics => ({
            id: ch.id as string,
            name: ch.name as string,
            serial: ch.serial as number | null,
            topics: ((ch.chapter_topics as Record<string, unknown>[]) || [])
              .sort((a, b) => ((a.serial as number) ?? 0) - ((b.serial as number) ?? 0))
              .map((t): Topic => ({
                id: t.id as string,
                name: t.name as string,
                serial: t.serial as number | null,
              })),
          })),
      })) as PaperWithChapters[];
    },
    enabled: disciplineIds.length > 0,
  });

  const papersRef = useRef(papers);
  papersRef.current = papers;

  const onUpdatePayloadRef = useRef(onUpdatePayload);
  onUpdatePayloadRef.current = onUpdatePayload;

  useEffect(() => {
    onUpdatePayloadRef.current((prev) =>
      resolvePracticeExamPayload(papersRef.current, selection, {
        questionCount: prev.questionCount,
        timeMinutes: prev.timeMinutes,
        negativeMark: prev.negativeMark,
        standardCodes: prev.standardCodes,
      }),
    );
  }, [selection]);

  const toggleTopic = (topicId: string) => {
    setSelection((prev) => {
      const topicIds = new Set(prev.topicIds);
      if (topicIds.has(topicId)) topicIds.delete(topicId);
      else topicIds.add(topicId);
      return { ...prev, topicIds };
    });
  };

  const toggleTopics = (topicIdsIn: string[], select: boolean) => {
    setSelection((prev) => {
      const topicIds = new Set(prev.topicIds);
      topicIdsIn.forEach((id) => (select ? topicIds.add(id) : topicIds.delete(id)));
      return { ...prev, topicIds };
    });
  };

  const toggleChapters = (chapterIds: string[], select: boolean) => {
    setSelection((prev) => {
      const emptyChapterIds = new Set(prev.emptyChapterIds);
      chapterIds.forEach((id) => (select ? emptyChapterIds.add(id) : emptyChapterIds.delete(id)));
      return { ...prev, emptyChapterIds };
    });
  };

  const togglePaper = (paperId: string, select: boolean) => {
    setSelection((prev) => {
      const emptyPaperIds = new Set(prev.emptyPaperIds);
      if (select) emptyPaperIds.add(paperId);
      else emptyPaperIds.delete(paperId);
      return { ...prev, emptyPaperIds };
    });
  };

  if (showSettings) {
    return (
      <PracticeSettings
        papers={papers}
        disciplineNames={disciplineNames}
        selection={selection}
        onBack={() => setShowSettings(false)}
        payload={payload}
        onUpdatePayload={onUpdatePayload}
        onStartExam={onStartExam}
        isStarting={isStarting}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PracticeSteps current={2} />

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        আবার বিষয় সিলেক্ট করুন
      </button>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : papers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              selection={selection}
              onToggleTopic={toggleTopic}
              onToggleTopics={toggleTopics}
              onToggleChapters={toggleChapters}
              onTogglePaper={togglePaper}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">কোনো পেপার পাওয়া যায়নি।</p>
      )}

      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          পেছনে
        </button>
        <button
          type="button"
          disabled={totalSelected === 0}
          onClick={() => setShowSettings(true)}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
            totalSelected > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          এগিয়ে যান ({toBengaliNumber(totalSelected)} টপিক)
        </button>
      </div>
    </div>
  );
}

function PaperCard({
  paper,
  selection,
  onToggleTopic,
  onToggleTopics,
  onToggleChapters,
  onTogglePaper,
}: {
  paper: PaperWithChapters;
  selection: PracticeSelection;
  onToggleTopic: (topicId: string) => void;
  onToggleTopics: (topicIds: string[], select: boolean) => void;
  onToggleChapters: (chapterIds: string[], select: boolean) => void;
  onTogglePaper: (paperId: string, select: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const allTopicIds = paper.chapters.flatMap((ch) => ch.topics.map((t) => t.id));
  const emptyChapterIds = paper.chapters.filter((ch) => ch.topics.length === 0).map((ch) => ch.id);
  const hasChapters = paper.chapters.length > 0;

  const totalUnits = allTopicIds.length + emptyChapterIds.length + (hasChapters ? 0 : 1);
  const selectedUnits =
    allTopicIds.filter((id) => selection.topicIds.has(id)).length +
    emptyChapterIds.filter((id) => selection.emptyChapterIds.has(id)).length +
    (!hasChapters && selection.emptyPaperIds.has(paper.id) ? 1 : 0);
  const allSelected = totalUnits > 0 && selectedUnits === totalUnits;

  const handlePaperCheck = () => {
    if (allSelected) {
      onToggleTopics(allTopicIds, false);
      onToggleChapters(emptyChapterIds, false);
      onTogglePaper(paper.id, false);
    } else {
      onToggleTopics(allTopicIds, true);
      onToggleChapters(emptyChapterIds, true);
      onTogglePaper(paper.id, !hasChapters);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={allSelected}
          onClick={handlePaperCheck}
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded shrink-0 border-2 transition-colors",
            allSelected
              ? "bg-primary border-primary text-white"
              : "border-muted-foreground/30 bg-transparent",
          )}
        >
          {allSelected && <Check className="h-3 w-3 stroke-[3]" />}
        </button>
        <span className="text-sm font-semibold flex-1">{paper.name_bn || paper.name_en}</span>
        <span className="text-xs text-muted-foreground">
          {toBengaliNumber(selectedUnits)}/{toBengaliNumber(totalUnits)} টপিক
        </span>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {paper.chapters.map((ch) => {
            const chTopicIds = ch.topics.map((t) => t.id);
            const chHasTopics = ch.topics.length > 0;
            const chSelectedCount = chTopicIds.filter((id) => selection.topicIds.has(id)).length;
            const chSelected = chHasTopics
              ? chTopicIds.length > 0 && chTopicIds.every((id) => selection.topicIds.has(id))
              : selection.emptyChapterIds.has(ch.id);
            const isChExpanded = expandedChapters.has(ch.id);

            return (
              <div key={ch.id} className="rounded-xl border border-border/60 bg-card/50 ml-4">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={chSelected}
                    onClick={() =>
                      chHasTopics
                        ? onToggleTopics(chTopicIds, !chSelected)
                        : onToggleChapters([ch.id], !chSelected)
                    }
                    className={cn(
                      "flex items-center justify-center w-5 h-5 rounded shrink-0 border-2 transition-colors",
                      chSelected
                        ? "bg-primary border-primary text-white"
                        : "border-muted-foreground/30 bg-transparent",
                    )}
                  >
                    {chSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                  <span className="text-sm font-medium flex-1">{ch.name}</span>
                  {chSelected && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      সকল
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {toBengaliNumber(chSelectedCount)}/{toBengaliNumber(chTopicIds.length)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedChapters((prev) => {
                        const next = new Set(prev);
                        if (next.has(ch.id)) next.delete(ch.id);
                        else next.add(ch.id);
                        return next;
                      })
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isChExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {isChExpanded && chHasTopics && (
                  <div className="px-3 pb-2.5 space-y-1.5 border-t border-border/30">
                    {ch.topics.map((t) => {
                      const isSelected = selection.topicIds.has(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          onClick={() => onToggleTopic(t.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-lg border transition-colors text-left",
                            isSelected
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/40 bg-transparent hover:bg-accent/50",
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center w-4 h-4 rounded shrink-0 border-2 transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-white"
                                : "border-muted-foreground/30 bg-transparent",
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-medium">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
