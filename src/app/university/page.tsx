import { useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { getEntityPageData, fetchClusterUniversities } from "@/lib/university-queries";
import type { EntityType } from "@/lib/entity-types";
import { ENTITY_LABELS } from "@/lib/entity-types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GraduationCap, Home, ChevronRight } from "lucide-react";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

import PageHeaderCard from "@/components/university/PageHeaderCard";
import UniversityFloatingDock from "@/components/university/UniversityFloatingDock";
import QuickLinks from "@/components/university/QuickLinks";
import HistoryAndMap from "@/components/university/HistoryAndMap";
import DynamicCountdown from "@/components/university/DynamicCountdown";
import CircularSection from "@/components/university/CircularSection";
import QuestionBankSection from "@/components/university/QuestionBankSection";
import DynamicAdmissionInfo from "@/components/university/DynamicAdmissionInfo";
import DynamicSeatInfo from "@/components/university/DynamicSeatInfo";
import ClusterUniversityList from "@/components/university/ClusterUniversityList";

export default function UniversityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();

  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");

  const entityType: EntityType = pathname.includes("/college/")
    ? "college"
    : pathname.includes("/cluster/")
      ? "cluster"
      : "university";

  const labelBn = ENTITY_LABELS[entityType].bn;

  const {
    data: pageData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["institution-page", entityType, slug],
    queryFn: () => getEntityPageData(slug!, entityType),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const entityId = pageData?.university?.id;

  const { data: clusterUniversities = [] } = useQuery({
    queryKey: ["cluster-universities", entityId],
    queryFn: () => fetchClusterUniversities(entityId!),
    enabled: !!entityId && entityType === "cluster",
    staleTime: 5 * 60 * 1000,
  });

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // --- Not Found ---
  if (isError || !pageData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <GraduationCap className="h-16 w-16 opacity-30" />
        <h2 className="text-xl font-bold font-bengali">{labelBn} পাওয়া যায়নি</h2>
        <p className="text-sm font-bengali">
          দুঃখিত, এই স্লাগের সাথে মিলে এমন কোনো {labelBn.toLowerCase()} নেই।
        </p>
      </div>
    );
  }

  const {
    university,
    units,
    circulars,
    links,
    general_info,
    map_locations,
    dynamic_notes,
    available_batches = [],
    total_seats,
    total_units,
  } = pageData;

  // Calculate total subjects count across all units
  const totalSubjects = units.reduce((sum, u) => sum + u.subjects.length, 0);

  return (
    <>
      <Helmet>
        <title>
          {university.name_bn}
          {university.short_name ? ` (${university.short_name})` : ""} — {labelBn} ভর্তি তথ্য
        </title>
        <meta
          name="description"
          content={
            university.description ||
            `${university.name_bn} ভর্তি পরীক্ষার সকল তথ্য — আবেদন, সিট সংখ্যা, পরীক্ষার সময়সূচী এবং আরও অনেক কিছু।`
          }
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Header />

        {/* Floating Dock */}
        <UniversityFloatingDock
          hasCirculars={circulars.length > 0}
          hasLinks={links.length > 0}
          hasGeneralInfo={general_info.length > 0}
          hasHistory={!!university.history}
          hasMap={map_locations.length > 0}
          availableBatches={available_batches}
          selectedBatchFilter={selectedBatchFilter}
          onBatchFilterChange={setSelectedBatchFilter}
        />

        {/* Main content container — matching legacy: container mx-auto px-2 lg:px-44 */}
        <main className="grow container mx-auto px-2 lg:px-44">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground pt-6 sm:pt-8 pb-2 font-bengali flex-wrap">
            <Link to="/" className="flex items-center hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              হোম
            </Link>

            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />

            <Link
              to="/public"
              className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
            >
              {entityType === "university"
                ? "বিশ্ববিদ্যালয়"
                : entityType === "college"
                  ? "কলেজ"
                  : "গুচ্ছ"}
            </Link>

            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />

            <span className="text-foreground font-semibold truncate">
              {university.name_bn || university.name_en}
            </span>
          </nav>

          {/* Hero / Header — with mt-10 for floating logo space */}
          <div className="mt-10">
            <section id="header">
              <PageHeaderCard
                university={university}
                totalUnits={total_units}
                totalSeats={total_seats}
                totalSubjects={totalSubjects}
                entityType={entityType}
              />
            </section>
          </div>

          {/* Quick Links */}
          {links.length > 0 && (
            <section id="Links" className="mt-4">
              <QuickLinks links={links} />
            </section>
          )}

          {/* History & Map accordions */}
          {(university.history || map_locations.length > 0) && (
            <section id="History" className="mt-4">
              <HistoryAndMap
                history={university.history || null}
                universityNameBn={university.name_bn}
                mapLocations={map_locations}
                historySource={university.history_source || null}
              />
            </section>
          )}

          {/* Countdown */}
          <section id="Countdown" className="mt-4">
            <DynamicCountdown units={units} universityNameBn={university.name_bn} />
          </section>

          {/* Circulars */}
          {circulars.length > 0 && (
            <section id="Circular" className="mt-4">
              <CircularSection circulars={circulars} units={units} />
            </section>
          )}

          {/* Question Bank */}
          {units.length > 0 && (
            <section id="QuestionBank" className="mt-4">
              <QuestionBankSection units={units} />
            </section>
          )}

          {/* Full Admission Info (আবেদন, প্রবেশপত্র, পরীক্ষা, কেন্দ্র, মানবণ্টন, ফলাফল) */}
          <section id="Info" className="mt-4">
            <DynamicAdmissionInfo
              units={units}
              generalInfo={general_info}
              university={university}
              dynamicNotes={dynamic_notes}
              availableBatches={available_batches}
              selectedBatchFilter={selectedBatchFilter}
            />
          </section>

          {/* Cluster: University list | Others: Seat Info per Subject */}
          {entityType === "cluster" ? (
            <section id="Subjects" className="mt-4 mb-12">
              <ClusterUniversityList universities={clusterUniversities} />
            </section>
          ) : (
            <section id="Subjects" className="mt-4 mb-12">
              <DynamicSeatInfo units={units} totalSeats={total_seats} />
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
