import { useState, useRef, useEffect, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, FileQuestion, ListPlus, FileText, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { createExam, updateExam } from "@/lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import type { Exam } from "@/lib/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/date-utils";

const bengaliToEnglishNumber = (str: string) => {
  const bengaliNumerals = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let newStr = str;
  for (let i = 0; i < 10; i++) {
    newStr = newStr.replace(new RegExp(bengaliNumerals[i], "g"), i.toString());
  }
  return newStr;
};

const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

interface AddEditExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  subsectionId?: string | null;
  exam?: Exam | null;
  papers?: any[];
}

export function AddEditExamModal({
  isOpen,
  onClose,
  courseId,
  sectionId,
  subsectionId,
  exam,
  papers = [],
}: AddEditExamModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isEditMode = !!exam;

  const [mode, setMode] = useState<"live" | "practice">("live");
  const [isCustomExam, setIsCustomExam] = useState(false);
  const [examType, setExamType] = useState<"mcq" | "written" | "cq">("mcq");

  const [startDate, setStartDate] = useState<Date | undefined>(dayjs().toDate());
  const [startHour, setStartHour] = useState("10");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("AM");

  const [endDate, setEndDate] = useState<Date | undefined>(dayjs().add(1, "hour").toDate());
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("PM");

  useEffect(() => {
    if (isOpen) {
      if (exam) {
        setMode(exam.is_practice ? "practice" : "live");
        setIsCustomExam(
          !!exam.total_subjects || !!exam.mandatory_subjects || !!exam.optional_subjects,
        );
        setExamType((exam.exam_type as "mcq" | "written" | "cq") || "mcq");

        if (exam.start_at) {
          const d = dayjs(exam.start_at);
          setStartDate(d.toDate());
          setStartHour((d.hour() % 12 === 0 ? 12 : d.hour() % 12).toString().padStart(2, "0"));
          setStartMinute(d.minute().toString().padStart(2, "0"));
          setStartPeriod(d.hour() >= 12 ? "PM" : "AM");
        } else {
          setStartDate(undefined);
        }

        if (exam.end_at) {
          const d = dayjs(exam.end_at);
          setEndDate(d.toDate());
          setEndHour((d.hour() % 12 === 0 ? 12 : d.hour() % 12).toString().padStart(2, "0"));
          setEndMinute(d.minute().toString().padStart(2, "0"));
          setEndPeriod(d.hour() >= 12 ? "PM" : "AM");
        } else {
          setEndDate(undefined);
        }
      } else {
        formRef.current?.reset();
        setMode("live");
        setIsCustomExam(false);
        setExamType("mcq");
        setStartDate(dayjs().toDate());
        setStartHour("10");
        setStartMinute("00");
        setStartPeriod("AM");

        setEndDate(dayjs().add(1, "day").toDate());
        setEndHour("10");
        setEndMinute("00");
        setEndPeriod("PM");
      }
    }
  }, [isOpen, exam]);

  const handleNumberInput = (e: FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    input.value = bengaliToEnglishNumber(input.value);
  };

  const combineDateTime = (date?: Date, hour?: string, minute?: string, period?: "AM" | "PM") => {
    if (!date || !hour || !minute || !period) return null;
    let h24 = parseInt(hour, 10);
    if (period === "PM" && h24 !== 12) {
      h24 += 12;
    }
    if (period === "AM" && h24 === 12) {
      h24 = 0;
    }
    const newDate = dayjs(date).hour(h24).minute(parseInt(minute, 10)).second(0).millisecond(0);
    return newDate.toISOString();
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append("course_id", courseId);
    formData.append("section_id", sectionId);
    if (subsectionId) formData.append("subsection_id", subsectionId);

    const startAtISO = combineDateTime(startDate, startHour, startMinute, startPeriod);
    const endAtISO = combineDateTime(endDate, endHour, endMinute, endPeriod);

    if (mode === "live") {
      if (startAtISO) formData.set("start_at", startAtISO);
      if (endAtISO) formData.set("end_at", endAtISO);
    }

    formData.set("is_practice", mode === "practice" ? "true" : "false");

    if (!isCustomExam) {
      formData.delete("total_subjects");
      formData.delete("mandatory_subjects");
      formData.delete("optional_subjects");
    }

    let result;
    if (isEditMode) {
      formData.append("id", exam.id);
      result = await updateExam(formData);
    } else {
      result = await createExam(formData);
    }

    if (result.success) {
      toast({ title: `এক্সাম সফলভাবে ${isEditMode ? "আপডেট" : "যোগ"} করা হয়েছে` });
      queryClient.invalidateQueries({ queryKey: ["admin-course-details", courseId] });
      onClose();
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "এক্সাম আপডেট করুন" : "নতুন এক্সাম যোগ করুন"}</DialogTitle>
          <DialogDescription>এক্সামের বিস্তারিত তথ্য দিন।</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} ref={formRef} className="space-y-4 py-2">
          {isEditMode && exam && (
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 pb-3 mb-2 border-b w-full">
              <Link
                to={`/instructor/courses/${courseId}/exams/${exam.id}/manage`}
                className="w-full sm:w-auto"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 text-[11px] sm:text-sm min-h-12 h-auto sm:h-10 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 whitespace-normal sm:whitespace-nowrap"
                >
                  <ListPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>প্রশ্ন ম্যানেজ</span>
                </Button>
              </Link>
              <Link
                to={`/instructor/courses/${courseId}/exams/${exam.id}/questions`}
                className="w-full sm:w-auto"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 text-[11px] sm:text-sm min-h-12 h-auto sm:h-10 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 whitespace-normal sm:whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-center">প্রশ্ন ও সমাধান</span>
                </Button>
              </Link>
              <Link
                to={`/instructor/courses/${courseId}/exams/${exam.id}/results`}
                className="w-full sm:w-auto"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-4 text-[11px] sm:text-sm min-h-12 h-auto sm:h-10 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 whitespace-normal sm:whitespace-nowrap"
                >
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>ফলাফল</span>
                </Button>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label htmlFor="mode">পরীক্ষার মোড</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as "live" | "practice")}>
              <SelectTrigger id="mode" className="w-[220px]">
                <SelectValue placeholder="পরীক্ষার মোড নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">লাইভ (Time-limited)</SelectItem>
                <SelectItem value="practice">প্রাকটিস (আনলিমিটেড)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-name">পরীক্ষার নাম *</Label>
              <Input
                id="exam-name"
                name="name"
                defaultValue={exam?.name || ""}
                placeholder="পরীক্ষার নাম"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">সময় (মিনিট)</Label>
              <Input
                id="duration"
                name="duration_minutes"
                defaultValue={exam?.duration_minutes ?? 40}
                placeholder="সময় (মিনিট)"
                type="number"
                onInput={handleNumberInput}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marks_per_question">প্রশ্ন প্রতি মার্ক</Label>
              <Input
                id="marks_per_question"
                name="marks_per_question"
                type="number"
                step="0.1"
                defaultValue={exam?.marks_per_question ?? 1}
                placeholder="প্রশ্ন প্রতি মার্ক"
                onInput={handleNumberInput}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negative_marks">নেগেটিভ মার্ক</Label>
              <Input
                id="negative_marks"
                name="negative_marks_per_wrong"
                defaultValue={exam?.negative_marks_per_wrong ?? 0.25}
                placeholder="নেগেটিভ মার্ক"
                type="number"
                step="0.01"
                onInput={handleNumberInput}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {mode === "live" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border">
              <div className="space-y-2">
                <Label>শুরুর সময়</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? dayjs(startDate).format("DD/MM/YYYY") : <span>তারিখ বাছুন</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex gap-2">
                  <Select value={startHour} onValueChange={setStartHour} disabled={isSubmitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="ঘন্টা" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours12.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={startMinute}
                    onValueChange={setStartMinute}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="মিনিট" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={startPeriod}
                    onValueChange={(v) => setStartPeriod(v as "AM" | "PM")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>শেষ হওয়ার সময়</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? dayjs(endDate).format("DD/MM/YYYY") : <span>তারিখ বাছুন</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <div className="flex gap-2">
                  <Select value={endHour} onValueChange={setEndHour} disabled={isSubmitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="ঘন্টা" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours12.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={endMinute} onValueChange={setEndMinute} disabled={isSubmitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="মিনিট" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={endPeriod}
                    onValueChange={(v) => setEndPeriod(v as "AM" | "PM")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="exam_type_modal">প্রশ্নের ধরন</Label>
              <Select
                value={examType}
                onValueChange={(value) => setExamType(value as "mcq" | "written" | "cq")}
                disabled={isSubmitting}
              >
                <SelectTrigger id="exam_type_modal" className="w-[220px]">
                  <SelectValue placeholder="প্রশ্নের ধরন নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="written">Written</SelectItem>
                  <SelectItem value="cq">CQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_sequence_order">ক্রম (Sequence Order)</Label>
              <Input
                id="exam_sequence_order"
                name="sequence_order"
                defaultValue={String(exam?.sequence_order ?? 0)}
                placeholder="ক্রম (Sequence Order)"
                type="number"
                onInput={handleNumberInput}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <input name="exam_type" type="hidden" value={examType} />

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shuffle-questions-toggle"
                name="shuffle_questions"
                value="true"
                defaultChecked={exam?.shuffle_questions || false}
                disabled={isSubmitting}
              />
              <Label htmlFor="shuffle-questions-toggle">প্রশ্নগুলো এলোমেলো করুন</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shuffle_sections_only"
                name="shuffle_sections_only"
                value="true"
                defaultChecked={exam?.shuffle_sections_only || false}
                disabled={isSubmitting}
              />
              <Label htmlFor="shuffle_sections_only">বিষয় অনুসারে এলোমেলো করুন</Label>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="custom-exam-toggle"
              checked={isCustomExam}
              onCheckedChange={(checked) => setIsCustomExam(checked as boolean)}
              disabled={isSubmitting}
            />
            <Label htmlFor="custom-exam-toggle">কাস্টম এক্সাম (মাল্টিপল সাবজেক্ট)</Label>
          </div>

          {isCustomExam && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/10">
              <div className="space-y-2">
                <Label htmlFor="total_subjects">মোট বিষয়</Label>
                <Input
                  id="total_subjects"
                  name="total_subjects"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={exam?.total_subjects || ""}
                  placeholder="e.g., 4"
                  onInput={handleNumberInput}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>দাগানো বাধ্যতামূলক</Label>
                <div className="grid grid-cols-2 gap-2">
                  {papers.map((paper) => (
                    <div key={`mandatory-${paper.id}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mandatory-${paper.id}`}
                        name="mandatory_subjects"
                        value={paper.id}
                        defaultChecked={exam?.mandatory_subjects?.includes(paper.id)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor={`mandatory-${paper.id}`}>
                        {paper.name_bn || paper.name_en}{" "}
                        {paper.short_code && `(${paper.short_code})`}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>অন্যান্য বিষয়</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {papers.map((paper) => (
                    <div key={`optional-${paper.id}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`optional-${paper.id}`}
                        name="optional_subjects"
                        value={paper.id}
                        defaultChecked={exam?.optional_subjects?.includes(paper.id)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor={`optional-${paper.id}`}>
                        {paper.name_bn || paper.name_en}{" "}
                        {paper.short_code && `(${paper.short_code})`}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              বাতিল
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEditMode ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
