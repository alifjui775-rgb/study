import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  collegeFormSchema,
  type CollegeFormValues,
  type CollegeRow,
  COLLEGE_CATEGORIES,
  COLLEGE_CATEGORY_LABELS,
} from "@/lib/college-admin-types";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save } from "lucide-react";

interface ManageCollegeInfoProps {
  college: CollegeRow;
}

export default function ManageCollegeInfo({ college }: ManageCollegeInfoProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CollegeFormValues>({
    resolver: zodResolver(collegeFormSchema) as any,
    defaultValues: {
      slug: college.slug || "",
      eiin: college.eiin || "",
      name_bn: college.name_bn || "",
      short_name_bn: college.short_name_bn || "",
      name_en: college.name_en || "",
      short_name_en: college.short_name_en || "",
      category: college.category || "public",
      sub_category: college.sub_category || [],
      type: college.type || [],
      website_url: college.website_url || "",
      admission_url: college.admission_url || "",
      logo_url: college.logo_url || "",
      history: college.history || "",
      description: college.description || "",
    },
  });

  const updateMut = useMutation({
    mutationFn: async (values: CollegeFormValues) => {
      const { error } = await supabase.from("colleges").update(values).eq("id", college.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-college-base", college.id] });
      toast({ title: "✅ কলেজ তথ্য আপডেট হয়েছে" });
    },
    onError: (e: any) =>
      toast({ title: "❌ আপডেট করতে সমস্যা", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="font-bengali flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          প্রতিষ্ঠান তথ্য
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => updateMut.mutate(v))} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name_bn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">নাম (বাংলা) *</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-bengali" />
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
                      <Input {...field} className="font-bengali" />
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                    <FormLabel className="font-bengali">স্লাগ *</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" />
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
                    <FormLabel className="font-bengali">EIIN</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLLEGE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="font-bengali">
                            {COLLEGE_CATEGORY_LABELS[c]}
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
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">লোগো URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bengali">ওয়েবসাইট</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="https://..." />
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
                    <FormLabel className="font-bengali">ভর্তি URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bengali">বিবরণ</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                      className="font-bengali"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="history"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bengali">ইতিহাস</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                      className="font-bengali"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateMut.isPending} className="gap-2 font-bengali">
              <Save className="h-4 w-4" />
              {updateMut.isPending ? "সেভ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
