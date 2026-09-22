import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader, LoadingSpinner } from "@/components";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  SquareCheck,
  Trash,
} from "lucide-react";
import dayjs from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

const RECYCLE_TABLE_OPTIONS = [
  "batches",
  "colleges",
  "universities",
  "degree_programs",
  "study_disciplines",
  "courses",
  "exams",
  "circulars",
];

type RecycledItem = {
  total_count?: number;
  record: Record<string, unknown>;
  deleted_by_user: { name: string | null; email: string | null } | null;
};

function getIdentifier(item: RecycledItem): string {
  const rec = item.record;
  if (rec.name) return String(rec.name);
  if (rec.title) return String(rec.title);
  return String(rec.id ?? "—");
}

export default function RecycleBinPage() {
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [selectedTable, setSelectedTable] = useState("courses");
  const [recycledItems, setRecycledItems] = useState<RecycledItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [confirmBulkAction, setConfirmBulkAction] = useState<"bulk-delete" | "empty-bin" | null>(
    null,
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
  }, [selectedTable]);

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

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const { data, error } = await supabase.rpc("get_recycled_items_paginated", {
        target_table: selectedTable,
        page_limit: ITEMS_PER_PAGE,
        page_offset: offset,
      });
      if (error) throw error;
      const items = (data as RecycledItem[]) || [];
      setRecycledItems(items);
      setTotalItems(items.length > 0 ? (items[0].total_count ?? 0) : 0);
    } catch (err) {
      console.error("Recycle bin fetch error:", err);
      toast({
        title: "লোড করতে সমস্যা হয়েছে",
        description: "রিসাইকেল বিন থেকে ডেটা আনা যায়নি।",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, currentPage, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const pageItems = getPageItems(currentPage, totalPages);

  async function handleRestore(id: string) {
    setIsActing(true);
    const { error } = await supabase.from(selectedTable).update({ deleted_at: null }).eq("id", id);
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
    loadItems();
  }

  async function handlePermanentDelete() {
    if (!confirmId) return;
    setIsActing(true);
    const { error } = await supabase.from(selectedTable).delete().eq("id", confirmId);
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
    setConfirmId(null);
    loadItems();
  }

  function toggleSelectAll() {
    if (selectedItems.length === recycledItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(recycledItems.map((item) => String(item.record.id ?? "")));
    }
  }

  function toggleItemSelection(id: string) {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleBulkPermanentDelete() {
    if (selectedItems.length === 0) return;
    setIsDeletingBulk(true);
    try {
      const { error } = await supabase.from(selectedTable).delete().in("id", selectedItems);

      if (error) throw error;
      toast({ title: `${selectedItems.length} টি রেকর্ড চিরতরে মুছে ফেলা হয়েছে!` });
      setSelectedItems([]);
      setConfirmBulkAction(null);
      loadItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "অজ্ঞাত এরর";
      toast({ title: `এরর: ${msg}`, variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
    }
  }

  async function handleEmptyRecycleBin() {
    setIsDeletingBulk(true);
    try {
      const { error } = await supabase.from(selectedTable).delete().not("deleted_at", "is", null);

      if (error) throw error;
      toast({ title: `${selectedTable} টেবিলের রিসাইকেল বিন সম্পূর্ণ খালি করা হয়েছে!` });
      setSelectedItems([]);
      setConfirmBulkAction(null);
      setCurrentPage(1);
      loadItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "অজ্ঞাত এরর";
      toast({ title: `এরর: ${msg}`, variant: "destructive" });
    } finally {
      setIsDeletingBulk(false);
    }
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
        title="রিসাইকেল বিন"
        description={`${selectedTable} টেবিলের মুছে ফেলা ${totalItems} টি রেকর্ড`}
      />

      <div className="rounded-md border bg-card p-3 w-full sm:w-64">
        <Label className="text-xs text-muted-foreground">টেবিল নির্বাচন করুন</Label>
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="টেবিল নির্বাচন করুন" />
          </SelectTrigger>
          <SelectContent>
            {RECYCLE_TABLE_OPTIONS.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner />
        </div>
      ) : recycledItems.length === 0 ? (
        <div className="rounded-md border border-dashed py-16 text-center">
          <Trash className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">এই টেবিলে কোনো মুছে ফেলা রেকর্ড নেই।</p>
        </div>
      ) : (
        <>
          {/* Action Bar — Select All + Bulk Delete + Empty Recycle Bin */}
          {recycledItems.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      recycledItems.length > 0 && selectedItems.length === recycledItems.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length > 0
                      ? `${selectedItems.length} টি নির্বাচিত`
                      : `সব (${recycledItems.length})`}
                  </span>
                </div>

                {selectedItems.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeletingBulk}
                    onClick={() => setConfirmBulkAction("bulk-delete")}
                  >
                    {isDeletingBulk ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="mr-1.5 h-4 w-4" />
                    )}
                    নির্বাচিত ({selectedItems.length}) চিরতরে মুছুন
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={isDeletingBulk}
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => setConfirmBulkAction("empty-bin")}
              >
                <Trash className="mr-1.5 h-4 w-4" />
                রিসাইকেল বিন খালি করুন
              </Button>
            </div>
          )}

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        recycledItems.length > 0 && selectedItems.length === recycledItems.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>আইডি / নাম</TableHead>
                  <TableHead>ডিলিট হওয়ার সময়</TableHead>
                  <TableHead>কে ডিলিট করেছেন</TableHead>
                  <TableHead className="text-right w-[200px]">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recycledItems.map((item) => {
                  const id = String(item.record.id ?? "");
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(id)}
                          onCheckedChange={() => toggleItemSelection(id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{getIdentifier(item)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.record?.deleted_at
                          ? dayjs(String(item.record.deleted_at)).format("DD MMM YYYY, HH:mm:ss")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {item.deleted_by_user?.name ? (
                          <div>
                            <p className="text-sm">{item.deleted_by_user.name}</p>
                            {item.deleted_by_user.email && (
                              <p className="text-xs text-muted-foreground">
                                {item.deleted_by_user.email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">অজ্ঞাত</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRecord(item.record);
                              setIsDetailsOpen(true);
                            }}
                            disabled={isActing}
                          >
                            <Eye className="mr-1.5 h-4 w-4" />
                            বিস্তারিত
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRestore(id)}
                            disabled={isActing}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          >
                            <RefreshCcw className="mr-1.5 h-4 w-4" />
                            রিস্টোর
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmId(id)}
                            disabled={isActing}
                            className="bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 shadow-none"
                          >
                            <Trash className="mr-1.5 h-4 w-4" />
                            স্থায়ী ডিলিট
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {recycledItems.map((item) => {
              const id = String(item.record.id ?? "");
              return (
                <div
                  key={id}
                  className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedItems.includes(id)}
                      onCheckedChange={() => toggleItemSelection(id)}
                    />
                    <p className="text-base font-semibold break-all">{getIdentifier(item)}</p>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <p>
                      <span className="text-muted-foreground">ডিলিট হওয়ার সময়:</span>{" "}
                      <span className="font-mono text-xs">
                        {item.record?.deleted_at
                          ? dayjs(String(item.record.deleted_at)).format("DD MMM YYYY, HH:mm:ss")
                          : "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">কে ডিলিট করেছেন:</span>{" "}
                      {item.deleted_by_user?.name ? (
                        <>
                          <span>{item.deleted_by_user.name}</span>
                          {item.deleted_by_user.email && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({item.deleted_by_user.email})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">অজ্ঞাত</span>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRecord(item.record);
                        setIsDetailsOpen(true);
                      }}
                      disabled={isActing}
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      বিস্তারিত
                    </Button>
                    <Button
                      onClick={() => handleRestore(id)}
                      disabled={isActing}
                      className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    >
                      <RefreshCcw className="mr-1.5 h-4 w-4" />
                      রিস্টোর
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmId(id)}
                      disabled={isActing}
                      className="col-span-2 bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 shadow-none"
                    >
                      <Trash className="mr-1.5 h-4 w-4" />
                      স্থায়ী ডিলিট
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 0 && (
        <div className="mt-4 flex flex-col gap-3 items-center sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            মোট {totalItems} টি রেকর্ডের মধ্যে {from + 1} - {Math.min(to + 1, totalItems)} দেখানো হচ্ছে
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

      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>স্থায়ীভাবে মুছবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedTable}" টেবিলের রেকর্ডটি ({confirmId}) ডেটাবেস থেকে স্থায়ীভাবে মুছে যাবে। এই কাজটি
              ফেরানো যাবে না!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActing}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePermanentDelete();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isActing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              হ্যাঁ, স্থায়ীভাবে মুছুন
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
              {confirmBulkAction === "bulk-delete" && "নির্বাচিত রেকর্ড চিরতরে মুছবেন?"}
              {confirmBulkAction === "empty-bin" && "রিসাইকেল বিন খালি করবেন?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBulkAction === "bulk-delete" && (
                <>
                  আপনি {selectedItems.length} টি রেকর্ড <strong>চিরতরে</strong> মুছে ফেলতে চলেছেন। এই
                  কাজটির পর ডাটা আর ফিরে পাওয়া যাবে না। আপনি কি নিশ্চিত?
                </>
              )}
              {confirmBulkAction === "empty-bin" && (
                <span className="text-destructive font-semibold">
                  আপনি কি নিশ্চিত? এই টেবিলের সমস্ত ডিলিট হওয়া ডাটা চিরতরে মুছে যাবে!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmBulkAction === "bulk-delete") void handleBulkPermanentDelete();
                else if (confirmBulkAction === "empty-bin") void handleEmptyRecycleBin();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeletingBulk && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {confirmBulkAction === "bulk-delete" ? "হ্যাঁ, চিরতরে মুছুন" : "হ্যাঁ, খালি করুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>রেকর্ডের বিস্তারিত তথ্য</DialogTitle>
            <DialogDescription>
              {selectedRecord &&
                (String(selectedRecord.name ?? selectedRecord.title ?? "") ||
                  (selectedRecord.id ? `আইডি: ${String(selectedRecord.id)}` : "রেকর্ড বিস্তারিত"))}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 pr-4">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1 rounded-md border bg-card p-3 sm:flex-row sm:items-baseline"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:w-48 sm:shrink-0">
                      {key}
                    </span>
                    {value !== null && typeof value === "object" ? (
                      <pre className="flex-1 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-sm font-medium break-all">
                        {String(value ?? "null")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
