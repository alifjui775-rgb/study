import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { supabase } from "@/lib/supabase";
import { fetchAuditLogs, type AuditLogRow } from "@/lib/admin-crud-queries";
import { PageHeader, LoadingSpinner } from "@/components";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  SquareCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import dayjs from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const ITEMS_PER_PAGE = 50;

function getPageItems(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

type SearchUser = {
  id: string;
  name: string | null;
  email: string | null;
};

const AUDIT_TABLE_OPTIONS = [
  "courses",
  "sections",
  "subsections",
  "instructions",
  "classes",
  "polls",
  "course_files",
  "assignments",
  "batches",
  "exams",
  "study_disciplines",
  "curriculum_papers",
  "degree_programs",
  "universities",
  "colleges",
  "clusters",
  "admission_units",
  "institution_subjects",
  "map_locations",
  "dynamic_notes",
  "circulars",
  "unit_requirements",
  "subject_group_seats",
  "application_details",
  "exam_schedules",
  "admit_card_details",
  "result_details",
  "unit_marks_distributions",
  "study_user",
  "study_student",
];

function getActionDetails(log: AuditLogRow): { label: string; colorClass: string } {
  if (log.action === "INSERT") {
    return {
      label: "যুক্ত",
      colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    };
  }
  if (log.action === "DELETE") {
    return {
      label: "স্থায়ী ডিলিট",
      colorClass: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200",
    };
  }
  if (log.action === "UPDATE") {
    if (!log.old_data?.deleted_at && log.new_data?.deleted_at) {
      return {
        label: "আর্কাইভ",
        colorClass: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
      };
    }
    if (log.old_data?.deleted_at && !log.new_data?.deleted_at) {
      return {
        label: "পুনরুদ্ধার",
        colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200",
      };
    }
    return {
      label: "আপডেট",
      colorClass: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    };
  }
  return {
    label: log.action,
    colorClass: "bg-muted text-muted-foreground border-border",
  };
}

function ActionBadge({ log }: { log: AuditLogRow }) {
  const { label, colorClass } = getActionDetails(log);
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit transition-colors",
        colorClass,
      )}
    >
      {label}
    </div>
  );
}

type FieldComparison = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
};

function getFieldComparisons(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): FieldComparison[] {
  const allKeys = Array.from(
    new Set([...(oldData ? Object.keys(oldData) : []), ...(newData ? Object.keys(newData) : [])]),
  );
  return allKeys.map((key) => {
    const oldVal = oldData ? oldData[key] : undefined;
    const newVal = newData ? newData[key] : undefined;
    return {
      field: key,
      oldValue: oldVal,
      newValue: newVal,
      changed: JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null),
    };
  });
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function AllFieldsView({
  data,
  tone,
}: {
  data: Record<string, unknown> | null;
  tone: "green" | "red";
}) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-muted-foreground italic">কোনো তথ্য নেই</p>;
  }
  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-1.5",
        tone === "green" ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200",
      )}
    >
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex flex-col sm:flex-row sm:gap-3 text-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:w-48 sm:shrink-0">
            {key}
          </span>
          <span className="font-mono text-xs break-all">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function FieldsWithHighlights({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  const fields = getFieldComparisons(oldData, newData);
  const changedCount = fields.filter((f) => f.changed).length;

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground italic">কোনো তথ্য নেই</p>;
  }

  return (
    <div className="space-y-2">
      {changedCount === 0 && (
        <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
          কোনো ফিল্ড পরিবর্তন করা হয়নি (No fields were modified).
        </div>
      )}

      {fields.map(({ field, oldValue, newValue, changed }) => (
        <div
          key={field}
          className={cn(
            "flex flex-col sm:flex-row sm:items-baseline sm:gap-3 rounded-md px-2 py-1.5 text-sm",
            changed && "bg-amber-50/60 border border-amber-200",
          )}
        >
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide sm:w-48 sm:shrink-0",
              changed ? "text-amber-800" : "text-gray-500",
            )}
          >
            {field}
          </span>

          {changed ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="line-through bg-red-100 text-red-700 px-1 rounded font-mono text-xs break-all">
                {formatValue(oldValue)}
              </span>
              <span className="text-muted-foreground">➡</span>
              <span className="bg-yellow-200 text-yellow-900 font-semibold px-1 rounded font-mono text-xs break-all">
                {formatValue(newValue)}
              </span>
            </div>
          ) : (
            <span className="text-gray-800 font-mono text-xs break-all">
              {formatValue(newValue ?? oldValue)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [filterTable, setFilterTable] = useState("ALL");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [confirmAction, setConfirmAction] = useState<
    "delete-log" | "restore" | "permanent-delete" | null
  >(null);
  const [isActing, setIsActing] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<"bulk-delete" | "clear-all" | null>(
    null,
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTable, filterUserId, filterDate, activeTab]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length <= 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("study_user")
        .select("id, name, email")
        .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
        .is("deleted_at", null)
        .limit(5);
      if (!error) setSearchResults((data as SearchUser[]) || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function checkSuperAdmin() {
      if (authLoading || !admin) return;
      try {
        const { data } = await supabase
          .from("study_admin")
          .select("is_super_admin")
          .eq("id", admin.uid)
          .maybeSingle();
        setIsSuperAdmin(!!data?.is_super_admin);
      } catch {
        setIsSuperAdmin(false);
      }
    }
    checkSuperAdmin();
  }, [admin, authLoading]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin === false) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs", activeTab, filterTable, filterUserId, filterDate, currentPage],
    queryFn: () =>
      fetchAuditLogs(
        admin!.uid,
        activeTab,
        { tableName: filterTable, userId: filterUserId, date: filterDate },
        currentPage,
        ITEMS_PER_PAGE,
      ),
    enabled: !!admin && isSuperAdmin === true,
  });

  const logs = data?.data ?? null;

  useEffect(() => {
    setTotalItems(data?.count ?? 0);
  }, [data]);

  useEffect(() => {
    setSelectedLogs([]);
  }, [activeTab, filterTable, filterUserId, filterDate]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const pageItems = getPageItems(currentPage, totalPages);

  const hasActiveFilters = filterTable !== "ALL" || filterUserId !== "" || !!filterDate;

  function clearFilters() {
    setFilterTable("ALL");
    setSelectedUser(null);
    setFilterUserId("");
    setSearchQuery("");
    setSearchResults([]);
    setFilterDate(undefined);
  }

  function toggleSelectAll() {
    if (logs && selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else if (logs) {
      setSelectedLogs(logs.map((log) => log.id));
    }
  }

  function toggleLogSelection(logId: string) {
    setSelectedLogs((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId],
    );
  }

  async function handleBulkDelete() {
    if (selectedLogs.length === 0) return;
    setIsDeletingBulk(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .delete()
        .in("id", selectedLogs)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "ডাটা মুছে ফেলা হয়নি! (RLS পারমিশন বা আইডি ভুল)", variant: "destructive" });
        return;
      }
      toast({ title: `${data.length} টি লগ সফলভাবে মুছে ফেলা হয়েছে!` });
      setSelectedLogs([]);
      setConfirmBulkAction(null);
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "অজ্ঞাত এরর";
      toast({ title: `এরর: ${msg}`, variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
    }
  }

  async function handleClearAllLogs() {
    setIsDeletingBulk(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .delete()
        .not("id", "is", null)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "ডাটা মুছে ফেলা হয়নি! (RLS পারমিশন)", variant: "destructive" });
        return;
      }
      toast({ title: `সব হিস্ট্রি সফলভাবে মুছে ফেলা হয়েছে! (${data.length} টি)` });
      setSelectedLogs([]);
      setConfirmBulkAction(null);
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "অজ্ঞাত এরর";
      toast({ title: `এরর: ${msg}`, variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
    }
  }

  const recordId = selectedLog?.old_data?.id ?? selectedLog?.new_data?.id ?? null;
  const isSoftDelete =
    selectedLog?.action === "UPDATE" &&
    !selectedLog?.old_data?.deleted_at &&
    !!selectedLog?.new_data?.deleted_at;

  async function handleDeleteLog() {
    if (!selectedLog?.id) {
      toast({
        title: "লগ আইডি পাওয়া যায়নি!",
        variant: "destructive",
      });
      return;
    }

    setIsActing(true);
    try {
      console.log("Attempting to delete log ID:", selectedLog.id);

      const { data, error } = await supabase
        .from("audit_logs")
        .delete()
        .eq("id", selectedLog.id)
        .select();

      if (error) {
        console.error("Supabase Error:", error);
        toast({
          title: "এরর",
          description: error.message,
          variant: "destructive",
        });
        setConfirmAction(null);
        return;
      }

      if (!data || data.length === 0) {
        console.error("Delete Log: No row affected:", selectedLog.id);
        toast({
          title: "ডাটা ডিলিট হয়নি!",
          description: "RLS পারমিশন বা আইডি ভুল হতে পারে।",
          variant: "destructive",
        });
        setConfirmAction(null);
        return;
      }

      toast({ title: "হিস্ট্রি সফলভাবে চিরতরে মুছে ফেলা হয়েছে!" });
      setConfirmAction(null);
      setSelectedLog(null);
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "সার্ভারে সমস্যা হয়েছে!",
        variant: "destructive",
      });
      setConfirmAction(null);
    } finally {
      setIsActing(false);
    }
  }

  async function handleRestoreData() {
    if (!selectedLog || !recordId) return;
    setIsActing(true);
    const { error } = await supabase
      .from(selectedLog.table_name)
      .update({ deleted_at: null })
      .eq("id", recordId);
    setIsActing(false);
    if (error) {
      toast({
        title: "রিস্টোর করতে ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "ডেটা সফলভাবে পুনরুদ্ধার করা হয়েছে" });
    setConfirmAction(null);
    setSelectedLog(null);
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  }

  async function handlePermanentDelete() {
    if (!selectedLog || !recordId) return;
    setIsActing(true);
    const { error } = await supabase.from(selectedLog.table_name).delete().eq("id", recordId);
    setIsActing(false);
    if (error) {
      toast({
        title: "স্থায়ীভাবে মুছতে ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "ডেটা স্থায়ীভাবে মুছে ফেলা হয়েছে" });
    setConfirmAction(null);
    setSelectedLog(null);
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  }

  if (authLoading || !admin || isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-lg font-semibold">অ্যাক্সেস নিষেধ</p>
        <p className="text-muted-foreground">এই পৃষ্ঠাটি শুধুমাত্র সুপার অ্যাডমিনদের জন্য।</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="অডিট লগ"
        description={logs ? `মোট ${logs.length} টি লগ রেকর্ড` : undefined}
      />

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1.5 lg:w-56">
            <Label className="text-xs text-muted-foreground">টেবিল</Label>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger>
                <SelectValue placeholder="সব টেবিল" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">সব টেবিল</SelectItem>
                {AUDIT_TABLE_OPTIONS.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 lg:flex-1">
            <Label className="text-xs text-muted-foreground">ব্যবহারকারী</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start gap-2 font-normal w-full",
                    !selectedUser && "text-muted-foreground",
                  )}
                >
                  {selectedUser ? (
                    <>
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate text-foreground">
                        {selectedUser.name || "নাম নেই"}
                        {selectedUser.email && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({selectedUser.email})
                          </span>
                        )}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(null);
                          setFilterUserId("");
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="ml-auto rounded-full p-0.5 hover:bg-muted"
                        aria-label="ব্যবহারকারী ফিল্টার মুছুন"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 shrink-0" />
                      <span className="truncate">নাম বা ইমেইল দিয়ে খুঁজুন...</span>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  {isSearching ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin" />
                      খুঁজছি...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setFilterUserId(user.id);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-emerald-50/70 hover:text-emerald-900"
                      >
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          <span className="font-medium">{user.name || "নাম নেই"}</span>
                          {user.email && (
                            <span className="ml-1 text-xs text-muted-foreground">{user.email}</span>
                          )}
                        </span>
                      </button>
                    ))
                  ) : searchQuery.trim().length > 2 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      কোনো ব্যবহারকারী পাওয়া যায়নি
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      অন্তত ৩টি অক্ষর লিখুন
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">তারিখ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start gap-2 font-normal",
                    !filterDate && "text-muted-foreground",
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  {filterDate ? dayjs(filterDate).format("DD MMM YYYY") : "তারিখ নির্বাচন করুন"}
                  {filterDate && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterDate(undefined);
                      }}
                      className="ml-auto rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="lg:mb-0.5">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              ফিল্টার মুছুন
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ALL">সব</TabsTrigger>
          <TabsTrigger value="INSERT">যুক্ত</TabsTrigger>
          <TabsTrigger value="UPDATE">এডিট</TabsTrigger>
          <TabsTrigger value="DELETE">ডিলেট</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-destructive">লগ লোড করতে সমস্যা হয়েছে।</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">কোনো অডিট লগ পাওয়া যায়নি।</div>
          ) : (
            <>
              {/* Action Bar — Select All + Bulk Delete + Clear All */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-md border border-red-200 bg-red-50/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={logs.length > 0 && selectedLogs.length === logs.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedLogs.length > 0
                        ? `${selectedLogs.length} টি নির্বাচিত`
                        : `সব (${logs.length})`}
                    </span>
                  </div>

                  {selectedLogs.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeletingBulk}
                      onClick={() => setConfirmBulkAction("bulk-delete")}
                    >
                      {isDeletingBulk ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-4 w-4" />
                      )}
                      নির্বাচিত ({selectedLogs.length}) মুছুন
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeletingBulk}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => setConfirmBulkAction("clear-all")}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  সব হিস্ট্রি মুছুন
                </Button>
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={logs.length > 0 && selectedLogs.length === logs.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[180px]">তারিখ ও সময়</TableHead>
                      <TableHead>টেবিল</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                      <TableHead>কর্মী</TableHead>
                      <TableHead className="text-right w-[100px]">বিস্তারিত</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLogs.includes(log.id)}
                            onCheckedChange={() => toggleLogSelection(log.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {dayjs(log.created_at).format("DD MMM YYYY, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.table_name}
                          </code>
                        </TableCell>
                        <TableCell>
                          <ActionBadge log={log} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_name ?? (
                            <span className="text-muted-foreground italic">অজ্ঞাত</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4 mr-1" />
                            বিস্তারিত
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border bg-card text-card-foreground shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3 p-4 pb-0">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedLogs.includes(log.id)}
                          onCheckedChange={() => toggleLogSelection(log.id)}
                        />
                        <ActionBadge log={log} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {dayjs(log.created_at).format("DD MMM YYYY, HH:mm:ss")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 p-4">
                      <p className="text-sm font-medium text-foreground">
                        <span className="text-muted-foreground">টেবিল:</span>{" "}
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.table_name}
                        </code>
                      </p>
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">কর্মী:</span>{" "}
                        {log.user_name ?? (
                          <span className="text-muted-foreground italic">অজ্ঞাত</span>
                        )}
                      </p>
                    </div>

                    <div className="p-4 pt-0">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        বিস্তারিত
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 items-center sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                মোট {totalItems} টি রেকর্ডের মধ্যে {from + 1} - {Math.min(to + 1, totalItems)} দেখানো
                হচ্ছে
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  পূর্ববর্তী
                </Button>

                {pageItems.map((page, i) =>
                  page === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        page === currentPage && "bg-emerald-600 text-white hover:bg-emerald-700",
                      )}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ),
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  পরবর্তী
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              লগ বিস্তারিত
              {selectedLog && <ActionBadge log={selectedLog} />}
            </DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <>
                  {dayjs(selectedLog.created_at).format("DD MMM YYYY, HH:mm:ss")} —{" "}
                  <code className="text-xs">{selectedLog.table_name}</code>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {selectedLog.record_id && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Record ID
                    </p>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {selectedLog.record_id}
                    </code>
                  </div>
                )}

                {selectedLog.user_name && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      কর্মী
                    </p>
                    <p className="text-sm">{selectedLog.user_name}</p>
                  </div>
                )}

                {selectedLog.action === "INSERT" && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      নতুন তথ্য (New Data)
                    </p>
                    <AllFieldsView data={selectedLog.new_data} tone="green" />
                  </div>
                )}

                {selectedLog.action === "DELETE" && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      মুছে ফেলা তথ্য (Deleted Data)
                    </p>
                    <AllFieldsView data={selectedLog.old_data} tone="red" />
                  </div>
                )}

                {selectedLog.action === "UPDATE" && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      সম্পূর্ণ তথ্য (পরিবর্তিত ফিল্ড হাইলাইট করা)
                    </p>
                    <FieldsWithHighlights
                      oldData={selectedLog.old_data}
                      newData={selectedLog.new_data}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            {isSoftDelete && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction("restore")}
                  disabled={isActing}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  রিস্টোর করুন
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmAction("permanent-delete")}
                  disabled={isActing}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  স্থায়ীভাবে মুছুন
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirmAction("delete-log")}
              disabled={isActing}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              হিস্ট্রি মুছুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete-log" && "অডিট লগ মুছবেন?"}
              {confirmAction === "restore" && "ডেটা পুনরুদ্ধার করবেন?"}
              {confirmAction === "permanent-delete" && "স্থায়ীভাবে মুছবেন?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete-log" &&
                "এই অডিট লগ রেকর্ডটি স্থায়ীভাবে মুছে যাবে। এই কাজটি ফেরানো যাবে না।"}
              {confirmAction === "restore" &&
                recordId &&
                `"${selectedLog?.table_name}" টেবিলের রেকর্ডটি (${recordId}) পুনরুদ্ধার করা হবে — deleted_at হবে null।`}
              {confirmAction === "permanent-delete" &&
                recordId &&
                `"${selectedLog?.table_name}" টেবিলের রেকর্ডটি (${recordId}) ডেটাবেস থেকে স্থায়ীভাবে মুছে যাবে। এই কাজটি ফেরানো যাবে না!`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActing}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                console.log(
                  "Action confirmed:",
                  confirmAction,
                  "Record ID:",
                  confirmAction === "delete-log"
                    ? selectedLog?.id
                    : confirmAction === "restore" || confirmAction === "permanent-delete"
                      ? recordId
                      : null,
                );
                if (confirmAction === "delete-log") void handleDeleteLog();
                else if (confirmAction === "restore") void handleRestoreData();
                else if (confirmAction === "permanent-delete") void handlePermanentDelete();
              }}
              className={cn(
                confirmAction !== "restore" && "bg-red-600 text-white hover:bg-red-700",
                confirmAction === "restore" && "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              {isActing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              হ্যাঁ, নিশ্চিত
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog
        open={confirmBulkAction !== null}
        onOpenChange={(open) => !open && setConfirmBulkAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulkAction === "bulk-delete" && "নির্বাচিত লগ মুছবেন?"}
              {confirmBulkAction === "clear-all" && "সব হিস্ট্রি মুছে ফেলবেন?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulkAction === "bulk-delete" &&
                `${selectedLogs.length} টি অডিট লগ স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি ফেরানো যাবে না।`}
              {confirmBulkAction === "clear-all" && (
                <span className="text-destructive font-semibold">Warning:</span>
              )}{" "}
              {confirmBulkAction === "clear-all" &&
                "সম্পূর্ণ অডিট লগ স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি ফেরানো যাবে না!"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmBulkAction === "bulk-delete") void handleBulkDelete();
                else if (confirmBulkAction === "clear-all") void handleClearAllLogs();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingBulk && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {confirmBulkAction === "bulk-delete" ? "হ্যাঁ, মুছে ফেলুন" : "হ্যাঁ, সব মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
