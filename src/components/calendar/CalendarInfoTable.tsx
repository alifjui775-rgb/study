import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarInfo, isRowVisible, type CalendarInfoRow } from "@/lib/calendar-queries";
import type { Json } from "@/lib/database.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Calculator, Check, X, Heart, Search, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

const toBengaliNumber = (num: number | string) => {
  const bengaliNumbers: { [key: string]: string } = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",
  };
  return String(num).replace(/[0-9]/g, (match) => bengaliNumbers[match]);
};

const MARKS_NOT_AVAILABLE = <span className="text-gray-500 text-sm">মানবন্টন তথ্য উপলব্ধ নয়</span>;

type SubjectSelectionSubject = {
  name: string;
  mcq: number | null;
  written: number | null;
};

type SubjectSelectionRule = {
  title: string;
  type: string;
  note: string | null;
  subjects: SubjectSelectionSubject[];
};

type SubjectSelectionGroup = {
  target_group: string;
  total_subjects_to_answer: number;
  rules: SubjectSelectionRule[];
};

const isString = (value: unknown): value is string => typeof value === "string";

const isNumberOrNull = (value: unknown): value is number | null =>
  typeof value === "number" || value === null;

const isSubjectSelectionSubject = (value: unknown): value is SubjectSelectionSubject => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return isString(obj.name) && isNumberOrNull(obj.mcq) && isNumberOrNull(obj.written);
};

const isSubjectSelectionRule = (value: unknown): value is SubjectSelectionRule => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    isString(obj.title) &&
    isString(obj.type) &&
    (obj.note === null || isString(obj.note)) &&
    Array.isArray(obj.subjects) &&
    obj.subjects.every(isSubjectSelectionSubject)
  );
};

const isSubjectSelectionGroup = (value: unknown): value is SubjectSelectionGroup => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    isString(obj.target_group) &&
    typeof obj.total_subjects_to_answer === "number" &&
    Array.isArray(obj.rules) &&
    obj.rules.every(isSubjectSelectionRule)
  );
};

const getValidatedGroups = (raw: Json | null): SubjectSelectionGroup[] | null => {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
  const groups = raw.filter(isSubjectSelectionGroup);
  return groups.length > 0 ? groups : null;
};

const formatMarksSummary = (marks: CalendarInfoRow["marks"]): string => {
  if (!marks) return "";

  const parts: string[] = [];

  if (marks.total_marks != null) {
    parts.push(`${toBengaliNumber(marks.total_marks)}নাম্বার`);
  }
  if (marks.total_time != null) {
    const hours = Math.floor(marks.total_time);
    const minutes = Math.round((marks.total_time - hours) * 60);
    if (hours > 0 && minutes > 0) {
      parts.push(`${toBengaliNumber(hours)}ঘন্টা ${toBengaliNumber(minutes)}মিনিট`);
    } else if (hours > 0) {
      parts.push(`${toBengaliNumber(hours)}ঘন্টা`);
    } else {
      parts.push(`${toBengaliNumber(minutes)}মিনিট`);
    }
  }

  return parts.join(", ");
};

const formatMarksDetail = (marks: CalendarInfoRow["marks"]): React.ReactNode => {
  if (!marks) return MARKS_NOT_AVAILABLE;

  const groups = getValidatedGroups(marks.subject_selection_rules);

  if (groups && groups.length > 0) {
    return (
      <div className="space-y-1.5 mt-1">
        {groups.map((group, gIdx) => (
          <div key={gIdx}>
            <p className="font-bold text-foreground text-xs">
              {group.target_group} বিভাগ (মোট: {toBengaliNumber(group.total_subjects_to_answer)}টি)
            </p>
            <div className="space-y-0.5">
              {group.rules.map((rule, rIdx) => (
                <div key={rIdx} className="text-xs">
                  <p className="font-bold text-foreground whitespace-nowrap">• {rule.title} ➛</p>
                  <p className="text-muted-foreground pl-3">
                    {rule.subjects.map((sub, sIdx) => {
                      const hasMarks = sub.mcq != null || sub.written != null;
                      const marksParts: string[] = [];
                      if (sub.mcq != null) marksParts.push(`M:${toBengaliNumber(sub.mcq)}`);
                      if (sub.written != null) marksParts.push(`W:${toBengaliNumber(sub.written)}`);

                      return (
                        <span key={sIdx}>
                          {sIdx > 0 && ", "}
                          {sub.name}
                          {hasMarks && (
                            <span className="text-muted-foreground/70">
                              ({marksParts.join(", ")})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback to flat marks fields
  const parts: string[] = [];
  if (marks.mcq_marks != null) parts.push(`MCQ:${toBengaliNumber(marks.mcq_marks)}`);
  if (marks.written_marks != null) parts.push(`লিখিত:${toBengaliNumber(marks.written_marks)}`);
  if (marks.other_marks != null) {
    const type = marks.other_marks_type || "অন্যান্য";
    parts.push(`${type}:${toBengaliNumber(marks.other_marks)}`);
  }

  return parts.length > 0 ? parts.join(", ") : MARKS_NOT_AVAILABLE;
};

interface CalendarInfoTableProps {
  filters?: { [key: string]: boolean };
}

const CalendarInfoTable = ({ filters }: CalendarInfoTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toggleFavorite, isFavorite } = useFavorites();
  const {
    data: infoRows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["calendar-info"],
    queryFn: fetchCalendarInfo,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <LoadingSpinner message="তথ্য লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">তথ্য লোড করতে সমস্যা হয়েছে।</p>
      </div>
    );
  }

  const getFavoriteKey = (row: CalendarInfoRow) =>
    row.id || `${row.institution_slug}_${row.unit_slug}`;

  const filteredInfoRows = infoRows.filter((row) => {
    if (!isRowVisible(row, filters)) return false;
    if (!row.marks) return false;
    const name = row.institution_name_bn
      ? `${row.institution_name_bn}${row.unit_slug ? ` (${row.unit_slug})` : ""}`
      : row.unit_name_bn;
    const q = searchTerm.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      (row.institution_slug && row.institution_slug.toLowerCase().includes(q))
    );
  });

  const sortedInfoRows = [...filteredInfoRows].sort((a, b) => {
    const isAFav = isFavorite(getFavoriteKey(a));
    const isBFav = isFavorite(getFavoriteKey(b));
    if (isAFav && !isBFav) return -1;
    if (!isAFav && isBFav) return 1;
    const nameA = (a.institution_name_bn || "").toLowerCase();
    const nameB = (b.institution_name_bn || "").toLowerCase();
    return nameA.localeCompare(nameB, "bn");
  });

  return (
    <>
      <div className="relative my-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="বিশ্ববিদ্যালয় খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 h-12 text-base bg-card border"
        />
      </div>
      <div className="w-full border border-border bg-card rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="bg-primary text-primary-foreground text-center font-bold rounded-tl-2xl w-[1%] p-0 border-b-0"></TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0">
                  বিশ্ববিদ্যালয়
                </TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0">
                  মানবন্টন
                </TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0 whitespace-nowrap">
                  পরীক্ষা কেন্দ্র
                </TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0 whitespace-nowrap">
                  সেকেন্ড
                  <br />
                  টাইম
                </TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0">
                  নেগিটিভ
                </TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold border-b-0">
                  <Calculator className="inline-block h-4 w-4" />
                </TableHead>
                <TableHead className="bg-primary text-primary-foreground text-center font-bold rounded-tr-2xl border-b-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {sortedInfoRows.map((row: CalendarInfoRow) => {
                const marksSummary = formatMarksSummary(row.marks);
                const marksDetail = formatMarksDetail(row.marks);
                const favoriteKey = getFavoriteKey(row);
                const isFav = isFavorite(favoriteKey);

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "hover:bg-muted/40 transition-colors duration-150",
                      isFav && "bg-primary/5 dark:bg-primary/10",
                    )}
                  >
                    {/* ফ্যাভারেট */}
                    <TableCell className="text-center p-1">
                      <button
                        onClick={() => toggleFavorite(favoriteKey)}
                        className="p-0.5 rounded-full hover:bg-muted transition-colors inline-flex items-center justify-center"
                        title="পছন্দের তালিকায় যুক্ত করুন"
                      >
                        <Heart
                          size={16}
                          className={cn(
                            "transition-all",
                            isFav
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground/50 hover:text-red-400",
                          )}
                        />
                      </button>
                    </TableCell>
                    {/* বিশ্ববিদ্যালয় */}
                    <TableCell className="font-bold whitespace-nowrap align-top text-center">
                      <div>
                        <p>
                          {row.institution_name_bn}
                          {row.show_unit_slug && ` (${row.unit_slug.toUpperCase()})`}
                        </p>
                        <div className="flex flex-col items-center gap-0.5 mt-1 text-xs">
                          {row.circular_download_url && (
                            <a
                              href={row.circular_download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              [সার্কুলার]
                            </a>
                          )}
                          {row.institution_slug && (
                            <Link
                              to={`/qb/${row.institution_slug}/${row.unit_slug}`}
                              className="text-primary hover:underline"
                            >
                              [প্রশ্নব্যাংক]
                            </Link>
                          )}
                          {row.institution_slug && (
                            <Link
                              to={`/${row.institution_type || "university"}/${row.institution_slug}`}
                              className="text-primary hover:underline"
                            >
                              [বিস্তারিত]
                            </Link>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* মানবন্টন */}
                    <TableCell className="align-top text-sm text-left sm:text-center">
                      {marksSummary ? (
                        <div>
                          <p className="font-bold">{marksSummary}</p>
                          <div className="text-xs text-muted-foreground mt-0.5">{marksDetail}</div>
                        </div>
                      ) : (
                        marksDetail
                      )}
                    </TableCell>

                    {/* পরীক্ষা কেন্দ্র */}
                    <TableCell className="align-top text-sm text-center">
                      {row.exam_center_note || <span className="text-muted-foreground">-</span>}
                    </TableCell>

                    {/* সেকেন্ড টাইম */}
                    <TableCell className="text-center align-top">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.second_time ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm">
                            <Check className="h-4 w-4" /> আছে
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 font-bold text-sm">
                            <X className="h-4 w-4" /> নেই
                          </span>
                        )}
                        {row.second_time_condition && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-blue-500 cursor-pointer" />
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3 text-sm">
                              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                শর্তাবলী
                              </p>
                              <p className="text-foreground leading-relaxed">
                                {row.second_time_condition}
                              </p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>

                    {/* নেগিটিভ */}
                    <TableCell className="text-center align-top font-bold text-sm">
                      {row.negative_mark != null && Number(row.negative_mark) > 0 ? (
                        <span>-{toBengaliNumber(row.negative_mark)}</span>
                      ) : (
                        <span className="text-muted-foreground">নেই</span>
                      )}
                    </TableCell>

                    {/* Calculator */}
                    <TableCell className="text-center align-top">
                      {row.calculator_allowed ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          {row.calculator_link && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <span className="text-xs text-primary hover:underline cursor-pointer">
                                  [তালিকা]
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2 text-sm font-bengali">
                                <a
                                  href={row.calculator_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  অনুমোদিত ক্যালকুলেটর দেখুন
                                </a>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      ) : (
                        <X className="h-4 w-4 text-red-500 dark:text-red-400 inline-block" />
                      )}
                    </TableCell>
                    <TableCell className="text-center p-1"></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default CalendarInfoTable;
