import { useAuth } from "@/context/AuthContext";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import {
  LoadingSpinner,
  PageHeader,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import {
  CalendarIcon,
  User as UserIcon,
  Edit,
  Save,
  X,
  LogOut,
  Shield,
  GraduationCap,
  Database,
  ArrowRight,
  ExternalLink,
  Loader2,
  GraduationCap as CapIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import dayjs from "@/lib/date-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEnrolledCourses,
  updateUserProfile,
  getStudyUser,
  getStudyStudent,
  updateStudyStudent,
  getAllBatches,
  getAllGroups,
} from "@/lib/queries";
import type { Course } from "@/lib/types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

const currentYear = new Date().getFullYear();
const sscYearOptions = Array.from({ length: currentYear - 2017 }, (_, i) => 2018 + i).reverse();

const academicFormSchema = z.object({
  hsc_batch_id: z.string().optional(),
  group_id: z.string().optional(),
  hsc_gpa: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 5), {
      message: "GPA ০ থেকে ৫.০ এর মধ্যে হতে হবে",
    }),
  hsc_gpa_without_fourth: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 5), {
      message: "GPA ০ থেকে ৫.০ এর মধ্যে হতে হবে",
    }),
  ssc_batch: z.string().optional(),
  ssc_gpa: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 5), {
      message: "GPA ০ থেকে ৫.০ এর মধ্যে হতে হবে",
    }),
  ssc_gpa_without_fourth: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 5), {
      message: "GPA ০ থেকে ৫.০ এর মধ্যে হতে হবে",
    }),
  unit_change: z.boolean(),
  second_timer: z.boolean(),
});

type AcademicFormValues = z.infer<typeof academicFormSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [academicDialogOpen, setAcademicDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router("/login");
    }
    if (user && !editName) {
      setEditName(user.name);
    }
  }, [user, authLoading, router]);

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["profile-courses", user?.uid],
    queryFn: () => getEnrolledCourses(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: studyUser } = useQuery({
    queryKey: ["study-user", user?.uid],
    queryFn: () => getStudyUser(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: studyStudent, isLoading: studentLoading } = useQuery({
    queryKey: ["study-student", user?.uid],
    queryFn: () => getStudyStudent(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["all-batches"],
    queryFn: getAllBatches,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["all-groups"],
    queryFn: getAllGroups,
  });

  const batchMap = new Map(batches.map((b) => [b.id, b]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const mutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user?.uid) throw new Error("User not found");
      await updateUserProfile(user.uid, newName);
    },
    onSuccess: () => {
      toast({ title: "প্রোফাইল আপডেট হয়েছে" });
      setEditing(false);
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "প্রোফাইল আপডেট করতে ব্যর্থ",
        variant: "destructive",
      });
    },
  });

  const academicMutation = useMutation({
    mutationFn: async (values: AcademicFormValues) => {
      if (!user?.uid) throw new Error("User not found");
      const payload: Record<string, unknown> = {
        hsc_batch_id: values.hsc_batch_id || null,
        group_id: values.group_id || null,
        hsc_gpa: values.hsc_gpa ? Number(values.hsc_gpa) : null,
        hsc_gpa_without_fourth: values.hsc_gpa_without_fourth
          ? Number(values.hsc_gpa_without_fourth)
          : null,
        ssc_batch: values.ssc_batch ? Number(values.ssc_batch) : null,
        ssc_gpa: values.ssc_gpa ? Number(values.ssc_gpa) : null,
        ssc_gpa_without_fourth: values.ssc_gpa_without_fourth
          ? Number(values.ssc_gpa_without_fourth)
          : null,
        unit_change: values.unit_change,
        second_timer: values.second_timer,
      };
      await updateStudyStudent(user.uid, payload);
    },
    onSuccess: () => {
      toast({ title: "একাডেমিক তথ্য হালনাগাদ হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["study-student", user?.uid] });
      setAcademicDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "একাডেমিক তথ্য আপডেট করতে ব্যর্থ",
        variant: "destructive",
      });
    },
  });

  const academicForm = useForm<AcademicFormValues>({
    resolver: zodResolver(academicFormSchema),
    defaultValues: {
      hsc_batch_id: "",
      group_id: "",
      hsc_gpa: "",
      hsc_gpa_without_fourth: "",
      ssc_batch: "",
      ssc_gpa: "",
      ssc_gpa_without_fourth: "",
      unit_change: false,
      second_timer: false,
    },
  });

  useEffect(() => {
    if (studyStudent && academicDialogOpen) {
      academicForm.reset({
        hsc_batch_id: studyStudent.hsc_batch_id || "",
        group_id: studyStudent.group_id || "",
        hsc_gpa: studyStudent.hsc_gpa != null ? String(studyStudent.hsc_gpa) : "",
        hsc_gpa_without_fourth:
          studyStudent.hsc_gpa_without_fourth != null
            ? String(studyStudent.hsc_gpa_without_fourth)
            : "",
        ssc_batch: studyStudent.ssc_batch != null ? String(studyStudent.ssc_batch) : "",
        ssc_gpa: studyStudent.ssc_gpa != null ? String(studyStudent.ssc_gpa) : "",
        ssc_gpa_without_fourth:
          studyStudent.ssc_gpa_without_fourth != null
            ? String(studyStudent.ssc_gpa_without_fourth)
            : "",
        unit_change: studyStudent.unit_change ?? false,
        second_timer: studyStudent.second_timer ?? false,
      });
    }
  }, [studyStudent, academicDialogOpen, academicForm]);

  const handleSaveProfile = () => {
    if (!user?.uid || !editName.trim()) return;
    mutation.mutate(editName);
  };

  const handleAcademicSubmit = (values: AcademicFormValues) => {
    academicMutation.mutate(values);
  };

  if (authLoading) {
    return <LoadingSpinner message="প্রোফাইল লোড হচ্ছে..." />;
  }

  if (!user) {
    return null;
  }

  const selectedBatch = studyStudent?.hsc_batch_id ? batchMap.get(studyStudent.hsc_batch_id) : null;
  const selectedGroup = studyStudent?.group_id ? groupMap.get(studyStudent.group_id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 w-full pt-8 sm:pt-10">
        <div className="space-y-6 p-2 md:p-4">
          <PageHeader title="প্রোফাইল" description="আপনার ব্যক্তিগত এবং একাডেমিক তথ্য" />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column - Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <Avatar className="h-20 w-20 border-2 border-primary">
                    {user?.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
                    )}
                    <AvatarFallback className="text-2xl">
                      <UserIcon className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1">
                    {editing ? (
                      <div className="space-y-2">
                        <Label htmlFor="name">নাম</Label>
                        <Input
                          id="name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="আপনার নাম"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveProfile}
                            disabled={mutation.isPending}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {mutation.isPending ? "সেভ হচ্ছে..." : "সেভ"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(false)}
                            disabled={mutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            বাতিল
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-2xl">{user.name}</CardTitle>
                        <CardDescription className="text-md">Roll: {user.roll}</CardDescription>
                        <Button size="sm" onClick={() => setEditing(true)}>
                          <Edit className="h-4 w-4 mr-1" />
                          এডিট
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">ভর্তি হওয়া কোর্সসমূহ</h3>
                  <div className="flex flex-wrap gap-2">
                    {coursesLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (courses as Course[]).length > 0 ? (
                      (courses as Course[]).map((course) => (
                        <Badge key={course.id} variant="secondary">
                          {course.title}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">কোনো কোর্সে ভর্তি হননি।</p>
                    )}
                  </div>
                </div>

                {studyUser &&
                  (studyUser.is_admin || studyUser.is_instructor || studyUser.is_qb_user) && (
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="font-semibold text-lg mb-2">অতিরিক্ত পোর্টালসমূহ</h3>
                      <div className="grid gap-2">
                        {studyUser.is_admin && (
                          <a
                            href="/admin/dashboard/"
                            className="inline-flex items-center justify-between w-full px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-200 group font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-primary" />
                              এডমিন প্যানেলে লগ ইন
                            </span>
                            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                          </a>
                        )}
                        {studyUser.is_instructor && (
                          <a
                            href="/instructor/dashboard/"
                            className="inline-flex items-center justify-between w-full px-4 py-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all duration-200 group font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-emerald-500" />
                              ইন্সট্রাক্টর প্যানেলে লগ ইন
                            </span>
                            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                          </a>
                        )}
                        {studyUser.is_qb_user && (
                          <a
                            href="https://qb.mnr.bd/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-between w-full px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all duration-200 group font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <Database className="h-5 w-5 text-amber-500" />
                              প্রশ্ন ব্যাংক (QB) এ লগ ইন
                            </span>
                            <ExternalLink className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                <div>
                  <h3 className="font-semibold text-lg mb-2">অন্যান্য তথ্য</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>রেজিস্ট্রেশনের তারিখ: {dayjs(user.created_at).format("DD MMMM, YYYY")}</span>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setLogoutDialogOpen(true)}
                    className="mt-4 w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    লগ আউট
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Academic Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <CapIcon className="h-5 w-5" />
                        একাডেমিক তথ্য
                      </CardTitle>
                      <CardDescription>আপনার HSC ও SSC এবং ভর্তি সম্পর্কিত তথ্য</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setAcademicDialogOpen(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      এডিট
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {studentLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ) : (
                    <>
                      {/* HSC Section */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          HSC তথ্য
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">ব্যাচ:</span>
                            <p className="font-medium">
                              {selectedBatch
                                ? `${selectedBatch.name} (${selectedBatch.year})`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">গ্রুপ:</span>
                            <p className="font-medium">{selectedGroup?.name_bn || "—"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">GPA (চতুর্থ বিষয়সহ):</span>
                            <p className="font-medium">{studyStudent?.hsc_gpa ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">GPA (চতুর্থ বিষয়ব্যতীত):</span>
                            <p className="font-medium">
                              {studyStudent?.hsc_gpa_without_fourth ?? "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4" />

                      {/* SSC Section */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          SSC তথ্য
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">বছর:</span>
                            <p className="font-medium">{studyStudent?.ssc_batch ?? "—"}</p>
                          </div>
                          <div />
                          <div>
                            <span className="text-muted-foreground">GPA (চতুর্থ বিষয়সহ):</span>
                            <p className="font-medium">{studyStudent?.ssc_gpa ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">GPA (চতুর্থ বিষয়ব্যতীত):</span>
                            <p className="font-medium">
                              {studyStudent?.ssc_gpa_without_fourth ?? "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4" />

                      {/* Admission Preferences */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          ভর্তি পছন্দ
                        </h4>
                        <div className="flex flex-col gap-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">ইউনিট পরিবর্তন:</span>
                            <Badge variant={studyStudent?.unit_change ? "default" : "secondary"}>
                              {studyStudent?.unit_change ? "হ্যাঁ" : "না"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">সেকেন্ড টাইমার:</span>
                            <Badge variant={studyStudent?.second_timer ? "default" : "secondary"}>
                              {studyStudent?.second_timer ? "হ্যাঁ" : "না"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <hr className="h-20 border-transparent" />
        </div>
      </main>
      <Footer />

      {/* Academic Info Edit Dialog */}
      <Dialog open={academicDialogOpen} onOpenChange={setAcademicDialogOpen}>
        <DialogContent className="flex flex-col sm:max-w-[560px] max-h-[85vh] md:max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CapIcon className="h-5 w-5" />
              একাডেমিক তথ্য এডিট করুন
            </DialogTitle>
            <DialogDescription>আপনার HSC, SSC এবং ভর্তি সম্পর্কিত তথ্য আপডেট করুন।</DialogDescription>
          </DialogHeader>

          <Form {...academicForm}>
            <form
              onSubmit={academicForm.handleSubmit(handleAcademicSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
                {/* HSC Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CapIcon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">HSC তথ্য</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={academicForm.control}
                      name="hsc_batch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ব্যাচ</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="ব্যাচ নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {batches.map((batch) => (
                                <SelectItem key={batch.id} value={batch.id}>
                                  {batch.name} ({batch.year})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={academicForm.control}
                      name="group_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>গ্রুপ</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="গ্রুপ নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name_bn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={academicForm.control}
                      name="hsc_gpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPA (চতুর্থ বিষয়সহ)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              max="5.0"
                              min="0"
                              placeholder="০.০০ - ৫.০০"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={academicForm.control}
                      name="hsc_gpa_without_fourth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPA (চতুর্থ বিষয়ব্যতীত)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              max="5.0"
                              min="0"
                              placeholder="০.০০ - ৫.০০"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t" />

                {/* SSC Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CapIcon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">SSC তথ্য</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={academicForm.control}
                      name="ssc_batch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>পাসের বছর</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="বছর নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sscYearOptions.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div />

                    <FormField
                      control={academicForm.control}
                      name="ssc_gpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPA (চতুর্থ বিষয়সহ)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              max="5.0"
                              min="0"
                              placeholder="০.০০ - ৫.০০"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={academicForm.control}
                      name="ssc_gpa_without_fourth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPA (চতুর্থ বিষয়ব্যতীত)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              max="5.0"
                              min="0"
                              placeholder="০.০০ - ৫.০০"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t" />

                {/* Admission Preferences */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">ভর্তি পছন্দ</h3>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={academicForm.control}
                      name="unit_change"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">ইউনিট পরিবর্তন</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              আপনি কি ইউনিট পরিবর্তন করেছেন?
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={academicForm.control}
                      name="second_timer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">সেকেন্ড টাইমার</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              আপনি কি সেকেন্ড টাইমার পরীক্ষার্থী?
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex justify-end gap-3 px-6 pt-4 pb-6 border-t bg-background">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAcademicDialogOpen(false)}
                  disabled={academicMutation.isPending}
                >
                  বাতিল
                </Button>
                <Button type="submit" disabled={academicMutation.isPending}>
                  {academicMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      সেভ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      তথ্য হালনাগাদ করুন
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>লগ আউট করতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি সত্যিই লগ আউট করতে চান? আপনাকে আবার লগইন করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={signOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              হ্যাঁ, লগ আউট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
