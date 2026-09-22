import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  collegeFormSchema,
  COLLEGE_CATEGORIES,
  COLLEGE_CATEGORY_LABELS,
  type CollegeFormValues,
  type CollegeRow,
} from "@/lib/college-admin-types";
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
  editingCollege: CollegeRow | null;
  onSubmit: (values: CollegeFormValues) => void;
  isSubmitting: boolean;
}

const defaultValues: CollegeFormValues = {
  slug: "",
  eiin: null,
  name_bn: "",
  short_name_bn: "",
  name_en: "",
  short_name_en: "",
  category: "public",
  sub_category: [],
  type: [],
  website_url: null,
  admission_url: null,
  logo_url: null,
  history: null,
  history_source: [],
  description: null,
};

export default function CollegeFormSheet({
  open,
  onOpenChange,
  editingCollege,
  onSubmit,
  isSubmitting,
}: Props) {
  const isEditing = !!editingCollege;

  const { data: subCategories = [] } = useQuery({
    queryKey: ["institution-sub-categories"],
    queryFn: fetchInstitutionSubCategories,
    staleTime: 10 * 60 * 1000,
  });

  const form = useForm<CollegeFormValues>({
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(collegeFormSchema) as any,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "history_source",
  });

  // Reset form when opening for add or when editing college changes
  useEffect(() => {
    if (open) {
      if (editingCollege) {
        form.reset({
          slug: editingCollege.slug,
          eiin: editingCollege.eiin ?? null,
          name_bn: editingCollege.name_bn,
          short_name_bn: editingCollege.short_name_bn,
          name_en: editingCollege.name_en,
          short_name_en: editingCollege.short_name_en,
          category: editingCollege.category,
          sub_category:
            editingCollege.sub_category && Array.isArray(editingCollege.sub_category)
              ? editingCollege.sub_category
              : editingCollege.sub_category
                ? [editingCollege.sub_category as any]
                : [],
          type:
            editingCollege.type && Array.isArray(editingCollege.type)
              ? editingCollege.type
              : editingCollege.type
                ? [editingCollege.type as any]
                : [],
          website_url: editingCollege.website_url,
          admission_url: editingCollege.admission_url,
          logo_url: editingCollege.logo_url,
          history: editingCollege.history,
          history_source:
            editingCollege.history_source && Array.isArray(editingCollege.history_source)
              ? editingCollege.history_source
              : [],
          description: editingCollege.description ?? null,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, editingCollege, form]);

  const handleSubmit = form.handleSubmit((values) => {
    const cleanedValues: CollegeFormValues = {
      ...values,
      sub_category:
        values.sub_category && values.sub_category.length > 0 ? values.sub_category : null,
      type: values.type && values.type.length > 0 ? values.type : null,
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
            {isEditing ? "কলেজের তথ্য সংশোধন" : "নতুন কলেজ যুক্ত করুন"}
          </SheetTitle>
          <SheetDescription className="font-bengali text-sm text-muted-foreground">
            এখানে কলেজের যাবতীয় তথ্য ইনপুট দিন। তারকাচিহ্নিত (*) ঘরগুলো অবশ্যই পূরণ করতে হবে।
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
                        <FormLabel className="font-bengali">কলেজের নাম (বাংলা) *</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: ঢাকা কলেজ" {...field} />
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
                          <Input placeholder="যেমন: ডিসি" {...field} />
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
                        <FormLabel>College Name (English) *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Dhaka College" {...field} />
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
                          <Input placeholder="e.g. DC" {...field} />
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
                          <Input
                            placeholder="যেমন: dhaka-college"
                            {...field}
                            disabled={isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eiin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bengali">EIIN নম্বর</FormLabel>
                        <FormControl>
                          <Input placeholder="যেমন: ১০৭৯৭৭" {...field} value={field.value ?? ""} />
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
                        <FormLabel className="font-bengali">কলেজের সংক্ষিপ্ত বিবরণ</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="কলেজটি সম্পর্কে সাধারণ একটি সংক্ষিপ্ত ধারণা লিখুন..."
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

              {/* --- Section 2: প্রকারভেদ ও লোগো (Category & Identity) --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary font-bengali tracking-wide uppercase border-l-2 border-primary pl-2">
                  শ্রেণী ও লোগো (Classification)
                </h4>

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
                              <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COLLEGE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {COLLEGE_CATEGORY_LABELS[cat]}
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

                      const selectedCats = subCategories.filter((c) =>
                        currentValues.includes(c.id),
                      );

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
                    name="type"
                    render={({ field }) => {
                      const currentValues = field.value || [];

                      const toggleType = (value: string) => {
                        const updated = currentValues.includes(value)
                          ? currentValues.filter((v) => v !== value)
                          : [...currentValues, value];
                        field.onChange(updated.length > 0 ? updated : null);
                      };

                      const typeOptions = [
                        { value: "intermediate", label: "ইন্টারমিডিয়েট" },
                        { value: "honours", label: "অনার্স" },
                        { value: "masters", label: "মাস্টার্স" },
                      ];

                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-bengali">ধরণ (Type)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between font-normal hover:bg-background/80 active:scale-100 text-left font-bengali min-h-10 h-auto py-2"
                                >
                                  {currentValues.length === 0 ? (
                                    <span className="text-muted-foreground">ধরণ নির্বাচন করুন</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5 max-w-full">
                                      {typeOptions
                                        .filter((o) => currentValues.includes(o.value))
                                        .map((opt) => (
                                          <Badge
                                            key={opt.value}
                                            variant="secondary"
                                            className="text-[10px] font-bengali shrink-0 px-2 py-0.5"
                                          >
                                            {opt.label}
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
                                {typeOptions.map((opt) => {
                                  const isChecked = currentValues.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className="flex items-center gap-2.5 rounded-lg hover:bg-muted/40 p-1.5 -mx-1.5 cursor-pointer select-none transition-colors"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleType(opt.value)}
                                      />
                                      <span className="text-sm font-medium font-bengali text-foreground/90">
                                        {opt.label}
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

              {/* --- Section 3: ওয়েবসাইট ও লিংকসমূহ (Links) --- */}
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
                            placeholder="https://example.edu.bd"
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
                            placeholder="https://example.edu.bd/admission"
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
                          placeholder="কলেজের বিস্তারিত ইতিহাস এখানে লিখুন..."
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
