import { useState, useEffect, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Exam } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, FileQuestion } from "lucide-react";
import { updateExam } from "@/lib/actions";
import dayjs from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";

const bengaliToEnglishNumber = (str: string) => {
  const bengaliNumerals = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let newStr = str;
  for (let i = 0; i < 10; i++) {
    newStr = newStr.replace(new RegExp(bengaliNumerals[i], "g"), i.toString());
  }
  return newStr;
};

interface EditExamModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  courses: { id: string; title: string }[];
  papers?: any[];
}

const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

export function EditExamModal({ exam, isOpen, onClose, courses, papers = [] }: EditExamModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"live" | "practice">("live");
  const formRef = useRef<HTMLFormElement>(null);
  const [shuffle, setShuffle] = useState(false);
  const [shuffleSectionsOnly, setShuffleSectionsOnly] = useState(false);
  const [isCustomExam, setIsCustomExam] = useState(false);
  const [mandatorySubjects, setMandatorySubjects] = useState<string[]>([]);
  const [optionalSubjects, setOptionalSubjects] = useState<string[]>([]);
  const [examType, setExamType] = useState<"mcq" | "written" | "cq">("mcq");

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startHour, setStartHour] = useState("12");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("AM");

  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endHour, setEndHour] = useState("12");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (exam) {
      formRef.current?.reset();
      setMode((exam?.is_practice ? "practice" : "live") as "live" | "practice");
      setShuffle(exam?.shuffle_questions || false);
      setShuffleSectionsOnly(exam?.shuffle_sections_only || false);
      setIsCustomExam(!!exam.total_subjects && exam.total_subjects > 0);
      setMandatorySubjects(exam.mandatory_subjects || []);
      setOptionalSubjects(exam.optional_subjects || []);
      setExamType((exam.exam_type as "mcq" | "written" | "cq") || "mcq");

      if (exam.start_at) {
        const d = dayjs(exam.start_at);
        setStartDate(d.toDate());
        const hour24 = d.hour();
        setStartPeriod(hour24 >= 12 ? "PM" : "AM");
        setStartHour((hour24 % 12 === 0 ? 12 : hour24 % 12).toString().padStart(2, "0"));
        setStartMinute(d.minute().toString().padStart(2, "0"));
      } else {
        setStartDate(undefined);
        setStartHour("12");
        setStartMinute("00");
        setStartPeriod("AM");
      }

      if (exam.end_at) {
        const d = dayjs(exam.end_at);
        setEndDate(d.toDate());
        const hour24 = d.hour();
        setEndPeriod(hour24 >= 12 ? "PM" : "AM");
        setEndHour((hour24 % 12 === 0 ? 12 : hour24 % 12).toString().padStart(2, "0"));
        setEndMinute(d.minute().toString().padStart(2, "0"));
      } else {
        setEndDate(undefined);
        setEndHour("12");
        setEndMinute("00");
        setEndPeriod("AM");
      }
    }
  }, [exam]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>পরীক্ষা সম্পাদন করুন</DialogTitle>
          <DialogDescription>নিচে পরীক্ষার বিবরণ আপডেট করুন।</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <form
            ref={formRef}
            action={async (formData) => {
              setIsSubmitting(true);
              if (exam?.id) {
                formData.append("id", exam.id);
              }

              const startAtISO = combineDateTime(startDate, startHour, startMinute, startPeriod);
              const endAtISO = combineDateTime(endDate, endHour, endMinute, endPeriod);

              if (startAtISO) formData.set("start_at", startAtISO);
              if (endAtISO) formData.set("end_at", endAtISO);

              const result = await updateExam(formData);
              if (result.success) {
                toast({ title: "পরীক্ষা সফলভাবে আপডেট করা হয়েছে!" });
                onClose();
              } else {
                toast({
                  title: "পরীক্ষা আপডেট করতে সমস্যা হয়েছে",
                  description: result.message,
                  variant: "destructive",
                });
              }
              setIsSubmitting(false);
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Label htmlFor="batch_id_edit">কোর্স নির্বাচন করুন</Label>
              <Select name="course_id" defaultValue={exam?.course_id || "public"}>
                <SelectTrigger id="batch_id_edit" className="w-[220px]">
                  <SelectValue placeholder="কোর্স নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">পাবলিক (সবার জন্য)</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-name-edit">পরীক্ষার নাম</Label>
              <Input
                id="exam-name-edit"
                type="text"
                name="name"
                defaultValue={exam?.name || ""}
                placeholder="পরীক্ষার নাম"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes-edit">সময় (মিনিট)</Label>
              <Input
                id="duration_minutes-edit"
                type="number"
                name="duration_minutes"
                defaultValue={String(exam?.duration_minutes || "")}
                placeholder="সময় (মিনিট)"
                onInput={handleNumberInput}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marks_per_question-edit">প্রশ্ন প্রতি মার্ক</Label>
              <Input
                id="marks_per_question-edit"
                type="number"
                step="0.1"
                name="marks_per_question"
                defaultValue={String(exam?.marks_per_question || "1")}
                placeholder="প্রশ্ন প্রতি মার্ক"
                onInput={handleNumberInput}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label>পরীক্ষার মোড</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "live" | "practice")}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="পরীক্ষার মোড নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">লাইভ (Time-limited)</SelectItem>
                  <SelectItem value="practice">প্রাকটিস (আনলিমিটেড)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "live" && (
              <div className="grid grid-cols-1 gap-4">
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
                    <Select value={startHour} onValueChange={setStartHour}>
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
                    <Select value={startMinute} onValueChange={setStartMinute}>
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
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? dayjs(endDate).format("DD/MM/YYYY") : <span>তারিখ বাছুন</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex gap-2">
                    <Select value={endHour} onValueChange={setEndHour}>
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
                    <Select value={endMinute} onValueChange={setEndMinute}>
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
                    <Select value={endPeriod} onValueChange={(v) => setEndPeriod(v as "AM" | "PM")}>
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
            <input
              name="is_practice"
              type="hidden"
              value={mode === "practice" ? "true" : "false"}
            />
            <div className="space-y-2">
              <Label htmlFor="negative_marks-edit">নেগেটিভ মার্ক</Label>
              <Input
                id="negative_marks-edit"
                type="number"
                step="0.01"
                name="negative_marks_per_wrong"
                defaultValue={String(exam?.negative_marks_per_wrong || "")}
                placeholder="নেগেটিভ মার্ক"
                onInput={handleNumberInput}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequence_order-edit">ক্রম (Sequence Order)</Label>
              <Input
                id="sequence_order-edit"
                type="number"
                name="sequence_order"
                defaultValue={String(exam?.sequence_order || 0)}
                placeholder="ক্রম"
                onInput={handleNumberInput}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="exam_type_edit">প্রশ্নের ধরন</Label>
              <Select
                value={examType}
                onValueChange={(value) => setExamType(value as "mcq" | "written" | "cq")}
              >
                <SelectTrigger id="exam_type_edit" className="w-[220px]">
                  <SelectValue placeholder="প্রশ্নের ধরন নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="written">Written</SelectItem>
                  <SelectItem value="cq">CQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input name="exam_type" type="hidden" value={examType} />

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shuffle_questions_edit"
                  name="shuffle_questions"
                  checked={shuffle}
                  onCheckedChange={(checked) => setShuffle(checked as boolean)}
                  value="true"
                />
                <Label htmlFor="shuffle_questions_edit">প্রশ্নগুলো এলোমেলো করুন</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shuffle_sections_only_edit"
                  name="shuffle_sections_only"
                  checked={shuffleSectionsOnly}
                  onCheckedChange={(checked) => setShuffleSectionsOnly(checked as boolean)}
                  value="true"
                />
                <Label htmlFor="shuffle_sections_only_edit">বিষয় অনুসারে এলোমেলো করুন</Label>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="custom-exam-toggle-edit"
                checked={isCustomExam}
                onCheckedChange={(checked) => setIsCustomExam(checked as boolean)}
              />
              <Label htmlFor="custom-exam-toggle-edit">কাস্টম এক্সাম</Label>
            </div>

            {isCustomExam && (
              <div className="space-y-4 p-4 border rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="total_subjects-edit">মোট বিষয়</Label>
                  <Input
                    id="total_subjects-edit"
                    name="total_subjects"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g., 4"
                    defaultValue={exam?.total_subjects || ""}
                    onInput={handleNumberInput}
                  />
                </div>

                <div className="space-y-2">
                  <Label>দাগানো বাধ্যতামূলক</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {papers.map((paper) => (
                      <div key={`mandatory-${paper.id}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mandatory-${paper.id}`}
                          name="mandatory_subjects"
                          value={paper.id}
                          checked={mandatorySubjects.includes(paper.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setMandatorySubjects((prev) => [...prev, paper.id]);
                            } else {
                              setMandatorySubjects((prev) => prev.filter((id) => id !== paper.id));
                            }
                          }}
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
                          checked={optionalSubjects.includes(paper.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setOptionalSubjects((prev) => [...prev, paper.id]);
                            } else {
                              setOptionalSubjects((prev) => prev.filter((id) => id !== paper.id));
                            }
                          }}
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

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  আপডেট করা হচ্ছে...
                </>
              ) : (
                "পরীক্ষা আপডেট করুন"
              )}
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
