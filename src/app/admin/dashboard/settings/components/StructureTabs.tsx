// =============================================================================
// Admin — Structure Tabs for Settings (Levels and Groups)
// =============================================================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchStudyLevels,
  insertStudyLevel,
  updateStudyLevel,
  deleteStudyLevel,
  fetchGroups,
  insertGroup,
  updateGroup,
  deleteGroup,
} from "@/lib/admin-crud-queries";
import {
  studyLevelFormSchema,
  groupFormSchema,
  type StudyLevelRow,
  type StudyLevelFormValues,
  type GroupRow,
  type GroupFormValues,
} from "@/lib/admin-crud-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Milestone, Layers, Loader2, Search } from "lucide-react";

// =============================================================================
// 1. Study Levels Tab Component
// =============================================================================

const QUERY_KEY_LEVELS = "admin-study-levels";

export function StudyLevelsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<StudyLevelRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyLevelRow | null>(null);
  const [search, setSearch] = useState("");

  const {
    data: levels = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_LEVELS],
    queryFn: fetchStudyLevels,
    staleTime: 2 * 60 * 1000,
  });

  const form = useForm<StudyLevelFormValues>({
    resolver: zodResolver(studyLevelFormSchema) as any,
    defaultValues: { id: 1, name: "", code: "" },
  });

  const openAdd = () => {
    setEditingLevel(null);
    const maxId = levels.reduce((max, lvl) => (lvl.id > max ? lvl.id : max), 0);
    form.reset({ id: maxId + 1, name: "", code: "" });
    setDialogOpen(true);
  };

  const openEdit = (lvl: StudyLevelRow) => {
    setEditingLevel(lvl);
    form.reset({ id: lvl.id, name: lvl.name, code: lvl.code });
    setDialogOpen(true);
  };

  const insertMut = useMutation({
    mutationFn: insertStudyLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEVELS] });
      queryClient.invalidateQueries({ queryKey: ["admin-subjects-list"] });
      toast({ title: "✅ লেভেল যোগ করা হয়েছে" });
      setDialogOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: StudyLevelFormValues }) =>
      updateStudyLevel(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEVELS] });
      queryClient.invalidateQueries({ queryKey: ["admin-subjects-list"] });
      toast({ title: "✅ লেভেল আপডেট হয়েছে" });
      setDialogOpen(false);
      setEditingLevel(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStudyLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEVELS] });
      queryClient.invalidateQueries({ queryKey: ["admin-subjects-list"] });
      toast({ title: "🗑️ লেভেল মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = form.handleSubmit((values) => {
    if (editingLevel) {
      updateMut.mutate({ id: editingLevel.id, values });
    } else {
      insertMut.mutate(values);
    }
  });

  const filteredLevels = levels.filter(
    (lvl) =>
      lvl.name.toLowerCase().includes(search.toLowerCase()) ||
      lvl.code.toLowerCase().includes(search.toLowerCase()),
  );

  const isSubmitting = insertMut.isPending || updateMut.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bengali">শিক্ষা লেভেলসমূহ</CardTitle>
          <CardDescription className="font-bengali">সবগুলো লেভেল পরিচালনা করুন</CardDescription>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="font-bengali">নতুন লেভেল</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="লেভেল খুঁজুন..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <LoadingSpinner message="লেভেল লোড হচ্ছে..." />
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-bengali">
              তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
            </p>
          </div>
        ) : filteredLevels.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground font-bengali">
            কোনো শিক্ষা লেভেল পাওয়া যায়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredLevels.map((lvl) => (
              <div
                key={lvl.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-all group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate font-bengali">{lvl.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">Code: {lvl.code}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600"
                    onClick={() => openEdit(lvl)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => setDeleteTarget(lvl)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingLevel(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bengali">
              {editingLevel ? "লেভেল সম্পাদনা" : "নতুন লেভেল যোগ করুন"}
            </DialogTitle>
            <DialogDescription className="font-bengali">
              {editingLevel ? "লেভেলের তথ্য পরিবর্তন করুন।" : "নতুন শিক্ষা লেভেলের তথ্য পূরণ করুন।"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">আইডি (ID) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="১" disabled={!!editingLevel} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">নাম *</FormLabel>
                    <FormControl>
                      <Input placeholder="এইচএসসি / সমমান" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">কোড *</FormLabel>
                    <FormControl>
                      <Input placeholder="hsc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  বাতিল
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingLevel ? "আপডেট" : "যোগ করুন"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deleteTarget?.name}</strong> লেভেলটি মুছে ফেলতে চান? এই লেভেলের সাথে
              সম্পর্কিত সকল বিষয় ও যোগ্যতার শর্তসমূহ প্রভাবিত হতে পারে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// =============================================================================
// 2. Groups Tab Component
// =============================================================================

const QUERY_KEY_GROUPS = "admin-groups";

export function GroupsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupRow | null>(null);
  const [search, setSearch] = useState("");

  const {
    data: groups = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_GROUPS],
    queryFn: fetchGroups,
    staleTime: 2 * 60 * 1000,
  });

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema) as any,
    defaultValues: { name_bn: "", name_en: "" },
  });

  const openAdd = () => {
    setEditingGroup(null);
    form.reset({ name_bn: "", name_en: "" });
    setDialogOpen(true);
  };

  const openEdit = (group: GroupRow) => {
    setEditingGroup(group);
    form.reset({ name_bn: group.name_bn, name_en: group.name_en });
    setDialogOpen(true);
  };

  const insertMut = useMutation({
    mutationFn: insertGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_GROUPS] });
      toast({ title: "✅ গ্রুপ যোগ করা হয়েছে" });
      setDialogOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: GroupFormValues }) =>
      updateGroup(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_GROUPS] });
      toast({ title: "✅ গ্রুপ আপডেট হয়েছে" });
      setDialogOpen(false);
      setEditingGroup(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_GROUPS] });
      toast({ title: "🗑️ গ্রুপ মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = form.handleSubmit((values) => {
    if (editingGroup) {
      updateMut.mutate({ id: editingGroup.id, values });
    } else {
      insertMut.mutate(values);
    }
  });

  const filteredGroups = groups.filter(
    (g) =>
      g.name_bn.toLowerCase().includes(search.toLowerCase()) ||
      g.name_en.toLowerCase().includes(search.toLowerCase()),
  );

  const isSubmitting = insertMut.isPending || updateMut.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bengali">গ্রুপসমূহ</CardTitle>
          <CardDescription className="font-bengali">সবগুলো গ্রুপ পরিচালনা করুন</CardDescription>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="font-bengali">নতুন গ্রুপ</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="গ্রুপ খুঁজুন..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <LoadingSpinner message="গ্রুপ লোড হচ্ছে..." />
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-bengali">
              তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
            </p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground font-bengali">
            কোনো গ্রুপ পাওয়া যায়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredGroups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm transition-all group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate font-bengali">{g.name_bn}</span>
                  <span className="text-xs text-muted-foreground">{g.name_en}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600"
                    onClick={() => openEdit(g)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => setDeleteTarget(g)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bengali">
              {editingGroup ? "গ্রুপ সম্পাদনা" : "নতুন গ্রুপ যোগ করুন"}
            </DialogTitle>
            <DialogDescription className="font-bengali">
              {editingGroup ? "গ্রুপের তথ্য পরিবর্তন করুন।" : "নতুন গ্রুপের তথ্য পূরণ করুন।"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="name_bn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">নাম (বাংলা) *</FormLabel>
                    <FormControl>
                      <Input placeholder="বিজ্ঞান" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Science" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  বাতিল
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingGroup ? "আপডেট" : "যোগ করুন"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deleteTarget?.name_bn}</strong> গ্রুপটি মুছে ফেলতে চান? এই গ্রুপের সাথে
              সম্পর্কিত ইউনিটের শর্ত ও আসন তথ্যও প্রভাবিত হতে পারে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
