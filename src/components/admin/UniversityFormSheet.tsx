import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  universityFormSchema,
  UNIVERSITY_CATEGORIES,
  CATEGORY_LABELS,
  type UniversityFormValues,
  type UniversityRow,
} from "@/lib/university-admin-types";
import { fetchInstitutionSubCategories } from "@/lib/institution-category-queries";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUniversity: UniversityRow | null;
  onSubmit: (values: UniversityFormValues) => void;
  isSubmitting: boolean;
}

const defaultValues: UniversityFormValues = {
  slug: "",
  name_bn: "",
  short_name_bn: "",
  name_en: "",
  short_name_en: "",
  category: "public",
  sub_category: [],
  second_time: false,
  unit_change: null,
  website_url: null,
  admission_url: null,
  logo_url: null,
  history: null,
  history_source: [],
  description: null,
};

export default function UniversityFormSheet({
  open,
  onOpenChange,
  editingUniversity,
  onSubmit,
  isSubmitting,
}: Props) {
  const isEditing = !!editingUniversity;

  const { data: subCategories = [] } = useQuery({
    queryKey: ["institution-sub-categories"],
    queryFn: fetchInstitutionSubCategories,
    staleTime: 10 * 60 * 1000,
  });

  const form = useForm<UniversityFormValues>({
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(universityFormSchema) as any,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "history_source",
  });

  // Reset form when opening for add or when editing university changes
  useEffect(() => {
    if (open) {
      if (editingUniversity) {
        form.reset({
          slug: editingUniversity.slug,
          name_bn: editingUniversity.name_bn,
          short_name_bn: editingUniversity.short_name_bn,
          name_en: editingUniversity.name_en,
          short_name_en: editingUniversity.short_name_en,
          category: editingUniversity.category,
          sub_category:
            editingUniversity.sub_category && Array.isArray(editingUniversity.sub_category)
              ? editingUniversity.sub_category
              : editingUniversity.sub_category
                ? [editingUniversity.sub_category as any]
                : [],
          second_time: editingUniversity.second_time,
          unit_change: editingUniversity.unit_change,
          website_url: editingUniversity.website_url,
          admission_url: editingUniversity.admission_url,
          logo_url: editingUniversity.logo_url,
          history: editingUniversity.history,
          history_source:
            editingUniversity.history_source && Array.isArray(editingUniversity.history_source)
              ? editingUniversity.history_source
              : [],
          description: editingUniversity.description ?? null,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, editingUniversity, form]);

  const handleSubmit = form.handleSubmit((values) => {
    const cleanedValues: UniversityFormValues = {
      ...values,
      sub_category:
        values.sub_category && values.sub_category.length > 0 ? values.sub_category : null,
      history_source:
        values.history_source && values.history_source.length > 0 ? values.history_source : null,
    };
    onSubmit(cleanedValues);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="font-bengali">
            {isEditing ? "বিশ্ববিদ্যালয় সম্পাদনা" : "নতুন বিশ্ববিদ্যালয় যোগ করুন"}
          </SheetTitle>
          <SheetDescription className="font-bengali">
            {isEditing ? "বিশ্ববিদ্যালয়ের তথ্য পরিবর্তন করুন।" : "নতুন বিশ্ববিদ্যালয়ের সকল তথ্য পূরণ করুন।"}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="university-form" onSubmit={handleSubmit} className="space-y-6 py-5">
              {/* --- Identity Section --- */}
              <SectionLabel>পরিচিতি</SectionLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name_bn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নাম (বাংলা) *</FormLabel>
                      <FormControl>
                        <Input placeholder="ঢাকা বিশ্ববিদ্যালয়" {...field} />
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
                      <FormLabel className="font-bengali">সংক্ষিপ্ত (বাংলা) *</FormLabel>
                      <FormControl>
                        <Input placeholder="ঢাবি" {...field} />
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
                        <Input placeholder="University of Dhaka" {...field} />
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
                      <FormLabel>Short Name (EN) *</FormLabel>
                      <FormControl>
                        <Input placeholder="DU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Slug *</FormLabel>
                      <FormControl>
                        <Input placeholder="dhaka-university" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bengali">বিশ্ববিদ্যালয়ের বিবরণ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="বিশ্ববিদ্যালয়ের সংক্ষিপ্ত বিবরণ লিখুন..."
                          rows={4}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* --- Classification --- */}
              <SectionLabel>শ্রেণিবিভাগ</SectionLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">ক্যাটাগরি *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="নির্বাচন করুন" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNIVERSITY_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
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
                  name="sub_category"
                  render={({ field }) => {
                    const currentValues = field.value || [];

                    const toggleSubCategory = (value: string) => {
                      const updated = currentValues.includes(value as any)
                        ? currentValues.filter((v) => v !== value)
                        : [...currentValues, value as any];
                      field.onChange(updated.length > 0 ? updated : null);
                    };

                    const selectedCats = subCategories.filter((c) => currentValues.includes(c.id));

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-bengali">সাব-ক্যাটাগরি সমূহ</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal hover:bg-background/80 active:scale-100 text-left font-bengali min-h-10 h-auto py-2"
                              >
                                {currentValues.length === 0 ? (
                                  <span className="text-muted-foreground">
                                    সাব-ক্যাটাগরি নির্বাচন করুন
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 max-w-full">
                                    {selectedCats.map((cat) => (
                                      <Badge
                                        key={cat.id}
                                        variant="secondary"
                                        className="text-[10px] font-bengali shrink-0 px-2 py-0.5"
                                      >
                                        {cat.name_bn}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-3 space-y-2 bg-card border border-border rounded-xl shadow-lg z-50"
                            align="start"
                          >
                            <p className="text-xs font-semibold text-muted-foreground font-bengali mb-2">
                              এক বা একাধিক নির্বাচন করুন
                            </p>
                            <div className="space-y-2.5">
                              {subCategories.map((cat) => {
                                const isChecked = currentValues.includes(cat.id);
                                return (
                                  <label
                                    key={cat.id}
                                    className="flex items-center gap-2.5 rounded-lg hover:bg-muted/40 p-1.5 -mx-1.5 cursor-pointer select-none transition-colors"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() => toggleSubCategory(cat.id)}
                                    />
                                    <span className="text-sm font-medium font-bengali text-foreground/90">
                                      {cat.name_bn}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="second_time"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-lg border border-border p-3 h-10 mt-auto">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0 font-bengali text-xs cursor-pointer">
                        ২য়বার পরীক্ষা
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_change"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">ইউনিট পরিবর্তন</FormLabel>
                      <FormControl>
                        <Input placeholder="ঐচ্ছিক" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* --- URLs --- */}
              <SectionLabel>লিংক সমূহ</SectionLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.du.ac.bd"
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
                          placeholder="https://admission.du.ac.bd"
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

              {/* --- History --- */}
              <SectionLabel>ইতিহাস</SectionLabel>

              <FormField
                control={form.control}
                name="history"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">ইতিহাস</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="বিশ্ববিদ্যালয়ের সংক্ষিপ্ত ইতিহাস..."
                        rows={4}
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
                                <FormLabel className="text-xs font-bengali">সোর্স লেবেল *</FormLabel>
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
            </form>
          </Form>
        </ScrollArea>

        <Separator />

        <div className="px-6 py-4 flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            বাতিল
          </Button>
          <Button type="submit" form="university-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "আপডেট করুন" : "যোগ করুন"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold pt-2 font-bengali">
      {children}
    </p>
  );
}
