import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  masterQbStreamFormSchema,
  type MasterQbStreamFormValues,
  type MasterQbStreamRow,
} from "@/lib/master-qb-admin-types";
import { fetchCurriculumPaperOptions } from "@/lib/master-qb-admin-queries";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import PaperMultiSelect from "@/components/admin/PaperMultiSelect";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStream: MasterQbStreamRow | null;
  onSubmit: (values: MasterQbStreamFormValues) => void;
  isSubmitting: boolean;
}

const defaultValues: MasterQbStreamFormValues = {
  name_bn: "",
  short_name_bn: null,
  slug: "",
  description: null,
  icon_url: null,
  sort_order: 0,
  paper_ids: [],
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function MasterQbStreamFormSheet({
  open,
  onOpenChange,
  editingStream,
  onSubmit,
  isSubmitting,
}: Props) {
  const isEditing = !!editingStream;
  const [slugTouched, setSlugTouched] = useState(false);

  const { data: papers = [], isLoading: papersLoading } = useQuery({
    queryKey: ["admin-curriculum-paper-options"],
    queryFn: fetchCurriculumPaperOptions,
    staleTime: 10 * 60 * 1000,
  });

  const form = useForm<MasterQbStreamFormValues>({
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(masterQbStreamFormSchema) as any,
    defaultValues,
  });

  const nameValue = form.watch("name_bn");
  const iconValue = form.watch("icon_url");

  // Reset form when opening for add or when editing stream changes
  useEffect(() => {
    if (!open) return;
    if (editingStream) {
      form.reset({
        name_bn: editingStream.name_bn,
        short_name_bn: editingStream.short_name_bn ?? null,
        slug: editingStream.slug,
        description: editingStream.description ?? null,
        icon_url: editingStream.icon_url ?? null,
        sort_order: editingStream.sort_order ?? 0,
        paper_ids: editingStream.paper_ids ?? [],
      });
      setSlugTouched(true);
    } else {
      form.reset(defaultValues);
      setSlugTouched(false);
    }
  }, [open, editingStream, form]);

  // Auto-generate slug from name (until the user edits the slug manually)
  useEffect(() => {
    if (!open || isEditing || slugTouched) return;
    const generated = slugify(nameValue || "");
    if (generated) {
      form.setValue("slug", generated);
    }
  }, [nameValue, open, isEditing, slugTouched, form]);

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="font-bengali">
            {isEditing ? "স্ট্রিম সম্পাদনা" : "নতুন স্ট্রিম যোগ করুন"}
          </SheetTitle>
          <SheetDescription className="font-bengali">
            {isEditing
              ? "স্ট্রিমের তথ্য পরিবর্তন করুন।"
              : "নতুন মাস্টার প্রশ্নব্যাংক স্ট্রিম তৈরি করুন।"}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="master-qb-stream-form" onSubmit={handleSubmit} className="space-y-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name_bn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bengali">নাম (বাংলা) *</FormLabel>
                      <FormControl>
                        <Input placeholder="ভার্সিটি “ক” মাস্টার প্রশ্নব্যাংক" {...field} />
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
                      <FormLabel className="font-bengali">সংক্ষিপ্ত নাম (বাংলা)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ভার্সিটি ক"
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
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="varsity-a"
                          {...field}
                          onChange={(e) => {
                            setSlugTouched(true);
                            field.onChange(e);
                          }}
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
                      <FormLabel className="font-bengali">ক্রম (Sort Order)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon_url"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Icon URL</FormLabel>
                      <div className="flex items-center gap-3">
                        {iconValue ? (
                          <img
                            src={iconValue}
                            alt="icon preview"
                            className="h-10 w-10 rounded-lg object-contain bg-muted p-1 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0">
                            —
                          </div>
                        )}
                        <FormControl>
                          <Input
                            placeholder="https://example.com/icon.png"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bengali">বিবরণ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="স্ট্রিমের সংক্ষিপ্ত বিবরণ লিখুন..."
                          rows={3}
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
                  name="paper_ids"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bengali">পেপার সমূহ</FormLabel>
                      <PaperMultiSelect
                        value={field.value || []}
                        onChange={field.onChange}
                        papers={papers}
                        isLoading={papersLoading}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            className="font-bengali"
          >
            বাতিল
          </Button>
          <Button type="submit" form="master-qb-stream-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "আপডেট করুন" : "যোগ করুন"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
