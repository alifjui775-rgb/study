import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import UniversityCard from "@/components/UniversityCard";
import { supabase } from "@/lib/supabase";
import { fetchInstitutionSubCategories } from "@/lib/institution-category-queries";
import type { InstitutionSubCategory } from "@/lib/institution-category-queries";
import type { College } from "@/lib/college-types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import SimplePageHeader from "@/components/common/SimplePageHeader";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function CollegePage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [subCategories, setSubCategories] = useState<InstitutionSubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [collegesRes, subCats] = await Promise.all([
          supabase.from("colleges").select("*"),
          fetchInstitutionSubCategories(),
        ]);
        if (collegesRes.error) throw collegesRes.error;
        setColleges(collegesRes.data || []);
        setSubCategories(subCats);
      } catch (err) {
        console.error("Failed to load college data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredColleges = useMemo(() => {
    if (!searchTerm.trim()) return colleges;
    const lower = searchTerm.toLowerCase();
    return colleges.filter((c) => {
      const matchNameBn = c.name_bn?.toLowerCase().includes(lower);
      const matchNameEn = c.name_en?.toLowerCase().includes(lower);
      const matchEiin = c.eiin?.toString().toLowerCase().includes(lower);
      return matchNameBn || matchNameEn || matchEiin;
    });
  }, [colleges, searchTerm]);

  return (
    <>
      <Helmet>
        <title>কলেজ — MNR Study</title>
        <meta name="description" content="সকল কলেজের ভর্তি তথ্য, সার্কুলার এবং প্রশ্নব্যাংক একত্রে" />
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
                  title="কলেজ"
                  description="সকল কলেজের ভর্তি তথ্য, সার্কুলার এবং প্রশ্নব্যাংক একত্রে"
                />
              </div>

              <div className="mt-4 space-y-4 px-4 sm:px-0 max-w-xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="কলেজের নাম বা EIIN দিয়ে খুঁজুন..."
                    className="w-full pl-10 h-12 text-base bg-card rounded-full focus-visible:ring-primary/40 font-bengali"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-8 space-y-12 pb-16">
                {subCategories.map((subCat) => {
                  const categoryColleges = filteredColleges.filter((c) =>
                    c.sub_category?.includes(subCat.id),
                  );
                  if (categoryColleges.length === 0) return null;

                  return (
                    <div key={subCat.id} className="px-4 sm:px-0">
                      <div className="scroll-mt-24 mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-center pb-2 border-b border-primary/20 flex items-center justify-center gap-2 font-bengali">
                          <Building2 className="h-5.5 w-5.5 text-primary" />
                          <span>
                            {subCat.name_bn} ({categoryColleges.length})
                          </span>
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryColleges.map((college, index) => (
                          <div
                            key={college.id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${(index % 6) * 50}ms` }}
                          >
                            <UniversityCard
                              university={{
                                id: college.id,
                                slug: college.slug,
                                nameBn: college.name_bn,
                                nameEn: college.name_en,
                                shortName: college.short_name_en,
                                logo: college.logo_url,
                                description: college.description,
                                link: `/college/${college.slug}`,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
