// =============================================================================
// Admin — Map Locations Tab CRUD component (Phase 2)
// =============================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchLocationsByEntity,
  insertLocation,
  updateLocation,
  deleteLocation,
} from "@/lib/university-manage-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import {
  mapLocationSchema,
  type MapLocationRow,
  type MapLocationFormValues,
} from "@/lib/university-manage-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MapPin, Loader2, ExternalLink } from "lucide-react";

interface ManageMapLocationsProps {
  universityId?: string;
  entityId?: string;
  entityType?: EntityType;
}

const QUERY_KEY_LOCATIONS = "admin-entity-locations";

const CATEGORY_MAP = {
  academic: "একাডেমিক ভবন",
  administrative: "প্রশাসনিক ভবন",
  residential: "আবাসিক হল/হোস্টেল",
  canteen: "ক্যান্টিন/খাবারের স্থান",
  library: "লাইব্রেরি",
  playground: "খেলার মাঠ",
  monument: "ভাস্কর্য/দর্শনীয় স্থান",
  gate: "প্রবেশদ্বার",
  mosque: "মসজিদ",
  other: "অন্যান্য",
};

export default function ManageMapLocations({
  universityId,
  entityId: rawEntityId,
  entityType = "university",
}: ManageMapLocationsProps) {
  const entityId = rawEntityId || universityId || "";
  const entityLabel = ENTITY_LABELS[entityType];
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<MapLocationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MapLocationRow | null>(null);

  // Fetch Locations
  const {
    data: locations = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_LOCATIONS, entityId, entityType],
    queryFn: () => fetchLocationsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const form = useForm<MapLocationFormValues>({
    resolver: zodResolver(mapLocationSchema) as any,
    defaultValues: {
      category: "academic",
      name: "",
      google_maps_url: "",
      lat: null,
      lng: null,
      tooltip: null,
      sort_order: 0,
    },
  });

  // Reset form
  useEffect(() => {
    if (sheetOpen) {
      if (editingLoc) {
        form.reset({
          category: editingLoc.category,
          name: editingLoc.name,
          google_maps_url: editingLoc.google_maps_url,
          lat: editingLoc.lat || null,
          lng: editingLoc.lng || null,
          tooltip: editingLoc.tooltip || "",
          sort_order: editingLoc.sort_order,
        });
      } else {
        form.reset({
          category: "academic",
          name: "",
          google_maps_url: "",
          lat: null,
          lng: null,
          tooltip: "",
          sort_order: 0,
        });
      }
    }
  }, [sheetOpen, editingLoc, form]);

  const insertMut = useMutation({
    mutationFn: (values: MapLocationFormValues) => insertLocation(values, entityId, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LOCATIONS, entityId, entityType] });
      toast({ title: "✅ ম্যাপ লোকেশন যোগ করা হয়েছে" });
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
    mutationFn: ({ id, values }: { id: string; values: MapLocationFormValues }) =>
      updateLocation(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LOCATIONS, entityId, entityType] });
      toast({ title: "✅ ম্যাপ লোকেশন আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingLoc(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LOCATIONS, entityId, entityType] });
      toast({ title: "🗑️ লোকেশন মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: MapLocationFormValues) => {
    if (editingLoc) {
      updateMut.mutate({ id: editingLoc.id, values });
    } else {
      insertMut.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingLoc(null);
    setSheetOpen(true);
  };

  const openEdit = (loc: MapLocationRow) => {
    setEditingLoc(loc);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            ম্যাপ লোকেশনসমূহ
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            বিশ্ববিদ্যালয়ের বিভিন্ন হল, অনুষদ ও গুরুত্বপূর্ন স্থানের ম্যাপ লোকেশনসমূহ পরিচালনা করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন লোকেশন
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="লোকেশন লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো লোকেশন যোগ করা হয়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* --- Mobile Card Grid --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base font-bengali text-foreground truncate">
                      {loc.name}
                    </h3>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full font-bengali mt-1.5 inline-block">
                      {CATEGORY_MAP[loc.category as keyof typeof CATEGORY_MAP] || loc.category}
                    </span>
                  </div>
                  <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded font-bengali">
                    ক্রম: {loc.sort_order}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  {loc.tooltip && (
                    <div>
                      <strong className="font-bengali text-foreground">টুলটিপ:</strong>{" "}
                      <span className="font-bengali">{loc.tooltip}</span>
                    </div>
                  )}
                  {(loc.lat || loc.lng) && (
                    <div>
                      <strong className="text-foreground">Coordinates:</strong>{" "}
                      <span>
                        {loc.lat || "—"}, {loc.lng || "—"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <a
                    href={loc.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-bengali"
                  >
                    ম্যাপ লিংক
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-xs font-bengali">সম্পাদনা</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setDeleteTarget(loc)}
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
                    <TableHead className="font-bengali">স্থান/স্থাপনার নাম</TableHead>
                    <TableHead className="font-bengali">ক্যাটাগরি</TableHead>
                    <TableHead className="font-bengali">টুলটিপ</TableHead>
                    <TableHead>Coordinates (Lat, Lng)</TableHead>
                    <TableHead className="font-bengali">ম্যাপ লিংক</TableHead>
                    <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-bold">{loc.sort_order}</TableCell>
                      <TableCell className="font-semibold font-bengali">{loc.name}</TableCell>
                      <TableCell className="font-bengali text-sm text-muted-foreground">
                        {CATEGORY_MAP[loc.category as keyof typeof CATEGORY_MAP] || loc.category}
                      </TableCell>
                      <TableCell className="text-sm font-bengali">{loc.tooltip || "—"}</TableCell>
                      <TableCell className="text-xs text-mono">
                        {loc.lat && loc.lng ? `${loc.lat}, ${loc.lng}` : "—"}
                      </TableCell>
                      <TableCell>
                        <a href={loc.google_maps_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(loc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(loc)}
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
              {editingLoc ? "ম্যাপ লোকেশন সম্পাদনা" : "নতুন ম্যাপ লোকেশন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              {editingLoc
                ? "লোকেশনটির বিবরণ ও ম্যাপ লিংক আপডেট করুন।"
                : "নতুন স্থাপনাটির ক্যাটাগরি, জিপিএস ও ম্যাপ লিংক সেট করুন।"}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="location-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  পরিচিতি ও তথ্য
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">স্থাপনার নাম *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: কার্জন হল" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ক্যাটাগরি *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="ক্যাটাগরি সিলেক্ট করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(CATEGORY_MAP).map(([val, label]) => (
                              <SelectItem key={val} value={val} className="font-bengali">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="google_maps_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">Google Maps URL *</FormLabel>
                      <FormControl>
                        <Input placeholder="https://maps.google.com/?q=..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="lat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude (Lat)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="যেমন: 23.7275"
                            type="number"
                            step="any"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lng"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude (Lng)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="যেমন: 90.4019"
                            type="number"
                            step="any"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ক্রমবিন্যাস *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tooltip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">টুলটিপ বিবরণ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="যেমন: বিজ্ঞান অনুষদের ডিন অফিস।"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
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
            <Button
              type="submit"
              form="location-form"
              disabled={isSubmitting}
              className="font-bengali"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLoc ? "আপডেট করুন" : "যোগ করুন"}
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
              আপনি কি সত্যিই <strong>{deleteTarget?.name}</strong> মুছে ফেলতে চান?
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
