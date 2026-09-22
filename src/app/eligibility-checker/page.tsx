"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import SimplePageHeader from "@/components/common/SimplePageHeader";
import { supabase } from "@/lib/supabase";
import {
  fetchInstitutionSubCategories,
  buildSubCategoryMap,
  type SubCategoryMap,
} from "@/lib/institution-category-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Building,
  GraduationCap,
  Calendar,
  Award,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Search,
  Check,
  LayoutGrid,
  Building2,
  Leaf,
  Settings,
  Atom,
  HeartPulse,
  Sparkles,
  Moon,
  Info,
  FileText,
  ArrowRight,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Group {
  id: string;
  name_en: string;
  name_bn: string;
}

interface Subject {
  id: string;
  name_en: string;
  name_bn: string;
  short_code: string;
}

interface UnitRequirement {
  id: string;
  university_id: string | null;
  cluster_id: string | null;
  college_id: string | null;
  unit_id: string;
  group_id: string;
  ssc_year_min: number | null;
  ssc_year_max: number | null;
  hsc_year_min: number | null;
  hsc_year_max: number | null;
  ssc_min_gpa: number;
  hsc_min_gpa: number;
  total_min_gpa: number;
  ssc_min_gpa_without_4th: number | null;
  hsc_min_gpa_without_4th: number | null;
  total_min_gpa_without_4th: number | null;
  requirement_text: string | null;
  subject_requirements: any;
  custom_checks: any;
  admission_units: {
    id: string;
    unit_name_bn: string;
    unit_name_en: string | null;
    unit_slug: string;
    primary_group_id?: string | null;
    subject_group_seats?:
      | {
          seat_count: number;
          group_id: string;
        }[]
      | null;
  } | null;
  universities: {
    id: string;
    name_en: string;
    name_bn: string;
    category?: string;
    sub_category?: string[] | null;
    logo_url: string | null;
    slug?: string | null;
    website_url?: string | null;
    admission_url?: string | null;
    institution_links?: { label: string; url: string; is_external: boolean }[] | null;
  } | null;
  clusters: {
    id: string;
    name_en: string;
    name_bn: string;
    cluster_type?: string;
    logo_url: string | null;
    slug?: string | null;
    website_url?: string | null;
    admission_url?: string | null;
    institution_links?: { label: string; url: string; is_external: boolean }[] | null;
  } | null;
  colleges: {
    id: string;
    name_en: string;
    name_bn: string;
    logo_url: string | null;
    slug?: string | null;
    institution_links?: { label: string; url: string; is_external: boolean }[] | null;
  } | null;
  unit_requirement_batches?:
    | {
        batches: {
          id: string;
          name: string;
          year: number;
          is_current: boolean;
        } | null;
      }[]
    | null;
}

interface GroupedInstitution {
  id: string;
  name_en: string;
  name_bn: string;
  logo_url: string | null;
  category?: string | null;
  cluster_type?: string | null;
  type: "university" | "cluster" | "college";
  slug?: string | null;
  website_url?: string | null;
  admission_url?: string | null;
  institution_links?: { label: string; url: string; is_external: boolean }[] | null;
  eligibleUnits: {
    id: string;
    unit_name_bn: string;
    unit_slug: string;
    requirement_text: string | null;
    primary_group_id?: string | null;
    subject_group_seats?:
      | {
          seat_count: number;
          group_id: string;
        }[]
      | null;
  }[];
  batchNames: Set<string>;
}

const passingYears = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

const categoryMapping: Record<string, { label: string; icon: any }> = {
  cluster: { label: "গুচ্ছ", icon: LayoutGrid },
  general: { label: "সাধারণ", icon: Building2 },
  agri: { label: "কৃষি", icon: Leaf },
  engineering: { label: "প্রকৌশল", icon: Settings },
  sandt: { label: "বিজ্ঞান ও প্রযুক্তি", icon: Atom },
  medical: { label: "মেডিকেল", icon: HeartPulse },
  special: { label: "বিশেষ", icon: Sparkles },
  islamic: { label: "ইসলামী", icon: Moon },
  affiliated: { label: "অধিভুক্ত", icon: Building },
  other: { label: "অন্যান্য", icon: Info },
};

const groupSortOrder = [
  "cluster",
  "general",
  "agri",
  "engineering",
  "sandt",
  "medical",
  "special",
  "islamic",
  "affiliated",
  "other",
];

export default function EligibilityCheckerPage() {
  // Database data
  const [groups, setGroups] = useState<Group[]>([]);
  const [requirements, setRequirements] = useState<UnitRequirement[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [subCategoryMap, setSubCategoryMap] = useState<SubCategoryMap>({});

  // Lazy load helper for localStorage cache
  const getCachedValue = (key: string, defaultValue: any) => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("eligibility_checker_inputs");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed[key] !== undefined) return parsed[key];
        }
      } catch (e) {
        console.error("Failed to load cached input", key, e);
      }
    }
    return defaultValue;
  };

  // Task 1 States
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() =>
    getCachedValue("selectedGroupId", ""),
  );
  const [exclude4thSubject, setExclude4thSubject] = useState<boolean>(() =>
    getCachedValue("exclude4thSubject", false),
  );
  const [sscGpaWithout4th, setSscGpaWithout4th] = useState<string>(() =>
    getCachedValue("sscGpaWithout4th", ""),
  );
  const [hscGpaWithout4th, setHscGpaWithout4th] = useState<string>(() =>
    getCachedValue("hscGpaWithout4th", ""),
  );
  const [dynamicSubjects, setDynamicSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>(() => getCachedValue("marks", {}));
  const [seats, setSeats] = useState<any[]>([]);

  const selectedGroupName = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId)?.name_bn || "";
  }, [groups, selectedGroupId]);

  const getSeatCountForUnit = (unitId: string) => {
    const matching = seats.filter((s) => s.institution_subjects?.unit_id === unitId);
    const specific = matching.filter((s) => s.group_id === selectedGroupId);
    if (specific.length > 0) {
      return specific.reduce((sum, s) => sum + (s.seat_count || 0), 0);
    }
    const general = matching.filter((s) => s.group_id === null);
    if (general.length > 0) {
      return general.reduce((sum, s) => sum + (s.seat_count || 0), 0);
    }
    return null;
  };

  // Additional necessary student inputs
  const [sscGpa, setSscGpa] = useState<string>(() => getCachedValue("sscGpa", ""));
  const [hscGpa, setHscGpa] = useState<string>(() => getCachedValue("hscGpa", ""));
  const [sscYear, setSscYear] = useState<string>(() => getCachedValue("sscYear", ""));
  const [hscYear, setHscYear] = useState<string>(() => getCachedValue("hscYear", ""));

  // Loading state for group change
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false);

  // Save cache on input changes
  useEffect(() => {
    const inputs = {
      selectedGroupId,
      exclude4thSubject,
      sscGpa,
      hscGpa,
      sscYear,
      hscYear,
      sscGpaWithout4th,
      hscGpaWithout4th,
      marks,
    };
    localStorage.setItem("eligibility_checker_inputs", JSON.stringify(inputs));
  }, [
    selectedGroupId,
    exclude4thSubject,
    sscGpa,
    hscGpa,
    sscYear,
    hscYear,
    sscGpaWithout4th,
    hscGpaWithout4th,
    marks,
  ]);

  // Task 2: Supabase Data Fetching
  // 1. Initial Load: Fetch all groups & requirements
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingDb(true);
        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("*")
          .order("name_en", { ascending: false });

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Fetch requirements
        const { data: reqsData, error: reqsError } = await supabase
          .from("unit_requirements")
          .select(`
            *,
            admission_units(
              id, 
              unit_name_bn, 
              unit_name_en, 
              unit_slug, 
              primary_group_id
            ),
            universities(id, name_en, name_bn, category, sub_category, logo_url, slug, institution_links(label, url, is_external)),
            clusters(id, name_en, name_bn, cluster_type, logo_url, slug, institution_links(label, url, is_external)),
            colleges(id, name_en, name_bn, logo_url, slug, institution_links(label, url, is_external)),
            unit_requirement_batches (
              batches (id, name, year, is_current)
            )
          `)
          .is("deleted_at", null);

        const { data: seatsData, error: seatsError } = await supabase.from("subject_group_seats")
          .select(`
            seat_count,
            group_id,
            institution_subjects (
              unit_id
            )
          `);

        if (reqsError) throw reqsError;
        if (seatsError) throw seatsError;
        setSeats(seatsData || []);
        setRequirements(reqsData || []);

        const subCats = await fetchInstitutionSubCategories();
        setSubCategoryMap(buildSubCategoryMap(subCats));
      } catch (err: any) {
        console.error("Error fetching initial database data", err);
        setDbError(err.message || "ডাটাবেজ থেকে তথ্য লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoadingDb(false);
      }
    }

    loadInitialData();
  }, []);

  // 2. On Group Change: Fetch subjects
  useEffect(() => {
    async function fetchSubjectsForGroup() {
      if (!selectedGroupId) {
        setDynamicSubjects([]);
        return;
      }

      try {
        setLoadingSubjects(true);
        const { data, error } = await supabase
          .from("subject_groups")
          .select("subject_id, study_disciplines(id, name_en, name_bn, short_code)")
          .eq("group_id", selectedGroupId);

        if (error) throw error;

        // Extract nested data to populate the dynamicSubjects state array
        const extractedSubjects = (data || [])
          .map((item: any) => item.study_disciplines)
          .filter((sub: any) => sub !== null) as Subject[];

        // Sort by name_en to keep it alphabetical
        extractedSubjects.sort((a, b) => a.name_en.localeCompare(b.name_en));

        setDynamicSubjects(extractedSubjects);
      } catch (err: any) {
        console.error("Error fetching subjects for group:", err);
      } finally {
        setLoadingSubjects(false);
      }
    }

    fetchSubjectsForGroup();
  }, [selectedGroupId]);

  // Helpers to parse JSONB structures
  const parseSubjectRequirements = (data: any): Record<string, number> => {
    if (!data) return {};
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed;
        }
      } catch {
        return {};
      }
    }
    if (typeof data === "object" && data !== null) {
      if (Array.isArray(data)) {
        const obj: Record<string, number> = {};
        data.forEach((item: any) => {
          if (item && item.subject) {
            obj[item.subject] = Number(item.gpa);
          }
        });
        return obj;
      }
      return data as Record<string, number>;
    }
    return {};
  };

  const parseCustomChecks = (data: any): any[] => {
    if (!data) return [];
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  };

  // Task 4: Advanced Evaluator Logic (checkEligibility)
  const groupedEligibleResults = useMemo(() => {
    // Basic verification: user must enter main GPAs and select group
    const sGpa = parseFloat(sscGpa);
    const hGpa = parseFloat(hscGpa);
    const sYear = parseInt(sscYear);
    const hYear = parseInt(hscYear);

    if (isNaN(sGpa) || isNaN(hGpa) || isNaN(sYear) || isNaN(hYear) || !selectedGroupId) {
      return null;
    }

    const sGpaWithout4 = exclude4thSubject ? parseFloat(sscGpaWithout4th) : null;
    const hGpaWithout4 = exclude4thSubject ? parseFloat(hscGpaWithout4th) : null;

    // Filter requirements to find the best requirement per unique unit_id
    const groupFilteredReqs = requirements.filter((req) => req.group_id === selectedGroupId);

    const bestRequirementsMap = new Map<string, { req: UnitRequirement; score: number }>();
    groupFilteredReqs.forEach((req) => {
      const batches =
        req.unit_requirement_batches
          ?.map((urb) => urb.batches)
          .filter((b): b is NonNullable<typeof b> => !!b) || [];
      const hasCurrent = batches.some((b) => b.is_current);
      const maxYear = batches.reduce((max, b) => Math.max(max, b.year), 0);

      const reqPriorityScore = hasCurrent ? 10000 + maxYear : maxYear;

      const key = req.unit_id;
      const existingBest = bestRequirementsMap.get(key);
      if (!existingBest || reqPriorityScore > existingBest.score) {
        bestRequirementsMap.set(key, { req, score: reqPriorityScore });
      }
    });

    const requirementsToEvaluate = Array.from(bestRequirementsMap.values()).map((v) => v.req);

    // Filter requirements using the eligibility criteria
    const eligibleReqs = requirementsToEvaluate.filter((req) => {
      // 1. Year Check
      if (req.ssc_year_min !== null && sYear < req.ssc_year_min) return false;
      if (req.ssc_year_max !== null && sYear > req.ssc_year_max) return false;
      if (req.hsc_year_min !== null && hYear < req.hsc_year_min) return false;
      if (req.hsc_year_max !== null && hYear > req.hsc_year_max) return false;

      // 2. Standard GPA Check
      if (sGpa < req.ssc_min_gpa) return false;
      if (hGpa < req.hsc_min_gpa) return false;
      if (sGpa + hGpa < req.total_min_gpa) return false;

      // 3. Without 4th Subject GPA Check
      if (req.ssc_min_gpa_without_4th !== null) {
        if (
          sGpaWithout4 === null ||
          isNaN(sGpaWithout4) ||
          sGpaWithout4 < req.ssc_min_gpa_without_4th
        ) {
          return false;
        }
      }
      if (req.hsc_min_gpa_without_4th !== null) {
        if (
          hGpaWithout4 === null ||
          isNaN(hGpaWithout4) ||
          hGpaWithout4 < req.hsc_min_gpa_without_4th
        ) {
          return false;
        }
      }
      if (req.total_min_gpa_without_4th !== null) {
        if (
          sGpaWithout4 === null ||
          hGpaWithout4 === null ||
          isNaN(sGpaWithout4) ||
          isNaN(hGpaWithout4) ||
          sGpaWithout4 + hGpaWithout4 < req.total_min_gpa_without_4th
        ) {
          return false;
        }
      }

      // 4. Subject Requirements (subject_requirements JSONB)
      const subjectReqs = parseSubjectRequirements(req.subject_requirements);
      for (const [shortCode, minGpa] of Object.entries(subjectReqs)) {
        const studentGrade = parseFloat(marks[shortCode] || "0");
        if (studentGrade < minGpa) {
          return false;
        }
      }

      // 5. Custom Checks (custom_checks JSONB Array)
      const customChecks = parseCustomChecks(req.custom_checks);
      for (const check of customChecks) {
        if (check.type === "atLeastNSubjectsWithMinGPA") {
          const matchingSubjectsCount = (check.subjects || []).filter(
            (subCode: string) => parseFloat(marks[subCode] || "0") >= (check.gpa || 0),
          ).length;
          if (matchingSubjectsCount < (check.count || 0)) {
            return false;
          }
        } else if (check.type === "remainingSubjectsWithMinGPA") {
          const atLeastNRule = customChecks.find(
            (c) =>
              c.type === "atLeastNSubjectsWithMinGPA" &&
              (c.subjects || []).some((s: string) => (check.subjects || []).includes(s)),
          );

          if (atLeastNRule) {
            const grades = (check.subjects || [])
              .map((subCode: string) => parseFloat(marks[subCode] || "0"))
              .sort((a: number, b: number) => b - a);

            const countThreshold = atLeastNRule.count || 0;
            const remainingGrades = grades.slice(countThreshold);
            const allPassed = remainingGrades.every((g: number) => g >= (check.gpa || 0));
            if (!allPassed) {
              return false;
            }
          } else {
            const allPassed = (check.subjects || []).every(
              (subCode: string) => parseFloat(marks[subCode] || "0") >= (check.gpa || 0),
            );
            if (!allPassed) {
              return false;
            }
          }
        } else if (check.type === "targetSubjectsTotalGPA") {
          const sumGpa = (check.subjects || []).reduce(
            (acc: number, subCode: string) => acc + parseFloat(marks[subCode] || "0"),
            0,
          );
          if (sumGpa < (check.minTotalGPA || 0)) {
            return false;
          }
        }
      }

      return true;
    });

    // Task 5: UI Updates (Results Grouping by Parent Institution)
    const grouped: Record<string, GroupedInstitution[]> = {};

    eligibleReqs.forEach((req) => {
      const parentInst = req.universities || req.clusters || req.colleges;
      if (!parentInst) return;

      const key = parentInst.id;
      let instType: "university" | "cluster" | "college" = "university";
      if (req.clusters) instType = "cluster";
      else if (req.colleges) instType = "college";

      // 1. Group Keys Assignment
      let groupKey = "other";
      if (req.clusters) {
        groupKey = "cluster";
      } else if (req.universities) {
        const cat = req.universities.category?.toLowerCase();
        if (cat === "public" || cat === "international") {
          const firstSubId = req.universities.sub_category?.[0];
          groupKey = (firstSubId && subCategoryMap[firstSubId]?.short_code) || "general";
        } else {
          groupKey = "other";
        }
      } else if (req.colleges) {
        groupKey = "affiliated";
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }

      let existingInst = grouped[groupKey].find((inst) => inst.id === key);
      if (!existingInst) {
        existingInst = {
          id: parentInst.id,
          name_en: parentInst.name_en,
          name_bn: parentInst.name_bn,
          logo_url: parentInst.logo_url,
          category: req.universities?.category || null,
          cluster_type: req.clusters?.cluster_type || null,
          type: instType,
          slug: (parentInst as any).slug || null,
          website_url: (parentInst as any).website_url || null,
          admission_url: (parentInst as any).admission_url || null,
          institution_links: (parentInst as any).institution_links || null,
          eligibleUnits: [],
          batchNames: new Set<string>(),
        };
        grouped[groupKey].push(existingInst);
      }

      // Extract and track unique batches
      const validBatches =
        req.unit_requirement_batches?.map((urb: any) => urb.batches?.name).filter(Boolean) || [];
      validBatches.forEach((batchName: string) => {
        existingInst!.batchNames.add(batchName);
      });

      // Avoid duplicate unit listings
      if (!existingInst.eligibleUnits.some((unit) => unit.id === req.unit_id)) {
        existingInst.eligibleUnits.push({
          id: req.unit_id,
          unit_name_bn: req.admission_units?.unit_name_bn || "Unknown Unit",
          unit_slug: req.admission_units?.unit_slug || "",
          requirement_text: req.requirement_text,
          primary_group_id: req.admission_units?.primary_group_id || null,
          subject_group_seats: req.admission_units?.subject_group_seats || null,
        });
      }
    });

    // 4. CRITICAL: Cluster Internal Sub-sorting (University vs College)
    if (grouped["cluster"]) {
      grouped["cluster"].sort((a, b) => {
        const aVal = a.cluster_type === "university" ? 1 : 0;
        const bVal = b.cluster_type === "university" ? 1 : 0;
        return bVal - aVal; // university (1) on top, college (0) at bottom
      });
    }

    return grouped;
  }, [
    requirements,
    selectedGroupId,
    sscGpa,
    hscGpa,
    sscYear,
    hscYear,
    exclude4thSubject,
    sscGpaWithout4th,
    hscGpaWithout4th,
    marks,
    subCategoryMap,
  ]);

  const totalInstitutionCount = useMemo(() => {
    if (!groupedEligibleResults) return 0;
    return Object.values(groupedEligibleResults).reduce((acc, list) => acc + list.length, 0);
  }, [groupedEligibleResults]);

  const handleReset = () => {
    setSelectedGroupId("");
    setExclude4thSubject(false);
    setSscGpa("");
    setHscGpa("");
    setSscYear("");
    setHscYear("");
    setSscGpaWithout4th("");
    setHscGpaWithout4th("");
    setMarks({});
    localStorage.removeItem("eligibility_checker_inputs");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow font-bengali">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <SimplePageHeader
              title="এলিজিবিলিটি চেকার"
              description="আপনার এসএসসি ও এইচএসসি পরীক্ষার তথ্য প্রদান করে কোন কোন পাবলিক বিশ্ববিদ্যালয়, গুচ্ছ বা কলেজে আবেদন করতে পারবেন তা সহজে দেখে নিন।"
            />
          </div>

          {loadingDb ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-semibold">
                তথ্য লোড করা হচ্ছে, দয়া করে অপেক্ষা করুন...
              </p>
            </div>
          ) : dbError ? (
            <Card className="border-destructive/30 bg-destructive/5 text-center p-8 max-w-lg mx-auto">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-bold text-lg mb-2">ডাটাবেজ ত্রুটি</p>
              <p className="text-muted-foreground text-sm">{dbError}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form Section */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="shadow-lg border-border/80">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Award className="text-primary h-5 w-5" /> আপনার শিক্ষাগত তথ্য
                      </CardTitle>
                      <CardDescription className="text-xs">
                        সঠিকভাবে জিপিএ ও পাশের সাল সিলেক্ট করুন।
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleReset}
                      title="পুনরায় শুরু করুন"
                      className="rounded-full h-8 w-8 hover:bg-muted text-muted-foreground transition-all duration-200"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Dynamic Group Selector */}
                    <div className="space-y-2.5">
                      <Label className="text-sm font-bold text-foreground">
                        এইচএসসি গ্রুপ নির্বাচন করুন
                      </Label>
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {groups.map((group) => (
                          <div
                            key={group.id}
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              // Reset subject marks when group changes
                              setMarks({});
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none text-center relative w-full",
                              selectedGroupId === group.id
                                ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                                : "border-border bg-card hover:bg-accent text-muted-foreground",
                            )}
                          >
                            <span className="text-xs sm:text-sm truncate w-full">
                              {group.name_bn}
                            </span>
                            <span className="text-[9px] sm:text-[10px] opacity-75 mt-0.5 truncate w-full">
                              {group.name_en}
                            </span>
                            {selectedGroupId === group.id && (
                              <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center text-white p-0.5">
                                <Check className="h-2 w-2 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Standard GPA Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sscGpa" className="text-xs font-semibold">
                          SSC GPA (৪র্থ বিষয় সহ)
                        </Label>
                        <Input
                          id="sscGpa"
                          type="number"
                          placeholder="5.00"
                          step="0.01"
                          min="1.00"
                          max="5.00"
                          value={sscGpa}
                          onChange={(e) => setSscGpa(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="hscGpa" className="text-xs font-semibold">
                          HSC GPA (৪র্থ বিষয় সহ)
                        </Label>
                        <Input
                          id="hscGpa"
                          type="number"
                          placeholder="5.00"
                          step="0.01"
                          min="1.00"
                          max="5.00"
                          value={hscGpa}
                          onChange={(e) => setHscGpa(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Passing Years */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sscYear" className="text-xs font-semibold">
                          SSC পাশের সাল
                        </Label>
                        <Select value={sscYear} onValueChange={setSscYear}>
                          <SelectTrigger id="sscYear">
                            <SelectValue placeholder="নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {passingYears.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="hscYear" className="text-xs font-semibold">
                          HSC পাশের সাল
                        </Label>
                        <Select value={hscYear} onValueChange={setHscYear}>
                          <SelectTrigger id="hscYear">
                            <SelectValue placeholder="নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {passingYears.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 4th Subject Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                      <div className="space-y-0.5 text-left pr-4">
                        <Label
                          htmlFor="exclude-4th-subject"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          GPA without 4th subject
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          কিছু বিশ্ববিদ্যালয়ে (যেমন: কৃষি) ৪র্থ বিষয় ছাড়া আলাদা GPA চায়
                        </p>
                      </div>
                      <Switch
                        id="exclude-4th-subject"
                        checked={exclude4thSubject}
                        onCheckedChange={setExclude4thSubject}
                      />
                    </div>

                    {/* Conditional 4th subject inputs */}
                    {exclude4thSubject && (
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="sscGpaWithout4th"
                            className="text-xs font-semibold text-primary"
                          >
                            SSC GPA (৪র্থ বিষয় ছাড়া)
                          </Label>
                          <Input
                            id="sscGpaWithout4th"
                            type="number"
                            placeholder="e.g. 4.50"
                            step="0.01"
                            min="1.00"
                            max="5.00"
                            value={sscGpaWithout4th}
                            onChange={(e) => setSscGpaWithout4th(e.target.value)}
                            className="border-primary/30 focus-visible:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="hscGpaWithout4th"
                            className="text-xs font-semibold text-primary"
                          >
                            HSC GPA (৪র্থ বিষয় ছাড়া)
                          </Label>
                          <Input
                            id="hscGpaWithout4th"
                            type="number"
                            placeholder="e.g. 4.30"
                            step="0.01"
                            min="1.00"
                            max="5.00"
                            value={hscGpaWithout4th}
                            onChange={(e) => setHscGpaWithout4th(e.target.value)}
                            className="border-primary/30 focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dynamic Subject Grade Section */}
                {selectedGroupId && (
                  <Card className="shadow-lg border-border/80 animate-in fade-in duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BookOpen className="text-primary h-4.5 w-4.5" /> বিষয়ভিত্তিক গ্রেড (HSC)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        বিশেষ বিষয়ভিত্তিক যোগ্যতা মূল্যায়নের জন্য আপনার সঠিক জিপিএ/গ্রেড ইনপুট দিন।
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingSubjects ? (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-muted-foreground">বিষয় লোড হচ্ছে...</span>
                        </div>
                      ) : dynamicSubjects.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-4">
                          এই গ্রুপের জন্য কোনো বিষয় তালিকাভুক্ত নেই।
                        </p>
                      ) : (
                        (() => {
                          const COMMON_SUBJECT_CODES = ["bn", "e", "i"];
                          const groupSpecificSubjects = dynamicSubjects.filter(
                            (sub) => !COMMON_SUBJECT_CODES.includes(sub.short_code.toLowerCase()),
                          );
                          const commonSubjects = dynamicSubjects.filter((sub) =>
                            COMMON_SUBJECT_CODES.includes(sub.short_code.toLowerCase()),
                          );

                          return (
                            <div className="space-y-4">
                              {groupSpecificSubjects.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {groupSpecificSubjects.map((sub) => (
                                    <div key={sub.id} className="flex flex-col gap-1 text-left">
                                      <Label
                                        htmlFor={`sub-${sub.short_code}`}
                                        className="text-xs font-medium truncate"
                                      >
                                        {sub.name_bn || sub.name_en} ({sub.short_code})
                                      </Label>
                                      <Select
                                        value={marks[sub.short_code] || ""}
                                        onValueChange={(val) =>
                                          setMarks((prev) => ({ ...prev, [sub.short_code]: val }))
                                        }
                                      >
                                        <SelectTrigger id={`sub-${sub.short_code}`} className="h-9">
                                          <SelectValue placeholder="সিলেক্ট গ্রেড" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="5.0">A+ (5.00)</SelectItem>
                                          <SelectItem value="4.0">A (4.00)</SelectItem>
                                          <SelectItem value="3.5">A- (3.50)</SelectItem>
                                          <SelectItem value="3.0">B (3.00)</SelectItem>
                                          <SelectItem value="2.0">C (2.00)</SelectItem>
                                          <SelectItem value="1.0">D (1.00)</SelectItem>
                                          <SelectItem value="0.0">F (0.00)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {groupSpecificSubjects.length > 0 && commonSubjects.length > 0 && (
                                <hr className="border-t border-border/60 my-4" />
                              )}

                              {commonSubjects.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {commonSubjects.map((sub) => (
                                    <div key={sub.id} className="flex flex-col gap-1 text-left">
                                      <Label
                                        htmlFor={`sub-${sub.short_code}`}
                                        className="text-xs font-medium truncate"
                                      >
                                        {sub.name_bn || sub.name_en} ({sub.short_code})
                                      </Label>
                                      <Select
                                        value={marks[sub.short_code] || ""}
                                        onValueChange={(val) =>
                                          setMarks((prev) => ({ ...prev, [sub.short_code]: val }))
                                        }
                                      >
                                        <SelectTrigger id={`sub-${sub.short_code}`} className="h-9">
                                          <SelectValue placeholder="সিলেক্ট গ্রেড" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="5.0">A+ (5.00)</SelectItem>
                                          <SelectItem value="4.0">A (4.00)</SelectItem>
                                          <SelectItem value="3.5">A- (3.50)</SelectItem>
                                          <SelectItem value="3.0">B (3.00)</SelectItem>
                                          <SelectItem value="2.0">C (2.00)</SelectItem>
                                          <SelectItem value="1.0">D (1.00)</SelectItem>
                                          <SelectItem value="0.0">F (0.00)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Results Section */}
              <div className="lg:col-span-7 space-y-6">
                {groupedEligibleResults === null ? (
                  // Initial / Empty State
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center flex flex-col items-center justify-center">
                    <Search className="h-14 w-14 text-muted-foreground/30 mb-4 animate-pulse" />
                    <h3 className="font-bold text-lg text-foreground font-bengali mb-1.5">
                      এলিজিবিলিটি ফলাফল দেখতে তথ্য দিন
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      বাম পাশের ফর্মে আপনার গ্রুপ, এসএসসি ও এইচএসসি পরীক্ষার জিপিএ এবং পাশের বছরসমূহ সঠিকভাবে
                      ইনপুট দিলে স্বয়ংক্রিয়ভাবে আপনার জন্য উপযুক্ত বিশ্ববিদ্যালয় ও ইউনিটগুলোর তালিকা এখানে দৃশ্যমান
                      হবে।
                    </p>
                  </div>
                ) : totalInstitutionCount === 0 ? (
                  // No results state
                  <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <AlertCircle className="h-14 w-14 text-destructive/50 mb-4" />
                    <h3 className="font-bold text-lg text-destructive font-bengali mb-1.5">
                      কোনো যোগ্য ইউনিট পাওয়া যায়নি
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                      দুঃখিত, আপনার প্রদত্ত জিপিএ এবং বিষয়ভিত্তিক গ্রেডের সাথে সামঞ্জস্যপূর্ণ কোনো বিশ্ববিদ্যালয় বা
                      ইউনিটের আবেদনের যোগ্যতা পূরণ হয়নি। তথ্যগুলো পুনরায় চেক করুন।
                    </p>
                  </div>
                ) : (
                  // Eligible Units Grouped by category and parent institution
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                      <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" /> যোগ্য প্রতিষ্ঠান ও
                        ইউনিটসমূহ ({totalInstitutionCount}টি)
                      </h3>
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold w-fit">
                        আবেদনের সুযোগ রয়েছে
                      </span>
                    </div>
                    {groupSortOrder.map((catKey) => {
                      const list = groupedEligibleResults[catKey] || [];
                      if (list.length === 0) return null;

                      const mapping = categoryMapping[catKey] || { label: catKey, icon: Info };
                      const IconComponent = mapping.icon;

                      return (
                        <div key={catKey} className="space-y-4">
                          {/* Category Header */}
                          <div className="flex items-center gap-2 border-b pb-2 mb-3">
                            <IconComponent className="h-5 w-5 text-primary shrink-0" />
                            <h3 className="font-bold text-base text-foreground font-bengali">
                              {mapping.label} ({list.length})
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {list.map((inst) => {
                              const batchText = Array.from(inst.batchNames).join(", ");
                              const nativeUnits = inst.eligibleUnits.filter(
                                (unit) => unit.primary_group_id === selectedGroupId,
                              );
                              const groupChangeUnits = inst.eligibleUnits.filter(
                                (unit) => unit.primary_group_id !== selectedGroupId,
                              );
                              const links = inst.institution_links || [];
                              const circularLink = links.find((l) => l.label === "সার্কুলার");
                              const qbLink = links.find((l) => l.label === "প্রশ্নব্যাংক");
                              const detailsUrl = inst.slug ? `/${inst.type}/${inst.slug}` : "#";
                              const hasExtraLinks = !!(circularLink || qbLink);

                              return (
                                <div key={inst.id} className="relative pt-4 mt-2">
                                  {batchText && (
                                    <Badge
                                      variant="outline"
                                      className="absolute top-1 left-4 z-10 bg-background text-xs font-semibold px-2.5 py-0.5 rounded-full border border-border shadow-none hover:shadow-none hover:scale-100 hover:bg-background font-bengali text-primary"
                                    >
                                      {batchText} ব্যাচের তথ্য অনুসারে
                                    </Badge>
                                  )}
                                  <Card className="shadow-sm hover:shadow-md transition-shadow border-border/80 overflow-hidden text-left">
                                    <CardHeader className="bg-muted/15 p-4 flex flex-col gap-0.5">
                                      <div className="flex flex-row items-start gap-3 w-full">
                                        {inst.logo_url ? (
                                          <img
                                            src={inst.logo_url}
                                            alt={inst.name_en}
                                            className="h-11 w-11 rounded-lg border bg-white object-contain p-1 shrink-0 mt-0.5"
                                          />
                                        ) : inst.type === "cluster" ? (
                                          <div className="h-11 w-11 rounded-lg border bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                                            <GraduationCap className="h-6 w-6 text-primary" />
                                          </div>
                                        ) : (
                                          <div className="h-11 w-11 rounded-lg border bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                                            <Building className="h-6 w-6 text-primary" />
                                          </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <h4 className="font-bold text-base text-foreground truncate">
                                              {inst.name_bn || inst.name_en}
                                            </h4>
                                            {inst.type === "cluster" && (
                                              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                                                গুচ্ছ{" "}
                                                {inst.cluster_type ? `(${inst.cluster_type})` : ""}
                                              </span>
                                            )}
                                            {inst.category &&
                                              inst.category !== "public" &&
                                              inst.category !== "private" &&
                                              inst.category !== "international" && (
                                                <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                                                  {inst.category === "engineering"
                                                    ? "প্রকৌশল"
                                                    : inst.category === "general"
                                                      ? "সাধারণ ও বিজ্ঞান প্রযুক্তি"
                                                      : inst.category === "agriculture"
                                                        ? "কৃষি"
                                                        : inst.category}
                                                </span>
                                              )}
                                          </div>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {inst.name_en}
                                          </p>

                                          {!hasExtraLinks && inst.slug && (
                                            <div className="flex flex-wrap items-center mt-0.5 font-bengali">
                                              <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-muted-foreground hover:text-primary px-2 font-medium"
                                              >
                                                <a href={detailsUrl}>
                                                  বিস্তারিত <ArrowRight className="w-4 h-4 ml-1.5" />
                                                </a>
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {hasExtraLinks && (
                                        <div className="flex flex-wrap items-center mt-0.5 pl-0 font-bengali">
                                          {circularLink && (
                                            <>
                                              <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-muted-foreground hover:text-primary px-2 font-medium"
                                              >
                                                <a
                                                  href={circularLink.url}
                                                  target={
                                                    circularLink.is_external ? "_blank" : "_self"
                                                  }
                                                  rel={
                                                    circularLink.is_external
                                                      ? "noopener noreferrer"
                                                      : undefined
                                                  }
                                                >
                                                  <FileText className="w-4 h-4 mr-1.5" /> সার্কুলার
                                                </a>
                                              </Button>
                                              <span className="text-muted-foreground/30 mx-1">
                                                |
                                              </span>
                                            </>
                                          )}

                                          {qbLink && (
                                            <>
                                              <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-muted-foreground hover:text-primary px-2 font-medium"
                                              >
                                                <a
                                                  href={qbLink.url}
                                                  target={qbLink.is_external ? "_blank" : "_self"}
                                                  rel={
                                                    qbLink.is_external
                                                      ? "noopener noreferrer"
                                                      : undefined
                                                  }
                                                >
                                                  <BookOpen className="w-4 h-4 mr-1.5" /> প্রশ্নব্যাংক
                                                </a>
                                              </Button>
                                              <span className="text-muted-foreground/30 mx-1">
                                                |
                                              </span>
                                            </>
                                          )}

                                          {inst.slug && (
                                            <Button
                                              asChild
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 text-muted-foreground hover:text-primary px-2 font-medium"
                                            >
                                              <a href={detailsUrl}>
                                                বিস্তারিত <ArrowRight className="w-4 h-4 ml-1.5" />
                                              </a>
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                      {nativeUnits.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {nativeUnits.map((unit) => {
                                            const instSlugLower = inst.slug
                                              ? inst.slug.toLowerCase()
                                              : "";
                                            const isSingleUnitFallback =
                                              instSlugLower &&
                                              (unit.unit_slug.toLowerCase() === instSlugLower ||
                                                unit.unit_name_bn.toLowerCase() === instSlugLower);
                                            const displayName = isSingleUnitFallback
                                              ? "একক/মূল ইউনিট"
                                              : unit.unit_name_bn;

                                            const seatRecord = unit.subject_group_seats?.find(
                                              (s) => s.group_id === selectedGroupId,
                                            );
                                            const seatCount = seatRecord
                                              ? seatRecord.seat_count
                                              : getSeatCountForUnit(unit.id);

                                            return (
                                              <div
                                                key={unit.id}
                                                className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent/40 transition-colors"
                                              >
                                                <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                                  <Check className="h-3 w-3 stroke-[3]" />
                                                </div>
                                                <div className="min-w-0">
                                                  <h5 className="font-semibold text-sm text-foreground leading-tight">
                                                    {displayName}{" "}
                                                    {seatCount ? `(আসন: ${seatCount}টি)` : ""}
                                                  </h5>
                                                  {unit.requirement_text && (
                                                    <p
                                                      className="text-[10px] text-muted-foreground mt-1 line-clamp-2"
                                                      title={unit.requirement_text}
                                                    >
                                                      * {unit.requirement_text}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {groupChangeUnits.length > 0 && (
                                        <div className="space-y-2.5 pt-3 border-t border-border/40">
                                          <p className="text-xs font-bold text-muted-foreground font-bengali">
                                            {selectedGroupName} বিভাগ থেকে নিচের ইউনিটগুলোতেও পরীক্ষা
                                            দিতে পারবেন:
                                          </p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {groupChangeUnits.map((unit) => {
                                              const instSlugLower = inst.slug
                                                ? inst.slug.toLowerCase()
                                                : "";
                                              const isSingleUnitFallback =
                                                instSlugLower &&
                                                (unit.unit_slug.toLowerCase() === instSlugLower ||
                                                  unit.unit_name_bn.toLowerCase() ===
                                                    instSlugLower);
                                              const displayName = isSingleUnitFallback
                                                ? "একক/মূল ইউনিট"
                                                : unit.unit_name_bn;

                                              const seatRecord = unit.subject_group_seats?.find(
                                                (s) => s.group_id === selectedGroupId,
                                              );
                                              const seatCount = seatRecord
                                                ? seatRecord.seat_count
                                                : getSeatCountForUnit(unit.id);

                                              return (
                                                <div
                                                  key={unit.id}
                                                  className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent/40 transition-colors"
                                                >
                                                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check className="h-3 w-3 stroke-[3]" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <h5 className="font-semibold text-sm text-foreground leading-tight">
                                                      {displayName}{" "}
                                                      {seatCount ? `(আসন: ${seatCount}টি)` : ""}
                                                    </h5>
                                                    {unit.requirement_text && (
                                                      <p
                                                        className="text-[10px] text-muted-foreground mt-1 line-clamp-2"
                                                        title={unit.requirement_text}
                                                      >
                                                        * {unit.requirement_text}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
