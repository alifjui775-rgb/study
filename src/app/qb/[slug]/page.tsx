import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Layers, ArrowLeft, GraduationCap, HelpCircle, ChevronRight } from "lucide-react";

export interface AdmissionUnit {
  id: string;
  university_id?: string | null;
  cluster_id?: string | null;
  college_id?: string | null;
  unit_name_bn: string;
  unit_name_en?: string | null;
  unit_slug: string;
  exam_center_note?: string | null;
  sort_order: number;
  primary_group_id?: string | null;
  allowed_group_ids?: string[] | null;
}

export interface EntityInfo {
  id: string;
  slug: string;
  name_bn: string;
  name_en?: string | null;
  short_name_en?: string | null;
  short_name_bn?: string | null;
  logo_url?: string | null;
  category?: string | null;
  entityType: "university" | "cluster" | "college";
}

export default function QbInstitutionPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["qb-institution-detail", slug],
    queryFn: async () => {
      if (!slug) return null;

      // 1. Fetch institution (university, cluster, or college)
      let entityType: "university" | "cluster" | "college" = "university";
      let entityRow: any = null;

      const uniRes = await supabase
        .from("universities")
        .select("id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, category")
        .is("deleted_at", null)
        .eq("slug", slug)
        .maybeSingle();

      if (uniRes.data) {
        entityRow = uniRes.data;
        entityType = "university";
      } else {
        const clusterRes = await supabase
          .from("clusters")
          .select("id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url")
          .is("deleted_at", null)
          .eq("slug", slug)
          .maybeSingle();
        if (clusterRes.data) {
          entityRow = clusterRes.data;
          entityType = "cluster";
        } else {
          const collegeRes = await supabase
            .from("colleges")
            .select("id, slug, name_bn, name_en, short_name_en, short_name_bn, logo_url, category")
            .is("deleted_at", null)
            .eq("slug", slug)
            .maybeSingle();
          if (collegeRes.data) {
            entityRow = collegeRes.data;
            entityType = "college";
          }
        }
      }

      if (!entityRow) return null;

      const entity: EntityInfo = {
        ...entityRow,
        entityType,
      };

      // 2. Fetch admission units
      const fkColumn =
        entityType === "university"
          ? "university_id"
          : entityType === "cluster"
            ? "cluster_id"
            : "college_id";

      const [unitsRes, groupsRes] = await Promise.all([
        supabase
          .from("admission_units")
          .select("*")
          .is("deleted_at", null)
          .eq(fkColumn, entity.id)
          .order("sort_order", { ascending: true, nullsFirst: false }),
        supabase.from("groups").select("id, name_bn, name_en"),
      ]);

      const groupsMap: Record<string, { name_bn: string; name_en: string }> = {};
      (groupsRes.data || []).forEach((g: any) => {
        groupsMap[g.id] = { name_bn: g.name_bn, name_en: g.name_en };
      });

      return {
        entity,
        units: (unitsRes.data || []) as AdmissionUnit[],
        groupsMap,
      };
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const entity = data?.entity;
  const units = data?.units || [];
  const groupsMap = data?.groupsMap || {};

  const shortNameDisplay = entity?.short_name_en || entity?.short_name_bn || "";

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner message="বিশ্ববিদ্যালয় তথ্য ও ইউনিটসমূহ লোড হচ্ছে..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !entity) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow container mx-auto px-4 py-16 text-center font-bengali">
          <div className="max-w-md mx-auto bg-card border rounded-2xl p-8 shadow-lg space-y-4">
            <Building className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">বিশ্ববিদ্যালয় বা প্রতিষ্ঠানটি পাওয়া যায়নি</h1>
            <p className="text-muted-foreground text-sm">
              আপনার খোঁজা লিংকটি সঠিক নয় অথবা তথ্য তথ্যভান্ডারে নেই।
            </p>
            <Button asChild className="mt-4">
              <Link to="/qb" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> প্রশ্নব্যাংক মূল পাতায় যান
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${entity.name_bn} ${
          shortNameDisplay ? `(${shortNameDisplay})` : ""
        } - ইউনিটসমূহ | MNR Study`}</title>
        <meta
          name="description"
          content={`${entity.name_bn}-এর বিগত বছরের ইউনিট ভিত্তিক প্রশ্নব্যাংক, মডেল টেস্ট ও সাজেশন সম্পূর্ণ সমাধান সহ।`}
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
        <Header />

        <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">
              হোম
            </Link>
            <span>/</span>
            <Link to="/qb" className="hover:text-primary transition-colors">
              প্রশ্নব্যাংক
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{entity.name_bn}</span>
          </nav>

          {/* Top Institution Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xl">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              {/* Institution Logo */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-background/90 p-3 border border-border/80 shadow-md flex items-center justify-center overflow-hidden group">
                  {entity.logo_url ? (
                    <img
                      src={entity.logo_url}
                      alt={entity.name_bn}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <GraduationCap className="h-12 w-12 text-primary" />
                  )}
                </div>
              </div>

              {/* Institution Details */}
              <div className="text-center sm:text-left space-y-3 grow">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                    {entity.name_bn}
                  </h1>
                  {shortNameDisplay && (
                    <Badge
                      variant="default"
                      className="text-base font-bold px-3 py-1 bg-primary/90 text-primary-foreground shadow-sm rounded-lg"
                    >
                      {shortNameDisplay}
                    </Badge>
                  )}
                </div>

                {entity.name_en && (
                  <p className="text-sm sm:text-base text-muted-foreground font-sans font-medium">
                    {entity.name_en}
                  </p>
                )}

                {/* Category & Tags */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                    <Building className="h-3.5 w-3.5" />
                    {entity.entityType === "cluster"
                      ? "গুচ্ছভুক্ত প্রতিষ্ঠান"
                      : entity.entityType === "college"
                        ? "অধিভুক্ত কলেজ"
                        : "বিশ্ববিদ্যালয়"}
                  </Badge>

                  {units.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      মোট {units.length} টি ইউনিট
                    </Badge>
                  )}
                </div>
              </div>

              {/* Back to Question Bank main button */}
              <div className="shrink-0 pt-2 sm:pt-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <Link to="/qb">
                    <ArrowLeft className="h-4 w-4" />
                    সকল প্রশ্নব্যাংক
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Unit Selection Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    ইউনিট নির্বাচন করুন
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    প্রশ্নব্যাংক ও ফাইলসমূহ দেখতে পছন্দের ইউনিটে প্রবেশ করুন
                  </p>
                </div>
              </div>
            </div>

            {/* Units Display */}
            {units.length === 0 ? (
              <div className="bg-card border rounded-2xl p-8 text-center space-y-3 shadow-sm">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto opacity-60" />
                <h3 className="text-lg font-bold text-foreground">
                  এই বিশ্ববিদ্যালয়ের কোনো ইউনিট এখনও যুক্ত করা হয়নি
                </h3>
                <p className="text-sm text-muted-foreground">
                  শীঘ্রই এই প্রতিষ্ঠানের ইউনিট এবং প্রশ্নব্যাংক যোগ করা হবে।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {units.map((unit) => {
                  const primaryGroup = unit.primary_group_id
                    ? groupsMap[unit.primary_group_id]?.name_bn
                    : null;

                  // Filter out allowed group names that match primaryGroup or are duplicated
                  const unitChangeGroups = (unit.allowed_group_ids || [])
                    .map((gid) => groupsMap[gid]?.name_bn)
                    .filter((gname): gname is string => Boolean(gname))
                    .filter((gname, index, self) => {
                      if (
                        primaryGroup &&
                        gname.trim().toLowerCase() === primaryGroup.trim().toLowerCase()
                      ) {
                        return false;
                      }
                      return self.indexOf(gname) === index;
                    });

                  return (
                    <Link
                      key={unit.id}
                      to={`/qb/${entity.slug}/${unit.unit_slug || unit.id}`}
                      className="text-left p-5 rounded-2xl border border-border bg-card hover:border-primary hover:bg-accent/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative group flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                              {unit.unit_name_bn}
                            </h3>
                          </div>
                          {unit.unit_name_en && (
                            <p className="text-xs text-muted-foreground font-sans mt-0.5">
                              {unit.unit_name_en}
                            </p>
                          )}
                        </div>

                        <div className="p-1.5 rounded-full bg-primary/10 text-primary opacity-80 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Group Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {primaryGroup && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-primary/15 text-primary border-transparent font-medium"
                          >
                            গ্রুপ: {primaryGroup}
                          </Badge>
                        )}

                        {unitChangeGroups.length > 0 && (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            ইউনিট পরিবর্তন: {unitChangeGroups.join(", ")}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
