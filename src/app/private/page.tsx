import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Search, Building2, University } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UniversityCard from "@/components/UniversityCard";
import { supabase } from "@/lib/supabase";
import { fetchInstitutionSubCategories } from "@/lib/institution-category-queries";
import type { InstitutionSubCategory } from "@/lib/institution-category-queries";
import type { University as UniversityType } from "@/lib/university-types";
import type { College } from "@/lib/college-types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import SimplePageHeader from "@/components/common/SimplePageHeader";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function PrivatePage() {
  const [universities, setUniversities] = useState<UniversityType[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [subCategories, setSubCategories] = useState<InstitutionSubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [uniRes, colRes, subCats] = await Promise.all([
          supabase.from("universities").select("*"),
          supabase.from("colleges").select("*"),
          fetchInstitutionSubCategories(),
        ]);
        if (uniRes.error) throw uniRes.error;
        if (colRes.error) throw colRes.error;
        setUniversities(uniRes.data || []);
        setColleges(colRes.data || []);
        setSubCategories(subCats);
      } catch (err) {
        console.error("Failed to load private data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const strictFilteredUniversities = useMemo(() => {
    return universities.filter((u) => u.category === "private" || u.category === "international");
  }, [universities]);

  const strictFilteredColleges = useMemo(() => {
    return colleges.filter((c) => {
      if (c.category !== "private") return false;
      if (!c.type || c.type.length === 0) return false;
      return c.type.includes("honours") || c.type.includes("masters");
    });
  }, [colleges]);

  const filteredUniversities = useMemo(() => {
    if (!searchTerm.trim()) return strictFilteredUniversities;
    const lower = searchTerm.toLowerCase();
    return strictFilteredUniversities.filter((u) => {
      const matchNameBn = u.name_bn?.toLowerCase().includes(lower);
      const matchNameEn = u.name_en?.toLowerCase().includes(lower);
      const matchShort = u.short_name?.toString().toLowerCase().includes(lower);
      return matchNameBn || matchNameEn || matchShort;
    });
  }, [strictFilteredUniversities, searchTerm]);

  const filteredColleges = useMemo(() => {
    if (!searchTerm.trim()) return strictFilteredColleges;
    const lower = searchTerm.toLowerCase();
    return strictFilteredColleges.filter((c) => {
      const matchNameBn = c.name_bn?.toLowerCase().includes(lower);
      const matchNameEn = c.name_en?.toLowerCase().includes(lower);
      const matchEiin = c.eiin?.toString().toLowerCase().includes(lower);
      return matchNameBn || matchNameEn || matchEiin;
    });
  }, [strictFilteredColleges, searchTerm]);

  const renderGrouped = (list: (UniversityType | College)[], linkPrefix: string) =>
    subCategories.map((subCat) => {
      const items = list.filter((item) => item.sub_category?.includes(subCat.id));
      if (items.length === 0) return null;

      return (
        <div key={subCat.id} className="px-4 sm:px-0">
          <div className="scroll-mt-24 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-center pb-2 border-b border-primary/20 flex items-center justify-center gap-2 font-bengali">
              <Building2 className="h-5.5 w-5.5 text-primary" />
              <span>
                {subCat.name_bn} ({items.length})
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, index) => {
              const ins = item as UniversityType;
              const col = item as College;
              return (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${(index % 6) * 50}ms` }}
                >
                  <UniversityCard
                    university={{
                      id: item.id,
                      slug: item.slug,
                      nameBn: item.name_bn,
                      nameEn: ins.name_en || col.name_en || "",
                      shortName: ins.short_name || col.short_name_en,
                      logo: item.logo_url,
                      description: item.description,
                      link: `/${linkPrefix}/${item.slug}`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    });

  return (
    <>
      <Helmet>
        <title>প্রাইভেট — MNR Study</title>
        <meta
          name="description"
          content="সকল প্রাইভেট বিশ্ববিদ্যালয় ও কলেজের ভর্তি তথ্য, সার্কুলার এবং প্রশ্নব্যাংক একত্রে"
        />
      </Helmet>
      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Header />
        <main className="grow container mx-auto px-2 lg:px-44 pt-8 sm:pt-10">
          {isLoading ? (
            <div className="min-h-[50vh] flex items-center justify-center">
              <LoadingSpinner message="লোডিং..." />
            </div>
          ) : (
            <>
              <div className="px-4">
                <SimplePageHeader
                  title="প্রাইভেট"
                  description="সকল প্রাইভেট বিশ্ববিদ্যালয় ও কলেজের ভর্তি তথ্য, সার্কুলার এবং প্রশ্নব্যাংক একত্রে"
                />
              </div>

              <div className="mt-4 space-y-4 px-4 sm:px-0 max-w-xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="নাম বা EIIN দিয়ে খুঁজুন..."
                    className="w-full pl-10 h-12 text-base bg-card rounded-full focus-visible:ring-primary/40 font-bengali"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8 pb-16">
                <Tabs defaultValue="university" className="w-full">
                  <div className="flex justify-center mb-8">
                    <TabsList className="w-auto inline-flex">
                      <TabsTrigger
                        value="university"
                        className="flex items-center gap-2 font-bengali"
                      >
                        <University className="h-4 w-4" />
                        বিশ্ববিদ্যালয়
                      </TabsTrigger>
                      <TabsTrigger value="college" className="flex items-center gap-2 font-bengali">
                        <Building2 className="h-4 w-4" />
                        কলেজ
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="university" className="space-y-12">
                    {renderGrouped(filteredUniversities, "university")}
                  </TabsContent>

                  <TabsContent value="college" className="space-y-12">
                    {renderGrouped(filteredColleges, "college")}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
