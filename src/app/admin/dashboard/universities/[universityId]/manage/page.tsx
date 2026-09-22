// =============================================================================
// Admin — University Management Tabs Layout (Phase 2 & Phase 3)
// =============================================================================

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { fetchUniversityById, fetchUniversityBySlug } from "@/lib/university-admin-queries";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ArrowLeft,
  Building2,
  Layers,
  BookMarked,
  MapPin,
  Link2,
  Calculator,
  Info,
  Users,
  FileSpreadsheet,
  Calendar,
  BarChart3,
} from "lucide-react";

import ManageUniversityMarksDistributions from "@/components/admin/ManageUniversityMarksDistributions";

import ManageUniversityUnits from "@/components/admin/ManageUniversityUnits";
import ManageUniversitySubjects from "@/components/admin/ManageUniversitySubjects";
import ManageMapLocations from "@/components/admin/ManageMapLocations";
import ManageUniversityLinks from "@/components/admin/ManageUniversityLinks";
import ManageGpaCalculationMethods from "@/components/admin/ManageGpaCalculationMethods";
import ManageUniversityGeneralInfo from "@/components/admin/ManageUniversityGeneralInfo";

// Phase 3 Components
import ManageUniversitySeats from "@/components/admin/ManageUniversitySeats";
import ManageUniversityRequirements from "@/components/admin/ManageUniversityRequirements";
import ManageAdmissionEvents from "@/components/admin/ManageAdmissionEvents";
import ManageSyllabusSubjects from "@/components/admin/ManageSyllabusSubjects";

export default function AdminUniversityManagePage() {
  const { universitySlug } = useParams<{ universitySlug: string }>();
  const navigate = useNavigate();

  // Fetch Base University Details by slug
  const {
    data: university,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-university-base", universitySlug],
    queryFn: async () => {
      if (!universitySlug) throw new Error("University slug is required");
      return await fetchUniversityBySlug(universitySlug);
    },
    enabled: !!universitySlug,
  });

  if (isLoading) {
    return <LoadingSpinner message="বিশ্ববিদ্যালয়ের বেসিক তথ্য লোড হচ্ছে..." />;
  }

  if (isError || !university) {
    const errMsg = error instanceof Error ? error.message : "University not found";
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-destructive font-bengali">বিশ্ববিদ্যালয়ের তথ্য আনতে সমস্যা হয়েছে: {errMsg}</p>
        <Button
          onClick={() => navigate("/admin/dashboard/universities")}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          বিশ্ববিদ্যালয় তালিকায় ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`ডেটা ব্যবস্থাপনা: ${university.name_bn} — অ্যাডমিন`}</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building2 className="h-4 w-4" />
              <span className="font-bengali">বিশ্ববিদ্যালয় ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground font-bengali">
              {university.name_bn}
            </h1>
            <p className="text-xs text-muted-foreground">
              {university.name_en} • Slug: {university.slug}
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/dashboard/universities")}
            variant="outline"
            className="gap-1.5 font-bengali w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            তালিকায় ফিরে যান
          </Button>
        </div>

        {/* Dynamic Nested Tabs */}
        <Tabs defaultValue="units" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex flex-wrap gap-1 p-1 bg-muted/50 border border-border rounded-lg">
            <TabsTrigger value="units" className="gap-1.5 py-2 font-bengali">
              <Layers className="h-4 w-4" />
              ইউনিট
            </TabsTrigger>
            <TabsTrigger value="subjects" className="gap-1.5 py-2 font-bengali">
              <BookMarked className="h-4 w-4" />
              বিষয়সমূহ
            </TabsTrigger>
            <TabsTrigger value="seats" className="gap-1.5 py-2 font-bengali">
              <Users className="h-4 w-4" />
              আসন সংখ্যা
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1.5 py-2 font-bengali">
              <MapPin className="h-4 w-4" />
              ম্যাপ লোকেশন
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5 py-2 font-bengali">
              <Link2 className="h-4 w-4" />
              লিংক সমূহ
            </TabsTrigger>
            <TabsTrigger value="gpa" className="gap-1.5 py-2 font-bengali">
              <Calculator className="h-4 w-4" />
              GPA ক্যালকুলেশন
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5 py-2 font-bengali">
              <Info className="h-4 w-4" />
              সাধারণ তথ্য
            </TabsTrigger>

            {/* Phase 3 Tabs */}
            <TabsTrigger value="requirements" className="gap-1.5 py-2 font-bengali">
              <FileSpreadsheet className="h-4 w-4" />
              যোগ্যতার শর্ত
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1.5 py-2 font-bengali">
              <Calendar className="h-4 w-4" />
              ভর্তি ইভেন্টস
            </TabsTrigger>
            <TabsTrigger value="marks-distribution" className="gap-1.5 py-2 font-bengali">
              <BarChart3 className="h-4 w-4" />
              মানবণ্টন
            </TabsTrigger>
            <TabsTrigger value="syllabus-subjects" className="gap-1.5 py-2 font-bengali">
              <BookMarked className="h-4 w-4" />
              সিলেবাস সাবজেক্ট
            </TabsTrigger>
          </TabsList>

          {/* Units Tab Content */}
          <TabsContent value="units" className="focus-visible:outline-none">
            {university && (
              <ManageUniversityUnits entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          {/* Subjects Tab Content */}
          <TabsContent value="subjects" className="focus-visible:outline-none">
            {university && (
              <ManageUniversitySubjects entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          {/* Seats Tab Content */}
          <TabsContent value="seats" className="focus-visible:outline-none">
            {university && <ManageUniversitySeats universityId={university.id} />}
          </TabsContent>

          {/* Locations Tab Content */}
          <TabsContent value="locations" className="focus-visible:outline-none">
            {university && <ManageMapLocations entityId={university.id} entityType="university" />}
          </TabsContent>

          {/* Links Tab Content */}
          <TabsContent value="links" className="focus-visible:outline-none">
            {university && (
              <ManageUniversityLinks entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          {/* GPA Calculation Tab Content */}
          <TabsContent value="gpa" className="focus-visible:outline-none">
            {university && (
              <ManageGpaCalculationMethods entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          {/* General Info Tab Content */}
          <TabsContent value="info" className="focus-visible:outline-none">
            {university && (
              <ManageUniversityGeneralInfo entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          {/* Phase 3 Tab Contents */}
          <TabsContent value="requirements" className="focus-visible:outline-none">
            {university && (
              <ManageUniversityRequirements entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          <TabsContent value="events" className="focus-visible:outline-none">
            {university && (
              <ManageAdmissionEvents entityId={university.id} entityType="university" />
            )}
          </TabsContent>

          <TabsContent value="marks-distribution" className="focus-visible:outline-none">
            {university && (
              <ManageUniversityMarksDistributions
                entityId={university.id}
                entityType="university"
              />
            )}
          </TabsContent>

          {/* Syllabus Subjects Tab */}
          <TabsContent value="syllabus-subjects" className="focus-visible:outline-none">
            {university && (
              <ManageSyllabusSubjects entityId={university.id} entityType="university" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
