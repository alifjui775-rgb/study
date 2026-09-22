// =============================================================================
// Admin — Clusters CRUD Page
// Full data table + add/edit sheet + delete confirmation.
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  fetchClustersPaginated,
  insertCluster,
  updateCluster,
  deleteCluster,
} from "@/lib/cluster-admin-queries";
import type { ClusterRow, ClusterFormValues } from "@/lib/cluster-admin-types";
import { CLUSTER_TYPE_LABELS } from "@/lib/cluster-admin-types";
import ClusterFormSheet from "@/components/admin/ClusterFormSheet";

// UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Network,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
} from "lucide-react";

const QUERY_KEY = "admin-clusters";

export default function AdminClustersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClusterRow | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 50;

  // --- Queries ---
  const {
    data: clustersResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, page],
    queryFn: () => fetchClustersPaginated(page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const clusters = clustersResult?.data || [];
  const totalCount = clustersResult?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Reset to page 1 on search
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // --- Mutations ---
  const insertMutation = useMutation({
    mutationFn: insertCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ গুচ্ছ ক্লাস্টার যোগ করা হয়েছে" });
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
    mutationFn: ({ id, values }: { id: string; values: ClusterFormValues }) =>
      updateCluster(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ গুচ্ছের তথ্য আপডেট করা হয়েছে" });
      setSheetOpen(false);
      setEditingCluster(null);
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
    mutationFn: deleteCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "🗑️ গুচ্ছ ক্লাস্টার মুছে ফেলা হয়েছে" });
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

  const handleFormSubmit = (values: ClusterFormValues) => {
    if (editingCluster) {
      updateMutation.mutate({ id: editingCluster.id, values });
    } else {
      insertMutation.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingCluster(null);
    setSheetOpen(true);
  };

  const openEdit = (cluster: ClusterRow) => {
    setEditingCluster(cluster);
    setSheetOpen(true);
  };

  // --- Client-side search within the paginated set ---
  const filtered = clusters.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name_bn.toLowerCase().includes(term) ||
      c.name_en.toLowerCase().includes(term) ||
      c.slug.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <Helmet>
        <title>গুচ্ছ তালিকা — অ্যাডমিন ড্যাশবোর্ড</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-bengali flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              গুচ্ছ (Cluster) তালিকা
            </h1>
            <p className="text-sm text-muted-foreground font-bengali mt-1">
              সিস্টেমের সকল গুচ্ছ শিক্ষাপ্রতিষ্ঠানসমূহ তৈরি, সম্পাদনা বা মুছুন।
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2 font-bengali">
            <Plus className="h-4 w-4" />
            নতুন গুচ্ছ
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="নাম বা স্লাগ দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 font-bengali"
          />
        </div>

        {/* Data Area */}
        {isLoading ? (
          <LoadingSpinner message="গুচ্ছ লোড হচ্ছে..." />
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-bengali">
              গুচ্ছ আনতে সমস্যা হয়েছে: {error instanceof Error ? error.message : "Unknown Error"}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Network className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-bengali">
              {searchTerm ? "কোনো গুচ্ছ পাওয়া যায়নি।" : "কোনো গুচ্ছ তৈরি করা হয়নি। নতুন গুচ্ছ যোগ করুন।"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* --- Mobile View Card List --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filtered.map((cluster) => (
                <div
                  key={cluster.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {cluster.logo_url ? (
                        <img
                          src={cluster.logo_url}
                          alt={cluster.name_bn}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Network className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base font-bengali text-foreground truncate">
                        {cluster.name_bn}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{cluster.name_en}</p>
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 font-bengali bg-primary/5"
                        >
                          {CLUSTER_TYPE_LABELS[cluster.cluster_type] ?? cluster.cluster_type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">সংক্ষিপ্ত নাম:</span>
                      <span className="font-medium text-foreground font-bengali">
                        {cluster.short_name_bn} ({cluster.short_name_en})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Slug:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                        {cluster.slug}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/dashboard/clusters/${cluster.slug}/manage`}>
                        <Button variant="outline" size="icon" className="h-8 w-8" title="ম্যানেজ">
                          <Database className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </Link>
                      <Link to={`/cluster/${cluster.slug}`} target="_blank">
                        <Button variant="outline" size="icon" className="h-8 w-8" title="ওয়েবসাইট">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(cluster)}
                        title="সম্পাদনা"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteTarget(cluster)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* --- Desktop View Table --- */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead className="w-12">লোগো</TableHead>
                      <TableHead className="font-bengali">নাম</TableHead>
                      <TableHead className="font-bengali">সংক্ষিপ্ত নাম</TableHead>
                      <TableHead className="font-bengali">গুচ্ছের ধরন</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((cluster, index) => (
                      <TableRow
                        key={cluster.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {(page - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="h-8 w-8 rounded bg-muted border border-border overflow-hidden flex items-center justify-center p-0.5">
                            {cluster.logo_url ? (
                              <img
                                src={cluster.logo_url}
                                alt={cluster.name_bn}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Network className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-bold text-sm font-bengali text-foreground">
                              {cluster.name_bn}
                            </p>
                            <p className="text-xs text-muted-foreground">{cluster.name_en}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium font-bengali">
                            {cluster.short_name_bn} ({cluster.short_name_en})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bengali bg-primary/5"
                          >
                            {CLUSTER_TYPE_LABELS[cluster.cluster_type] ?? cluster.cluster_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {cluster.slug}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/admin/dashboard/clusters/${cluster.slug}/manage`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="ম্যানেজ">
                                <Database className="h-3.5 w-3.5 text-primary" />
                              </Button>
                            </Link>
                            <Link to={`/cluster/${cluster.slug}`} target="_blank">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="ওয়েবসাইট"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(cluster)}
                              title="সম্পাদনা"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(cluster)}
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
              <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-bengali">
                  মোট: {filtered.length} / {totalCount} টি গুচ্ছ (পৃষ্ঠা {page}/{totalPages || 1})
                </p>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <span className="text-sm text-muted-foreground font-bengali">
                  পৃষ্ঠা {page} / {totalPages} (মোট {totalCount} টি গুচ্ছ)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-bengali"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    পূর্ববর্তী
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground text-xs">...</span>
                          )}
                          <Button
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}

                  <Button
                    variant="outline"
                    size="sm"
                    className="font-bengali"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    পরবর্তী
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cluster Drawer Form Sheet */}
      <ClusterFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingCluster={editingCluster}
        onSubmit={handleFormSubmit}
        isSubmitting={insertMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">আপনি কি নিশ্চিত?</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি নিশ্চিতভাবে <strong>{deleteTarget?.name_bn}</strong> গুচ্ছ ক্লাস্টারটি মুছে ফেলতে চান?
              এটি মুছে ফেললে এর সাথে সংযুক্ত সকল জুডিশিয়াল রিলেশন মুছে যাবে এবং পুনরুদ্ধার করা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "মুছা হচ্ছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
