import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase, setSupabaseUserHeader } from "@/lib/supabase";
import { VIRTUAL_STANDARDS, MAX_TOPICS_PER_EXAM } from "@/lib/constants/practice";
import PracticeSubjectTab from "./PracticeSubjectTab";
import PracticeUniversityTab from "./PracticeUniversityTab";
import type { PracticeExamPayload } from "./PracticeTopicSelection";

type PracticeData = {
  selectedGroupId: string | null;
  selectedDisciplines: string[];
  selectedIndividualCodes: string[];
  selectedVirtualKeys: string[];
  payload: PracticeExamPayload;
};

const initialPayload: PracticeExamPayload = {
  topicIds: [],
  chapterIds: [],
  paperIds: [],
  standardCodes: [],
  questionCount: 25,
  timeMinutes: 25,
  negativeMark: 0.25,
};

function loadPersisted(): PracticeData | null {
  try {
    const raw = sessionStorage.getItem("practiceState");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      payload: { ...initialPayload, ...parsed.payload },
    };
  } catch {
    return null;
  }
}

export default function PracticePage() {
  const persisted = loadPersisted();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const startLockRef = useRef(false);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    persisted?.selectedGroupId ?? null,
  );
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(persisted?.selectedDisciplines ?? []),
  );
  const [selectedIndividualCodes, setSelectedIndividualCodes] = useState<Set<string>>(
    new Set(persisted?.selectedIndividualCodes ?? []),
  );
  const [selectedVirtualKeys, setSelectedVirtualKeys] = useState<Set<string>>(
    new Set(persisted?.selectedVirtualKeys ?? []),
  );
  const [payload, setPayload] = useState<PracticeExamPayload>(persisted?.payload ?? initialPayload);

  const persist = useCallback(
    (
      gId: string | null,
      disciplines: Set<string>,
      codes: Set<string>,
      virtuals: Set<string>,
      p: PracticeExamPayload,
    ) => {
      try {
        sessionStorage.setItem(
          "practiceState",
          JSON.stringify({
            selectedGroupId: gId,
            selectedDisciplines: Array.from(disciplines),
            selectedIndividualCodes: Array.from(codes),
            selectedVirtualKeys: Array.from(virtuals),
            payload: p,
          }),
        );
      } catch {
        /* quota exceeded – ignore */
      }
    },
    [],
  );

  const handleGroupIdChange = useCallback(
    (id: string) => {
      setSelectedGroupId(id);
      setSelectedDisciplines(new Set());
      setSelectedIndividualCodes(new Set());
      setSelectedVirtualKeys(new Set());
      setPayload(initialPayload);
      persist(id, new Set(), new Set(), new Set(), initialPayload);
    },
    [persist],
  );

  const handleDisciplinesChange = useCallback(
    (disciplines: Set<string>) => {
      setSelectedDisciplines(disciplines);
      const next = { ...initialPayload };
      persist(selectedGroupId, disciplines, selectedIndividualCodes, selectedVirtualKeys, next);
      setPayload(next);
    },
    [selectedGroupId, selectedIndividualCodes, selectedVirtualKeys, persist],
  );

  const handleIndividualCodesChange = useCallback(
    (codes: Set<string>) => {
      setSelectedIndividualCodes(codes);
      const effective = new Set<string>();
      codes.forEach((c) => effective.add(c));
      selectedVirtualKeys.forEach((vk) => {
        const match = VIRTUAL_STANDARDS.find((v) => `virtual:${v.label}` === vk);
        if (match) match.codes.forEach((c) => effective.add(c));
      });
      const next = { ...payload, standardCodes: Array.from(effective) };
      persist(selectedGroupId, selectedDisciplines, codes, selectedVirtualKeys, next);
      setPayload(next);
    },
    [selectedGroupId, selectedDisciplines, selectedVirtualKeys, payload, persist],
  );

  const handleVirtualKeysChange = useCallback(
    (virtuals: Set<string>) => {
      setSelectedVirtualKeys(virtuals);
      const effective = new Set<string>();
      selectedIndividualCodes.forEach((c) => effective.add(c));
      virtuals.forEach((vk) => {
        const match = VIRTUAL_STANDARDS.find((v) => `virtual:${v.label}` === vk);
        if (match) match.codes.forEach((c) => effective.add(c));
      });
      const next = { ...payload, standardCodes: Array.from(effective) };
      persist(selectedGroupId, selectedDisciplines, selectedIndividualCodes, virtuals, next);
      setPayload(next);
    },
    [selectedGroupId, selectedDisciplines, selectedIndividualCodes, payload, persist],
  );

  const handleUpdatePayload = useCallback(
    (updater: (prev: PracticeExamPayload) => PracticeExamPayload) => {
      setPayload((prev) => {
        const next = updater(prev);
        persist(
          selectedGroupId,
          selectedDisciplines,
          selectedIndividualCodes,
          selectedVirtualKeys,
          next,
        );
        return next;
      });
    },
    [selectedGroupId, selectedDisciplines, selectedIndividualCodes, selectedVirtualKeys, persist],
  );

  const handleReset = useCallback(() => {
    setSelectedGroupId(null);
    setSelectedDisciplines(new Set());
    setSelectedIndividualCodes(new Set());
    setSelectedVirtualKeys(new Set());
    setPayload(initialPayload);
    sessionStorage.removeItem("practiceState");
  }, []);

  const handleStartExam = useCallback(async () => {
    if (!user) {
      toast({
        title: "লগইন প্রয়োজন",
        description: "পরীক্ষা শুরু করতে প্রথমে লগইন করুন।",
        variant: "destructive",
      });
      return;
    }
    const totalSelected =
      payload.topicIds.length + payload.chapterIds.length + payload.paperIds.length;
    if (totalSelected === 0) {
      toast({
        title: "কোনো টপিক সিলেক্ট হয়নি",
        description: "অন্তত একটি টপিক সিলেক্ট করুন।",
        variant: "destructive",
      });
      return;
    }

    if (payload.topicIds.length > MAX_TOPICS_PER_EXAM) {
      toast({
        title: "অনেক বেশি টপিক সিলেক্ট হয়েছে",
        description: `আপনি একসাথে অনেক বেশি টপিক সিলেক্ট করেছেন। দয়া করে সর্বোচ্চ ${MAX_TOPICS_PER_EXAM}টি টপিক সিলেক্ট করুন।`,
        variant: "destructive",
      });
      return;
    }

    if (startLockRef.current) return;
    startLockRef.current = true;
    setIsStarting(true);
    try {
      setSupabaseUserHeader(user.uid);
      const { data: rawQuestions, error: rpcErr } = await supabase.rpc("start_practice_exam", {
        p_topic_ids: payload.topicIds.length > 0 ? payload.topicIds : null,
        p_chapter_ids: payload.chapterIds.length > 0 ? payload.chapterIds : null,
        p_paper_ids: payload.paperIds.length > 0 ? payload.paperIds : null,
        p_standard_ids: payload.standardCodes.length > 0 ? payload.standardCodes : null,
        p_limit: payload.questionCount,
        p_time_minutes: payload.timeMinutes,
        p_negative_mark: payload.negativeMark,
      });

      if (rpcErr) {
        console.error("RPC Start Exam Error:", rpcErr);
        toast({
          title: "ত্রুটি",
          description: rpcErr.message || "পরীক্ষা শুরু করা যায়নি।",
          variant: "destructive",
        });
        return;
      }

      const questionList = (rawQuestions as { id: string; session_id?: string }[]) || [];
      if (questionList.length === 0) {
        toast({
          title: "প্রশ্ন পাওয়া যায়নি",
          description: "নির্বাচিত টপিকে কোনো প্রশ্ন পাওয়া যায়নি।",
          variant: "destructive",
        });
        return;
      }

      const sessionId = questionList[0]?.session_id;
      if (!sessionId) {
        toast({
          title: "সেশন তৈরি ব্যর্থ",
          description: "পরীক্ষার সেশন তৈরি করা যায়নি।",
          variant: "destructive",
        });
        return;
      }

      sessionStorage.removeItem("practiceState");
      navigate(`/dashboard/practice/exam/${sessionId}`);
    } catch (err) {
      toast({
        title: "অপ্রত্যাশিত ত্রুটি",
        description: err instanceof Error ? err.message : "কিছু ভুল হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
      startLockRef.current = false;
    }
  }, [user, payload, navigate, toast]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      <PageHeader
        title="আনলিমিটেড প্রাকটিস"
        description="যেকোনো বিষয়, যেকোনো টপিক, যেকোনো ইউনিভার্সিটি, যেকোনো কোর্স কিংবা নিজের পূর্বে দেয়া পরীক্ষায় ভুল করা প্রশ্নের উপর আনলিমিটেড পরীক্ষা"
      />

      <Tabs defaultValue="subject" className="w-full">
        <TabsList className="h-auto p-1 bg-muted rounded-xl flex-wrap justify-center max-w-lg mx-auto">
          <TabsTrigger
            value="subject"
            className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            বিষয়
          </TabsTrigger>
          <TabsTrigger
            value="university"
            className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            ইউনিভার্সিটি
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subject" className="mt-6">
          <PracticeSubjectTab
            selectedGroupId={selectedGroupId}
            onGroupIdChange={handleGroupIdChange}
            selectedDisciplines={selectedDisciplines}
            onDisciplinesChange={handleDisciplinesChange}
            selectedIndividualCodes={selectedIndividualCodes}
            onIndividualCodesChange={handleIndividualCodesChange}
            selectedVirtualKeys={selectedVirtualKeys}
            onVirtualKeysChange={handleVirtualKeysChange}
            payload={payload}
            onUpdatePayload={handleUpdatePayload}
            onReset={handleReset}
            onStartExam={handleStartExam}
            isStarting={isStarting}
          />
        </TabsContent>
        <TabsContent value="university" className="mt-6">
          <PracticeUniversityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
