import { useState } from "react";
import { PageHeader, LoadingSpinner as CustomLoader } from "@/components";
import { getReportCourseOptions, getReports } from "@/lib/reports-supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, XCircle, Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import dayjs from "@/lib/date-utils";
import { maskRollNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface ReportItem {
  uid: string;
  name: string;
  roll: string;
  present: boolean;
  mandatory_done: boolean;
  optional_done: boolean;
  todo_done: boolean;
  mandatory_url: string | null;
  optional_url: string | null;
  todo_url: string | null;
  exams: { name: string; score: number }[];
}

// Calculate daily progress: Attendance 10% + Mandatory 30% + Optional 30% + Todo 30% = 100%
const calculateProgress = (report: ReportItem): number => {
  let progress = 0;
  if (report.present) progress += 10; // Attendance: 10%
  if (report.mandatory_done) progress += 30; // Mandatory: 30%
  if (report.optional_done) progress += 30; // Optional: 30%
  if (report.todo_done) progress += 30; // Todo: 30%
  return progress;
};

// Progress Bar Component
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${
          progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-500"
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
    <span className="text-xs font-semibold">{progress}%</span>
  </div>
);

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [date, setDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch course options for the reports filter. Uses its own query key so it
  // never collides with the instructor courses page (["admin-courses"]), which
  // expects full Course rows rather than these { id, name } options.
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["reports-courses-list"],
    queryFn: async () => {
      const data = await getReportCourseOptions();
      if (data.length > 0 && !selectedCourse) {
        setSelectedCourse(data[0].id);
      }
      return data;
    },
  });

  // Fetch reports
  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["admin-reports", selectedCourse, date],
    queryFn: async () => {
      if (!selectedCourse) return [];
      return await getReports(selectedCourse, date);
    },
    enabled: !!selectedCourse,
  });

  const handleDownloadPDF = async () => {
    if (reports.length === 0) return;
    setGeneratingPDF(true);
    try {
      const courseName = courses.find((c) => c.id === selectedCourse)?.name || "Course";
      const response = await fetch("/api/generate-reports-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedCourse,
          date: date,
          reports: reports,
          batchName: courseName,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const html = await response.text();
      const newWin = window.open("", "_blank");
      if (newWin) {
        newWin.document.write(html);
        newWin.document.close();
        newWin.focus();
        setTimeout(() => {
          try {
            newWin.print();
          } catch (err) {
            console.error("Print failed:", err);
            newWin.close();
          }
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "রিপোর্ট তৈরিতে ব্যর্থ", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    try {
      const courseName = courses.find((c) => c.id === selectedCourse)?.name || "Course";
      const headers = [
        "Name",
        "Roll",
        "Attendance",
        "Exam",
        "আজকের কাজ",
        "আজকের কাজ লিঙ্ক",
        "যতটুকু হয়েছে",
        "যতটুকু হয়েছে লিঙ্ক",
        "যতটুকু বাকি",
        "যতটুকু বাকি লিঙ্ক",
        "Daily Progress %",
      ];
      const csvData = reports.map((r) => [
        r.name,
        maskRollNumber(r.roll),
        r.present ? "Present" : "Absent",
        r.exams && r.exams.length > 0
          ? r.exams.map((ex) => `${ex.name}(${ex.score})`).join(" | ")
          : "No",
        r.mandatory_done ? "Done" : "Pending",
        r.mandatory_url || "",
        r.optional_done ? "Done" : "N/A",
        r.optional_url || "",
        r.todo_done ? "Done" : "N/A",
        r.todo_url || "",
        calculateProgress(r),
      ]);

      const csvContent = [headers, ...csvData].map((e) => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${courseName.replace(/\s+/g, "_")}_report_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "CSV ডাউনলোড হয়েছে" });
    } catch (err) {
      console.error(err);
      toast({ title: "CSV এক্সপোর্ট করতে ব্যর্থ", variant: "destructive" });
    }
  };

  if (loadingCourses) return <CustomLoader />;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="এটেন্ডেন্স ও টাস্ক রিপোর্ট"
        description="কোর্স ভিত্তিক প্রতিদিনের উপস্থিতি এবং টাস্ক জমার রিপোর্ট দেখুন।"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">কোর্স নির্বাচন করুন</label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="কোর্স সিলেক্ট করুন" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">তারিখ</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>শিক্ষার্থীদের তালিকা ({reports.length})</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleDownloadPDF}
              disabled={generatingPDF || reports.length === 0}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {generatingPDF ? (
                <CustomLoader size="sm" message="" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> প্রিন্ট / PDF
                </>
              )}
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={reports.length === 0}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <FileDown className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="py-10 text-center">লোডিং...</div>
          ) : reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম ও রোল</TableHead>
                  <TableHead className="text-center">উপস্থিতি</TableHead>
                  <TableHead className="text-center">পরীক্ষা</TableHead>
                  <TableHead className="text-center">আজকের কাজ</TableHead>
                  <TableHead className="text-center">যতটুকু হয়েছে</TableHead>
                  <TableHead className="text-center">যতটুকু বাকি</TableHead>
                  <TableHead className="text-center">দৈনিক অগ্রগতি</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.uid}>
                    <TableCell>
                      <div className="font-medium">{report.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Roll: {maskRollNumber(report.roll)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {report.present ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> উপস্থিত
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" /> অনুপস্থিত
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1 items-center">
                        {report.exams && report.exams.length > 0 ? (
                          report.exams.map((ex, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="whitespace-nowrap bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            >
                              {ex.name}: {ex.score.toFixed(2)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-gray-400">
                            অংশ নেয়নি
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {report.mandatory_done ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            সম্পন্ন
                          </Badge>
                          {report.mandatory_url && (
                            <a
                              href={report.mandatory_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center"
                            >
                              লিঙ্ক <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-red-400 border-red-400">
                          বাকি
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {report.optional_done ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            সম্পন্ন
                          </Badge>
                          {report.optional_url && (
                            <a
                              href={report.optional_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center"
                            >
                              লিঙ্ক <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-400">
                          নেই
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {report.todo_done ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            সম্পন্ন
                          </Badge>
                          {report.todo_url && (
                            <a
                              href={report.todo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center"
                            >
                              লিঙ্ক <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-400">
                          নেই
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ProgressBar progress={calculateProgress(report)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              এই ব্যাচে কোনো শিক্ষার্থী পাওয়া যায়নি।
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
