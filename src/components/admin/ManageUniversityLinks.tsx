// =============================================================================
// Admin — University Links Tab CRUD component (Phase 2)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchLinksByEntity,
  insertLink,
  updateLink,
  deleteLink,
} from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import {
  universityLinkSchema,
  type UniversityLinkRow,
  type UniversityLinkFormValues,
} from "@/lib/university-manage-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  FormDescription,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Link2, Loader2, ExternalLink } from "lucide-react";

interface ManageUniversityLinksProps {
  universityId?: string;
  entityId?: string;
  entityType?: EntityType;
}

const QUERY_KEY_LINKS = "admin-entity-links";

const LINK_LABEL_OPTIONS = [
  "সার্কুলার",
  "প্রশ্নব্যাংক",
  "ভর্তি ওয়েবসাইট",
  "মূল ওয়েবসাইট",
  "আবেদন",
  "প্রবেশপত্র",
  "ফলাফল",
  "আবেদন | প্রবেশপত্র | ফলাফল",
  "অধিভুক্ত কলেজ ভর্তি",
];

export default function ManageUniversityLinks({
  universityId,
  entityId: rawEntityId,
  entityType = "university",
}: ManageUniversityLinksProps) {
  const entityId = rawEntityId || universityId || "";
  const entityLabel = ENTITY_LABELS[entityType];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UniversityLinkRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UniversityLinkRow | null>(null);

  // Fetch Links
  const {
    data: links = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_LINKS, entityId, entityType],
    queryFn: () => fetchLinksByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<UniversityLinkFormValues>({
    resolver: zodResolver(universityLinkSchema) as any,
    defaultValues: {
      label: "" as any,
      url: "",
      is_external: true,
      col_span: 1,
      row_group: 1,
      sort_order: 0,
    },
  });

  // Reset form
  useEffect(() => {
    if (sheetOpen) {
      if (editingLink) {
        form.reset({
          label: editingLink.label as any,
          url: editingLink.url,
          is_external: editingLink.is_external,
          col_span: editingLink.col_span,
          row_group: editingLink.row_group,
          sort_order: editingLink.sort_order,
        });
      } else {
        form.reset({
          label: "" as any,
          url: "",
          is_external: true,
          col_span: 1,
          row_group: 1,
          sort_order: 0,
        });
      }
    }
  }, [sheetOpen, editingLink, form]);

  const insertMut = useMutation({
    mutationFn: (values: UniversityLinkFormValues) => insertLink(values, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LINKS, entityId, entityType] });
      toast({ title: "✅ লিংক যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "❌ যোগ করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UniversityLinkFormValues }) =>
      updateLink(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LINKS, entityId, entityType] });
      toast({ title: "✅ লিংক আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingLink(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LINKS, entityId, entityType] });
      toast({ title: "🗑️ লিংক মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: UniversityLinkFormValues) => {
    if (editingLink) {
      updateMut.mutate({ id: editingLink.id, values });
    } else {
      insertMut.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingLink(null);
    setSheetOpen(true);
  };

  const openEdit = (lnk: UniversityLinkRow) => {
    setEditingLink(lnk);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            লিংকসমূহ
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            বিশ্ববিদ্যালয়ের অ্যাডমিশন, রেজাল্ট ও অন্যান্য প্রয়োজনীয় লিংকসমূহ পরিচালনা করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন লিংক
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="লিংক লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো লিংক যোগ করা হয়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* --- Mobile Card Grid --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {links.map((lnk) => (
              <div
                key={lnk.id}
                className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base font-bengali text-foreground truncate">
                      {lnk.label}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded font-bengali">
                        গ্রুপ: {lnk.row_group}
                      </span>
                      {lnk.is_external && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bengali">
                          এক্সটার্নাল
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded font-bengali">
                    ক্রম: {lnk.sort_order}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="truncate">
                    <strong className="text-foreground">URL:</strong>{" "}
                    <code className="text-muted-foreground text-xs">{lnk.url}</code>
                  </div>
                  <div>
                    <strong className="font-bengali text-foreground">কলাম স্প্যান:</strong>{" "}
                    <span>{lnk.col_span}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <a
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-bengali"
                  >
                    ভিজিট করুন
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => openEdit(lnk)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-xs font-bengali">সম্পাদনা</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setDeleteTarget(lnk)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-xs font-bengali">মুছুন</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* --- Desktop Table View --- */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 font-bengali text-center">ক্রম</TableHead>
                    <TableHead className="font-bengali">লিংকের লেবেল</TableHead>
                    <TableHead className="font-bengali">গ্রুপ (Row Group)</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-center font-bengali">এক্সটার্নাল</TableHead>
                    <TableHead className="text-center font-bengali">কলাম (Col Span)</TableHead>
                    <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((lnk) => (
                    <TableRow key={lnk.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-bold">{lnk.sort_order}</TableCell>
                      <TableCell className="font-semibold font-bengali">{lnk.label}</TableCell>
                      <TableCell className="font-bengali text-sm font-semibold">
                        {lnk.row_group}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{lnk.url}</code>
                      </TableCell>
                      <TableCell className="text-center">
                        {lnk.is_external ? (
                          <Badge variant="outline" className="font-bengali text-[10px]">
                            হ্যাঁ
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground font-bengali">না</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{lnk.col_span}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a href={lnk.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(lnk)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(lnk)}
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
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full"
        >
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-bengali">
              {editingLink ? "লিংক তথ্য সম্পাদনা" : "নতুন লিংক যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              {editingLink
                ? "লিংকের নাম, ইউআরএল ও অন্যান্য প্যারামিটার আপডেট করুন।"
                : "নতুন লিংক, এর গ্রুপিং ও প্রদর্শন লেআউট সেট করুন।"}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="link-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  লিংক পরিচিতি
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">লিংকের নাম (লেবেল) *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="লেবেল নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="font-bengali">
                            {LINK_LABEL_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="row_group"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">সারি নম্বর (Row Group) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="যেমন: 1, 2, 3..." {...field} />
                        </FormControl>
                        <FormDescription className="font-bengali text-[10px]">
                          যে লিংকগুলোকে ফ্রন্টএন্ডে একই লাইনে (সারিতে) পাশাপাশি দেখাতে চান, তাদের ক্ষেত্রে একই সারি
                          নম্বর দিন।
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL *</FormLabel>
                      <FormControl>
                        <Input placeholder="https://admission.du.ac.bd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="col_span"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">
                          বাটনের চওড়া বা কলাম সাইজ (Col Span) *
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="যেমন: 1, 2..." {...field} />
                        </FormControl>
                        <FormDescription className="font-bengali text-[10px]">
                          বাটনটি কতটুকু জায়গা নেবে? (১ = সাধারণ বাটন, ২ = দ্বিগুণ চওড়া বা পুরো লাইন)।
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ক্রমবিন্যাস (Sort Order) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="যেমন: 0, 1, 2..." {...field} />
                        </FormControl>
                        <FormDescription className="font-bengali text-[10px]">
                          একই সারির ভেতরে কোন বাটনটি আগে দেখাবে? (ছোট সংখ্যা আগে আসবে)।
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_external"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-muted/20 p-3 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="font-bengali text-sm font-bold">
                          নতুন ট্যাবে ওপেন হবে (Is External)
                        </FormLabel>
                        <FormDescription className="font-bengali text-xs">
                          এটি অন থাকলে লিংকটিতে ক্লিক করলে ব্রাউজারের নতুন ট্যাবে ওপেন হবে।
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </ScrollArea>

          <Separator />

          <div className="px-6 py-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={isSubmitting}
              className="font-bengali"
            >
              বাতিল
            </Button>
            <Button type="submit" form="link-form" disabled={isSubmitting} className="font-bengali">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLink ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি সত্যিই <strong>{deleteTarget?.label}</strong> লিংকটি মুছে ফেলতে চান?
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
