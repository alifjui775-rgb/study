// =============================================================================
// Admin — Universities CRUD Page
// Full data table + add/edit sheet + delete confirmation.
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  fetchUniversitiesPaginated,
  insertUniversity,
  updateUniversity,
  deleteUniversity,
} from "@/lib/university-admin-queries";
import type { UniversityRow, UniversityFormValues } from "@/lib/university-admin-types";
import { CATEGORY_LABELS, type UniversityCategory } from "@/lib/university-admin-types";
import { useSubCategoryMap } from "@/lib/institution-category-queries";
import UniversityFormSheet from "@/components/admin/UniversityFormSheet";
import { cn } from "@/lib/utils";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  GraduationCap,
  ExternalLink,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const QUERY_KEY = "admin-universities";
const PAGE_SIZE = 50;

export default function AdminUniversitiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<UniversityRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UniversityRow | null>(null);
  const [activeCategory, setActiveCategory] = useState<UniversityCategory>(() => {
    const saved = localStorage.getItem("admin_last_selected_category");
    if (saved && (saved === "public" || saved === "private" || saved === "international")) {
      return saved as UniversityCategory;
    }
    return "public";
  });

  const handleCategoryChange = (cat: UniversityCategory) => {
    setActiveCategory(cat);
    localStorage.setItem("admin_last_selected_category", cat);
  };

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeCategory]);

  // --- Queries ---
  const {
    data: universitiesResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, page, activeCategory, searchTerm],
    queryFn: () => fetchUniversitiesPaginated(page, PAGE_SIZE, activeCategory, searchTerm),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const universities = universitiesResult?.data || [];
  const totalCount = universitiesResult?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // --- Mutations ---
  const insertMutation = useMutation({
    mutationFn: insertUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ বিশ্ববিদ্যালয় যোগ করা হয়েছে" });
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
    mutationFn: ({ id, values }: { id: string; values: UniversityFormValues }) =>
      updateUniversity(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "✅ বিশ্ববিদ্যালয় আপডেট করা হয়েছে" });
      setSheetOpen(false);
      setEditingUniversity(null);
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
    mutationFn: deleteUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "🗑️ বিশ্ববিদ্যালয় মুছে ফেলা হয়েছে" });
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

  // --- Handlers ---
  const handleOpenAdd = () => {
    setEditingUniversity(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (uni: UniversityRow) => {
    setEditingUniversity(uni);
    setSheetOpen(true);
  };

  const handleFormSubmit = (values: UniversityFormValues) => {
    if (editingUniversity) {
      updateMutation.mutate({ id: editingUniversity.id, values });
    } else {
      insertMutation.mutate(values);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const subCategoryMap = useSubCategoryMap();
  const isSubmitting = insertMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Helmet>
        <title>বিশ্ববিদ্যালয় ব্যবস্থাপনা — অ্যাডমিন</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-bengali flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              বিশ্ববিদ্যালয় ব্যবস্থাপনা
            </h1>
            <p className="text-sm text-muted-foreground font-bengali mt-1">
              সকল বিশ্ববিদ্যালয়ের তথ্য যোগ, সম্পাদনা ও মুছুন।
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="font-bengali">নতুন যোগ করুন</span>
          </Button>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          {/* Category Tabs using shadcn Tabs components */}
          <Tabs
            value={activeCategory}
            onValueChange={(val) => handleCategoryChange(val as UniversityCategory)}
            className="w-full sm:max-w-md"
          >
            <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted rounded-xl">
              {(["public", "private", "international"] as UniversityCategory[]).map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="font-bengali flex items-center gap-1.5 rounded-lg"
                >
                  {CATEGORY_LABELS[cat]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="এখানে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 font-bengali h-9"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner message="বিশ্ববিদ্যালয় লোড হচ্ছে..." />
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-bengali">
              তথ্য আনতে সমস্যা হয়েছে: {error instanceof Error ? error.message : "Unknown"}
            </p>
          </div>
        ) : universities.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-bengali">
              {searchTerm ? "কোনো বিশ্ববিদ্যালয় পাওয়া যায়নি।" : "এখনো কোনো বিশ্ববিদ্যালয় যোগ করা হয়নি।"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* --- Mobile Card Grid (Visible on smaller screens) --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {universities.map((uni) => (
                <div
                  key={uni.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
                >
                  {/* Top: Logo & Names */}
                  <div className="flex items-start gap-3">
                    {uni.logo_url ? (
                      <img
                        src={uni.logo_url}
                        alt={uni.short_name_bn}
                        className="h-12 w-12 rounded-lg object-contain bg-muted p-1"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-primary/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base font-bengali text-foreground truncate">
                        {uni.name_bn}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{uni.name_en}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <CategoryBadge category={uni.category} />
                        {uni.sub_category &&
                          (Array.isArray(uni.sub_category) ? (
                            uni.sub_category.map((sub) => (
                              <Badge
                                key={sub}
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 font-bengali"
                              >
                                {subCategoryMap[sub]?.name_bn ?? sub}
                              </Badge>
                            ))
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 font-bengali"
                            >
                              {subCategoryMap[uni.sub_category as string]?.name_bn ??
                                uni.sub_category}
                            </Badge>
                          ))}
                        {uni.second_time && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 font-bengali"
                          >
                            ২য় বার
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slug */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Slug:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                      {uni.slug}
                    </code>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/dashboard/universities/${uni.slug}/manage`}>
                        <Button variant="outline" size="icon" className="h-8 w-8" title="ম্যানেজ">
                          <Database className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link to={`/university/${uni.slug}`} target="_blank">
                        <Button variant="outline" size="icon" className="h-8 w-8" title="ওয়েবসাইট">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(uni)}
                        title="সম্পাদনা"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteTarget(uni)}
                        title="মুছুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* --- Desktop Table View (Visible on medium screens and up) --- */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 font-bengali">#</TableHead>
                      <TableHead className="font-bengali">লোগো</TableHead>
                      <TableHead className="font-bengali">নাম</TableHead>
                      <TableHead className="font-bengali">ক্যাটাগরি</TableHead>
                      <TableHead className="font-bengali">সাব-ক্যাটাগরি</TableHead>
                      <TableHead className="font-bengali">Slug</TableHead>
                      <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universities.map((uni, idx) => (
                      <TableRow key={uni.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs text-muted-foreground">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>

                        {/* Logo */}
                        <TableCell>
                          {uni.logo_url ? (
                            <img
                              src={uni.logo_url}
                              alt={uni.short_name_bn}
                              className="h-8 w-8 rounded-md object-contain bg-muted/50"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="h-4 w-4 text-primary/50" />
                            </div>
                          )}
                        </TableCell>

                        {/* Name */}
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm font-bengali truncate">
                              {uni.name_bn}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{uni.name_en}</p>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <CategoryBadge category={uni.category} />
                        </TableCell>

                        {/* Sub Category */}
                        <TableCell>
                          {uni.sub_category &&
                          (Array.isArray(uni.sub_category) ? uni.sub_category.length > 0 : true) ? (
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(uni.sub_category) ? (
                                uni.sub_category.map((sub) => (
                                  <Badge
                                    key={sub}
                                    variant="outline"
                                    className="text-[10px] font-bengali"
                                  >
                                    {subCategoryMap[sub]?.name_bn ?? sub}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-bengali">
                                  {subCategoryMap[uni.sub_category as string]?.name_bn ??
                                    uni.sub_category}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Slug */}
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{uni.slug}</code>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/admin/dashboard/universities/${uni.slug}/manage`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="ম্যানেজ">
                                <Database className="h-3.5 w-3.5 text-primary" />
                              </Button>
                            </Link>
                            <Link to={`/university/${uni.slug}`} target="_blank">
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
                              onClick={() => handleOpenEdit(uni)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(uni)}
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

              {/* Footer */}
              <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-bengali">
                  মোট: {totalCount} টি বিশ্ববিদ্যালয় (পৃষ্ঠা {page}/{totalPages || 1})
                </p>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <span className="text-sm text-muted-foreground font-bengali">
                  পৃষ্ঠা {page} / {totalPages} (মোট {totalCount} টি বিশ্ববিদ্যালয়)
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

      {/* Add/Edit Sheet */}
      <UniversityFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingUniversity(null);
        }}
        editingUniversity={editingUniversity}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deleteTarget?.name_bn}</strong> বিশ্ববিদ্যালয়টি মুছে ফেলতে চান? এই কাজটি
              পূর্বাবস্থায় ফেরানো যাবে না। এর সাথে সম্পর্কিত সকল ইউনিট, বিষয়, আসন তথ্য ইত্যাদিও মুছে যেতে পারে।
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
    </>
  );
}

// --- Helper ---
function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    public: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    private: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    international: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-bengali ${colorMap[category] || ""}`}>
      {CATEGORY_LABELS[category as UniversityCategory] ?? category}
    </Badge>
  );
}
