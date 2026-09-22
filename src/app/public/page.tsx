import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  fetchInstitutionSubCategories,
  buildSubCategoryMap,
} from "@/lib/institution-category-queries";
import PublicPageClient from "@/components/PublicPageClient";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function PublicPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-institutions"],
    queryFn: async () => {
      const [uniRes, clusterRes, cuRes, subCatRes] = await Promise.all([
        supabase
          .from("universities")
          .select(
            "id, slug, name_bn, name_en, short_name_en, logo_url, description, category, sub_category",
          )
          .eq("category", "public"),
        supabase
          .from("clusters")
          .select(
            "id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, description, cluster_type",
          ),
        supabase.from("cluster_universities").select("university_id, cluster_id"),
        fetchInstitutionSubCategories(),
      ]);

      if (uniRes.error) throw uniRes.error;
      if (clusterRes.error) throw clusterRes.error;

      return {
        universities: uniRes.data || [],
        clusters: clusterRes.data || [],
        clusterLinks: cuRes.data || [],
        subCategoryMap: buildSubCategoryMap(subCatRes),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const subCategoryMap = data?.subCategoryMap || {};

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
  };

  // University → cluster(s) mapping for badges
  const clusterById = new Map((data?.clusters || []).map((c) => [c.id, c]));
  const uniClusterIds = new Map<string, string[]>();
  for (const link of data?.clusterLinks || []) {
    if (!link.university_id || !link.cluster_id || !clusterById.has(link.cluster_id)) continue;
    const ids = uniClusterIds.get(link.university_id) || [];
    if (!ids.includes(link.cluster_id)) ids.push(link.cluster_id);
    uniClusterIds.set(link.university_id, ids);
  }

  const mappedUniversities = (data?.universities || []).map((uni) => {
    const categories: string[] = [];
    if (uni.category) {
      const mappedCat = dbCategoryToBn[uni.category.toLowerCase()];
      if (mappedCat) categories.push(mappedCat);
    }
    if (uni.sub_category && uni.sub_category.length > 0) {
      uni.sub_category.forEach((sub: string) => {
        const mapped = subCategoryMap[sub]?.name_bn;
        if (mapped && !categories.includes(mapped)) categories.push(mapped);
      });
    }
    if (categories.length === 0) {
      categories.push("সাধারণ");
    }

    return {
      id: uni.id,
      slug: uni.slug,
      nameBn: uni.name_bn,
      nameEn: uni.name_en || "",
      shortName: uni.short_name_en || "",
      logo: uni.logo_url,
      description: uni.description,
      link: `/university/${uni.slug}`,
      categories,
      clusters: (uniClusterIds.get(uni.id) || []).map((cid) => {
        const c = clusterById.get(cid)!;
        return {
          label: c.name_bn,
          fullName: c.name_bn,
        };
      }),
    };
  });

  const mappedClusters = (data?.clusters || []).map((cluster) => {
    const isAffiliation =
      cluster.cluster_type === "affiliation" ||
      cluster.slug.includes("affiliated") ||
      cluster.slug === "tec" ||
      cluster.slug === "dcu" ||
      cluster.name_bn.includes("অধিভুক্ত");

    const categories = isAffiliation ? ["অধিভুক্ত"] : ["গুচ্ছ"];

    return {
      id: cluster.id,
      slug: cluster.slug,
      nameBn: cluster.name_bn,
      nameEn: cluster.name_en || "",
      shortName: cluster.short_name_en || "",
      logo: cluster.logo_url,
      description: cluster.description,
      link: `/cluster/${cluster.slug}`,
      categories,
    };
  });

  const allItems = [...mappedClusters, ...mappedUniversities];

  return (
    <>
      <Helmet>
        <title>পাবলিক বিশ্ববিদ্যালয় — MNR Study</title>
        <meta
          name="description"
          content="সকল পাবলিক বিশ্ববিদ্যালয়ের ভর্তি তথ্য, সার্কুলার এবং প্রশ্নব্যাংক একত্রে"
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Header />

        <main className="grow container mx-auto px-2 lg:px-44 pt-8 sm:pt-10">
          {isLoading ? (
            <div className="min-h-[50vh] flex items-center justify-center">
              <LoadingSpinner message="লোডিং..." />
            </div>
          ) : isError ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center px-4">
              <p className="text-destructive font-bengali font-bold">তথ্য লোড করতে সমস্যা হয়েছে!</p>
              <p className="text-xs text-muted-foreground max-w-md">
                {error instanceof Error ? error.message : "Unknown error occurred"}
              </p>
            </div>
          ) : (
            <PublicPageClient universities={allItems} />
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
