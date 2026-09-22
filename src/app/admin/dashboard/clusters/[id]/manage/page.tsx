// =============================================================================
// Admin — Cluster Management Tabs Layout
// =============================================================================

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { fetchClusterBySlug } from "@/lib/cluster-admin-queries";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ArrowLeft,
  Network,
  Layers,
  BookMarked,
  MapPin,
  Link2,
  Calculator,
  Info,
  Building2,
  FileSpreadsheet,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import ManageUniversityUnits from "@/components/admin/ManageUniversityUnits";
import ManageMapLocations from "@/components/admin/ManageMapLocations";
import ManageUniversityLinks from "@/components/admin/ManageUniversityLinks";
import ManageGpaCalculationMethods from "@/components/admin/ManageGpaCalculationMethods";
import ManageUniversityGeneralInfo from "@/components/admin/ManageUniversityGeneralInfo";
import ClusterInstitutionsManagement from "@/components/admin/ClusterInstitutionsManagement";
import ManageUniversityRequirements from "@/components/admin/ManageUniversityRequirements";
import ManageSyllabusSubjects from "@/components/admin/ManageSyllabusSubjects";
import ManageAdmissionEvents from "@/components/admin/ManageAdmissionEvents";
import ManageUniversityMarksDistributions from "@/components/admin/ManageUniversityMarksDistributions";

export default function AdminClusterManagePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Fetch Base Cluster Details
  const {
    data: cluster,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-cluster-base", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Cluster slug is required");
      return await fetchClusterBySlug(slug);
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <LoadingSpinner message="গুচ্ছের বেসিক তথ্য লোড হচ্ছে..." />;
  }

  if (isError || !cluster) {
    const errMsg = error instanceof Error ? error.message : "Cluster not found";
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-destructive font-bengali">গুচ্ছের তথ্য আনতে সমস্যা হয়েছে: {errMsg}</p>
        <Button
          onClick={() => navigate("/admin/dashboard/clusters")}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          গুচ্ছ তালিকায় ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`ডেটা ব্যবস্থাপনা: ${cluster.name_bn} — অ্যাডমিন`}</title>
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Network className="h-4 w-4" />
              <span className="font-bengali">গুচ্ছ ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground font-bengali">{cluster.name_bn}</h1>
            <p className="text-xs text-muted-foreground">
              {cluster.name_en} • Slug: {cluster.slug}
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/dashboard/clusters")}
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
              value="institutions"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              প্রতিষ্ঠানসমূহ
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              ম্যাপ লোকেশন
            </TabsTrigger>

            <TabsTrigger
              value="locations"
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
              value="links"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              যোগ্যতার শর্ত
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

            <TabsTrigger
              value="syllabus-subjects"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bengali"
            >
              <BookMarked className="h-3.5 w-3.5 mr-1.5" />
              সিলেবাস সাবজেক্ট
            </TabsTrigger>
          </TabsList>

          {/* Units Tab Content */}
          <TabsContent value="units" className="focus-visible:outline-none mt-4">
            {cluster.id && <ManageUniversityUnits entityId={cluster.id} entityType="cluster" />}
          </TabsContent>

          {/* Institutions Tab Content */}
          <TabsContent value="institutions" className="focus-visible:outline-none mt-4">
            {cluster.id && (
              <ClusterInstitutionsManagement
                clusterId={cluster.id}
                clusterType={cluster.cluster_type}
              />
            )}
          </TabsContent>

          {/* Requirements Tab Content */}
          <TabsContent value="requirements" className="focus-visible:outline-none mt-4">
            {cluster.id && (
              <ManageUniversityRequirements entityId={cluster.id} entityType="cluster" />
            )}
          </TabsContent>

          {/* Locations Tab Content */}
          <TabsContent value="locations" className="focus-visible:outline-none mt-4">
            {cluster.id && <ManageMapLocations entityId={cluster.id} entityType="cluster" />}
          </TabsContent>
          {/* Links Tab Content */}
          <TabsContent value="links" className="focus-visible:outline-none mt-4">
            {cluster.id && <ManageUniversityLinks entityId={cluster.id} entityType="cluster" />}
          </TabsContent>

          {/* GPA Calculation Tab Content */}
          <TabsContent value="gpa" className="focus-visible:outline-none mt-4">
            {cluster.id && (
              <ManageGpaCalculationMethods entityId={cluster.id} entityType="cluster" />
            )}
          </TabsContent>

          {/* General Info Tab Content */}
          <TabsContent value="info" className="focus-visible:outline-none mt-4">
            {cluster.id && (
              <ManageUniversityGeneralInfo entityId={cluster.id} entityType="cluster" />
            )}
          </TabsContent>

          {/* Syllabus Subjects Tab */}
          <TabsContent value="syllabus-subjects" className="focus-visible:outline-none mt-4">
            {cluster.id && <ManageSyllabusSubjects entityId={cluster.id} entityType="cluster" />}
          </TabsContent>

          {/* Admission Events Tab */}
          <TabsContent value="events" className="focus-visible:outline-none mt-4">
            {cluster.id && <ManageAdmissionEvents entityId={cluster.id} entityType="cluster" />}
          </TabsContent>

          {/* Marks Distribution Tab */}
          <TabsContent value="marks-distribution" className="focus-visible:outline-none mt-4">
            {cluster.id && (
              <ManageUniversityMarksDistributions entityId={cluster.id} entityType="cluster" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
