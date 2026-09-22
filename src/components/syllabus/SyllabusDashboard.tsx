import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSyllabusForUnit,
  fetchNextExamSchedule,
  type AdmissionUnitItem,
  type InstitutionItem,
  type SyllabusPaper,
  type UnitMarksDistribution,
  type ExamScheduleItem,
} from "@/lib/syllabus-queries";
import { toBanglaNumber } from "@/lib/date-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  CalendarClock,
  SquareArrowOutUpRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
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
const LS_TOPICS_PREFIX = "st_topics_";
const LS_CHAPTERS_PREFIX = "st_chapters_";

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

// --- Progress cache (write-through) ---
const LS_PROGRESS_PREFIX = "st_progress_";

type ProgressCache = { completed: number; total: number; updatedAt: number };

function updateProgressCache(
  universityId: string,
  papers: SyllabusPaper[],
  doneTopics: Set<string>,
  doneChapters: Set<string>,
) {
  if (!universityId || papers.length === 0) return;

  let total = 0;
  let completed = 0;

  for (const paper of papers) {
    for (const ch of paper.chapters) {
      if (ch.topics.length === 0) {
        total++;
        if (doneChapters.has(ch.id)) completed++;
      } else {
        for (const t of ch.topics) {
          total++;
          if (doneTopics.has(t.id)) completed++;
        }
      }
    }
  }

  const entry: ProgressCache = { completed, total, updatedAt: Date.now() };
  try {
    localStorage.setItem(`${LS_PROGRESS_PREFIX}${universityId}`, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------
// Marks Distribution Display
// ----------------------------------------------------------------

function MarksDistributionCard({
  dist,
  groupId,
  institution,
  activeUnit,
}: {
  dist: UnitMarksDistribution;
  groupId?: string;
  institution?: InstitutionItem;
  activeUnit?: AdmissionUnitItem;
}) {
  const marksDetails: string[] = [];
  if (dist.mcq_marks != null) marksDetails.push(`MCQ: ${toBanglaNumber(dist.mcq_marks)}`);
  if (dist.written_marks != null) marksDetails.push(`লিখিত: ${toBanglaNumber(dist.written_marks)}`);
  if (dist.other_marks != null) {
    const type = dist.other_marks_type || "অন্যান্য";
    marksDetails.push(`${type}: ${toBanglaNumber(dist.other_marks)}`);
  }

  const allRules = (dist.subject_selection_rules || []) as {
    target_group: string;
    group_ids?: string[];
    total_subjects_to_answer: number;
    rules: {
      type: string;
      title: string;
      note?: string;
      subjects: {
        name: string;
        mcq?: number;
        written?: number;
        total_marks?: number;
        pass_marks?: number;
      }[];
    }[];
  }[];

  const rulesList = useMemo(() => {
    if (!groupId || allRules.length === 0) return allRules;

    const byGroupIds = allRules.filter((r) => r.group_ids?.includes(groupId));
    if (byGroupIds.length > 0) return byGroupIds;

    const matched = allRules.filter((r) => {
      const target = r.target_group?.toLowerCase() || "";
      if (groupId === "2803200a") return target.includes("বিজ্ঞান");
      if (groupId === "dcfd4b49") return target.includes("কলা") || target.includes("অন্য");
      if (groupId === "c151111f") return target.includes("বাণিজ্য") || target.includes("অন্য");
      return false;
    });
    return matched.length > 0 ? matched : allRules;
  }, [allRules, groupId]);

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-xl p-4 text-sm font-bengali bg-card">
        {dist.total_marks != null && (
          <div>
            ● <b>মোট নাম্বার:</b> {toBanglaNumber(dist.total_marks)} নাম্বার
            {(marksDetails.length > 0 || dist.total_time) && (
              <hr className="my-1.5 border-border/50" />
            )}
          </div>
        )}
        {marksDetails.length > 0 && (
          <div>
            ● <b>মান বণ্টন:</b> {marksDetails.join(", ")}
            {dist.total_time && <hr className="my-1.5 border-border/50" />}
          </div>
        )}
        {dist.total_time != null && (
          <div>
            ● <b>মোট সময়:</b> {toBanglaNumber(dist.total_time)} ঘণ্টা
          </div>
        )}
        {dist.general_note && (
          <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-2 leading-relaxed whitespace-pre-line">
            {dist.general_note}
          </div>
        )}
      </div>

      {rulesList.length > 0 && (
        <div className="space-y-2">
          {rulesList.map((group, groupIdx) => (
            <Accordion key={groupIdx} type="single" collapsible className="w-full">
              <AccordionItem
                value={`group-${groupIdx}`}
                className="border border-border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-3 py-2.5 text-sm font-bold hover:no-underline">
                  <div className="flex items-center font-bengali text-left gap-2">
                    <CircleHelp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{group.target_group} বিভাগ — কোন কোন বিষয় দাগাতে হবে?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 text-sm font-bengali leading-relaxed space-y-3">
                  <div>
                    <strong>
                      মোট {toBanglaNumber(group.total_subjects_to_answer)}টি বিষয় দাগাতে হবে।
                    </strong>
                  </div>
                  {group.rules?.map((rule, ruleIdx) => (
                    <div key={ruleIdx} className="space-y-1.5">
                      <div className="font-bold text-foreground text-xs sm:text-sm flex items-start gap-1">
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                        <span>{rule.title}</span>
                      </div>
                      {rule.subjects?.length > 0 && (
                        <ul className="pl-5 space-y-0.5 text-xs sm:text-sm text-muted-foreground">
                          {rule.subjects.map((sub, subIdx) => {
                            const parts: string[] = [];
                            if (sub.mcq != null) parts.push(`MCQ: ${toBanglaNumber(sub.mcq)}`);
                            if (sub.written != null)
                              parts.push(`লিখিত: ${toBanglaNumber(sub.written)}`);
                            if (sub.total_marks != null)
                              parts.push(`মোট: ${toBanglaNumber(sub.total_marks)}`);
                            return (
                              <li key={subIdx} className="flex items-center gap-1.5">
                                <span className="text-muted-foreground/50 text-[10px]">○</span>
                                <span>{sub.name}</span>
                                {parts.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ({parts.join(", ")})
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {rule.note && (
                        <p className="text-[11px] text-muted-foreground">({rule.note})</p>
                      )}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      )}

      {(institution?.second_time ||
        (institution?.negative_mark != null && Number(institution.negative_mark) > 0) ||
        institution?.calculator_allowed ||
        activeUnit?.calculator_allowed) && (
        <div className="border border-border rounded-xl p-4 text-sm font-bengali bg-card">
          {institution?.second_time != null && (
            <div>
              ● <b>সেকেন্ড টাইম:</b>{" "}
              {institution.second_time ? (
                <span>
                  আছে
                  {institution.second_time_condition
                    ? ` (${institution.second_time_condition})`
                    : ""}
                </span>
              ) : (
                <span>নেই</span>
              )}
              <hr className="my-1.5 border-border/50" />
            </div>
          )}

          {institution?.negative_mark != null && Number(institution.negative_mark) > 0 && (
            <div>
              ● <b>নেগেটিভ মার্কিং:</b> প্রতি ভুলের জন্য{" "}
              {toBanglaNumber(Number(institution.negative_mark))} নম্বর কাটা যাবে
              <hr className="my-1.5 border-border/50" />
            </div>
          )}

          <div>
            ● <b>ক্যালকুলেটর:</b>{" "}
            {(() => {
              const isAllowed =
                activeUnit?.calculator_allowed ?? institution?.calculator_allowed ?? false;
              const calcLink =
                activeUnit?.calculator_link?.trim() || institution?.calculator_link?.trim() || null;
              return (
                <span>
                  {isAllowed ? "ব্যবহার করা যাবে" : "ব্যবহার করা যাবে না"}
                  {calcLink && (
                    <a
                      href={calcLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors font-bengali align-middle"
                    >
                      <span>অনুমোদিত ক্যালকুলেটরের তালিকা</span>
                      <SquareArrowOutUpRight className="h-3 w-3" />
                    </a>
                  )}
                </span>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Exam Countdown
// ----------------------------------------------------------------

function ExamCountdown({ schedule }: { schedule: ExamScheduleItem }) {
  const examDate = new Date(schedule.exam_datetime);

  const [diff, setDiff] = useState(() => examDate.getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setDiff(examDate.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [examDate]);

  if (diff <= 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl shrink-0">
          <CalendarClock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-bengali">পরীক্ষা চলছে বা শেষ হয়েছে</p>
          <p className="text-sm font-semibold font-bengali">
            {examDate.toLocaleDateString("bn-BD", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {schedule.is_tentative && (
              <span className="ml-2 text-[10px] text-muted-foreground">(অনুমানিক)</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl shrink-0">
        <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-bengali mb-1">
          পরীক্ষা বাকি
          {schedule.is_tentative && <span className="ml-1 text-[10px]">(অনুমানিক)</span>}
        </p>
        <div className="flex items-center gap-2 text-sm font-bold font-bengali">
          {days > 0 && <span>{toBanglaNumber(days)} দিন</span>}
          {hours > 0 && <span>{toBanglaNumber(hours)} ঘণ্টা</span>}
          <span>{toBanglaNumber(minutes)} মিনিট</span>
          <span>{toBanglaNumber(seconds)} সেকেন্ড</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-bengali mt-1">
          {examDate.toLocaleDateString("bn-BD", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        {schedule.note && (
          <p className="text-[11px] text-muted-foreground font-bengali mt-0.5">{schedule.note}</p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Subjects Tab Content
// ----------------------------------------------------------------

type ChapterUnit = { done: number; total: number; kind: "task" | "topic" | "unit" };

// Resolve a chapter's progress source per the active progress mode:
// tasks (when applicable) → topics (when applicable) → chapter-unit (0/1)
function resolveChapterUnit(
  chapter: SyllabusPaper["chapters"][0],
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
function buildTopicStateKey(subject: SyllabusPaper, doneTopics: Set<string>): string {
  let key = "";
  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) key += doneTopics.has(topic.id) ? "1" : "0";
    key += "|";
  }
  return key;
}

type TopicRowProps = {
  topic: SyllabusPaper["chapters"][0]["topics"][0];
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
    <div className="flex items-center gap-2">
      <Checkbox
        id={`tp-${topic.id}`}
        checked={done}
        onCheckedChange={() => onTopicToggle(topic.id, chapterId, topicIds)}
        className="shrink-0"
      />
      <label
        htmlFor={`tp-${topic.id}`}
        className={`text-xs font-bengali cursor-pointer transition-all duration-200 ${
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
  subject: SyllabusPaper;
  chapter: SyllabusPaper["chapters"][0];
  chapterIds: string[];
  topicIds: string[];
  visiblePresets: ChapterTaskPreset[];
  progressMode: ProgressMode;
  chapterDone: boolean;
  chapterProgress: number;
  doneTopics: Set<string>;
  chapterTasks: Record<string, boolean> | undefined;
  onTopicToggle: (topicId: string, chapterId: string, allTopicIds: string[]) => void;
  onChapterToggle: (chapter: SyllabusPaper["chapters"][0], visiblePresets: ChapterTaskPreset[]) => void;
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
      className={`border rounded-xl p-3 transition-all duration-300 ${
        chapterDone ? "border-primary/20 bg-primary/5" : "border-border bg-background"
      }`}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <Checkbox
          id={`ch-${chapter.id}`}
          checked={chapterDone}
          onCheckedChange={() => onChapterToggle(chapter, visiblePresets)}
          className="mt-0.5 shrink-0"
        />
        <label
          htmlFor={`ch-${chapter.id}`}
          className={`font-semibold text-sm font-bengali cursor-pointer flex-1 leading-snug transition-all duration-200 ${
            chapterDone ? "line-through text-muted-foreground/60" : "text-foreground"
          }`}
        >
          {chapter.serial ? `অধ্যায় ${chapter.serial}: ` : ""}
          {chapter.name}
        </label>
        <span className="text-[11px] text-muted-foreground shrink-0 font-bengali">
          {chapterProgress}%
        </span>
      </div>

      {/* Chapter Tasks (hidden in "topic" mode) */}
      {progressMode !== "topic" && visiblePresets.length > 0 && (
        <div className="ml-0 md:ml-6 mb-5">
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
        <div className="ml-0 md:ml-6">
          <p className="text-[11px] font-semibold text-muted-foreground font-bengali mb-1.5">
            টপিক
          </p>
          <hr className="border-border/50 mb-2" />
          <div className="space-y-1.5">
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
  subject: SyllabusPaper;
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
  onChapterToggle: (chapter: SyllabusPaper["chapters"][0], visiblePresets: ChapterTaskPreset[]) => void;
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
        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-muted/30 transition-colors">
          <div className="flex-1 text-left mr-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <SubjectIcon url={subject.icon_url} />
                <span className="font-bold text-sm font-bengali truncate">
                  {subject.name_bn || subject.name_en}
                </span>
              </div>
              {counterLabel && (
                <span className="text-[11px] text-muted-foreground font-bengali ml-2 shrink-0">
                  {counterLabel}
                </span>
              )}
            </div>
            <Progress value={progress} className="h-1.5 rounded-full" />
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-4 pb-4">
          <div className="space-y-3 pt-1">
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
              <p className="text-xs text-muted-foreground font-bengali text-center py-3">
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

function SubjectsTab({
  papers,
  doneTopics,
  doneChapters,
  onTopicToggle,
  onChapterToggle,
  examSchedule,
  taskScope,
}: {
  papers: SyllabusPaper[];
  doneTopics: Set<string>;
  doneChapters: Set<string>;
  onTopicToggle: (topicId: string, chapterId: string, allTopicIds: string[]) => void;
  onChapterToggle: (chapter: SyllabusPaper["chapters"][0], mode: ProgressMode) => void;
  examSchedule: ExamScheduleItem | null;
  taskScope?: string;
}) {
  // Chapter task presets (store-backed; cached snapshot keeps stable references)
  const [chapterSelections, setChapterSelections] = useState<ChapterTaskSelections>(() =>
    getChapterSelectionsCached(taskScope),
  );
  const chapterSelectionsRef = useRef(chapterSelections);
  chapterSelectionsRef.current = chapterSelections;

  const [, setStoreVersion] = useState(0);

  useEffect(() => {
    return onChapterTasksChange(() => {
      const next = getChapterSelectionsCached(taskScope);
      setChapterSelections((prev) => (prev === next ? prev : next));
      // Config-only events don't change the selections snapshot; bump a
      // version so the render still happens and re-resolves the preset cache.
      setStoreVersion((v) => v + 1);
    });
  }, [taskScope]);

  const [progressMode, setProgressModeState] = useState<ProgressMode>(getProgressMode);
  const progressModeRef = useRef(progressMode);
  progressModeRef.current = progressMode;

  useEffect(() => {
    return onProgressModeChange(() => setProgressModeState(getProgressMode()));
  }, []);

  const handleTaskToggle = useCallback(
    (chapterId: string, presetId: string) => {
      setChapterSelections(toggleChapterTask(chapterId, presetId, taskScope));
    },
    [taskScope],
  );

  const handleTasksApplied = useCallback(() => {
    setChapterSelections(getChapterSelectionsCached(taskScope));
  }, [taskScope]);

  // Chapters with visible tasks: bulk toggle all tasks locally.
  // Otherwise delegate to the parent (topic marking or chapter-unit toggle).
  const handleChapterClick = useCallback(
    (chapter: SyllabusPaper["chapters"][0], visiblePresets: ChapterTaskPreset[]) => {
      const mode = progressModeRef.current;
      const selections = chapterSelectionsRef.current;
      if (mode !== "topic" && visiblePresets.length > 0) {
        const allChecked = visiblePresets.every((p) => !!selections[chapter.id]?.[p.id]);
        setChapterSelections(
          setChapterTasks(
            chapter.id,
            visiblePresets.map((p) => p.id),
            !allChecked,
            taskScope,
          ),
        );
        return;
      }
      onChapterToggle(chapter, mode);
    },
    [onChapterToggle, taskScope],
  );

  // Stable per-subject/per-chapter id lists (derived only from data, never
  // from toggle state) so memoized rows receive reference-stable props.
  const chapterIdsBySubject = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const subject of papers) {
      map.set(subject.id, subject.chapters.map((ch) => ch.id));
    }
    return map;
  }, [papers]);

  const topicIdsByChapter = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const subject of papers) {
      for (const chapter of subject.chapters) {
        map.set(chapter.id, chapter.topics.map((t) => t.id));
      }
    }
    return map;
  }, [papers]);

  const sumSubjectUnits = (
    subject: SyllabusPaper,
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

  const getSubjectProgress = (subject: SyllabusPaper, visiblePresets: ChapterTaskPreset[]) => {
    const { done, total } = sumSubjectUnits(subject, visiblePresets);
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const getSubjectCounter = (subject: SyllabusPaper, visiblePresets: ChapterTaskPreset[]) => {
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
    for (const subject of papers) {
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
    papers,
    doneTopics,
    doneChapters,
    chapterSelections,
    progressMode,
    visiblePresetsConfigVersion,
  ]);

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <BookOpen className="h-12 w-12 opacity-30" />
        <p className="text-sm font-bengali">এই ইউনিটের জন্য কোনো সিলেবাস পাওয়া যায়নি।</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examSchedule && <ExamCountdown schedule={examSchedule} />}

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold font-bengali flex-1">সামগ্রিক অগ্রগতি</p>
          <Badge variant="secondary" className="text-sm font-bold px-3 py-1 shrink-0">
            {overallProgress}%
          </Badge>
        </div>
        <div className="ml-[38px]">
          <Progress value={overallProgress} className="h-2.5 rounded-full" />
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {papers.map((subject) => {
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
              onTopicToggle={onTopicToggle}
              onChapterToggle={handleChapterClick}
              onTaskToggle={handleTaskToggle}
              onTasksApplied={handleTasksApplied}
            />
          );
        })}
      </Accordion>
    </div>
  );
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

interface Props {
  unit: AdmissionUnitItem;
  groupId?: string;
  institution?: InstitutionItem;
}

export default function SyllabusDashboard({ unit, groupId, institution }: Props) {
  const topicsKey = `${LS_TOPICS_PREFIX}${unit.id}`;
  const chaptersKey = `${LS_CHAPTERS_PREFIX}${unit.id}`;

  const {
    data: syllabusData,
    isLoading: papersLoading,
    isError: papersError,
    refetch: refetchPapers,
  } = useQuery({
    queryKey: ["syllabus-unit-papers", unit.id, groupId],
    queryFn: () => fetchSyllabusForUnit(unit, groupId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: examSchedule } = useQuery({
    queryKey: ["exam-schedule", unit.id],
    queryFn: () => fetchNextExamSchedule(unit.id),
    staleTime: 10 * 60 * 1000,
  });

  const papers = useMemo(() => syllabusData?.papers ?? [], [syllabusData]);
  const marksDist = syllabusData?.marksDistribution ?? null;

  const [localTopics, setLocalTopics] = useState<Set<string>>(() => getLocalSet(topicsKey));
  const [localChapters, setLocalChapters] = useState<Set<string>>(() => getLocalSet(chaptersKey));

  const doneTopics: Set<string> = localTopics;
  const doneChapters: Set<string> = localChapters;

  // Refs mirror the state above so the handlers passed down to memoized rows
  // keep a stable identity across toggles.
  const localTopicsRef = useRef(localTopics);
  const localChaptersRef = useRef(localChapters);
  localTopicsRef.current = localTopics;
  localChaptersRef.current = localChapters;

  // Initialize progress cache if missing (first visit)
  useEffect(() => {
    const progressKey = institution?.id;
    if (papers.length > 0 && progressKey) {
      const existing = localStorage.getItem(`${LS_PROGRESS_PREFIX}${progressKey}`);
      if (!existing) {
        updateProgressCache(progressKey, papers, doneTopics, doneChapters);
      }
    }
  }, [papers, institution?.id, doneTopics, doneChapters]);

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
      saveLocalSet(topicsKey, newTopics);
      saveLocalSet(chaptersKey, newChapters);
      if (institution?.id) updateProgressCache(institution.id, papers, newTopics, newChapters);
    },
    [institution?.id, papers, topicsKey, chaptersKey],
  );

  const handleChapterToggle = useCallback(
    (chapter: SyllabusPaper["chapters"][0], mode: ProgressMode) => {
      const wasDone = localChaptersRef.current.has(chapter.id);
      const allTopicIds = chapter.topics.map((t) => t.id);
      const newTopics = new Set(localTopicsRef.current);
      const newChapters = new Set(localChaptersRef.current);

      if (mode === "task" || chapter.topics.length === 0) {
        // "task" mode without visible tasks, or chapter without topics: unit toggle only
        if (wasDone) {
          newChapters.delete(chapter.id);
        } else {
          newChapters.add(chapter.id);
        }
      } else {
        // Topic marking (modes "mixed" without tasks and "topic")
        if (wasDone) {
          newChapters.delete(chapter.id);
          allTopicIds.forEach((id) => newTopics.delete(id));
        } else {
          newChapters.add(chapter.id);
          allTopicIds.forEach((id) => newTopics.add(id));
        }
      }

      setLocalTopics(newTopics);
      setLocalChapters(newChapters);
      saveLocalSet(topicsKey, newTopics);
      saveLocalSet(chaptersKey, newChapters);
      if (institution?.id) updateProgressCache(institution.id, papers, newTopics, newChapters);
    },
    [institution?.id, papers, topicsKey, chaptersKey],
  );

  if (papersError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center bg-card border border-border rounded-2xl">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground font-bengali">ডেটা লোড করতে সমস্যা হয়েছে।</p>
        <button
          onClick={() => refetchPapers()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-bengali text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (papersLoading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  const hasMarksDist = marksDist != null;

  if (!hasMarksDist) {
    return (
      <SubjectsTab
        papers={papers}
        doneTopics={doneTopics}
        doneChapters={doneChapters}
        onTopicToggle={handleTopicToggle}
        onChapterToggle={handleChapterToggle}
        examSchedule={examSchedule ?? null}
        taskScope={institution?.slug}
      />
    );
  }

  return (
    <Tabs defaultValue="subjects">
      <TabsList className="flex w-full gap-2 p-1 overflow-x-auto bg-muted/50 rounded-xl mb-5">
        <TabsTrigger
          value="subjects"
          className="flex-1 py-2 px-3 rounded-lg text-sm font-bengali shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          বিষয়সমূহ
        </TabsTrigger>
        <TabsTrigger
          value="marks"
          className="flex-1 py-2 px-3 rounded-lg text-sm font-bengali shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          মানবন্টন
        </TabsTrigger>
      </TabsList>

      <TabsContent value="subjects">
        <SubjectsTab
          papers={papers}
          doneTopics={doneTopics}
          doneChapters={doneChapters}
          onTopicToggle={handleTopicToggle}
          onChapterToggle={handleChapterToggle}
          examSchedule={examSchedule ?? null}
          taskScope={institution?.slug}
        />
      </TabsContent>

      <TabsContent value="marks">
        {marksDist && (
          <MarksDistributionCard
            dist={marksDist}
            groupId={groupId}
            institution={institution}
            activeUnit={unit}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
