// =============================================================================
// ClusterFormSheet — Admin Add / Edit Cluster Drawer Component
// Matches the exact styling, structure, and premium design patterns
// =============================================================================

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  clusterFormSchema,
  CLUSTER_TYPES,
  CLUSTER_TYPE_LABELS,
  type ClusterFormValues,
  type ClusterRow,
} from "@/lib/cluster-admin-types";
import {
  fetchClusterUniversities,
  fetchClusterColleges,
  fetchAllUniversitiesMinimal,
  fetchAllCollegesMinimal,
} from "@/lib/cluster-admin-queries";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCluster: ClusterRow | null;
  onSubmit: (values: ClusterFormValues) => void;
  isSubmitting: boolean;
}

const defaultValues: ClusterFormValues = {
  slug: "",
  name_bn: "",
  short_name_bn: "",
  name_en: "",
  short_name_en: "",
  cluster_type: "university",
  parent_university_id: null,
  website_url: null,
  admission_url: null,
  logo_url: null,
  history: null,
  history_source: [],
  description: null,
  institution_ids: [],
};

export default function ClusterFormSheet({
  open,
  onOpenChange,
  editingCluster,
  onSubmit,
  isSubmitting,
}: Props) {
  const isEditing = !!editingCluster;

  const form = useForm<ClusterFormValues>({
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clusterFormSchema) as any,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "history_source",
  });

  const selectedClusterType = form.watch("cluster_type");

  // --- Queries to fetch all options ---
  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities-minimal"],
    queryFn: fetchAllUniversitiesMinimal,
    enabled: open,
  });

  const { data: colleges = [] } = useQuery({
    queryKey: ["admin-colleges-minimal"],
    queryFn: fetchAllCollegesMinimal,
    enabled: open,
  });

  // --- Query to fetch currently linked institution IDs ---
  const { data: linkedIds } = useQuery({
    queryKey: ["cluster-junctions", editingCluster?.id, editingCluster?.cluster_type],
    queryFn: async () => {
      if (!editingCluster) return [];
      const isUni =
        editingCluster.cluster_type === "university" || editingCluster.cluster_type === "mixed";
      if (isUni) {
        const mappings = await fetchClusterUniversities(editingCluster.id);
        return mappings.map((m) => m.university_id);
      }
      return fetchClusterColleges(editingCluster.id);
    },
    enabled: open && !!editingCluster,
  });

  // Reset form when opening for add or when editing cluster/linkedIds changes
  useEffect(() => {
    if (open) {
      if (editingCluster) {
        form.reset({
          slug: editingCluster.slug,
          name_bn: editingCluster.name_bn,
          short_name_bn: editingCluster.short_name_bn,
          name_en: editingCluster.name_en,
          short_name_en: editingCluster.short_name_en,
          cluster_type: editingCluster.cluster_type,
          parent_university_id: editingCluster.parent_university_id ?? null,
          website_url: editingCluster.website_url,
          admission_url: editingCluster.admission_url,
          logo_url: editingCluster.logo_url,
          history: editingCluster.history,
          history_source:
            editingCluster.history_source && Array.isArray(editingCluster.history_source)
              ? editingCluster.history_source
              : [],
          description: editingCluster.description ?? null,
          institution_ids: linkedIds || [],
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, editingCluster, linkedIds, form]);

  // Clean form state if cluster_type changes to reset selected IDs
  const handleTypeChange = (val: "university" | "college" | "mixed" | "affiliation") => {
    form.setValue("cluster_type", val);
    if (val !== "college" && val !== "affiliation") {
      form.setValue("parent_university_id", null);
    }
    form.setValue("institution_ids", []);
  };

  const handleSubmit = form.handleSubmit((values) => {
    const cleanedValues: ClusterFormValues = {
      ...values,
      parent_university_id:
        values.cluster_type === "college" || values.cluster_type === "affiliation"
          ? values.parent_university_id
          : null,
      history_source:
        values.history_source && values.history_source.length > 0 ? values.history_source : null,
    };
    onSubmit(cleanedValues);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 gap-0 z-50">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="font-bold font-bengali text-xl text-foreground">
            {isEditing ? "গুচ্ছ ক্লাস্টার তথ্য সংশোধন" : "নতুন গুচ্ছ ক্লাস্টার যুক্ত করুন"}
          </SheetTitle>
          <SheetDescription className="font-bengali text-sm text-muted-foreground">
            এখানে ক্লাস্টারের নাম, ধরন এবং অন্তর্ভুক্ত শিক্ষাপ্রতিষ্ঠানসমূহ নির্ধারণ করুন।
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6 pb-8">
              {/* --- Section 1: পরিচিতি (Identity) --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary font-bengali tracking-wide uppercase border-l-2 border-primary pl-2">
                  পরিচিতি (Identity)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name_bn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">গুচ্ছের নাম (বাংলা) *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: জিএসটি গুচ্ছ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="short_name_bn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">সংক্ষিপ্ত নাম (বাংলা) *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: গুচ্ছ" {...field} />
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
                        <FormLabel>Cluster Name (English) *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. GST Cluster" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="short_name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Name (English) *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. GST" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">স্লাগ (Slug) *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: gst-cluster" {...field} disabled={isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cluster_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">ক্লাস্টার ধরন *</FormLabel>
                        <Select
                          onValueChange={(val) => handleTypeChange(val as any)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="ধরন নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CLUSTER_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {CLUSTER_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(selectedClusterType === "college" || selectedClusterType === "affiliation") && (
                    <FormField
                      control={form.control}
                      name="parent_university_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bengali">
                            প্যারেন্ট বিশ্ববিদ্যালয় (Parent University) *
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="বিশ্ববিদ্যালয় সিলেক্ট করুন..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {universities.map((uni) => (
                                <SelectItem key={uni.id} value={uni.id}>
                                  {uni.name_bn} ({uni.name_en})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="font-bengali">সংক্ষিপ্ত বিবরণ</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="ক্লাস্টার সম্পর্কে সাধারণ তথ্য..."
                            className="resize-none min-h-[80px]"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* --- Section 2: প্রতিষ্ঠান নির্বাচন (Institutions Checklist Grid) --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary font-bengali tracking-wide uppercase border-l-2 border-primary pl-2">
                  শিক্ষাপ্রতিষ্ঠানসমূহ (Institutions)
                </h4>

                <FormField
                  control={form.control}
                  name="institution_ids"
                  render={({ field }) => {
                    const selectedIds = field.value || [];
                    const options =
                      selectedClusterType === "university" || selectedClusterType === "mixed"
                        ? universities
                        : colleges;

                    const handleCheckboxChange = (id: string, checked: boolean) => {
                      const next = checked
                        ? [...selectedIds, id]
                        : selectedIds.filter((x) => x !== id);
                      field.onChange(next);
                    };

                    const getChecklistLabel = () => {
                      if (selectedClusterType === "university")
                        return "অন্তর্ভুক্ত বিশ্ববিদ্যালয়সমূহ নির্বাচন করুন";
                      if (selectedClusterType === "mixed")
                        return "অন্তর্ভুক্ত বিশ্ববিদ্যালয়সমূহ নির্বাচন করুন (মিশ্র)";
                      if (selectedClusterType === "affiliation") return "অধিভুক্ত কলেজসমূহ নির্বাচন করুন";
                      return "অন্তর্ভুক্ত কলেজসমূহ নির্বাচন করুন";
                    };

                    return (
                      <FormItem className="flex flex-col gap-2">
                        <FormLabel className="font-bengali">{getChecklistLabel()}</FormLabel>
                        <ScrollArea className="h-64 rounded-lg border border-border p-3 bg-muted/10">
                          {options.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-bengali p-2 italic">
                              কোনো শিক্ষাপ্রতিষ্ঠান পাওয়া যায়নি।
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {options.map((opt) => {
                                const isChecked = selectedIds.includes(opt.id);
                                return (
                                  <label
                                    key={opt.id}
                                    className="flex items-center gap-2.5 rounded-lg border border-border/40 hover:bg-muted/40 p-2 cursor-pointer select-none transition-colors"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        handleCheckboxChange(opt.id, !!checked)
                                      }
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold font-bengali text-foreground truncate">
                                        {opt.name_bn}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {opt.name_en}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <Separator />

              {/* --- Section 3: লিংক ও লোগো (Links & Logo) --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary font-bengali tracking-wide uppercase border-l-2 border-primary pl-2">
                  ওয়েবসাইট ও লিংকসমূহ (Links)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://gstadmission.ac.bd"
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
                    name="admission_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://gstadmission.ac.bd/apply"
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
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/logo.png"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* --- Section 4: ইতিহাস ও বিবরণ (History) --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary font-bengali tracking-wide uppercase border-l-2 border-primary pl-2">
                  ইতিহাস ও তথ্যসূত্র (History & Source)
                </h4>

                <FormField
                  control={form.control}
                  name="history"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">ইতিহাস</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="গুচ্ছের বিস্তারিত ইতিহাস এখানে লিখুন..."
                          className="min-h-[150px] resize-y"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* --- History Sources --- */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-bengali">ইতিহাসের সোর্সসমূহ (Sources)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 font-bengali text-xs"
                      onClick={() => append({ label: "", url: "" })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      সোর্স যোগ করুন
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-bengali italic">
                      কোনো সোর্স যোগ করা হয়নি।
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-end gap-3 border border-border/40 p-3 rounded-lg bg-muted/10 relative group"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                            <FormField
                              control={form.control}
                              name={`history_source.${index}.label`}
                              render={({ field: inputField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bengali">
                                    সোর্স লেবেল *
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="যেমন: উইকিপিডিয়া" {...inputField} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`history_source.${index}.url`}
                              render={({ field: inputField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Source URL *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="https://bn.wikipedia.org/..."
                                      {...inputField}
                                    />
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
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>

        <Separator />

        <div className="px-6 py-4 flex gap-3 justify-end bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="font-bengali"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="font-bengali gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "সংশোধন করুন" : "যুক্ত করুন"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
