"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Scroll,
  TimerIcon,
  FilePenLine,
  FileText,
  CheckCircle,
  BarChart,
  RotateCcw,
  Check,
  X,
  History,
  Trash2,
  ZoomIn,
  ZoomOut,
  UploadCloud,
  Info,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import SimplePageHeader from "@/components/common/SimplePageHeader";

type View = "config" | "test" | "answers" | "result";
type Answer = { q: number; value: string };

interface ResultBreakdown {
  q: number;
  userAnswer: string;
  correctAnswer?: string;
  status: "correct" | "incorrect" | "skipped";
}

interface ExamResult {
  id: number;
  testName: string;
  mcqNumber: number;
  timeLimit: number;
  correctCount: number;
  incorrectCount: number;
  totalScore: number;
  date: string;
}

const bengaliToEnglishNumber = (str: string): string => {
  const bengaliNumerals = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const englishNumerals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let newStr = str;
  for (let i = 0; i < 10; i++) {
    newStr = newStr.replace(new RegExp(bengaliNumerals[i], "g"), englishNumerals[i]);
  }
  return newStr;
};

const QUESTION_PAPER_DB_NAME = "selfTestQuestionPaper";
const QUESTION_PAPER_DB_STORE = "questionPapers";
const QUESTION_PAPER_DB_KEY = "current";

const openQuestionPaperDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(QUESTION_PAPER_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUESTION_PAPER_DB_STORE)) {
        db.createObjectStore(QUESTION_PAPER_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveQuestionPaperFile = (id: string, file: File | Blob): Promise<void> =>
  openQuestionPaperDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(QUESTION_PAPER_DB_STORE, "readwrite");
        tx.objectStore(QUESTION_PAPER_DB_STORE).put(file, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );

const getQuestionPaperFile = (id: string): Promise<File | Blob | undefined> =>
  openQuestionPaperDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(QUESTION_PAPER_DB_STORE, "readonly");
        const request = tx.objectStore(QUESTION_PAPER_DB_STORE).get(id);
        request.onsuccess = () => resolve(request.result as File | Blob | undefined);
        request.onerror = () => reject(request.error);
      }),
  );

const deleteQuestionPaperFromDb = (id: string): Promise<void> =>
  openQuestionPaperDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(QUESTION_PAPER_DB_STORE, "readwrite");
        tx.objectStore(QUESTION_PAPER_DB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );

export default function ExamPage() {
  const [view, setView] = useState<View>("config");

  // Config state
  const [testName, setTestName] = useState("");
  const [mcqNumber, setMcqNumber] = useState(10);
  const [timeLimit, setTimeLimit] = useState(10);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.25);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [activeTab, setActiveTab] = useState<"self" | "ready">("self");

  // Question paper state
  const [questionPaperUrl, setQuestionPaperUrl] = useState<string | null>(null);
  const [questionPaperType, setQuestionPaperType] = useState<"pdf" | "image" | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [questionPaperFileName, setQuestionPaperFileName] = useState("");

  // Answers view paper (fresh upload, independent from config paper)
  const [ansPaperUrl, setAnsPaperUrl] = useState<string | null>(null);
  const [ansPaperType, setAnsPaperType] = useState<"pdf" | "image" | null>(null);
  const [ansPaperName, setAnsPaperName] = useState("");
  const [ansZoom, setAnsZoom] = useState(1);

  // Test state
  const [timeLeft, setTimeLeft] = useState("");
  const [isTimeLow, setIsTimeLow] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Answer[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<Answer[]>([]);
  const [isSummaryVisible, setSummaryVisible] = useState(false);

  // Result state
  const [resultDetails, setResultDetails] = useState<ResultBreakdown[]>([]);
  const [resultStats, setResultStats] = useState({
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
    totalScore: 0,
    accuracy: 0,
    correctPercentage: 0,
    negativeMark: 0,
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("omrTestHistory");
    if (savedHistory) {
      setExamHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveResultToHistory = (newResult: Omit<ExamResult, "id" | "date">) => {
    const resultToSave: ExamResult = {
      ...newResult,
      id: Date.now(),
      date: new Date().toLocaleString("bn-BD"),
    };
    const updatedHistory = [...examHistory, resultToSave];
    setExamHistory(updatedHistory);
    localStorage.setItem("omrTestHistory", JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (window.confirm("আপনি কি নিশ্চিতভাবে সব পরীক্ষার ইতিহাস মুছে ফেলতে চান?")) {
      setExamHistory([]);
      localStorage.removeItem("omrTestHistory");
    }
  };

  const deleteHistoryItem = (id: number) => {
    const updatedHistory = examHistory.filter((exam) => exam.id !== id);
    setExamHistory(updatedHistory);
    localStorage.setItem("omrTestHistory", JSON.stringify(updatedHistory));
  };

  // --- Question Paper (Upload / IndexedDB / Viewer) ---
  const handleQuestionPaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (questionPaperUrl) URL.revokeObjectURL(questionPaperUrl);
      await deleteQuestionPaperFromDb(QUESTION_PAPER_DB_KEY);
      const type = file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "pdf" : "image";
      await saveQuestionPaperFile(QUESTION_PAPER_DB_KEY, file);
      setQuestionPaperUrl(URL.createObjectURL(file));
      setQuestionPaperType(type);
      setQuestionPaperFileName(file.name);
      setZoomLevel(1);
    } catch {
      alert("ফাইল আপলোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      e.currentTarget.value = "";
    }
  };

  const removeQuestionPaper = async () => {
    await deleteQuestionPaperFromDb(QUESTION_PAPER_DB_KEY);
    if (questionPaperUrl) URL.revokeObjectURL(questionPaperUrl);
    setQuestionPaperUrl(null);
    setQuestionPaperType(null);
    setQuestionPaperFileName("");
    setZoomLevel(1);
  };

  // --- Answers view paper handlers ---
  const handleAnsPaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (ansPaperUrl) URL.revokeObjectURL(ansPaperUrl);
      await deleteQuestionPaperFromDb("answersPaper");
      const type = file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "pdf" : "image";
      await saveQuestionPaperFile("answersPaper", file);
      setAnsPaperUrl(URL.createObjectURL(file));
      setAnsPaperType(type);
      setAnsPaperName(file.name);
      setAnsZoom(1);
    } catch {
      alert("ফাইল আপলোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      e.currentTarget.value = "";
    }
  };

  const removeAnsPaper = async () => {
    await deleteQuestionPaperFromDb("answersPaper");
    if (ansPaperUrl) URL.revokeObjectURL(ansPaperUrl);
    setAnsPaperUrl(null);
    setAnsPaperType(null);
    setAnsPaperName("");
    setAnsZoom(1);
  };

  useEffect(() => {
    if (view !== "result") return;
    removeAnsPaper();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      deleteQuestionPaperFromDb("answersPaper").catch(() => {});
      if (ansPaperUrl) URL.revokeObjectURL(ansPaperUrl);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [ansPaperUrl]);

  useEffect(() => {
    const restorePaper = async () => {
      try {
        const file = await getQuestionPaperFile(QUESTION_PAPER_DB_KEY);
        if (file instanceof Blob) {
          setQuestionPaperUrl(URL.createObjectURL(file));
          setQuestionPaperType(file.type === "application/pdf" ? "pdf" : "image");
          setQuestionPaperFileName(file instanceof File ? file.name : "");
        }
      } catch {
        // ignore
      }
    };
    restorePaper();
  }, []);

  useEffect(() => {
    if (view !== "result") return;
    removeQuestionPaper();
  }, [view]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      deleteQuestionPaperFromDb(QUESTION_PAPER_DB_KEY).catch(() => {});
      if (questionPaperUrl) URL.revokeObjectURL(questionPaperUrl);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [questionPaperUrl]);

  // --- Handlers for Configuration View ---
  const startTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (mcqNumber <= 0 || timeLimit <= 0) {
      alert("অনুগ্রহ করে MCQ সংখ্যা এবং সময়সীমার জন্য বৈধ সংখ্যা লিখুন।");
      return;
    }
    setUserAnswers(Array(mcqNumber).fill(null));
    setCorrectAnswers(Array(mcqNumber).fill(null));
    setIsTimeLow(false);
    setView("test");
  };

  // --- Handlers for Test View ---
  const handleAnswerChange = (qIndex: number, value: string) => {
    const newAnswers = [...userAnswers];
    if (newAnswers[qIndex] === null) {
      newAnswers[qIndex] = { q: qIndex + 1, value };
      setUserAnswers(newAnswers);
    }
  };

  const submitTest = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setView("answers");
  };

  // --- Handlers for Correct Answers View ---
  const handleCorrectAnswerChange = (qIndex: number, value: string) => {
    const newCorrectAnswers = [...correctAnswers];
    newCorrectAnswers[qIndex] = { q: qIndex + 1, value };
    setCorrectAnswers(newCorrectAnswers);
  };

  const submitCorrectAnswers = () => {
    if (correctAnswers.some((a) => a === null)) {
      alert("অনুগ্রহ করে সকল সঠিক উত্তর নির্বাচন করুন।");
      return;
    }
    calculateResult();
    setView("result");
  };

  // --- Result Calculation ---
  const calculateResult = () => {
    let correctCount = 0;
    let incorrectCount = 0;
    const breakdown: ResultBreakdown[] = [];

    const userAnswersMap = new Map(userAnswers.filter(Boolean).map((a) => [a.q, a.value]));
    const correctAnswersMap = new Map(correctAnswers.map((a) => [a.q, a.value]));

    for (let i = 1; i <= mcqNumber; i++) {
      const userAnswer = userAnswersMap.get(i);
      const correctAnswer = correctAnswersMap.get(i);
      let status: ResultBreakdown["status"] = "skipped";
      if (userAnswer) {
        if (userAnswer === correctAnswer) {
          correctCount++;
          status = "correct";
        } else {
          incorrectCount++;
          status = "incorrect";
        }
      }
      breakdown.push({
        q: i,
        userAnswer: userAnswer || "-",
        correctAnswer: correctAnswer,
        status: status,
      });
    }

    const skippedCount = mcqNumber - (correctCount + incorrectCount);
    const negativeMark = incorrectCount * negativeMarkValue;
    const totalScore = correctCount - negativeMark;

    const correctPercentage =
      correctCount + incorrectCount > 0
        ? (correctCount / (correctCount + incorrectCount)) * 100
        : 0;
    const accuracy = (correctCount / mcqNumber) * 100;

    const newStats = {
      correctCount,
      incorrectCount,
      skippedCount,
      totalScore,
      accuracy,
      correctPercentage,
      negativeMark,
    };
    setResultDetails(breakdown);
    setResultStats(newStats);

    saveResultToHistory({
      testName,
      mcqNumber,
      timeLimit,
      correctCount,
      incorrectCount,
      totalScore,
    });
  };

  // --- Reset ---
  const restartTest = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTestName("");
    setMcqNumber(10);
    setTimeLimit(10);
    setNegativeMarkValue(0.25);
    setView("config");
  };

  // --- Timer Effect ---
  useEffect(() => {
    if (view !== "test") return;

    let timeRemaining = timeLimit * 60;
    const updateTimerDisplay = () => {
      if (timeRemaining <= 0) {
        clearInterval(timerIntervalRef.current!);
        setTimeLeft("সময় শেষ!");
        alert("সময় শেষ! পরীক্ষাটি স্বয়ংক্রিয়ভাবে জমা দেওয়া হবে।");
        submitTest();
      } else {
        if (timeRemaining <= 300) {
          setIsTimeLow(true);
        }
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        setTimeLeft(
          `অবশিষ্ট সময়: ${String(minutes).padStart(2, "0")}মি ${String(seconds).padStart(2, "0")}সে`,
        );
        timeRemaining--;
      }
    };

    updateTimerDisplay();
    timerIntervalRef.current = setInterval(updateTimerDisplay, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [view, timeLimit]);

  const renderMcqInputs = (
    count: number,
    namePrefix: string,
    answers: Answer[],
    onChange: (index: number, value: string) => void,
    isCorrectAnswerView = false,
  ) => {
    const inputs = [];
    for (let i = 0; i < count; i++) {
      inputs.push(
        <Card
          key={`${namePrefix}-${i}`}
          id={`mcq-${i + 1}`}
          className="mb-4 animate-fade-in-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <CardContent
            className={cn(
              "flex items-center p-4 gap-4",
              isCorrectAnswerView
                ? "flex-col sm:flex-row sm:justify-start"
                : "flex-row justify-start",
            )}
          >
            <p className="font-semibold text-lg whitespace-nowrap">
              {isCorrectAnswerView ? `প্রশ্ন ${i + 1} এর সঠিক উত্তর:` : `প্রশ্ন. ${i + 1}:`}
            </p>
            <div className="flex items-center justify-end flex-nowrap gap-x-3">
              {["A", "B", "C", "D"].map((option) => (
                <div key={option} className="flex items-center shrink-0 space-x-1.5">
                  <input
                    type="radio"
                    id={`${namePrefix}-${i + 1}-${option}`}
                    name={`${namePrefix}-${i + 1}`}
                    value={option}
                    className="h-5 w-5 accent-primary"
                    checked={answers[i]?.value === option}
                    onChange={() => onChange(i, option)}
                    disabled={!isCorrectAnswerView && answers[i] !== null}
                  />
                  <Label
                    htmlFor={`${namePrefix}-${i + 1}-${option}`}
                    className="text-base font-medium cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>,
      );
    }
    return inputs;
  };

  const renderSummary = () => {
    const content = [];
    for (let i = 0; i < mcqNumber; i++) {
      const isAnswered = !!userAnswers[i];
      content.push(
        <div
          key={`summary-${i}`}
          className={`w-8 h-8 flex items-center justify-center cursor-pointer rounded font-bold border ${
            isAnswered ? "bg-green-500 text-white border-green-600" : "bg-card border-border"
          }`}
          onClick={() => {
            document
              .getElementById(`mcq-${i + 1}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
            setSummaryVisible(false);
          }}
        >
          {i + 1}
        </div>,
      );
    }
    return content;
  };

  const renderQuestionPaper = () => {
    if (!questionPaperUrl) return null;

    if (questionPaperType === "image") {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            >
              <ZoomOut className="mr-1 h-4 w-4" /> জুম আউট
            </Button>
            <span className="w-14 text-center text-sm font-bold text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            >
              <ZoomIn className="mr-1 h-4 w-4" /> জুম ইন
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoomLevel(1)}>
              <RotateCcw className="mr-1 h-4 w-4" /> ১০০%
            </Button>
          </div>
          <div className="overflow-auto border rounded-lg bg-muted/40 p-2 min-h-[300px] max-h-[70vh]">
            <img
              src={questionPaperUrl}
              alt="আপলোড করা ফাইল"
              className="w-full h-auto block mx-auto transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top center",
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        className="overflow-hidden border rounded-lg bg-muted/40 min-h-[400px]"
        style={{ height: "75vh" }}
      >
        <object type="application/pdf" data={questionPaperUrl} className="w-full h-full">
          <iframe src={questionPaperUrl} title="ফাইল (PDF)" className="w-full h-full" />
        </object>
      </div>
    );
  };

  const renderAnsPaper = () => {
    if (!ansPaperUrl) return null;

    if (ansPaperType === "image") {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnsZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
            >
              <ZoomOut className="mr-1 h-4 w-4" /> জুম আউট
            </Button>
            <span className="w-14 text-center text-sm font-bold text-muted-foreground">
              {Math.round(ansZoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnsZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            >
              <ZoomIn className="mr-1 h-4 w-4" /> জুম ইন
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAnsZoom(1)}>
              <RotateCcw className="mr-1 h-4 w-4" /> ১০০%
            </Button>
          </div>
          <div className="overflow-auto border rounded-lg bg-muted/40 p-2 min-h-[300px] max-h-[70vh]">
            <img
              src={ansPaperUrl}
              alt="আপলোড করা ফাইল"
              className="w-full h-auto block mx-auto transition-transform duration-200"
              style={{
                transform: `scale(${ansZoom})`,
                transformOrigin: "top center",
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        className="overflow-hidden border rounded-lg bg-muted/40 min-h-[400px]"
        style={{ height: "75vh" }}
      >
        <object type="application/pdf" data={ansPaperUrl} className="w-full h-full">
          <iframe src={ansPaperUrl} title="ফাইল (PDF)" className="w-full h-full" />
        </object>
      </div>
    );
  };

  const renderHistory = () => (
    <Card className="mt-12 shadow-sm rounded-2xl animate-fade-in-up border-border/50">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 whitespace-nowrap">
            <History /> পরীক্ষার ইতিহাস
          </CardTitle>
          <CardDescription>আপনার পূর্ববর্তী পরীক্ষার ফলাফলসমূহ।</CardDescription>
        </div>
        {examHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive self-start sm:self-auto"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> সব ইতিহাস মুছুন
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {examHistory.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
            {[...examHistory].reverse().map((exam: ExamResult, index: number) => (
              <div
                key={exam.id}
                className="bg-card border border-border/60 rounded-xl shadow-sm p-3 sm:p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10"
              >
                {/* Row 1: Badge + Name + Delete */}
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground bg-muted rounded-lg px-2 py-1">
                      #{String(examHistory.length - index).padStart(2, "0")}
                    </span>
                    <span className="font-bold text-foreground truncate">
                      {exam.testName || "পরীক্ষা"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteHistoryItem(exam.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Row 2: Date */}
                <div className="mt-1 ml-0 sm:ml-10">
                  <span className="text-xs sm:text-sm text-muted-foreground">{exam.date}</span>
                </div>

                {/* Row 3: Stats + Score Badge */}
                <div className="flex flex-wrap items-center gap-3 mt-3 ml-0 sm:ml-10">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-muted-foreground">
                    <span>প্রশ্ন: {exam.mcqNumber}</span>
                    <span className="text-green-600 dark:text-green-400">
                      সঠিক: {exam.correctCount}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      ভুল: {exam.incorrectCount}
                    </span>
                  </div>
                  <span
                    title="প্রাপ্ত নম্বর"
                    className="rounded-full bg-primary/10 text-primary font-bold text-sm px-3 py-1 whitespace-nowrap"
                  >
                    {exam.totalScore.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            এখনও কোনো পরীক্ষার ইতিহাস সেভ করা হয়নি।
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow font-bengali">
        <div className="container mx-auto px-2 py-8 max-w-4xl">
          <SimplePageHeader
            title="OMR টেস্ট সিমুলেটর"
            description="সহজেই আপনার OMR-ভিত্তিক পরীক্ষা তৈরি ও পরিচালনা করুন!"
          />

          <div className="flex gap-2 mt-8 mb-8 p-1 bg-muted rounded-xl w-fit mx-auto">
            <button
              type="button"
              onClick={() => setActiveTab("self")}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === "self"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              নিজের প্রশ্নে পরীক্ষা
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ready")}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === "ready"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              রেডিমেট প্রশ্নে পরীক্ষা
            </button>
          </div>

          {activeTab === "self" && (
            <>
              {view === "test" && (
                <div
                  className="fixed bottom-4 left-4 z-50"
                  onMouseEnter={() => setSummaryVisible(true)}
                  onMouseLeave={() => setSummaryVisible(false)}
                >
                  <Button
                    size="icon"
                    className="rounded-full h-14 w-14 shadow-lg"
                    onClick={() => setSummaryVisible(!isSummaryVisible)}
                  >
                    <Scroll className="h-6 w-6" />
                  </Button>
                  {isSummaryVisible && (
                    <Card className="absolute bottom-16 left-0 w-64 p-2 shadow-xl">
                      <CardHeader className="p-2 text-center">
                        <CardTitle className="text-base">প্রশ্নাবলীর সারাংশ</CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-64 overflow-y-auto p-2 flex flex-wrap gap-2">
                        {renderSummary()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {view === "config" && (
                <div className="animate-fade-in-up space-y-6">
                  {showInstructions && (
                    <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 shadow-sm rounded-2xl p-6 relative mb-8 animate-fade-in-up transition-all duration-300">
                      <button
                        type="button"
                        onClick={() => setShowInstructions(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <div className="flex items-center gap-2.5 mb-4">
                        <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                          নির্দেশনা
                        </h2>
                      </div>
                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          নোট: এই সিস্টেমে কোনো প্রশ্নপত্র ডিফল্টভাবে দেওয়া থাকবে না। আপনাকে নিজের বই দেখে অথবা
                          ডিভাইসে PDF/ছবি আপলোড করে পরীক্ষা দিতে হবে।
                        </p>
                        <ol className="list-decimal list-inside space-y-1.5">
                          <li>আপনার পরীক্ষার একটি পছন্দসই নাম দিন।</li>
                          <li>
                            মোট কতটি প্রশ্নের উত্তর দেবেন এবং কত সময় ধরে পরীক্ষা দেবেন, তা নির্ধারণ করুন।
                          </li>
                          <li>
                            নেগেটিভ মার্কিং যুক্ত করতে চাইলে সেটি ইনপুট দিন (ডিফল্ট ০.২৫)। না চাইলে
                            &apos;০&apos; করে দিন।
                          </li>
                          <li>
                            স্ক্রিনে প্রশ্ন দেখে পরীক্ষা দিতে চাইলে আপনার প্রশ্নপত্রের PDF বা ছবি আপলোড করুন।
                          </li>
                          <li>
                            কনফিগারেশন শেষে{" "}
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              &quot;পরীক্ষা শুরু করুন&quot;
                            </span>{" "}
                            বাটনে ক্লিক করুন।
                          </li>
                          <li>
                            সময় শেষ হওয়ার আগে সব অপশন দাগিয়ে{" "}
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              &quot;পরীক্ষা জমা দিন&quot;
                            </span>
                            -এ ক্লিক করুন, অথবা সময় শেষ হলে এটি স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।
                          </li>
                          <li>
                            এরপর আপনার কাছে থাকা মূল উত্তরপত্র দেখে আমাদের সিস্টেমে সঠিক উত্তরগুলো ইনপুট দিন।
                          </li>
                          <li>
                            পরিশেষে{" "}
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              &quot;সঠিক উত্তর জমা দিন&quot;
                            </span>
                            -এ ক্লিক করলেই আপনার প্রাপ্ত নম্বর, সঠিক ও ভুল উত্তরের বিস্তারিত বিশ্লেষণ দেখতে
                            পাবেন।
                          </li>
                        </ol>
                        <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-blue-100 dark:border-blue-900/40 italic">
                          বিশেষ দ্রষ্টব্য: আপনার পরীক্ষার ডেটা সম্পূর্ণভাবে আপনার ডিভাইসেই (লোকালি) সেভ থাকে। ব্রাউজার
                          বা ডিভাইস পরিবর্তন করলে পূর্বের ডেটা পাওয়া যাবে না।
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={startTest} className="space-y-6">
                    <Card className="shadow-md rounded-2xl border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FilePenLine /> পরীক্ষার কনফিগারেশন
                        </CardTitle>
                        <CardDescription>আপনার নতুন পরীক্ষা এখানে সেট আপ করুন।</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="testName">পরীক্ষার নাম:</Label>
                          <Input
                            id="testName"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            required
                            placeholder="যেমন: ভর্তি পরীক্ষা মডেল টেস্ট"
                            className="rounded-lg focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="mcqNumber">MCQ সংখ্যা:</Label>
                            <Input
                              id="mcqNumber"
                              type="text"
                              inputMode="numeric"
                              value={mcqNumber}
                              onChange={(e) =>
                                setMcqNumber(parseInt(bengaliToEnglishNumber(e.target.value)) || 0)
                              }
                              required
                              className="rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="timeLimit">সময়সীমা (মিনিটে):</Label>
                            <Input
                              id="timeLimit"
                              type="text"
                              inputMode="numeric"
                              value={timeLimit}
                              onChange={(e) =>
                                setTimeLimit(parseInt(bengaliToEnglishNumber(e.target.value)) || 0)
                              }
                              required
                              className="rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="negativeMarkValue">
                              নেগেটিভ মার্কিং (প্রতি ভুল উত্তরে):
                            </Label>
                            <Input
                              id="negativeMarkValue"
                              type="text"
                              inputMode="numeric"
                              value={negativeMarkValue}
                              onChange={(e) =>
                                setNegativeMarkValue(
                                  parseFloat(bengaliToEnglishNumber(e.target.value)) || 0,
                                )
                              }
                              step="0.01"
                              placeholder="যেমন: 0.25"
                              className="rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-md rounded-2xl border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText /> ফাইল আপলোড করুন
                        </CardTitle>
                        <CardDescription>
                          পরীক্ষার সময় পাশে দেখার জন্য ফাইল (PDF অথবা ইমেজ) আপলোড করুন।
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!questionPaperUrl ? (
                          <div className="relative">
                            <input
                              id="questionPaper"
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleQuestionPaperUpload}
                              aria-label="ফাইল আপলোড করুন"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                              <UploadCloud className="h-10 w-10 mx-auto text-primary mb-2" />
                              <p className="font-medium text-muted-foreground">
                                ক্লিক করে PDF বা ছবি আপলোড করুন
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                .pdf, .png, .jpg, .jpeg, .webp
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 animate-fade-in-up">
                            <p className="flex items-center gap-2 text-sm font-medium min-w-0">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate text-foreground">
                                {questionPaperFileName || "ফাইল আপলোড হয়েছে"}
                              </span>
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeQuestionPaper}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="mr-1 h-4 w-4" /> সরান
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex justify-center pt-2">
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full md:w-auto md:min-w-[320px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <FilePenLine className="mr-2 h-5 w-5" /> পরীক্ষা শুরু করুন
                      </Button>
                    </div>
                  </form>
                  {renderHistory()}
                </div>
              )}

              {view === "test" && (
                <div className="relative">
                  <Card className="mb-6 animate-fade-in-up">
                    <CardHeader className="text-center">
                      <CardTitle>{testName || "OMR পরীক্ষা"}</CardTitle>
                      <CardDescription>
                        মোট প্রশ্ন: {mcqNumber} | সময়সীমা: {timeLimit} মিনিট | নেগেটিভ মার্কিং:{" "}
                        {negativeMarkValue > 0 ? `${negativeMarkValue}` : "নেই"}
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="sticky top-[80px] z-30 mb-6">
                    <div className="w-full text-center py-2 px-4 rounded-lg bg-[#e8edfb] dark:bg-[#0d1117] border border-primary animate-fade-in-up">
                      <p
                        className={cn(
                          "text-xl font-bold flex items-center justify-center gap-2",
                          isTimeLow ? "text-destructive" : "text-primary",
                        )}
                      >
                        <TimerIcon /> {timeLeft}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {questionPaperUrl && (
                      <div className="order-1 md:order-1 w-full md:w-2/3 md:sticky md:top-[150px]">
                        <Card className="animate-fade-in-up">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <FileText /> ফাইল
                            </CardTitle>
                          </CardHeader>
                          <CardContent>{renderQuestionPaper()}</CardContent>
                        </Card>
                      </div>
                    )}
                    <div
                      className={cn(
                        "order-2 md:order-2 w-full",
                        questionPaperUrl ? "md:w-1/3" : "",
                      )}
                    >
                      {renderMcqInputs(mcqNumber, "q", userAnswers, handleAnswerChange)}
                      <Button onClick={submitTest} className="w-full mt-6" size="lg">
                        পরীক্ষা জমা দিন
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {view === "answers" && (
                <div className="animate-fade-in-up space-y-6">
                  <Card className="shadow-md rounded-2xl border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle /> সঠিক উত্তর নির্বাচন করুন
                      </CardTitle>
                      <CardDescription>ফলাফল তৈরির জন্য সঠিক উত্তর দিন।</CardDescription>
                    </CardHeader>
                  </Card>

                  {!ansPaperUrl ? (
                    <Card className="shadow-md rounded-2xl border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText /> ফাইল আপলোড করুন
                        </CardTitle>
                        <CardDescription>
                          উত্তর দেওয়ার সময় পাশে দেখার জন্য ফাইল (PDF অথবা ইমেজ) আপলোড করুন।
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <input
                            id="ansPaper"
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleAnsPaperUpload}
                            aria-label="ফাইল আপলোড করুন"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <UploadCloud className="h-10 w-10 mx-auto text-primary mb-2" />
                            <p className="font-medium text-muted-foreground">
                              ক্লিক করে PDF বা ছবি আপলোড করুন
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              .pdf, .png, .jpg, .jpeg, .webp
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6 items-start w-full max-w-7xl mx-auto">
                      <div className="order-1 md:order-1 w-full flex-1 md:sticky md:top-[80px]">
                        <Card className="shadow-md rounded-2xl border-border/50 animate-fade-in-up">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <FileText /> ফাইল
                            </CardTitle>
                          </CardHeader>
                          <CardContent>{renderAnsPaper()}</CardContent>
                        </Card>
                      </div>
                      <div className="order-2 md:order-2 w-full flex-1 space-y-4">
                        {renderMcqInputs(
                          mcqNumber,
                          "correct-q",
                          correctAnswers,
                          handleCorrectAnswerChange,
                          true,
                        )}
                        <p className="text-red-500 text-center text-sm">
                          জমা দেওয়ার আগে সকল প্রশ্নের জন্য সঠিক উত্তর নির্বাচন করুন।
                        </p>
                        <Button onClick={submitCorrectAnswers} className="w-full" size="lg">
                          সঠিক উত্তর জমা দিন
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view === "result" && (
                <Card className="animate-fade-in-up">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <BarChart /> পরীক্ষার ফলাফল
                    </CardTitle>
                    <CardDescription>আপনার পরীক্ষার পারফরম্যান্সের সারসংক্ষেপ এখানে।</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 text-center">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">মোট প্রশ্ন</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{mcqNumber}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">সঠিক উত্তর</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-green-500">
                              {resultStats.correctCount}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">ভুল উত্তর</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-destructive">
                              {resultStats.incorrectCount}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">উত্তর দেননি</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{resultStats.skippedCount}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">নেগেটিভ মার্কিং</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-lg font-bold">
                              {resultStats.negativeMark.toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="md:col-span-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">সর্বমোট স্কোর</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-primary">
                              {resultStats.totalScore.toFixed(2)} / {mcqNumber}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <div className="border-2 border-green-500 bg-green-100 dark:bg-green-900/20 p-4 rounded-lg">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            Correct Percentage: {resultStats.correctPercentage.toFixed(2)}%
                          </p>
                        </div>
                        <div className="border-2 border-blue-500 bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg">
                          <p className="font-bold text-blue-600 dark:text-blue-400">
                            Accuracy: {resultStats.accuracy.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold my-4">ফলাফল বিশ্লেষণ</h3>
                        <div className="border rounded-lg overflow-x-auto">
                          <table className="w-full divide-y divide-border">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold">প্রশ্ন</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold">
                                  আপনার উত্তর
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold">
                                  সঠিক উত্তর
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold">ফলাফল</th>
                              </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                              {resultDetails.map((res) => (
                                <tr key={res.q}>
                                  <td className="px-4 py-2 font-medium">{res.q}</td>
                                  <td
                                    className={cn(
                                      "px-4 py-2 font-bold",
                                      res.status === "incorrect"
                                        ? "text-destructive"
                                        : "text-green-500",
                                    )}
                                  >
                                    {res.userAnswer}
                                  </td>
                                  <td className="px-4 py-2 font-bold text-blue-500">
                                    {res.correctAnswer}
                                  </td>
                                  <td className="px-4 py-2">
                                    {res.status === "correct" && (
                                      <span className="flex items-center gap-1 text-green-500">
                                        <Check size={16} /> সঠিক
                                      </span>
                                    )}
                                    {res.status === "incorrect" && (
                                      <span className="flex items-center gap-1 text-destructive">
                                        <X size={16} /> ভুল
                                      </span>
                                    )}
                                    {res.status === "skipped" && (
                                      <span className="text-muted-foreground">স্কিপড</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4">
                    <Button onClick={restartTest} className="w-full" size="lg">
                      <RotateCcw /> আরেকটি পরীক্ষা শুরু করুন
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </>
          )}

          {activeTab === "ready" && (
            <div className="animate-fade-in-up">
              <Card className="shadow-md rounded-2xl border-border/50 max-w-2xl mx-auto text-center">
                <CardContent className="pt-12 pb-10 px-8 space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">শীঘ্রই আসছে</h2>
                    <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                      এখানে আমাদের প্রশ্ন ব্যাংক থেকে নিজের পছন্দমতো কাস্টমাইজ করে পরীক্ষা দেওয়া যাবে। এই ফিচারটির
                      কাজ খুব দ্রুত চলছে, খুব শীঘ্রই এটি উন্মুক্ত করা হবে!
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    <Sparkles className="w-3.5 h-3.5" /> Coming Soon
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
