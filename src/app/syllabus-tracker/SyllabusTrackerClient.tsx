import { useState, useCallback, useEffect, useMemo, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSyllabusData } from "@/lib/queries";
import type { CurriculumPaperWithChapters, PaperChapterWithTopics } from "@/lib/types";
import { getFilters, onFiltersChange, type GroupFilterState } from "@/lib/syllabus-filter-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import {
  getChapterSelectionsCached,
  toggleChapterTask,
  onChapterTasksChange,
  getVisiblePresetsForSubject,
  getVisiblePresetsConfigVersion,
  setChapterTasks,
  type ChapterTaskSelections,
} from "@/lib/chapter-task-store";
import type { ChapterTaskPreset } from "@/lib/chapter-task-presets";
import {
  getProgressMode,
  onProgressModeChange,
  type ProgressMode,
} from "@/lib/progress-mode-store";
import { ChapterTaskAddButton } from "@/components/syllabus/ChapterTaskAddButton";
import { SubjectIcon } from "@/components/syllabus/SubjectIcon";

// --- LOCAL STORAGE helpers ---
const LS_TOPICS_KEY = "st_topics";
const LS_CHAPTERS_KEY = "st_chapters";

function getLocalSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

// ----------------------------------------------------------------
// Progress resolution + memoized list rows
// ----------------------------------------------------------------

type ChapterUnit = { done: number; total: number; kind: "task" | "topic" | "unit" };

// Resolve a chapter's progress source per the active progress mode:
// tasks (when applicable) → topics (when applicable) → chapter-unit (0/1)
function resolveChapterUnit(
  chapter: PaperChapterWithTopics,
  visiblePresets: ChapterTaskPreset[],
  mode: ProgressMode,
  doneTopics: Set<string>,
  doneChapters: Set<string>,
  chapterSelections: ChapterTaskSelections,
): ChapterUnit {
  if (mode !== "topic" && visiblePresets.length > 0) {
    const done = visiblePresets.filter((p) => !!chapterSelections[chapter.id]?.[p.id]).length;
    return { done, total: visiblePresets.length, kind: "task" };
  }
  if (mode !== "task" && chapter.topics.length > 0) {
    const done = chapter.topics.filter((t) => doneTopics.has(t.id)).length;
    return { done, total: chapter.topics.length, kind: "topic" };
  }
  return { done: doneChapters.has(chapter.id) ? 1 : 0, total: 1, kind: "unit" };
}

const EMPTY_TOPIC_IDS: string[] = [];
const EMPTY_CHAPTER_IDS: string[] = [];

// Exact per-subject topic-done bits. Needed because a topic toggle does NOT
// change counterLabel when the chapter resolves to task-kind (e.g. mixed mode
// with active presets) — this key is the change signal for topic toggles.
function buildTopicStateKey(
  subject: CurriculumPaperWithChapters,
  doneTopics: Set<string>,
): string {
  let key = "";
  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) key += doneTopics.has(topic.id) ? "1" : "0";
    key += "|";
  }
  return key;
}

type TopicRowProps = {
  topic: PaperChapterWithTopics["topics"][0];
  done: boolean;
  chapterId: string;
  topicIds: string[];
  onTopicToggle: (topicId: string, chapterId: string, allTopicIds: string[]) => void;
};

const TopicRow = memo(function TopicRow({
  topic,
  done,
  chapterId,
  topicIds,
  onTopicToggle,
}: TopicRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox
        id={`topic-${topic.id}`}
        checked={done}
        onCheckedChange={() => onTopicToggle(topic.id, chapterId, topicIds)}
        className="shrink-0"
      />
      <label
        htmlFor={`topic-${topic.id}`}
        className={`text-sm font-bengali cursor-pointer transition-all duration-200 ${
          done ? "line-through text-muted-foreground/50" : "text-foreground/80"
        }`}
      >
        {topic.serial ? `${topic.serial}. ` : ""}
        {topic.name}
      </label>
    </div>
  );
});

type ChapterRowProps = {
  subject: CurriculumPaperWithChapters;
  chapter: PaperChapterWithTopics;
  chapterIds: string[];
  topicIds: string[];
  visiblePresets: ChapterTaskPreset[];
  progressMode: ProgressMode;
  chapterDone: boolean;
  chapterProgress: number;
  doneTopics: Set<string>;
  chapterTasks: Record<string, boolean> | undefined;
  onTopicToggle: (topicId: string, chapterId: string, allTopicIds: string[]) => void;
  onChapterToggle: (chapter: PaperChapterWithTopics, visiblePresets: ChapterTaskPreset[]) => void;
  onTaskToggle: (chapterId: string, presetId: string) => void;
  onTasksApplied: () => void;
};

const ChapterRow = memo(function ChapterRow({
  subject,
  chapter,
  chapterIds,
  topicIds,
  visiblePresets,
  progressMode,
  chapterDone,
  chapterProgress,
  doneTopics,
  chapterTasks,
  onTopicToggle,
  onChapterToggle,
  onTaskToggle,
  onTasksApplied,
}: ChapterRowProps) {
  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-300 ${
        chapterDone ? "border-primary/20 bg-primary/5" : "border-border bg-background"
      }`}
    >
      {/* Chapter row */}
      <div className="flex items-start gap-3 mb-3">
        <Checkbox
          id={`chapter-${chapter.id}`}
          checked={chapterDone}
          onCheckedChange={() => onChapterToggle(chapter, visiblePresets)}
          className="mt-0.5 shrink-0"
        />
        <label
          htmlFor={`chapter-${chapter.id}`}
          className={`font-semibold font-bengali cursor-pointer flex-1 leading-snug transition-all duration-200 ${
            chapterDone ? "line-through text-muted-foreground/60" : "text-foreground"
          }`}
        >
          {chapter.serial ? `অধ্যায় ${chapter.serial}: ` : ""}
          {chapter.name}
        </label>
        <span className="text-xs text-muted-foreground shrink-0 font-bengali">
          {chapterProgress}%
        </span>
      </div>

      {/* Chapter Tasks (hidden in "topic" mode) */}
      {progressMode !== "topic" && visiblePresets.length > 0 && (
        <div className="ml-0 md:ml-7 mb-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground font-bengali">টাস্ক</p>
            <ChapterTaskAddButton
              subjectId={subject.id}
              chapterIds={chapterIds}
              onTasksApplied={onTasksApplied}
            />
          </div>
          <hr className="border-border/50 mb-2" />
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {visiblePresets.map((preset) => {
              const isChecked = !!chapterTasks?.[preset.id];
              return (
                <div key={preset.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`task-${chapter.id}-${preset.id}`}
                    checked={isChecked}
                    onCheckedChange={() => onTaskToggle(chapter.id, preset.id)}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <label
                    htmlFor={`task-${chapter.id}-${preset.id}`}
                    className={`text-[11px] font-bengali cursor-pointer transition-all duration-200 ${
                      isChecked ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {preset.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics list (hidden in "task" mode) */}
      {progressMode !== "task" && chapter.topics.length > 0 && (
        <div className="ml-0 md:ml-7">
          <p className="text-[11px] font-semibold text-muted-foreground font-bengali mb-1.5">
            টপিক
          </p>
          <hr className="border-border/50 mb-2" />
          <div className="space-y-2">
            {chapter.topics.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                done={doneTopics.has(topic.id)}
                chapterId={chapter.id}
                topicIds={topicIds}
                onTopicToggle={onTopicToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

type SubjectItemProps = {
  subject: CurriculumPaperWithChapters;
  visiblePresets: ChapterTaskPreset[];
  progress: number;
  counterLabel: string;
  topicStateKey: string;
  progressMode: ProgressMode;
  doneTopics: Set<string>;
  doneChapters: Set<string>;
  chapterSelections: ChapterTaskSelections;
  chapterIds: string[];
  topicIdsByChapter: Map<string, string[]>;
  onTopicToggle: (topicId: string, chapterId: string, allTopicIds: string[]) => void;
  onChapterToggle: (chapter: PaperChapterWithTopics, visiblePresets: ChapterTaskPreset[]) => void;
  onTaskToggle: (chapterId: string, presetId: string) => void;
  onTasksApplied: () => void;
};

// Memo comparator deliberately ignores the doneTopics/doneChapters/chapterSelections
// references: those change on every toggle anywhere, but they can only affect THIS
// subject's rendered output if a unit belonging to THIS subject flipped. Every toggle
// type is captured by the compared signals:
//   - task toggles / unit toggles → change this subject's exact per-kind counts
//     (encoded in counterLabel),
//   - topic toggles → change topicStateKey (per-topic done bits) even when they
//     don't move the counts,
//   - config changes → new visiblePresets reference or a different progressMode.
// So equal (subject, visiblePresets, progressMode, progress, counterLabel,
// topicStateKey, handlers) ⇒ this subject's render output would be identical.
const SubjectItem = memo(
  function SubjectItem({
    subject,
    visiblePresets,
    progress,
    counterLabel,
    progressMode,
    doneTopics,
    doneChapters,
    chapterSelections,
    chapterIds,
    topicIdsByChapter,
    onTopicToggle,
    onChapterToggle,
    onTaskToggle,
    onTasksApplied,
  }: SubjectItemProps) {
    return (
      <AccordionItem
        value={subject.id}
        className="border border-border rounded-2xl overflow-hidden shadow-sm bg-card"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
          <div className="flex-1 text-left mr-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <SubjectIcon url={subject.icon_url} />
                <span className="font-bold text-base font-bengali truncate">
                  {subject.name_bn || subject.name_en}
                </span>
              </div>
              {counterLabel && (
                <span className="text-xs text-muted-foreground font-bengali ml-2 shrink-0">
                  {counterLabel}
                </span>
              )}
            </div>
            <Progress value={progress} className="h-2 rounded-full" />
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-5 pb-5">
          <div className="space-y-4 pt-2">
            {subject.chapters.map((chapter) => {
              const unit = resolveChapterUnit(
                chapter,
                visiblePresets,
                progressMode,
                doneTopics,
                doneChapters,
                chapterSelections,
              );
              const chapterProgress =
                unit.total === 0 ? 0 : Math.round((unit.done / unit.total) * 100);

              return (
                <ChapterRow
                  key={chapter.id}
                  subject={subject}
                  chapter={chapter}
                  chapterIds={chapterIds}
                  topicIds={topicIdsByChapter.get(chapter.id) ?? EMPTY_TOPIC_IDS}
                  visiblePresets={visiblePresets}
                  progressMode={progressMode}
                  chapterDone={chapterProgress === 100}
                  chapterProgress={chapterProgress}
                  doneTopics={doneTopics}
                  chapterTasks={chapterSelections[chapter.id]}
                  onTopicToggle={onTopicToggle}
                  onChapterToggle={onChapterToggle}
                  onTaskToggle={onTaskToggle}
                  onTasksApplied={onTasksApplied}
                />
              );
            })}

            {subject.chapters.length === 0 && (
              <p className="text-sm text-muted-foreground font-bengali text-center py-4">
                এই বিষয়ে কোনো অধ্যায় যোগ করা হয়নি।
              </p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  },
  (prev, next) =>
    prev.subject === next.subject &&
    prev.visiblePresets === next.visiblePresets &&
    prev.progressMode === next.progressMode &&
    prev.progress === next.progress &&
    prev.counterLabel === next.counterLabel &&
    prev.topicStateKey === next.topicStateKey &&
    prev.onTopicToggle === next.onTopicToggle &&
    prev.onChapterToggle === next.onChapterToggle &&
    prev.onTaskToggle === next.onTaskToggle &&
    prev.onTasksApplied === next.onTasksApplied,
);

// ----------------------------------------------------------------

export default function SyllabusTrackerClient() {
  // --- Group filters (synced with SyllabusFloatingDock via store) ---
  const [groupFilters, setGroupFilters] = useState<GroupFilterState>(getFilters);

  useEffect(() => {
    return onFiltersChange(() => setGroupFilters(getFilters()));
  }, []);

  // --- Supabase data ---
  const {
    data: syllabusData,
    isLoading: syllabusLoading,
    isError: syllabusError,
    refetch: refetchSyllabus,
  } = useQuery({
    queryKey: ["syllabus-data"],
    queryFn: getSyllabusData,
    staleTime: 5 * 60 * 1000,
  });

  const papers = useMemo(() => syllabusData?.papers ?? [], [syllabusData]);

  // --- Local state (always localStorage) ---
  const [localTopics, setLocalTopics] = useState<Set<string>>(() => getLocalSet(LS_TOPICS_KEY));
  const [localChapters, setLocalChapters] = useState<Set<string>>(() =>
    getLocalSet(LS_CHAPTERS_KEY),
  );

  const doneTopics: Set<string> = localTopics;
  const doneChapters: Set<string> = localChapters;

  // Refs mirror the state above so the toggle handlers can be stable
  // (useCallback with [] deps) — required for React.memo scoping.
  const localTopicsRef = useRef(localTopics);
  const localChaptersRef = useRef(localChapters);
  localTopicsRef.current = localTopics;
  localChaptersRef.current = localChapters;

  // Chapter task presets (store-backed; cached snapshot keeps stable references)
  const [chapterSelections, setChapterSelections] = useState<ChapterTaskSelections>(() =>
    getChapterSelectionsCached(),
  );
  const chapterSelectionsRef = useRef(chapterSelections);
  chapterSelectionsRef.current = chapterSelections;

  const [, setStoreVersion] = useState(0);

  useEffect(() => {
    return onChapterTasksChange(() => {
      const next = getChapterSelectionsCached();
      setChapterSelections((prev) => (prev === next ? prev : next));
      // Config-only events (preset activation/overrides/local presets) don't
      // change the selections snapshot; bump a version so a render still
      // happens and re-resolves getVisiblePresetsForSubject from its
      // invalidated cache.
      setStoreVersion((v) => v + 1);
    });
  }, []);

  const [progressMode, setProgressModeState] = useState<ProgressMode>(getProgressMode);
  const progressModeRef = useRef(progressMode);
  progressModeRef.current = progressMode;

  useEffect(() => {
    return onProgressModeChange(() => setProgressModeState(getProgressMode()));
  }, []);

  const handleTaskToggle = useCallback((chapterId: string, presetId: string) => {
    setChapterSelections(toggleChapterTask(chapterId, presetId));
  }, []);

  const handleTasksApplied = useCallback(() => {
    setChapterSelections(getChapterSelectionsCached());
  }, []);

  // ----------------------------------------------------------------
  // TOPIC TOGGLE
  // ----------------------------------------------------------------
  const handleTopicToggle = useCallback(
    (topicId: string, chapterId: string, allTopicIds: string[]) => {
      const wasDone = localTopicsRef.current.has(topicId);
      const newTopics = new Set(localTopicsRef.current);
      const newChapters = new Set(localChaptersRef.current);

      if (wasDone) {
        newTopics.delete(topicId);
        newChapters.delete(chapterId);
      } else {
        newTopics.add(topicId);
        const allDone = allTopicIds.every((id) => newTopics.has(id));
        if (allDone) newChapters.add(chapterId);
      }

      setLocalTopics(newTopics);
      setLocalChapters(newChapters);
      saveLocalSet(LS_TOPICS_KEY, newTopics);
      saveLocalSet(LS_CHAPTERS_KEY, newChapters);
    },
    [],
  );

  // ----------------------------------------------------------------
  // CHAPTER TOGGLE (mode-aware)
  // ----------------------------------------------------------------
  const handleChapterToggle = useCallback(
    (chapter: PaperChapterWithTopics, visiblePresets: ChapterTaskPreset[]) => {
      const mode = progressModeRef.current;
      const selections = chapterSelectionsRef.current;

      // Chapters with visible tasks (modes "mixed" and "task"): bulk toggle all tasks
      if (mode !== "topic" && visiblePresets.length > 0) {
        const allChecked = visiblePresets.every((p) => !!selections[chapter.id]?.[p.id]);
        setChapterSelections(
          setChapterTasks(
            chapter.id,
            visiblePresets.map((p) => p.id),
            !allChecked,
          ),
        );
        return;
      }

      // Chapters with topics (modes "mixed" without tasks and "topic"): mark all topics
      if (mode !== "task" && chapter.topics.length > 0) {
        const wasDone = localChaptersRef.current.has(chapter.id);
        const allTopicIds = chapter.topics.map((t) => t.id);
        const newTopics = new Set(localTopicsRef.current);
        const newChapters = new Set(localChaptersRef.current);

        if (wasDone) {
          newChapters.delete(chapter.id);
          allTopicIds.forEach((id) => newTopics.delete(id));
        } else {
          newChapters.add(chapter.id);
          allTopicIds.forEach((id) => newTopics.add(id));
        }

        setLocalTopics(newTopics);
        setLocalChapters(newChapters);
        saveLocalSet(LS_TOPICS_KEY, newTopics);
        saveLocalSet(LS_CHAPTERS_KEY, newChapters);
        return;
      }

      // Chapter-unit fallback (no applicable tasks/topics)
      const newChapters = new Set(localChaptersRef.current);
      if (newChapters.has(chapter.id)) {
        newChapters.delete(chapter.id);
      } else {
        newChapters.add(chapter.id);
      }
      setLocalChapters(newChapters);
      saveLocalSet(LS_CHAPTERS_KEY, newChapters);
    },
    [],
  );

  // ----------------------------------------------------------------
  // FILTERED PAPERS AND PROGRESS CALCULATIONS
  // ----------------------------------------------------------------
  const filteredPapers = useMemo(
    () =>
      papers.filter((paper) => {
        if (paper.chapters.length === 0) return false;
        // If paper has no group_ids, show it (fallback)
        if (!paper.group_ids || paper.group_ids.length === 0) return true;
        // Show if at least one of the paper's groups is enabled
        return paper.group_ids.some((gid) => groupFilters[gid]);
      }),
    [papers, groupFilters],
  );

  // Stable per-subject/per-chapter id lists (derived only from data, never
  // from toggle state) so memoized rows receive reference-stable props.
  const chapterIdsBySubject = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const subject of filteredPapers) {
      map.set(subject.id, subject.chapters.map((ch) => ch.id));
    }
    return map;
  }, [filteredPapers]);

  const topicIdsByChapter = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const subject of filteredPapers) {
      for (const chapter of subject.chapters) {
        map.set(chapter.id, chapter.topics.map((t) => t.id));
      }
    }
    return map;
  }, [filteredPapers]);

  const sumSubjectUnits = (
    subject: CurriculumPaperWithChapters,
    visiblePresets: ChapterTaskPreset[],
  ): ChapterUnit => {
    let done = 0;
    let total = 0;
    for (const ch of subject.chapters) {
      const u = resolveChapterUnit(ch, visiblePresets, progressMode, doneTopics, doneChapters, chapterSelections);
      done += u.done;
      total += u.total;
    }
    return { done, total, kind: "unit" };
  };

  const getSubjectProgress = (
    subject: CurriculumPaperWithChapters,
    visiblePresets: ChapterTaskPreset[],
  ) => {
    const { done, total } = sumSubjectUnits(subject, visiblePresets);
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const getSubjectCounter = (
    subject: CurriculumPaperWithChapters,
    visiblePresets: ChapterTaskPreset[],
  ) => {
    const acc: Record<"task" | "topic" | "unit", [number, number]> = {
      task: [0, 0],
      topic: [0, 0],
      unit: [0, 0],
    };
    for (const ch of subject.chapters) {
      const u = resolveChapterUnit(ch, visiblePresets, progressMode, doneTopics, doneChapters, chapterSelections);
      acc[u.kind][0] += u.done;
      acc[u.kind][1] += u.total;
    }
    const parts: string[] = [];
    if (acc.task[1] > 0) parts.push(`${acc.task[0]}/${acc.task[1]} টাস্ক`);
    if (acc.topic[1] > 0) parts.push(`${acc.topic[0]}/${acc.topic[1]} টপিক`);
    if (acc.unit[1] > 0) parts.push(`${acc.unit[0]}/${acc.unit[1]} অধ্যায়`);
    return parts.join(" · ");
  };

  // Changes only when preset CONFIG changes; stable primitive so the overall
  // memo recomputes on task-settings edits without recomputing every render.
  const visiblePresetsConfigVersion = getVisiblePresetsConfigVersion();

  const overallProgress = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const subject of filteredPapers) {
      const visiblePresets = getVisiblePresetsForSubject(subject.id);
      for (const ch of subject.chapters) {
        const u = resolveChapterUnit(ch, visiblePresets, progressMode, doneTopics, doneChapters, chapterSelections);
        done += u.done;
        total += u.total;
      }
    }
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }, [
    filteredPapers,
    doneTopics,
    doneChapters,
    chapterSelections,
    progressMode,
    visiblePresetsConfigVersion,
  ]);

  if (syllabusError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center bg-card border border-border rounded-2xl">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground font-bengali">ডেটা লোড করতে সমস্যা হয়েছে।</p>
        <button
          onClick={() => refetchSyllabus()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-bengali text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (syllabusLoading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
        <BookOpen className="h-14 w-14 opacity-30" />
        <p className="text-lg font-bengali">এখনো কোনো সিলেবাস যোগ করা হয়নি।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-xl shrink-0">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-semibold font-bengali flex-1">সামগ্রিক অগ্রগতি</p>
          <Badge variant="secondary" className="text-base font-bold px-4 py-1.5 shrink-0">
            {overallProgress}%
          </Badge>
        </div>
        <div className="ml-[44px]">
          <Progress value={overallProgress} className="h-3 rounded-full" />
        </div>
      </div>

      {/* Subjects accordion */}
      {filteredPapers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground font-bengali bg-card border rounded-2xl">
          কোনো সিলেবাস পাওয়া যায়নি।
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {filteredPapers.map((subject) => {
            const visiblePresets = getVisiblePresetsForSubject(subject.id);
            return (
              <SubjectItem
                key={subject.id}
                subject={subject}
                visiblePresets={visiblePresets}
                progress={getSubjectProgress(subject, visiblePresets)}
                counterLabel={getSubjectCounter(subject, visiblePresets)}
                topicStateKey={buildTopicStateKey(subject, doneTopics)}
                progressMode={progressMode}
                doneTopics={doneTopics}
                doneChapters={doneChapters}
                chapterSelections={chapterSelections}
                chapterIds={chapterIdsBySubject.get(subject.id) ?? EMPTY_CHAPTER_IDS}
                topicIdsByChapter={topicIdsByChapter}
                onTopicToggle={handleTopicToggle}
                onChapterToggle={handleChapterToggle}
                onTaskToggle={handleTaskToggle}
                onTasksApplied={handleTasksApplied}
              />
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
