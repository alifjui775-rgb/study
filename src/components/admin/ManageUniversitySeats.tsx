// =============================================================================
// Admin — Subject Group Seats Tab CRUD component (Phase 3)
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchSeatsByUniversity,
  insertSeats,
  updateSeats,
  deleteSeatsBySubject,
} from "@/lib/university-events-queries";
import { fetchSubjectsByUniversity, fetchUnitsByUniversity } from "@/lib/university-manage-queries";
import { fetchGroups } from "@/lib/admin-crud-queries";
import {
  subjectGroupSeatSchema,
  type SubjectGroupSeatRow,
  type SubjectGroupSeatFormValues,
} from "@/lib/university-events-types";

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
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";

interface ManageUniversitySeatsProps {
  universityId: string;
}

const QUERY_KEY_SEATS = "admin-university-seats";
const QUERY_KEY_SUBJECTS = "admin-university-subjects";
const QUERY_KEY_GROUPS = "admin-groups";

export default function ManageUniversitySeats({ universityId }: ManageUniversitySeatsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [groupSeats, setGroupSeats] = useState<{ group_id: string | null; seat_count: number }[]>(
    [],
  );

  // Fetch Seats Mappings
  const {
    data: seats = [],
    isLoading: loadingSeats,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_SEATS, universityId],
    queryFn: () => fetchSeatsByUniversity(universityId),
    enabled: !!universityId,
  });

  // Fetch University Mapped Subjects for select list
  const { data: uniSubjects = [], isLoading: loadingSubs } = useQuery({
    queryKey: [QUERY_KEY_SUBJECTS, universityId],
    queryFn: () => fetchSubjectsByUniversity(universityId),
    enabled: !!universityId,
  });

  // Fetch Groups for select list
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: [QUERY_KEY_GROUPS],
    queryFn: fetchGroups,
  });

  // Fetch Units for Filtering
  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["admin-university-units", universityId],
    queryFn: () => fetchUnitsByUniversity(universityId),
    enabled: !!universityId,
  });

  const filteredSeats = seats.filter((seat) => {
    if (!selectedUnitId) return true;
    return seat.institution_subjects?.unit_id === selectedUnitId;
  });

  // Group seats by subject for pivoted desktop table
  const groupedSeats = useMemo(() => {
    const map = new Map<
      string,
      {
        university_subject_id: string;
        subjectCode: string;
        subjectName: string;
        unitName: string;
        groupSeats: Record<string, number>;
        isAssumed: boolean;
        firstSeat: (typeof seats)[number];
      }
    >();

    for (const seat of seats) {
      const subjectId = seat.university_subject_id;
      if (!map.has(subjectId)) {
        map.set(subjectId, {
          university_subject_id: subjectId,
          subjectCode: seat.institution_subjects?.degree_program?.short_name || "—",
          subjectName: seat.institution_subjects?.degree_program?.full_name_en || "—",
          unitName: seat.institution_subjects?.unit
            ? seat.institution_subjects.unit.unit_name_bn ||
              seat.institution_subjects.unit.unit_name_en ||
              "—"
            : "—",
          groupSeats: {},
          isAssumed: false,
          firstSeat: seat,
        });
      }
      const entry = map.get(subjectId)!;
      const groupName = seat.group_id === null ? "উন্মুক্ত" : seat.group?.name_bn || "—";
      entry.groupSeats[groupName] = seat.seat_count;
      if (seat.is_assumed) entry.isAssumed = true;
    }

    return Array.from(map.values());
  }, [seats]);

  // Filter out subjects that already have seats (for "Add New" mode)
  const availableSubjects = useMemo(() => {
    if (editingSubjectId) return uniSubjects;
    const usedIds = new Set(seats.map((s) => s.university_subject_id));
    return uniSubjects.filter((sub) => !usedIds.has(sub.id));
  }, [uniSubjects, seats, editingSubjectId]);

  // Filter grouped seats by unit for desktop table
  const filteredGroupedSeats = useMemo(() => {
    if (!selectedUnitId) return groupedSeats;
    return groupedSeats.filter((g) => g.firstSeat.institution_subjects?.unit_id === selectedUnitId);
  }, [groupedSeats, selectedUnitId]);

  const form = useForm<SubjectGroupSeatFormValues>({
    resolver: zodResolver(subjectGroupSeatSchema) as any,
    defaultValues: {
      university_subject_id: "",
      group_seats: [],
      is_assumed: false,
    },
  });

  // Reset form and local groupSeats state
  useEffect(() => {
    if (sheetOpen) {
      if (editingSubjectId) {
        // Edit mode: load existing seats for this subject
        const existingSeats = seats.filter((s) => s.university_subject_id === editingSubjectId);
        const seatMap = new Map<string, number>();
        for (const s of existingSeats) {
          seatMap.set(s.group_id ?? "open", s.seat_count);
        }
        const isAssumed = existingSeats.some((s) => s.is_assumed);
        const newGroupSeats = [
          ...groups.map((g) => ({
            group_id: g.id,
            seat_count: seatMap.get(g.id) ?? 0,
          })),
          { group_id: null, seat_count: seatMap.get("open") ?? 0 },
        ];
        setGroupSeats(newGroupSeats);
        form.reset({
          university_subject_id: editingSubjectId,
          group_seats: newGroupSeats,
          is_assumed: isAssumed,
        });
      } else {
        // Add mode: empty entries for every group + open/shared
        const newGroupSeats = [
          ...groups.map((g) => ({ group_id: g.id, seat_count: 0 })),
          { group_id: null, seat_count: 0 },
        ];
        setGroupSeats(newGroupSeats);
        form.reset({
          university_subject_id: "",
          group_seats: newGroupSeats,
          is_assumed: false,
        });
      }
    }
  }, [sheetOpen, editingSubjectId, seats, groups, form]);

  const insertMut = useMutation({
    mutationFn: insertSeats,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SEATS, universityId] });
      toast({ title: "✅ আসন বিন্যাস যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) =>
      toast({ title: "❌ যোগ করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({
      subjectId,
      values,
    }: {
      subjectId: string;
      values: SubjectGroupSeatFormValues;
    }) => updateSeats(subjectId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SEATS, universityId] });
      toast({ title: "✅ আসন বিন্যাস আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingSubjectId(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSeatsBySubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SEATS, universityId] });
      toast({ title: "🗑️ আসন বিন্যাস মুছে ফেলা হয়েছে" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "❌ মুছতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  const onSubmit = (values: SubjectGroupSeatFormValues) => {
    if (editingSubjectId) {
      updateMut.mutate({ subjectId: editingSubjectId, values });
    } else {
      insertMut.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingSubjectId(null);
    setSheetOpen(true);
  };

  const openEdit = (grouped: { university_subject_id: string }) => {
    setEditingSubjectId(grouped.university_subject_id);
    setSheetOpen(true);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;
  const isLoadingData = loadingSeats || loadingSubs || loadingGroups || loadingUnits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            আসন বিন্যাস (Subject Group Seats)
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            প্রতিটি সাবজেক্ট ও গ্রুপের জন্য আসন সংখ্যা সুনির্দিষ্টভাবে নির্ধারণ করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন আসন বিন্যাস
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="আসন তথ্যাবলী লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : seats.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো আসন বিন্যাস নির্ধারণ করা হয়নি।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Unit Filters */}
          <div className="md:hidden">
            <Select
              value={selectedUnitId || "all"}
              onValueChange={(val) => setSelectedUnitId(val === "all" ? null : val)}
            >
              <SelectTrigger className="w-full font-bengali bg-background border-border">
                <SelectValue placeholder="ইউনিট ফিল্টার করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bengali">
                  সব ইউনিট
                </SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="font-bengali">
                    {unit.unit_name_bn} ({unit.unit_name_en})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <Button
              variant={selectedUnitId === null ? "default" : "outline"}
              size="sm"
              className="rounded-full font-bengali whitespace-nowrap"
              onClick={() => setSelectedUnitId(null)}
            >
              সব ইউনিট
            </Button>
            {units.map((unit) => (
              <Button
                key={unit.id}
                variant={selectedUnitId === unit.id ? "default" : "outline"}
                size="sm"
                className="rounded-full font-bengali whitespace-nowrap"
                onClick={() => setSelectedUnitId(unit.id)}
              >
                {unit.unit_name_bn} ({unit.unit_name_en})
              </Button>
            ))}
          </div>

          {filteredSeats.length === 0 && filteredGroupedSeats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <p className="text-muted-foreground font-bengali text-sm">
                এই ইউনিটের জন্য কোনো আসন বিন্যাস পাওয়া যায়নি।
              </p>
            </div>
          ) : (
            <>
              {/* --- Mobile Card Grid --- */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredSeats.map((seat) => {
                  const subCode = seat.institution_subjects?.degree_program?.short_name || "—";
                  const subName = seat.institution_subjects?.degree_program?.full_name_en || "—";
                  const uName = seat.institution_subjects?.unit
                    ? seat.institution_subjects.unit.unit_name_bn ||
                      seat.institution_subjects.unit.unit_name_en
                    : "সব ইউনিট / প্রযোজ্য নয়";
                  const gName =
                    seat.group_id === null ? "উন্মুক্ত (Shared)" : seat.group?.name_bn || "—";

                  return (
                    <div
                      key={seat.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded inline-block mb-1">
                            {subCode}
                          </span>
                          {seat.is_assumed && (
                            <span className="ml-1.5 font-bold text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded inline-block font-bengali mb-1">
                              অনুমানকৃত
                            </span>
                          )}
                          <h3 className="font-bold text-sm text-foreground truncate">{subName}</h3>
                          <p className="text-xs text-muted-foreground font-bengali mt-1">
                            ইউনিট: {uName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground font-bengali block">
                            আসন সংখ্যা
                          </span>
                          <span className="font-extrabold text-lg text-primary">
                            {seat.seat_count}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                        <span className="font-bengali text-muted-foreground">গ্রুপ:</span>
                        <span className="font-bold font-bengali">{gName}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openEdit(seat)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="text-xs font-bengali">সম্পাদনা</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() =>
                            setDeleteTarget({ university_subject_id: seat.university_subject_id })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-bengali">মুছুন</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* --- Desktop Table View --- */}
              <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">কোড</TableHead>
                        <TableHead className="font-bengali">সাবজেক্ট</TableHead>
                        <TableHead className="font-bengali">ইউনিট</TableHead>
                        <TableHead className="text-center font-bengali">বিজ্ঞান</TableHead>
                        <TableHead className="text-center font-bengali">মানবিক</TableHead>
                        <TableHead className="text-center font-bengali">ব্যবসা</TableHead>
                        <TableHead className="text-center font-bengali">উন্মুক্ত</TableHead>
                        <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroupedSeats.map((grouped) => {
                        return (
                          <TableRow
                            key={grouped.university_subject_id}
                            className="group hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="font-bold">{grouped.subjectCode}</TableCell>
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-2">
                                <span>{grouped.subjectName}</span>
                                {grouped.isAssumed && (
                                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bengali">
                                    অনুমানকৃত
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-bengali text-sm text-muted-foreground">
                              {grouped.unitName}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-primary text-base">
                              {Object.entries(grouped.groupSeats)
                                .filter(([name]) => /বিজ্ঞান|science/i.test(name))
                                .reduce((sum, [, count]) => sum + count, 0) || "—"}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-primary text-base">
                              {Object.entries(grouped.groupSeats)
                                .filter(([name]) => /মানবিক|humanit/i.test(name))
                                .reduce((sum, [, count]) => sum + count, 0) || "—"}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-primary text-base">
                              {Object.entries(grouped.groupSeats)
                                .filter(([name]) => /ব্যবসা|business/i.test(name))
                                .reduce((sum, [, count]) => sum + count, 0) || "—"}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-primary text-base">
                              {grouped.groupSeats["উন্মুক্ত"] || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(grouped)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(grouped)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
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
              {editingSubjectId ? "আসন বিন্যাস সম্পাদনা" : "নতুন আসন বিন্যাস"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              বিষয় এবং গ্রুপ ভিত্তিক মোট সীট বা আসন সংখ্যা ইনপুট দিন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="seat-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <FormField
                  control={form.control}
                  name="university_subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">বিশ্ববিদ্যালয় বিষয় (Subject) *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="font-bengali">
                            <SelectValue placeholder="বিষয় সিলেক্ট করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubjects.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id} className="font-bengali">
                              [{sub.degree_program?.short_name}] {sub.degree_program?.full_name_en}{" "}
                              {sub.unit
                                ? `(${sub.unit.unit_name_bn || sub.unit.unit_name_en})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dynamic Group Seat Inputs */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold font-bengali">গ্রুপভিত্তিক আসন সংখ্যা</p>
                  <p className="text-xs text-muted-foreground font-bengali">
                    প্রতিটি গ্রুপের জন্য আসন সংখ্যা লিখুন। শূন্য রাখলে সেই গ্রুপের জন্য কোনো রেকর্ড তৈরি হবে না।
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groups.map((group, index) => (
                      <div key={group.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <label className="flex-1 text-sm font-medium font-bengali truncate">
                          {group.name_bn}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({group.name_en})
                          </span>
                        </label>
                        <input
                          type="hidden"
                          {...form.register(`group_seats.${index}.group_id`)}
                          value={group.id}
                        />
                        <Input
                          type="number"
                          className="w-24 text-center"
                          placeholder="০"
                          {...form.register(`group_seats.${index}.seat_count`, {
                            valueAsNumber: true,
                          })}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            form.setValue(`group_seats.${index}.seat_count`, val);
                          }}
                        />
                      </div>
                    ))}
                    {/* Open / Shared entry */}
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 bg-muted/30">
                      <label className="flex-1 text-sm font-medium font-bengali truncate">
                        উন্মুক্ত
                        <span className="text-xs text-muted-foreground ml-1">(Open / Shared)</span>
                      </label>
                      <input
                        type="hidden"
                        {...form.register(`group_seats.${groups.length}.group_id`)}
                        value=""
                      />
                      <Input
                        type="number"
                        className="w-24 text-center"
                        placeholder="০"
                        {...form.register(`group_seats.${groups.length}.seat_count`, {
                          valueAsNumber: true,
                        })}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          form.setValue(`group_seats.${groups.length}.seat_count`, val);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="is_assumed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0">
                      <div className="space-y-0.5 text-left pr-4">
                        <FormLabel className="font-bengali text-sm font-semibold">
                          অনুমানকৃত আসন সংখ্যা (Is Assumed)
                        </FormLabel>
                        <p className="text-xs text-muted-foreground font-bengali">
                          অফিসিয়াল সার্কুলার না পাওয়া পর্যন্ত আসন সংখ্যাটি অনুমানকৃত হিসেবে চিহ্নিত করুন।
                        </p>
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
            <Button type="submit" form="seat-form" disabled={isSubmitting} className="font-bengali">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSubjectId ? "আপডেট করুন" : "যোগ করুন"}
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
              আপনি কি সত্যিই এই আসন বিন্যাসটি মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.university_subject_id)}
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
