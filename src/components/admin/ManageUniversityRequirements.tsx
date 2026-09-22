// =============================================================================
// Admin — Unit Requirements Tab CRUD component (Phase 3)
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchRequirementsByEntity,
  insertRequirement,
  updateRequirement,
  deleteRequirement,
  type JoinedUnitRequirementRow,
} from "@/lib/university-events-queries";
import { fetchUnitsByEntity } from "@/lib/university-manage-queries";
import { supabase } from "@/lib/supabase";
import {
  fetchGroups,
  fetchStudyDisciplinesList,
  fetchBatches,
  type StudyDisciplineMasterRow,
} from "@/lib/admin-crud-queries";
import {
  unitRequirementSchema,
  type UnitRequirementRow,
  type UnitRequirementFormValues,
} from "@/lib/university-events-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileSpreadsheet, Loader2, X, Copy } from "lucide-react";

interface ManageUniversityRequirementsProps {
  entityId: string;
  entityType: "university" | "college" | "cluster";
}

const QUERY_KEY_REQUIREMENTS = "admin-university-requirements";
const QUERY_KEY_UNITS = "admin-university-units";
const QUERY_KEY_GROUPS = "admin-groups";

const parseSubjectRequirements = (data: any): { subject: string; gpa: number }[] => {
  if (!data) return [];
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed).map(([subject, gpa]) => ({
          subject,
          gpa: Number(gpa),
        }));
      }
    } catch (e) {
      return [];
    }
  }
  if (typeof data === "object" && data !== null) {
    return Object.entries(data).map(([subject, gpa]) => ({
      subject,
      gpa: Number(gpa),
    }));
  }
  return [];
};

const parseCustomChecks = (data: any): any[] => {
  if (!data) return [];
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

export default function ManageUniversityRequirements({
  entityId,
  entityType,
}: ManageUniversityRequirementsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<JoinedUnitRequirementRow | null>(null);
  const [exclude4th, setExclude4th] = useState(false);
  const [activeBatchTab, setActiveBatchTab] = useState<string>("all");
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Locally persisted checkmarks per entity
  const storageKey = `req-checked-${entityId}`;
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };
  const [deleteTargetGroup, setDeleteTargetGroup] = useState<{
    reqIds: string[];
    unitName: string;
    groupNames: string;
  } | null>(null);

  // Fetch Unit Requirements
  const {
    data: requirements = [],
    isLoading: loadingReqs,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_REQUIREMENTS, entityId],
    queryFn: () => fetchRequirementsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  const filteredRequirements = requirements.filter((req) => {
    if (activeBatchTab === "all") return true;
    return (req.unit_requirement_batches || []).some((urb: any) => urb.batch_id === activeBatchTab);
  });

  const groupedRequirements = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        primaryReq: JoinedUnitRequirementRow;
        allReqs: JoinedUnitRequirementRow[];
        groups: Array<{ id: string; name_bn: string; name_en: string }>;
        batchIds: string[];
      }
    >();

    filteredRequirements.forEach((req) => {
      const key = `${req.unit_id}_${req.ssc_year_min}_${req.ssc_year_max}_${req.hsc_year_min}_${req.hsc_year_max}_${req.ssc_min_gpa}_${req.hsc_min_gpa}_${req.total_min_gpa}_${req.ssc_min_gpa_without_4th}_${req.hsc_min_gpa_without_4th}_${req.total_min_gpa_without_4th}_${JSON.stringify(req.subject_requirements)}_${JSON.stringify(req.custom_checks)}_${req.requirement_text || ""}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          primaryReq: req,
          allReqs: [req],
          groups: req.group
            ? [{ id: req.group_id, name_bn: req.group.name_bn, name_en: req.group.name_en }]
            : [],
          batchIds: (req.unit_requirement_batches || []).map((b: any) => b.batch_id),
        });
      } else {
        const existing = map.get(key)!;
        existing.allReqs.push(req);
        if (req.group && !existing.groups.some((g) => g.id === req.group_id)) {
          existing.groups.push({
            id: req.group_id,
            name_bn: req.group.name_bn,
            name_en: req.group.name_en,
          });
        }
        (req.unit_requirement_batches || []).forEach((b: any) => {
          if (!existing.batchIds.includes(b.batch_id)) {
            existing.batchIds.push(b.batch_id);
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const nameA = a.primaryReq.unit?.unit_name_bn || a.primaryReq.unit?.unit_name_en || "";
      const nameB = b.primaryReq.unit?.unit_name_bn || b.primaryReq.unit?.unit_name_en || "";
      return nameA.localeCompare(nameB, "bn");
    });
  }, [filteredRequirements]);

  // Fetch Units
  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: [QUERY_KEY_UNITS, entityId],
    queryFn: () => fetchUnitsByEntity(entityId, entityType),
    enabled: !!entityId,
  });

  // Fetch Groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: [QUERY_KEY_GROUPS],
    queryFn: fetchGroups,
  });

  // Fetch Subjects for Dropdown options
  const {
    data: disciplinesList = [] as StudyDisciplineMasterRow[],
    isLoading: loadingDisciplinesList,
  } = useQuery({
    queryKey: [QUERY_KEY_GROUPS + "-subject-list"],
    queryFn: fetchStudyDisciplinesList,
  });

  // Fetch Batches
  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ["admin-batches"],
    queryFn: fetchBatches,
  });

  const form = useForm<UnitRequirementFormValues>({
    resolver: zodResolver(unitRequirementSchema) as any,
    defaultValues: {
      unit_id: "",
      group_ids: [],
      batch_ids: [],
      ssc_year_min: null,
      ssc_year_max: null,
      hsc_year_min: null,
      hsc_year_max: null,
      ssc_min_gpa: 0,
      hsc_min_gpa: 0,
      total_min_gpa: 0,
      ssc_min_gpa_without_4th: null,
      hsc_min_gpa_without_4th: null,
      total_min_gpa_without_4th: null,
      requirement_text: "",
      subject_requirements: [],
      custom_checks: [],
    },
  });

  // Field Arrays
  const {
    fields: subjectFields,
    append: appendSubject,
    remove: removeSubject,
  } = useFieldArray({
    control: form.control,
    name: "subject_requirements",
  });

  const {
    fields: customCheckFields,
    append: appendCustomCheck,
    remove: removeCustomCheck,
  } = useFieldArray({
    control: form.control,
    name: "custom_checks",
  });

  // Reset form
  useEffect(() => {
    if (sheetOpen) {
      if (editingReq) {
        // Collect all group_ids that share this unit requirement rule
        const matchingGroupIds = requirements
          .filter(
            (r) =>
              r.unit_id === editingReq.unit_id &&
              r.ssc_min_gpa === editingReq.ssc_min_gpa &&
              r.hsc_min_gpa === editingReq.hsc_min_gpa &&
              r.total_min_gpa === editingReq.total_min_gpa &&
              (r.requirement_text || "") === (editingReq.requirement_text || ""),
          )
          .map((r) => r.group_id);

        const groupIdsToSet = Array.from(new Set([editingReq.group_id, ...matchingGroupIds]));

        form.reset({
          unit_id: editingReq.unit_id,
          group_ids: groupIdsToSet,
          batch_ids: (editingReq.unit_requirement_batches || []).map((b: any) => b.batch_id),
          ssc_year_min: editingReq.ssc_year_min,
          ssc_year_max: editingReq.ssc_year_max,
          hsc_year_min: editingReq.hsc_year_min,
          hsc_year_max: editingReq.hsc_year_max,
          ssc_min_gpa: editingReq.ssc_min_gpa,
          hsc_min_gpa: editingReq.hsc_min_gpa,
          total_min_gpa: editingReq.total_min_gpa,
          ssc_min_gpa_without_4th: editingReq.ssc_min_gpa_without_4th,
          hsc_min_gpa_without_4th: editingReq.hsc_min_gpa_without_4th,
          total_min_gpa_without_4th: editingReq.total_min_gpa_without_4th,
          requirement_text: editingReq.requirement_text || "",
          subject_requirements: parseSubjectRequirements(editingReq.subject_requirements),
          custom_checks: parseCustomChecks(editingReq.custom_checks),
        });
        setExclude4th(
          editingReq.ssc_min_gpa_without_4th !== null ||
            editingReq.hsc_min_gpa_without_4th !== null ||
            editingReq.total_min_gpa_without_4th !== null,
        );
      } else {
        const defaultBatchIds = activeBatchTab === "all" ? [] : [activeBatchTab];
        form.reset({
          unit_id: "",
          group_ids: [],
          batch_ids: defaultBatchIds,
          ssc_year_min: null,
          ssc_year_max: null,
          hsc_year_min: null,
          hsc_year_max: null,
          ssc_min_gpa: 0,
          hsc_min_gpa: 0,
          total_min_gpa: 0,
          ssc_min_gpa_without_4th: null,
          hsc_min_gpa_without_4th: null,
          total_min_gpa_without_4th: null,
          requirement_text: "",
          subject_requirements: [],
          custom_checks: [],
        });
        setExclude4th(false);
      }
    }
  }, [sheetOpen, editingReq, form, requirements, activeBatchTab]);

  const transformValuesForDb = (values: UnitRequirementFormValues) => {
    const subjectReqObj: Record<string, number> = {};
    if (Array.isArray(values.subject_requirements)) {
      values.subject_requirements.forEach((item) => {
        if (item.subject && item.gpa) {
          subjectReqObj[item.subject] = Number(item.gpa);
        }
      });
    }

    const customChecksFiltered = (values.custom_checks || []).map((item) => {
      if (item.type === "targetSubjectsTotalGPA") {
        return {
          type: item.type,
          subjects: item.subjects || [],
          minTotalGPA: Number(item.minTotalGPA),
        };
      }
      const cleaned: any = {
        type: item.type,
        subjects: item.subjects || [],
        gpa: Number(item.gpa),
      };
      if (
        item.type === "atLeastNSubjectsWithMinGPA" &&
        item.count !== undefined &&
        item.count !== null
      ) {
        cleaned.count = Number(item.count);
      }
      return cleaned;
    });

    const { group_ids, ...rest } = values as any;
    return {
      ...rest,
      ssc_year_min: values.ssc_year_min ? Number(values.ssc_year_min) : null,
      ssc_year_max: values.ssc_year_max ? Number(values.ssc_year_max) : null,
      hsc_year_min: values.hsc_year_min ? Number(values.hsc_year_min) : null,
      hsc_year_max: values.hsc_year_max ? Number(values.hsc_year_max) : null,
      ssc_min_gpa: Number(values.ssc_min_gpa),
      hsc_min_gpa: Number(values.hsc_min_gpa),
      total_min_gpa: Number(values.total_min_gpa),
      ssc_min_gpa_without_4th:
        exclude4th && values.ssc_min_gpa_without_4th
          ? Number(values.ssc_min_gpa_without_4th)
          : null,
      hsc_min_gpa_without_4th:
        exclude4th && values.hsc_min_gpa_without_4th
          ? Number(values.hsc_min_gpa_without_4th)
          : null,
      total_min_gpa_without_4th:
        exclude4th && values.total_min_gpa_without_4th
          ? Number(values.total_min_gpa_without_4th)
          : null,
      requirement_text: values.requirement_text || null,
      subject_requirements: Object.keys(subjectReqObj).length > 0 ? subjectReqObj : null,
      custom_checks: customChecksFiltered.length > 0 ? customChecksFiltered : null,
    };
  };

  const saveRequirementForGroup = async (
    values: UnitRequirementFormValues,
    groupId: string,
    targetReqId?: string,
  ) => {
    const transformed = transformValuesForDb(values);
    const entityCol =
      entityType === "university"
        ? "university_id"
        : entityType === "college"
          ? "college_id"
          : "cluster_id";

    const payload: any = {
      ...transformed,
      group_id: groupId,
      unit_id: values.unit_id,
      university_id: entityType === "university" ? entityId : null,
      college_id: entityType === "college" ? entityId : null,
      cluster_id: entityType === "cluster" ? entityId : null,
    };

    let savedReqId: string;

    if (targetReqId) {
      const saved = await updateRequirement(targetReqId, payload);
      savedReqId = saved.id;
    } else {
      const saved = await insertRequirement(payload);
      savedReqId = saved.id;
    }

    // Sync Batches
    const { error: deleteError } = await supabase
      .from("unit_requirement_batches")
      .delete()
      .eq("requirement_id", savedReqId);
    if (deleteError) {
      console.error("[REQ] delete batches error:", deleteError);
      throw deleteError;
    }

    if (values.batch_ids && values.batch_ids.length > 0) {
      const batchInserts = values.batch_ids.map((bId) => ({
        requirement_id: savedReqId,
        batch_id: bId,
      }));
      const { error: insertError } = await supabase
        .from("unit_requirement_batches")
        .insert(batchInserts);
      if (insertError) {
        console.error("[REQ] insert batches error:", insertError);
        throw insertError;
      }
    }

    return savedReqId;
  };

  const insertMut = useMutation({
    mutationFn: async (values: UnitRequirementFormValues) => {
      for (const groupId of values.group_ids) {
        await saveRequirementForGroup(values, groupId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REQUIREMENTS, entityId] });
      toast({ title: "✅ রিকোয়ারমেন্ট যোগ করা হয়েছে" });
      setSheetOpen(false);
    },
    onError: (e: any) => {
      toast({
        title: "❌ যোগ করতে সমস্যা",
        description: e?.message || String(e),
        variant: "destructive",
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UnitRequirementFormValues }) => {
      if (!values.group_ids || values.group_ids.length === 0) return;

      const initialMatchingReqs = editingReq
        ? requirements.filter(
            (r) =>
              r.unit_id === editingReq.unit_id &&
              r.ssc_min_gpa === editingReq.ssc_min_gpa &&
              r.hsc_min_gpa === editingReq.hsc_min_gpa &&
              r.total_min_gpa === editingReq.total_min_gpa &&
              (r.requirement_text || "") === (editingReq.requirement_text || ""),
          )
        : [];

      const initialGroupIds = initialMatchingReqs.map((r) => r.group_id);

      // 1. Save/Update all checked groups
      await saveRequirementForGroup(values, values.group_ids[0], id);

      for (let i = 1; i < values.group_ids.length; i++) {
        await saveRequirementForGroup(values, values.group_ids[i]);
      }

      // 2. Delete rows for any groups that were unchecked by user
      const removedGroupIds = initialGroupIds.filter((gId) => !values.group_ids.includes(gId));
      for (const removedGId of removedGroupIds) {
        const reqToDelete = initialMatchingReqs.find((r) => r.group_id === removedGId);
        if (reqToDelete && reqToDelete.id !== id) {
          await deleteRequirement(reqToDelete.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REQUIREMENTS, entityId] });
      toast({ title: "✅ রিকোয়ারমেন্ট আপডেট হয়েছে" });
      setSheetOpen(false);
      setEditingReq(null);
    },
    onError: (e: any) => {
      console.error("[REQ] updateMut error:", e);
      toast({
        title: "❌ আপডেট করতে সমস্যা",
        description: e?.message || String(e),
        variant: "destructive",
      });
    },
  });
  const deleteGroupMut = useMutation({
    mutationFn: async (reqIds: string[]) => {
      for (const id of reqIds) {
        await deleteRequirement(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REQUIREMENTS, entityId] });
      toast({ title: "🗑️ রিকোয়ারমেন্ট মুছে ফেলা হয়েছে" });
      setDeleteTargetGroup(null);
    },
    onError: (e: any) =>
      toast({
        title: "❌ মুছতে সমস্যা",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const cloneMut = useMutation({
    mutationFn: async (req: JoinedUnitRequirementRow) => {
      const batchIds = (req.unit_requirement_batches || []).map((b: any) => b.batch_id);

      const saved = await insertRequirement({
        university_id: req.university_id,
        cluster_id: req.cluster_id,
        college_id: req.college_id,
        unit_id: req.unit_id,
        group_id: req.group_id,
        ssc_year_min: req.ssc_year_min,
        ssc_year_max: req.ssc_year_max,
        hsc_year_min: req.hsc_year_min,
        hsc_year_max: req.hsc_year_max,
        ssc_min_gpa: req.ssc_min_gpa,
        hsc_min_gpa: req.hsc_min_gpa,
        total_min_gpa: req.total_min_gpa,
        ssc_min_gpa_without_4th: req.ssc_min_gpa_without_4th,
        hsc_min_gpa_without_4th: req.hsc_min_gpa_without_4th,
        total_min_gpa_without_4th: req.total_min_gpa_without_4th,
        requirement_text: req.requirement_text,
        subject_requirements: req.subject_requirements,
        custom_checks: req.custom_checks,
      });

      if (batchIds.length > 0) {
        const batchInserts = batchIds.map((bId) => ({
          requirement_id: saved.id,
          batch_id: bId,
        }));
        const { error: insertError } = await supabase
          .from("unit_requirement_batches")
          .insert(batchInserts);
        if (insertError) {
          console.error("[REQ] clone insert batches error:", insertError);
          throw insertError;
        }
      }

      return {
        ...saved,
        unit: req.unit,
        group: req.group,
        unit_requirement_batches: batchIds.map((bId) => ({ batch_id: bId })),
      } as JoinedUnitRequirementRow;
    },
    onSuccess: (clonedRow) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REQUIREMENTS, entityId] });
      toast({ title: "✅ রিকোয়ারমেন্ট ক্লোন হয়েছে — পরিবর্তন করতে এডিট করুন" });
      setCloningId(null);
      if (clonedRow) {
        openEdit(clonedRow);
      }
    },
    onError: (e: any) => {
      console.error("[REQ] cloneMut error:", e);
      setCloningId(null);
      toast({
        title: "❌ ক্লোন করতে সমস্যা",
        description: e?.message || String(e),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: UnitRequirementFormValues) => {
    if (editingReq) {
      updateMut.mutate({ id: editingReq.id, values });
    } else {
      insertMut.mutate(values);
    }
  };

  const openAdd = () => {
    setEditingReq(null);
    setSheetOpen(true);
    const defaultBatchIds = activeBatchTab === "all" ? [] : [activeBatchTab];
    form.reset({
      unit_id: "",
      group_ids: [],
      batch_ids: defaultBatchIds,
      ssc_year_min: null,
      ssc_year_max: null,
      hsc_year_min: null,
      hsc_year_max: null,
      ssc_min_gpa: 0,
      hsc_min_gpa: 0,
      total_min_gpa: 0,
      ssc_min_gpa_without_4th: null,
      hsc_min_gpa_without_4th: null,
      total_min_gpa_without_4th: null,
      requirement_text: "",
      subject_requirements: [],
      custom_checks: [],
    });
    setExclude4th(false);
  };

  const openEdit = (req: JoinedUnitRequirementRow) => {
    setEditingReq(req);
    setSheetOpen(true);
  };

  const handleClone = (req: JoinedUnitRequirementRow) => {
    setCloningId(req.id);
    cloneMut.mutate(req);
  };

  const isSubmitting = insertMut.isPending || updateMut.isPending;
  const isLoadingData =
    loadingReqs || loadingUnits || loadingGroups || loadingDisciplinesList || loadingBatches;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-bengali flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            আবেদনের যোগ্যতা
          </h2>
          <p className="text-xs text-muted-foreground font-bengali mt-0.5">
            ইউনিট ও গ্রুপ অনুযায়ী জিপিএ ও সাবজেক্টের শর্তাবলী সেট করুন।
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 font-bengali">
          <Plus className="h-4 w-4" />
          নতুন রিকোয়ারমেন্ট
        </Button>
      </div>

      {isLoadingData ? (
        <LoadingSpinner message="যোগ্যতার তথ্যাবলী লোড হচ্ছে..." />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-bengali">
            তথ্য আনতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
          </p>
        </div>
      ) : requirements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-bengali">এখনো কোনো যোগ্যতার শর্তাবলী সেট করা হয়নি।</p>
        </div>
      ) : (
        <div className="w-full space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
            <Select value={activeBatchTab} onValueChange={setActiveBatchTab}>
              <SelectTrigger className="w-full md:w-[280px] font-bengali">
                <SelectValue placeholder="সেশন/ব্যাচ নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bengali">
                  সব ব্যাচ ({requirements.length})
                </SelectItem>
                {batches.map((batch: any) => {
                  const count = requirements.filter((req) =>
                    (req.unit_requirement_batches || []).some(
                      (urb: any) => urb.batch_id === batch.id,
                    ),
                  ).length;
                  return (
                    <SelectItem key={batch.id} value={batch.id} className="font-bengali">
                      {batch.name || `Admission ${batch.year}`} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {groupedRequirements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-bengali">
                এই ব্যাচের জন্য কোনো শর্তাবলী সেট করা হয়নি।
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* --- Mobile Card Grid --- */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {groupedRequirements.map((groupItem) => {
                  const req = groupItem.primaryReq;
                  return (
                    <div
                      key={groupItem.key}
                      className={`rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm ${checkedIds.has(req.id) ? "bg-primary/5 border-primary/30" : ""}`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={checkedIds.has(req.id)}
                            onChange={() => toggleChecked(req.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer mt-1 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base font-bengali text-foreground truncate">
                              ইউনিট:{" "}
                              {req.unit ? req.unit.unit_name_bn || req.unit.unit_name_en : "—"}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {groupItem.groups.map((g) => (
                                <span
                                  key={g.id}
                                  className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded font-bengali"
                                >
                                  গ্রুপ: {g.name_bn}
                                </span>
                              ))}
                              {groupItem.batchIds.length > 0 &&
                                groupItem.batchIds.map((bId) => {
                                  const batchObj = batches.find((b: any) => b.id === bId);
                                  return (
                                    <span
                                      key={bId}
                                      className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100 font-bengali"
                                    >
                                      {batchObj ? batchObj.name : `Batch ${bId.slice(0, 4)}`}
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Passing Years */}
                      {(req.ssc_year_min ||
                        req.ssc_year_max ||
                        req.hsc_year_min ||
                        req.hsc_year_max) && (
                        <div className="text-xs text-muted-foreground font-bengali bg-muted/20 p-2 rounded-md space-y-1">
                          <span className="font-semibold text-foreground block text-[10px]">
                            পাশের সাল সীমা:
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              SSC: {req.ssc_year_min || "যেকোনো"} - {req.ssc_year_max || "যেকোনো"}
                            </div>
                            <div>
                              HSC: {req.hsc_year_min || "যেকোনো"} - {req.hsc_year_max || "যেকোনো"}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GPA limits */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground text-center">
                        <div className="bg-muted/30 p-2 rounded">
                          <span className="block text-[10px] font-bengali">SSC GPA</span>
                          <strong className="text-foreground text-sm">{req.ssc_min_gpa}</strong>
                          {req.ssc_min_gpa_without_4th != null && (
                            <span className="block text-[9px] text-amber-600 font-medium">
                              ({req.ssc_min_gpa_without_4th}*)
                            </span>
                          )}
                        </div>
                        <div className="bg-muted/30 p-2 rounded">
                          <span className="block text-[10px] font-bengali">HSC GPA</span>
                          <strong className="text-foreground text-sm">{req.hsc_min_gpa}</strong>
                          {req.hsc_min_gpa_without_4th != null && (
                            <span className="block text-[9px] text-amber-600 font-medium">
                              ({req.hsc_min_gpa_without_4th}*)
                            </span>
                          )}
                        </div>
                        <div className="bg-muted/30 p-2 rounded">
                          <span className="block text-[10px] font-bengali">Total GPA</span>
                          <strong className="text-primary text-sm font-extrabold">
                            {req.total_min_gpa}
                          </strong>
                          {req.total_min_gpa_without_4th != null && (
                            <span className="block text-[9px] text-amber-600 font-medium">
                              ({req.total_min_gpa_without_4th}*)
                            </span>
                          )}
                        </div>
                      </div>
                      {(req.ssc_min_gpa_without_4th != null ||
                        req.hsc_min_gpa_without_4th != null ||
                        req.total_min_gpa_without_4th != null) && (
                        <p className="text-[10px] text-amber-600 text-right mt-1 font-bengali font-medium">
                          * ৪র্থ বিষয় ছাড়া ন্যূনতম জিপিএ
                        </p>
                      )}

                      {/* Sub details */}
                      <div className="pt-2 border-t border-border/50 space-y-2 text-xs text-muted-foreground">
                        {req.subject_requirements && (
                          <div>
                            <strong className="font-bengali text-foreground block mb-1">
                              সাবজেক্ট শর্তাবলী:
                            </strong>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const parsed = parseSubjectRequirements(req.subject_requirements);
                                if (parsed.length === 0) return "—";
                                return parsed.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 rounded border border-primary/10"
                                  >
                                    {item.subject} (জিপিএ: {item.gpa})
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                        {req.custom_checks && (
                          <div>
                            <strong className="font-bengali text-foreground block mb-1">
                              কাস্টম শর্তসমূহ:
                            </strong>
                            <div className="space-y-1">
                              {(() => {
                                const parsed = parseCustomChecks(req.custom_checks);
                                if (parsed.length === 0) return "—";
                                return parsed.map((item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="bg-secondary/50 p-1.5 rounded border border-border/50 text-[11px] leading-relaxed"
                                  >
                                    <span className="font-semibold text-primary">
                                      {item.type === "atLeastNSubjectsWithMinGPA"
                                        ? `কমপক্ষে ${item.count}টি বিষয়ে GPA ${item.gpa}:`
                                        : item.type === "remainingSubjectsWithMinGPA"
                                          ? `বাকি বিষয়সমূহে GPA ${item.gpa}:`
                                          : `মোট জিপিএ (Min Total GPA: ${item.minTotalGPA}):`}
                                    </span>{" "}
                                    {item.subjects?.join(", ")}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                        {req.requirement_text && (
                          <div>
                            <strong className="font-bengali text-foreground block">
                              অতিরিক্ত বিবরণ:
                            </strong>
                            <p className="font-bengali text-[11px] mt-0.5 bg-muted/10 p-1.5 rounded">
                              {req.requirement_text}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-primary"
                          onClick={() => handleClone(req)}
                          disabled={cloningId === req.id}
                        >
                          {cloningId === req.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span className="text-xs font-bengali">ক্লোন</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openEdit(req)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="text-xs font-bengali">সম্পাদনা</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() =>
                            setDeleteTargetGroup({
                              reqIds: groupItem.allReqs.map((r) => r.id),
                              unitName: req.unit?.unit_name_bn || "ইউনিট",
                              groupNames: groupItem.groups.map((g) => g.name_bn).join(", "),
                            })
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
                        <TableHead className="w-10" />
                        <TableHead className="font-bengali">ইউনিট</TableHead>
                        <TableHead className="font-bengali">গ্রুপ (Group)</TableHead>
                        <TableHead className="font-bengali text-center">পাশের সাল সীমা</TableHead>
                        <TableHead className="text-center font-bengali">SSC Min GPA</TableHead>
                        <TableHead className="text-center font-bengali">HSC Min GPA</TableHead>
                        <TableHead className="text-center font-bengali">Total Min GPA</TableHead>
                        <TableHead className="font-bengali">সাবজেক্ট রিকোয়ারমেন্ট</TableHead>
                        <TableHead className="font-bengali">কাস্টম শর্তাবলী</TableHead>
                        <TableHead className="text-right font-bengali">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedRequirements.map((groupItem) => {
                        const req = groupItem.primaryReq;
                        return (
                          <TableRow
                            key={groupItem.key}
                            className={`group hover:bg-muted/30 transition-colors ${checkedIds.has(req.id) ? "bg-primary/5" : ""}`}
                          >
                            <TableCell className="w-10 text-center">
                              <input
                                type="checkbox"
                                checked={checkedIds.has(req.id)}
                                onChange={() => toggleChecked(req.id)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell className="font-bold">
                              <div>
                                {req.unit ? req.unit.unit_name_bn || req.unit.unit_name_en : "—"}
                              </div>
                              {groupItem.batchIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 font-normal">
                                  {groupItem.batchIds.map((bId) => {
                                    const batchObj = batches.find((b: any) => b.id === bId);
                                    return (
                                      <span
                                        key={bId}
                                        className="inline-flex items-center bg-blue-50 text-blue-700 text-[9px] px-1 py-0.5 rounded border border-blue-100 font-semibold"
                                      >
                                        {batchObj ? batchObj.name : `Batch ${bId.slice(0, 4)}`}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold font-bengali">
                              <div className="flex flex-wrap gap-1">
                                {groupItem.groups.map((g) => (
                                  <span
                                    key={g.id}
                                    className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded font-bold"
                                  >
                                    {g.name_bn}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-bengali text-center">
                              {req.ssc_year_min ||
                              req.ssc_year_max ||
                              req.hsc_year_min ||
                              req.hsc_year_max ? (
                                <div className="space-y-0.5 text-muted-foreground text-[10px]">
                                  <div>
                                    SSC: {req.ssc_year_min ?? "—"} - {req.ssc_year_max ?? "—"}
                                  </div>
                                  <div>
                                    HSC: {req.hsc_year_min ?? "—"} - {req.hsc_year_max ?? "—"}
                                  </div>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              <div>{req.ssc_min_gpa}</div>
                              {req.ssc_min_gpa_without_4th != null && (
                                <div className="text-[10px] text-amber-600 font-medium">
                                  ({req.ssc_min_gpa_without_4th}*)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              <div>{req.hsc_min_gpa}</div>
                              {req.hsc_min_gpa_without_4th != null && (
                                <div className="text-[10px] text-amber-600 font-medium">
                                  ({req.hsc_min_gpa_without_4th}*)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-extrabold text-primary">
                              <div>{req.total_min_gpa}</div>
                              {req.total_min_gpa_without_4th != null && (
                                <div className="text-[10px] text-amber-600 font-bold">
                                  ({req.total_min_gpa_without_4th}*)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-bengali text-muted-foreground max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const parsed = parseSubjectRequirements(req.subject_requirements);
                                  if (parsed.length === 0) return "—";
                                  return parsed.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 rounded border border-primary/10"
                                    >
                                      {item.subject}: {item.gpa}
                                    </span>
                                  ));
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-bengali text-muted-foreground max-w-[250px]">
                              <div className="space-y-1">
                                {(() => {
                                  const parsed = parseCustomChecks(req.custom_checks);
                                  if (parsed.length === 0) return "—";
                                  return parsed.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-secondary/50 p-1 rounded border border-border/50 text-[10px] leading-tight"
                                    >
                                      <strong className="text-foreground">
                                        {item.type === "atLeastNSubjectsWithMinGPA"
                                          ? `কমপক্ষে ${item.count}টি বিষয়ে GPA ${item.gpa}:`
                                          : item.type === "remainingSubjectsWithMinGPA"
                                            ? `বাকি বিষয়সমূহে GPA ${item.gpa}:`
                                            : `মোট জিপিএ (Min Total GPA: ${item.minTotalGPA}):`}
                                      </strong>{" "}
                                      <span className="text-muted-foreground">
                                        {item.subjects?.join(", ")}
                                      </span>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary"
                                  title="ক্লোন করুন"
                                  onClick={() => handleClone(req)}
                                  disabled={cloningId === req.id}
                                >
                                  {cloningId === req.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(req)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setDeleteTargetGroup({
                                      reqIds: groupItem.allReqs.map((r) => r.id),
                                      unitName: req.unit?.unit_name_bn || "ইউনিট",
                                      groupNames: groupItem.groups.map((g) => g.name_bn).join(", "),
                                    })
                                  }
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
            </div>
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
              {editingReq ? "রিকোয়ারমেন্ট সম্পাদনা" : "নতুন রিকোয়ারমেন্ট যোগ করুন"}
            </SheetTitle>
            <SheetDescription className="font-bengali">
              ইউনিট ভিত্তিক আবেদন করার যোগ্যতা ও ন্যূনতম জিপিএ কন্ডিশন সেট করুন।
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 px-6">
            <Form {...form}>
              <form
                id="requirement-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 py-5"
              >
                <input type="hidden" {...form.register("batch_ids")} />

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-1 font-bengali">
                  টার্গেট স্কোপ
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ইউনিট *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="font-bengali">
                              <SelectValue placeholder="ইউনিট সিলেক্ট করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id} className="font-bengali">
                                {unit.unit_name_bn}{" "}
                                {unit.unit_name_en ? `(${unit.unit_name_en})` : ""}
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
                    name="group_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">গ্রুপ (Group) *</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={field.value?.length === groups.length && groups.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange(groups.map((g) => g.id));
                                  } else {
                                    field.onChange([]);
                                  }
                                }}
                              />
                              <span className="text-xs font-medium font-bengali">সব সিলেক্ট</span>
                            </label>
                            {groups.map((group) => (
                              <label
                                key={group.id}
                                className="flex items-center gap-1.5 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  checked={field.value?.includes(group.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      field.onChange([...(field.value || []), group.id]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter((id) => id !== group.id) || [],
                                      );
                                    }
                                  }}
                                />
                                <span className="text-xs font-bengali">{group.name_bn}</span>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  পাশের সাল (Passing Year Requirements)
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="ssc_year_min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali text-xs">SSC Min Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="যেমন: 2020"
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
                    name="ssc_year_max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali text-xs">SSC Max Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="যেমন: 2023"
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
                    name="hsc_year_min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali text-xs">HSC Min Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="যেমন: 2022"
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
                    name="hsc_year_max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali text-xs">HSC Max Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="যেমন: 2025"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
                  জিপিএ কন্ডিশন (GPA Requirements)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ssc_min_gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">SSC Min GPA *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hsc_min_gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">HSC Min GPA *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_min_gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">Total Min GPA *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-2 bg-muted/20 p-3 rounded-lg border border-border/50 my-2">
                  <Switch
                    id="exclude-4th-subject"
                    checked={exclude4th}
                    onCheckedChange={setExclude4th}
                  />
                  <label
                    htmlFor="exclude-4th-subject"
                    className="text-xs font-semibold font-bengali text-foreground cursor-pointer select-none"
                  >
                    ৪র্থ বিষয় ব্যতীত জিপিএ শর্ত আছে কি? (Exclude 4th Subject?)
                  </label>
                </div>

                {exclude4th && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border border-dashed border-border/80 p-3 rounded-lg bg-amber-50/5">
                    <FormField
                      control={form.control}
                      name="ssc_min_gpa_without_4th"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bengali text-xs text-amber-800">
                            SSC Min GPA (৪র্থ বিষয় ছাড়া)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hsc_min_gpa_without_4th"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bengali text-xs text-amber-800">
                            HSC Min GPA (৪র্থ বিষয় ছাড়া)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="total_min_gpa_without_4th"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bengali text-xs text-amber-800">
                            Total Min GPA (৪র্থ বিষয় ছাড়া)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* --- Task 2: Subject Requirements Builder --- */}
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold font-bengali">
                      সাবজেক্ট রিকোয়ারমেন্ট বিল্ডার (Subject Requirements)
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendSubject({ subject: "", gpa: 3.0 })}
                      className="h-7 gap-1 font-bengali text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      যোগ করুন
                    </Button>
                  </div>

                  {subjectFields.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex gap-3 items-end border border-border/55 bg-muted/5 p-3 rounded-lg relative group"
                    >
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <FormField
                          control={form.control}
                          name={`subject_requirements.${index}.subject`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bengali">সাবজেক্ট *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="font-bengali h-9">
                                    <SelectValue placeholder="সিলেক্ট করুন" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {disciplinesList.map((sub) => (
                                    <SelectItem
                                      key={sub.id}
                                      value={sub.short_code}
                                      className="font-bengali"
                                    >
                                      {sub.name_bn} ({sub.short_code})
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
                          name={`subject_requirements.${index}.gpa`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bengali">ন্যূনতম জিপিএ *</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" className="h-9" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        onClick={() => removeSubject(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {subjectFields.length === 0 && (
                    <p className="text-xs text-muted-foreground font-bengali text-center py-2 border border-dashed rounded-lg bg-muted/10">
                      কোনো সাবজেক্টের শর্ত এখনও যোগ করা হয়নি।
                    </p>
                  )}
                </div>

                {/* --- Task 3: Custom Checks Builder --- */}
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold font-bengali">
                      কাস্টম রুল বিল্ডার (Custom Rules Builder)
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendCustomCheck({
                          type: "atLeastNSubjectsWithMinGPA",
                          subjects: [],
                          count: 1,
                          gpa: 3.0,
                        })
                      }
                      className="h-7 gap-1 font-bengali text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      রুল যোগ করুন
                    </Button>
                  </div>

                  {customCheckFields.map((item, index) => {
                    const ruleType = form.watch(`custom_checks.${index}.type`);
                    return (
                      <div
                        key={item.id}
                        className="space-y-3 border border-border bg-muted/10 p-4 rounded-xl relative group"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-xs font-extrabold text-primary font-bengali">
                            রুল #{index + 1}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 -mt-1"
                            onClick={() => removeCustomCheck(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`custom_checks.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bengali">রুল টাইপ *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="font-bengali h-9">
                                      <SelectValue placeholder="সিলেক্ট করুন" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem
                                      value="atLeastNSubjectsWithMinGPA"
                                      className="font-bengali"
                                    >
                                      কমপক্ষে N টি বিষয়ে নির্দিষ্ট জিপিএ
                                    </SelectItem>
                                    <SelectItem
                                      value="remainingSubjectsWithMinGPA"
                                      className="font-bengali"
                                    >
                                      বাকি সকল বিষয়ে নির্দিষ্ট জিপিএ
                                    </SelectItem>
                                    <SelectItem
                                      value="targetSubjectsTotalGPA"
                                      className="font-bengali"
                                    >
                                      নির্দিষ্ট বিষয়সমূহের মোট জিপিএ (Total GPA of Specific Subjects)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {ruleType !== "targetSubjectsTotalGPA" ? (
                            <FormField
                              control={form.control}
                              name={`custom_checks.${index}.gpa`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bengali">
                                    টার্গেট জিপিএ *
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-9"
                                      {...field}
                                      value={field.value ?? ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={`custom_checks.${index}.minTotalGPA`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bengali">
                                    ন্যূনতম মোট জিপিএ *
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-9"
                                      {...field}
                                      value={field.value ?? ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {ruleType === "atLeastNSubjectsWithMinGPA" && (
                          <FormField
                            control={form.control}
                            name={`custom_checks.${index}.count`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bengali">
                                  ন্যূনতম বিষয়ের সংখ্যা (N) *
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    className="h-9"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name={`custom_checks.${index}.subjects`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bengali">
                                টার্গেট বিষয়সমূহ (Subjects) *
                              </FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-2 gap-2 mt-1 border border-border bg-card p-2.5 rounded-lg max-h-40 overflow-y-auto">
                                  {disciplinesList.map((sub) => {
                                    const isChecked = field.value?.includes(sub.short_code);
                                    return (
                                      <label
                                        key={sub.id}
                                        className="flex items-center gap-2 text-xs font-bengali cursor-pointer hover:bg-muted p-1 rounded"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              field.onChange([
                                                ...(field.value || []),
                                                sub.short_code,
                                              ]);
                                            } else {
                                              field.onChange(
                                                (field.value || []).filter(
                                                  (val: string) => val !== sub.short_code,
                                                ),
                                              );
                                            }
                                          }}
                                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                        />
                                        <span>
                                          {sub.name_bn} ({sub.name_en})
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  })}
                  {customCheckFields.length === 0 && (
                    <p className="text-xs text-muted-foreground font-bengali text-center py-2 border border-dashed rounded-lg bg-muted/10">
                      কোনো কাস্টম রুল এখনও যোগ করা হয়নি।
                    </p>
                  )}
                </div>

                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 border-t border-border/50 font-bengali">
                  অতিরিক্ত তথ্য
                </p>

                <FormField
                  control={form.control}
                  name="requirement_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">
                        রিকোয়ারমেন্ট নোট / অতিরিক্ত বিবরণ (Requirement Text)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="যেমন: শুধুমাত্র বিজ্ঞান ও প্রযুক্তি বিষয়সমূহের জন্য প্রযোজ্য।"
                          rows={3}
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
              form="requirement-form"
              disabled={isSubmitting}
              className="font-bengali"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingReq ? "আপডেট করুন" : "যোগ করুন"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTargetGroup}
        onOpenChange={(open) => !open && setDeleteTargetGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bengali">নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription className="font-bengali">
              আপনি কি সত্যিই <strong>{deleteTargetGroup?.unitName}</strong> ইউনিটের (গ্রুপ:{" "}
              {deleteTargetGroup?.groupNames}) শর্তাবলী মুছে ফেলতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bengali">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetGroup && deleteGroupMut.mutate(deleteTargetGroup.reqIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bengali"
              disabled={deleteGroupMut.isPending}
            >
              {deleteGroupMut.isPending ? "মুছছে..." : "মুছুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
