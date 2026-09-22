"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  LayoutGrid,
  Users,
  Search,
  Milestone,
  Layers,
} from "lucide-react";
import { StudyLevelsTab, GroupsTab } from "./components/StructureTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  createCourseBatch,
  updateCourseBatch,
  deleteCourseBatch,
  createCourseCategory,
  updateCourseCategory,
  deleteCourseCategory,
} from "@/lib/actions";
import type { Batch, CourseCategory } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsClientProps {
  initialBatches: Batch[];
  initialCategories: CourseCategory[];
}

export function SettingsClient({ initialBatches, initialCategories }: SettingsClientProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Batch management
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [batchIsCurrent, setBatchIsCurrent] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");

  // States for Category management
  const [categories, setCategories] = useState<CourseCategory[]>(initialCategories);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Filtered lists
  const filteredBatches = batches.filter((b) =>
    b.name.toLowerCase().includes(batchSearch.toLowerCase()),
  );
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  // Batch Handlers
  const handleOpenBatchModal = (batch: Batch | null = null) => {
    setEditingBatch(batch);
    setBatchName(batch?.name || "");
    setBatchYear(batch ? String(batch.year) : String(new Date().getFullYear()));
    setBatchIsCurrent(batch ? batch.is_current : false);
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async () => {
    if (!batchName.trim() || !batchYear.trim()) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", batchName.trim());
    formData.append("year", batchYear.trim());
    formData.append("is_current", String(batchIsCurrent));

    let result;
    if (editingBatch) {
      formData.append("id", editingBatch.id);
      result = await updateCourseBatch(formData);
    } else {
      result = await createCourseBatch(formData);
    }

    if (result.success) {
      toast({ title: `ব্যাচ ${editingBatch ? "আপডেট" : "যোগ"} করা হয়েছে` });
      if (editingBatch) {
        setBatches((prev) =>
          prev.map((b) =>
            b.id === editingBatch.id
              ? {
                  ...b,
                  name: batchName.trim(),
                  year: parseInt(batchYear.trim(), 10),
                  is_current: batchIsCurrent,
                }
              : b,
          ),
        );
      } else if (result.data) {
        setBatches((prev) =>
          [...prev, result.data as Batch].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      setIsBatchModalOpen(false);
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ব্যাচটি মুছে ফেলতে চান? এটি ব্যবহার করা কোর্সে প্রভাব ফেলতে পারে।"))
      return;

    const formData = new FormData();
    formData.append("id", id);
    const result = await deleteCourseBatch(formData);

    if (result.success) {
      toast({ title: "ব্যাচ মুছে ফেলা হয়েছে" });
      setBatches((prev) => prev.filter((b) => b.id !== id));
    } else {
      toast({ title: "মুছে ফেলতে ব্যর্থ", description: result.message, variant: "destructive" });
    }
  };

  // Category Handlers
  const handleOpenCategoryModal = (category: CourseCategory | null = null) => {
    setEditingCategory(category);
    setCategoryName(category?.name || "");
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", categoryName.trim());

    let result;
    if (editingCategory) {
      formData.append("id", editingCategory.id);
      result = await updateCourseCategory(formData);
    } else {
      result = await createCourseCategory(formData);
    }

    if (result.success) {
      toast({ title: `ক্যাটাগরি ${editingCategory ? "আপডেট" : "যোগ"} করা হয়েছে` });
      if (editingCategory) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, name: categoryName.trim() } : c)),
        );
      } else if (result.data) {
        setCategories((prev) =>
          [...prev, result.data as CourseCategory].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      setIsCategoryModalOpen(false);
    } else {
      toast({ title: "সমস্যা হয়েছে", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ক্যাটাগরি মুছে ফেলতে চান? এটি ব্যবহার করা কোর্সে প্রভাব ফেলতে পারে।"))
      return;

    const formData = new FormData();
    formData.append("id", id);
    const result = await deleteCourseCategory(formData);

    if (result.success) {
      toast({ title: "ক্যাটাগরি মুছে ফেলা হয়েছে" });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast({ title: "মুছে ফেলতে ব্যর্থ", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <Tabs defaultValue="batches" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Users className="h-4 w-4 hidden md:inline-block" /> ব্যাচসমূহ
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 hidden md:inline-block" /> ক্যাটাগরিসমূহ
          </TabsTrigger>
          <TabsTrigger value="level" className="font-bengali flex items-center gap-1.5 rounded-lg">
            <Milestone className="h-4 w-4 hidden md:inline-block" /> লেভেল
          </TabsTrigger>
          <TabsTrigger value="group" className="font-bengali flex items-center gap-1.5 rounded-lg">
            <Layers className="h-4 w-4 hidden md:inline-block" /> গ্রুপ
          </TabsTrigger>
        </TabsList>

        {/* BATCHES TAB */}
        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl">কোর্স ব্যাচসমূহ</CardTitle>
                <CardDescription>সবগুলো ব্যাচ পরিচালনা করুন</CardDescription>
              </div>
              <Button onClick={() => handleOpenBatchModal()} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> নতুন ব্যাচ
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ব্যাচ খুঁজুন..."
                  className="pl-9"
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-all group"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{batch.name}</span>
                        {batch.is_current && (
                          <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bengali font-medium">
                            চলতি
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">সাল: {batch.year}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => handleOpenBatchModal(batch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => handleDeleteBatch(batch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredBatches.length === 0 && (
                  <div className="col-span-full py-10 text-center text-muted-foreground">
                    কোনো ব্যাচ পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl">কোর্স ক্যাটাগরিসমূহ</CardTitle>
                <CardDescription>সবগুলো ক্যাটাগরি পরিচালনা করুন</CardDescription>
              </div>
              <Button onClick={() => handleOpenCategoryModal()} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> নতুন ক্যাটাগরি
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ক্যাটাগরি খুঁজুন..."
                  className="pl-9"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-all group"
                  >
                    <span className="font-medium truncate">{category.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => handleOpenCategoryModal(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="col-span-full py-10 text-center text-muted-foreground">
                    কোনো ক্যাটাগরি পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEVELS TAB */}
        <TabsContent value="level" className="space-y-4">
          <StudyLevelsTab />
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="group" className="space-y-4">
          <GroupsTab />
        </TabsContent>
      </Tabs>

      {/* Batch Modal */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBatch ? "ব্যাচ আপডেট করুন" : "নতুন ব্যাচ যোগ করুন"}</DialogTitle>
            <DialogDescription>ব্যাচের নাম দিন।</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batchName">ব্যাচের নাম</Label>
              <Input
                id="batchName"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="যেমন: HSC-25"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchYear">সাল (Year)</Label>
              <Input
                id="batchYear"
                type="number"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                placeholder="যেমন: ২০২৫"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="batchIsCurrent"
                checked={batchIsCurrent}
                onCheckedChange={(checked) => setBatchIsCurrent(!!checked)}
              />
              <Label
                htmlFor="batchIsCurrent"
                className="font-bengali cursor-pointer select-none text-sm"
              >
                এটি চলতি (Current) ব্যাচ হিসেবে চিহ্নিত করুন
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBatchModalOpen(false)}
              disabled={isSubmitting}
            >
              বাতিল
            </Button>
            <Button
              onClick={handleSaveBatch}
              disabled={isSubmitting || !batchName.trim() || !batchYear.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : editingBatch ? (
                "আপডেট করুন"
              ) : (
                "যোগ করুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "ক্যাটাগরি আপডেট করুন" : "নতুন ক্যাটাগরি যোগ করুন"}</DialogTitle>
            <DialogDescription>ক্যাটাগরির নাম দিন।</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="categoryName">ক্যাটাগরির নাম</Label>
            <Input
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="যেমন: HSC Physics"
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={isSubmitting}
            >
              বাতিল
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSubmitting || !categoryName.trim()}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : editingCategory ? (
                "আপডেট করুন"
              ) : (
                "যোগ করুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
