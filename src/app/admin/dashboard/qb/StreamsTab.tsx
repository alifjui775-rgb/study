// =============================================================================
// Admin — Master QB: Streams Management tab (master_qb_streams)
// =============================================================================

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMasterQbStreams,
  insertMasterQbStream,
  updateMasterQbStream,
  deleteMasterQbStream,
  updateMasterQbStreamSortOrder,
} from "@/lib/master-qb-admin-queries";
import type {
  MasterQbStreamRow,
  MasterQbStreamFormValues,
} from "@/lib/master-qb-admin-types";
import MasterQbStreamFormSheet from "@/components/admin/MasterQbStreamFormSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  FileText,
} from "lucide-react";

const QUERY_KEY = "admin-master-qb-streams";

function StreamIcon({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <BookOpen className="h-4 w-4 text-primary/50" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailed(true)}
      className="h-9 w-9 rounded-lg object-contain bg-muted p-1 shrink-0"
    />
  );
}

export default function StreamsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<MasterQbStreamRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterQbStreamRow | null>(null);

  const {
    data: streams = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchMasterQbStreams,
    staleTime: 2 * 60 * 1000,
  });

  const insertMutation = useMutation({
    mutationFn: insertMasterQbStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ স্ট্রিম যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "❌ যোগ করতে সমস্যা হয়েছে",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: MasterQbStreamFormValues }) =>
      updateMasterQbStream(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ স্ট্রিম আপডেট করা হয়েছে" });
      setSheetOpen(false);
      setEditingStream(null);
    },
    onError: (err: any) => {
      toast({
        title: "❌ আপডেট করতে সমস্যা হয়েছে",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMasterQbStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "🗑️ স্ট্রিম মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({
        title: "❌ মুছতে সমস্যা হয়েছে",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ordered: MasterQbStreamRow[]) => {
      await Promise.all(ordered.map((s, i) => updateMasterQbStreamSortOrder(s.id, i)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ ক্রম পরিবর্তন করা হয়েছে" });
    },
    onError: (err: any) => {
      toast({
        title: "❌ ক্রম পরিবর্তন করতে সমস্যা হয়েছে",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleOpenAdd = () => {
    setEditingStream(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (stream: MasterQbStreamRow) => {
    setEditingStream(stream);
    setSheetOpen(true);
  };

  const handleFormSubmit = (values: MasterQbStreamFormValues) => {
    if (editingStream) {
      updateMutation.mutate({ id: editingStream.id, values });
    } else {
      insertMutation.mutate(values);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= streams.length) return;
    const next = [...streams];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next);
  };

  const isSubmitting = insertMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground font-bengali">
          মোট {streams.length} টি স্ট্রিম
        </p>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="font-bengali">নতুন স্ট্রিম</span>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="স্ট্রিম লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা হয়েছে: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : streams.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো স্ট্রিম যোগ করা হয়নি।</p>
        </div>
      ) : (
        <>
          {/* --- Mobile Card Grid --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {streams.map((stream, index) => (
              <div
                key={stream.id}
                className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <StreamIcon url={stream.icon_url} name={stream.name_bn} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base font-bengali text-foreground truncate">
                      {stream.name_bn}
                    </h3>
                    <code className="text-xs text-muted-foreground">{stream.slug}</code>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    #{index + 1}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <Badge variant="secondary" className="text-[10px] gap-1 font-bengali">
                    <FileText className="h-3 w-3" />
                    {stream.paper_ids?.length ?? 0} পেপার
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => move(index, 1)}
                      disabled={index === streams.length - 1 || reorderMutation.isPending}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(stream)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteTarget(stream)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* --- Desktop Table --- */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 font-bengali">#</TableHead>
                    <TableHead className="font-bengali">আইকন</TableHead>
                    <TableHead className="font-bengali">নাম</TableHead>
                    <TableHead className="font-bengali">Slug</TableHead>
                    <TableHead className="font-bengali text-center">ক্রম</TableHead>
                    <TableHead className="font-bengali text-center">পেপার</TableHead>
                    <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream, index) => (
                    <TableRow
                      key={stream.id}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>

                      <TableCell>
                        <StreamIcon url={stream.icon_url} name={stream.name_bn} />
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm font-bengali truncate">
                            {stream.name_bn}
                          </p>
                          {stream.short_name_bn && (
                            <p className="text-xs text-muted-foreground font-bengali truncate">
                              {stream.short_name_bn}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {stream.slug}
                        </code>
                      </TableCell>

                      <TableCell className="text-center text-sm">
                        {stream.sort_order}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <FileText className="h-3 w-3" />
                          {stream.paper_ids?.length ?? 0}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="উপরে"
                            onClick={() => move(index, -1)}
                            disabled={index === 0 || reorderMutation.isPending}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="নিচে"
                            onClick={() => move(index, 1)}
                            disabled={index === streams.length - 1 || reorderMutation.isPending}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="সম্পাদনা"
                            onClick={() => handleOpenEdit(stream)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="মুছুন"
                            onClick={() => setDeleteTarget(stream)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <MasterQbStreamFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingStream(null);
        }}
        editingStream={editingStream}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deleteTarget?.name_bn}</strong> স্ট্রিমটি মুছে ফেলতে চান? এই কাজটি
              পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
