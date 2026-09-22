import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchFaculties,
  insertFaculty,
  updateFaculty,
  deleteFaculty,
} from "@/lib/admin-crud-queries";
import { facultyFormSchema, type FacultyRow, type FacultyFormValues } from "@/lib/admin-crud-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Search, Building2, Loader2 } from "lucide-react";

const QUERY_KEY_FACULTIES = "admin-faculties";

export function FacultyManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FacultyRow | null>(null);

  const {
    data: faculties = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_FACULTIES],
    queryFn: fetchFaculties,
    staleTime: 2 * 60 * 1000,
  });

  const form = useForm<FacultyFormValues>({
    resolver: zodResolver(facultyFormSchema) as any,
    defaultValues: { name_en: "", name_bn: "" },
  });

  const insertMut = useMutation({
    mutationFn: insertFaculty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FACULTIES] });
      toast({ title: "✅ অনুষদ যোগ করা হয়েছে" });
      setDialogOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FacultyFormValues }) =>
      updateFaculty(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FACULTIES] });
      toast({ title: "✅ অনুষদ আপডেট হয়েছে" });
      setDialogOpen(false);
      setEditingFaculty(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFaculty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FACULTIES] });
      toast({ title: "🗑️ অনুষদ মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = form.handleSubmit((values) => {
    if (editingFaculty) {
      updateMut.mutate({ id: editingFaculty.id, values });
    } else {
      insertMut.mutate(values);
    }
  });

  const handleDialogOpen = (faculty?: FacultyRow) => {
    if (faculty) {
      setEditingFaculty(faculty);
      form.reset({ name_en: faculty.name_en, name_bn: faculty.name_bn });
    } else {
      setEditingFaculty(null);
      form.reset({ name_en: "", name_bn: "" });
    }
    setDialogOpen(true);
  };

  const filteredFaculties = faculties.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (f.name_en && f.name_en.toLowerCase().includes(q)) ||
      (f.name_bn && f.name_bn.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Header: Search + Add */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="অনুষদ খুঁজুন..."
            className="pl-9 font-bengali h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => handleDialogOpen()} className="gap-2 w-full sm:w-auto h-9">
          <Plus className="h-4 w-4" />
          <span className="font-bengali text-sm">নতুন অনুষদ</span>
        </Button>
      </div>

      {/* Loading / Error / Empty / Table */}
      {isLoading ? (
        <LoadingSpinner message="অনুষদ লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : filteredFaculties.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">কোনো অনুষদ পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile list */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredFaculties.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
              >
                <div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    ID: {f.id}
                  </span>
                  <h3 className="font-bold text-sm text-foreground mt-1.5">{f.name_en}</h3>
                  <p className="text-xs text-muted-foreground font-bengali mt-0.5">{f.name_bn}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-bengali">অ্যাকশন:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => handleDialogOpen(f)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-xs font-bengali">সম্পাদনা</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setDeleteTarget(f)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-xs font-bengali">মুছুন</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 font-bengali">#</TableHead>
                  <TableHead className="font-bengali">ID</TableHead>
                  <TableHead>Name (English)</TableHead>
                  <TableHead className="font-bengali">নাম (বাংলা)</TableHead>
                  <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaculties.map((f, idx) => (
                  <TableRow key={f.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.id}</TableCell>
                    <TableCell className="text-sm">{f.name_en}</TableCell>
                    <TableCell className="text-sm font-bengali text-muted-foreground">
                      {f.name_bn}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDialogOpen(f)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTarget(f)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-4 py-2.5">
              <p className="text-xs text-muted-foreground font-bengali">
                মোট: {filteredFaculties.length} টি অনুষদ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingFaculty(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bengali">
              {editingFaculty ? "অনুষদ সম্পাদনা" : "নতুন অনুষদ"}
            </DialogTitle>
            <DialogDescription className="font-bengali">
              {editingFaculty ? "অনুষদের তথ্য আপডেট করুন।" : "নতুন অনুষদ যোগ করতে নিচের তথ্য পূরণ করুন।"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form id="faculty-form" onSubmit={onSubmit} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Faculty of Science" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_bn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">নাম (বাংলা) *</FormLabel>
                    <FormControl>
                      <Input placeholder="বিজ্ঞান অনুষদ" {...field} className="font-bengali" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={insertMut.isPending || updateMut.isPending}
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              form="faculty-form"
              disabled={insertMut.isPending || updateMut.isPending}
            >
              {(insertMut.isPending || updateMut.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingFaculty ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি <strong>{deleteTarget?.name_bn || deleteTarget?.name_en}</strong> অনুষদটি মুছে
              ফেলতে চান?
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
    </div>
  );
}
