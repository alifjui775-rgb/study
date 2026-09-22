import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  fetchInstitutionSubCategories,
  buildSubCategoryMap,
} from "@/lib/institution-category-queries";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import SharedPageHeader from "@/components/common/SharedPageHeader";
import QuestionBankCards, { type MasterQBStream } from "@/components/QuestionBankCards";
import { Book, Pen, Folder } from "lucide-react";
import QbFloatingDock from "@/components/common/QbFloatingDock";
import QuestionBankClient from "@/components/QuestionBankClient";
import TestPaperCard from "@/components/TestPaperCards";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { allData } from "@/lib/data";
import type { QuestionBankUniversity } from "@/components/QuestionBankUniversityCard";

export default function QuestionBankPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const allGroupsTestPapers = allData.testPapersList.allGroups;
  const scienceGroupTestPapers = allData.testPapersList.scienceGroup;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["question-bank-institutions"],
    queryFn: async () => {
      const [uniRes, clusterRes, collegeRes, unitsRes, subCatRes] = await Promise.all([
        supabase
          .from("universities")
          .select(
            "id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, description, category, sub_category",
          )
          .is("deleted_at", null),
        supabase
          .from("clusters")
          .select(
            "id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, description, cluster_type",
          )
          .is("deleted_at", null),
        supabase
          .from("colleges")
          .select(
            "id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, description, category, sub_category",
          )
          .is("deleted_at", null),
        supabase
          .from("admission_units")
          .select("id, university_id, cluster_id, college_id, unit_name_bn, sort_order")
          .is("deleted_at", null)
          .order("sort_order", { ascending: true }),
        fetchInstitutionSubCategories(),
      ]);

      if (uniRes.error) throw uniRes.error;
      if (clusterRes.error) throw clusterRes.error;
      if (collegeRes.error) throw collegeRes.error;
      if (unitsRes.error) throw unitsRes.error;

      return {
        universities: uniRes.data || [],
        clusters: clusterRes.data || [],
        colleges: collegeRes.data || [],
        units: unitsRes.data || [],
        subCategoryMap: buildSubCategoryMap(subCatRes),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: masterStreams,
    isLoading: isMasterStreamsLoading,
    isError: isMasterStreamsError,
  } = useQuery<MasterQBStream[]>({
    queryKey: ["master-qb-streams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_qb_streams")
        .select("id, slug, name_bn, short_name_bn, description, icon_url, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MasterQBStream[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const subCategoryMap = data?.subCategoryMap || {};

  // Group units by entity (university_id, cluster_id, college_id)
  const unitsByEntity: Record<string, string[]> = {};
  (data?.units || []).forEach((u) => {
    const entityId = u.university_id || u.cluster_id || u.college_id;
    if (!entityId) return;
    if (!unitsByEntity[entityId]) {
      unitsByEntity[entityId] = [];
    }
    if (u.unit_name_bn && !unitsByEntity[entityId].includes(u.unit_name_bn)) {
      unitsByEntity[entityId].push(u.unit_name_bn);
    }
  });

  const formatUnitsText = (unitNames: string[]) => {
    if (!unitNames || unitNames.length === 0) return "";
    const hasLongName = unitNames.some(
      (name) =>
        name.includes("ইউনিট") ||
        name.includes("বিভাগ") ||
        name.includes("নার্সিং") ||
        name.includes("সকল") ||
        name.length > 6,
    );
    if (hasLongName) {
      return unitNames.join(", ");
    }
    return `ইউনিট: ${unitNames.join(", ")}`;
  };

  const mappedClusters: QuestionBankUniversity[] = (data?.clusters || []).map((cluster) => {
    const isAffiliation =
      cluster.cluster_type === "affiliation" ||
      cluster.slug.includes("affiliated") ||
      cluster.slug === "tec" ||
      cluster.slug === "dcu" ||
      cluster.name_bn.includes("অধিভুক্ত");

    const categories = isAffiliation ? ["অধিভুক্ত"] : ["গুচ্ছ"];
    const unitList = unitsByEntity[cluster.id] || [];

    return {
      id: cluster.id,
      slug: cluster.slug,
      nameBn: cluster.name_bn,
      nameEn: cluster.name_en || "",
      shortName: cluster.short_name_en || cluster.short_name_bn || "",
      logo: cluster.logo_url || "",
      category: categories,
      link: `/qb/${cluster.slug}`,
      unitsText: formatUnitsText(unitList),
    };
  });

  const dbCategoryToBn: Record<string, string> = {
    engineering: "ইঞ্জিনিয়ারিং",
    engineers: "ইঞ্জিনিয়ারিং",
    eng: "ইঞ্জিনিয়ারিং",
    agri: "কৃষি",
    agriculture: "কৃষি",
    science_technology: "বিজ্ঞান ও প্রযুক্তি",
    "science-and-technology": "বিজ্ঞান ও প্রযুক্তি",
    sandt: "বিজ্ঞান ও প্রযুক্তি",
    medical: "মেডিকেল",
    special: "বিশেষ",
    islamic: "ইসলামিক",
    islami: "ইসলামিক",
    general: "সাধারণ",
    private: "প্রাইভেট",
    affiliated: "অধিভুক্ত",
    cluster: "গুচ্ছ",
  };

  const mappedUniversities: QuestionBankUniversity[] = (data?.universities || []).map((uni) => {
    const categories: string[] = [];
    if (uni.category) {
      const mappedCat = dbCategoryToBn[uni.category.toLowerCase()];
      if (mappedCat) {
        categories.push(mappedCat);
      }
    }
    if (uni.sub_category && uni.sub_category.length > 0) {
      uni.sub_category.forEach((sub: string) => {
        const mapped = subCategoryMap[sub]?.name_bn;
        if (mapped && !categories.includes(mapped)) {
          categories.push(mapped);
        }
      });
    }
    if (categories.length === 0) {
      categories.push("সাধারণ");
    }

    const unitList = unitsByEntity[uni.id] || [];

    return {
      id: uni.id,
      slug: uni.slug,
      nameBn: uni.name_bn,
      nameEn: uni.name_en || "",
      shortName: uni.short_name_en || uni.short_name_bn || "",
      logo: uni.logo_url || "",
      category: categories,
      link: `/qb/${uni.slug}`,
      unitsText: formatUnitsText(unitList),
    };
  });

  const mappedColleges: QuestionBankUniversity[] = (data?.colleges || []).map((col) => {
    const categories: string[] = [];
    if (col.category) {
      const mappedCat = dbCategoryToBn[col.category.toLowerCase()];
      if (mappedCat) {
        categories.push(mappedCat);
      }
    }
    if (col.sub_category && col.sub_category.length > 0) {
      col.sub_category.forEach((sub: string) => {
        const mapped = subCategoryMap[sub]?.name_bn;
        if (mapped && !categories.includes(mapped)) {
          categories.push(mapped);
        }
      });
    }
    if (categories.length === 0) {
      categories.push("অধিভুক্ত");
    }

    const unitList = unitsByEntity[col.id] || [];

    return {
      id: col.id,
      slug: col.slug,
      nameBn: col.name_bn,
      nameEn: col.name_en || "",
      shortName: col.short_name_en || col.short_name_bn || "",
      logo: col.logo_url || "",
      category: categories,
      link: `/qb/${col.slug}`,
      unitsText: formatUnitsText(unitList),
    };
  });

  const fetchedInstitutions = [...mappedClusters, ...mappedUniversities, ...mappedColleges];

  const fallbackInstitutions: QuestionBankUniversity[] = allData.universities.map((uni) => ({
    id: uni.id,
    slug: uni.id,
    nameBn: uni.nameBn,
    nameEn: uni.nameEn,
    shortName: uni.shortName,
    logo: uni.logo,
    category: uni.category,
    link: `/qb/${uni.id}`,
  }));

  const allInstitutions =
    fetchedInstitutions.length > 0 ? fetchedInstitutions : fallbackInstitutions;

  return (
    <>
      <Helmet>
        <title>প্রশ্নব্যাংক ও সমাধান — MNR Study</title>
        <meta
          name="description"
          content="বিগত বছরের প্রশ্ন সমাধান করে ভর্তি প্রস্তুতিতে এগিয়ে থাকো। এখানেই পাবে সব বিশ্ববিদ্যালয় ও ইউনিটের প্রশ্নব্যাংক।"
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Header />

        <QbFloatingDock isScrolled={isScrolled} />

        <main className="grow container mx-auto px-2 lg:px-44 pt-8 sm:pt-12 font-bengali pb-12">
          <SharedPageHeader
            title="প্রশ্নব্যাংক ও সমাধান"
            description="বিগত বছরের প্রশ্ন সমাধান করে ভর্তি প্রস্তুতিতে এগিয়ে থাকো। এখানেই পাবে সব বিশ্ববিদ্যালয় ও ইউনিটের প্রশ্নব্যাংক।"
            placeholder="বিশ্ববিদ্যালয় খুঁজুন..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
          />

          <div className="mt-12">
            <h2
              id="master-question-bank"
              className="text-2xl font-bold mb-4 text-center pb-2 border-b-2 border-primary/20 flex items-center justify-center gap-2"
            >
              <Book className="h-6 w-6 text-primary/80" />
              প্রশ্নব্যাংক সমগ্র
            </h2>
          </div>

          {(isMasterStreamsLoading || (masterStreams && masterStreams.length > 0)) && (
            <>
              <div className="mt-8 flex justify-center">
                <div className="gradient-background inline-flex items-center gap-2 px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md">
                  <Book className="h-5 w-5" />
                  মাস্টার প্রশ্নব্যাংক
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <QuestionBankCards
                  streams={masterStreams ?? []}
                  isLoading={isMasterStreamsLoading}
                  isError={isMasterStreamsError}
                />
              </div>
            </>
          )}

          <div className="mt-12">
            {isLoading ? (
              <div className="min-h-[30vh] flex items-center justify-center">
                <LoadingSpinner message="বিশ্ববিদ্যালয় তথ্য লোড হচ্ছে..." />
              </div>
            ) : isError ? (
              <div className="text-center text-destructive py-8">
                <p>তথ্য লোড করতে সমস্যা হয়েছে!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            ) : (
              <QuestionBankClient universities={allInstitutions} searchTerm={searchTerm} />
            )}
          </div>

          <div className="mt-12">
            <h2
              id="test-papers"
              className="text-2xl font-bold mb-4 text-center pb-2 border-b-2 border-primary/20 flex items-center justify-center gap-2"
            >
              <Pen className="h-6 w-6 text-primary/80" />
              টেস্ট পেপার (HSC)
            </h2>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="gradient-background inline-flex items-center gap-2 px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md">
              <Folder className="h-5 w-5" />
              সকল বিভাগ
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allGroupsTestPapers.map((paper, index) => (
              <TestPaperCard key={index} {...paper} />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="gradient-background inline-flex items-center gap-2 px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md">
              <Folder className="h-5 w-5" />
              বিজ্ঞান বিভাগ
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {scienceGroupTestPapers.map((paper, index) => (
              <TestPaperCard key={index} {...paper} />
            ))}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
