// =============================================================================
// Admin — College Management Tabs Layout
// =============================================================================

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { fetchCollegeById } from "@/lib/college-admin-queries";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ArrowLeft,
  School,
  Layers,
  BookMarked,
  MapPin,
  Link2,
  Calculator,
  Info,
  FileSpreadsheet,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import ManageUniversityUnits from "@/components/admin/ManageUniversityUnits";
import ManageUniversitySubjects from "@/components/admin/ManageUniversitySubjects";
import ManageMapLocations from "@/components/admin/ManageMapLocations";
import ManageUniversityLinks from "@/components/admin/ManageUniversityLinks";
import ManageGpaCalculationMethods from "@/components/admin/ManageGpaCalculationMethods";
import ManageUniversityGeneralInfo from "@/components/admin/ManageUniversityGeneralInfo";
import ManageUniversityRequirements from "@/components/admin/ManageUniversityRequirements";
import ManageSyllabusSubjects from "@/components/admin/ManageSyllabusSubjects";
import ManageAdmissionEvents from "@/components/admin/ManageAdmissionEvents";
import ManageUniversityMarksDistributions from "@/components/admin/ManageUniversityMarksDistributions";

export default function AdminCollegeManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch Base College Details
  const {
    data: college,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-college-base", id],
    queryFn: async () => {
      if (!id) throw new Error("College ID is required");
      return await fetchCollegeById(id);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSpinner message="কলেজের বেসিক তথ্য লোড হচ্ছে..." />;
  }

  if (isError || !college) {
    const errMsg = error instanceof Error ? error.message : "College not found";
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-destructive font-bengali">কলেজের তথ্য আনতে সমস্যা হয়েছে: {errMsg}</p>
        <Button
          onClick={() => navigate("/admin/dashboard/colleges")}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          কলেজ তালিকায় ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`ডেটা ব্যবস্থাপনা: ${college.name_bn} — অ্যাডমিন`}</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <School className="h-4 w-4" />
              <span className="font-bengali">কলেজ ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground font-bengali">{college.name_bn}</h1>
            <p className="text-xs text-muted-foreground">
              {college.name_en} • Slug: {college.slug}
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/dashboard/colleges")}
            variant="outline"
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-bengali">ফিরে যান</span>
          </Button>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="units" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start">
            <TabsTrigger
              value="units"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              ইউনিটসমূহ
            </TabsTrigger>
            <TabsTrigger
              value="subjects"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <BookMarked className="h-3.5 w-3.5 mr-1.5" />
              বিষয়সমূহ
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              যোগ্যতার শর্ত
            </TabsTrigger>
            <TabsTrigger
              value="locations"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              ম্যাপ লোকেশন
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              প্রয়োজনীয় লিংক
            </TabsTrigger>
            <TabsTrigger
              value="gpa"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <Calculator className="h-3.5 w-3.5 mr-1.5" />
              জিপিএ হিসাব
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <Info className="h-3.5 w-3.5 mr-1.5" />
              সাধারণ তথ্য
            </TabsTrigger>
            <TabsTrigger
              value="syllabus-subjects"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <BookMarked className="h-3.5 w-3.5 mr-1.5" />
              সিলেবাস সাবজেক্ট
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              ভর্তি ইভেন্টস
            </TabsTrigger>
            <TabsTrigger
              value="marks-distribution"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              মানবণ্টন
            </TabsTrigger>
          </TabsList>

          {/* Units Tab Content */}
          <TabsContent value="units" className="focus-visible:outline-none mt-4">
            {id && <ManageUniversityUnits entityId={id} entityType="college" />}
          </TabsContent>

          {/* Subjects Tab Content */}
          <TabsContent value="subjects" className="focus-visible:outline-none mt-4">
            {id && <ManageUniversitySubjects entityId={id} entityType="college" />}
          </TabsContent>

          {/* Requirements Tab Content */}
          <TabsContent value="requirements" className="focus-visible:outline-none mt-4">
            {id && <ManageUniversityRequirements entityId={id} entityType="college" />}
          </TabsContent>

          {/* Locations Tab Content */}
          <TabsContent value="locations" className="focus-visible:outline-none mt-4">
            {id && <ManageMapLocations entityId={id} entityType="college" />}
          </TabsContent>

          {/* Links Tab Content */}
          <TabsContent value="links" className="focus-visible:outline-none mt-4">
            {id && <ManageUniversityLinks entityId={id} entityType="college" />}
          </TabsContent>

          {/* GPA Calculation Tab Content */}
          <TabsContent value="gpa" className="focus-visible:outline-none mt-4">
            {id && <ManageGpaCalculationMethods entityId={id} entityType="college" />}
          </TabsContent>

          {/* General Info Tab Content */}
          <TabsContent value="info" className="focus-visible:outline-none mt-4">
            {id && <ManageUniversityGeneralInfo entityId={id} entityType="college" />}
          </TabsContent>

          {/* Syllabus Subjects Tab */}
          <TabsContent value="syllabus-subjects" className="focus-visible:outline-none mt-4">
            {id && <ManageSyllabusSubjects entityId={id} entityType="college" />}
          </TabsContent>

          {/* Admission Events Tab */}
          <TabsContent value="events" className="focus-visible:outline-none mt-4">
            {id && <ManageAdmissionEvents entityId={id} entityType="college" />}
          </TabsContent>

          {/* Marks Distribution Tab */}
          <TabsContent value="marks-distribution" className="focus-visible:outline-none mt-4">
            {id && <ManageUniversityMarksDistributions entityId={id} entityType="college" />}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
