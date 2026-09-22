import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Building,
  FileText,
  Info,
  ArrowLeft,
  Search,
  GraduationCap,
  HelpCircle,
  Eye,
  PenLine,
  Lock,
} from "lucide-react";

export interface QbFile {
  id: string;
  original_filename: string;
  display_name?: string | null;
  uploaded_at?: string | null;
  total_questions?: number | null;
  category_id?: string | null;
  university_id?: string | null;
  cluster_id?: string | null;
  college_id?: string | null;
  unit_id?: string | null;
  year_id?: string | null;
  set_id?: string | null;
  batch?: {
    id: string;
    name?: string | null;
    year?: number | null;
  } | null;
  category?: {
    id: string;
    name_bn?: string | null;
    name_en?: string | null;
  } | null;
}

export interface BatchGroup {
  batchId: string;
  batchName: string;
  batchYear: number;
  files: QbFile[];
}

const FREE_BATCHES = 3;

export function getBatchSession(
  batch?: { year?: number | null; name?: string | null } | null,
): string | null {
  if (!batch) return null;
  if (batch.year) {
    const fullYear = batch.year;
    const nextTwoDigits = String(fullYear + 1).slice(-2);
    return `${fullYear}-${nextTwoDigits}`;
  }
  return batch.name || null;
}

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

export default function QbUnitFilesPage() {
  const { slug, unitSlug } = useParams<{ slug: string; unitSlug: string }>();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["qb-unit-files", slug, unitSlug],
    queryFn: async () => {
      if (!slug || !unitSlug) return null;

      // 1. Fetch institution entity (university, cluster, or college)
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

      const fkColumn =
        entityType === "university"
          ? "university_id"
          : entityType === "cluster"
            ? "cluster_id"
            : "college_id";

      // 2. Fetch Unit by unit_slug or id
      let { data: unitData } = await supabase
        .from("admission_units")
        .select("*")
        .is("deleted_at", null)
        .eq(fkColumn, entity.id)
        .eq("unit_slug", unitSlug)
        .maybeSingle();

      if (!unitData) {
        const { data: fallbackUnit } = await supabase
          .from("admission_units")
          .select("*")
          .is("deleted_at", null)
          .eq(fkColumn, entity.id)
          .eq("id", unitSlug)
          .maybeSingle();
        unitData = fallbackUnit;
      }

      if (!unitData) return null;
      const unit = unitData as AdmissionUnit;

      // 3. Fetch groups map, qb_files, and batches in parallel
      const [groupsRes, filesRes, batchesRes] = await Promise.all([
        supabase.from("groups").select("id, name_bn, name_en"),
        supabase
          .from("qb_files")
          .select(`
            *,
            batch:batches(id, name, year),
            category:institution_sub_categories(id, name_bn, name_en)
          `)
          .eq(fkColumn, entity.id)
          .eq("unit_id", unit.id),
        supabase
          .from("batches")
          .select("id, name, year")
          .is("deleted_at", null)
          .order("year", { ascending: false }),
      ]);

      const groupsMap: Record<string, { name_bn: string; name_en: string }> = {};
      (groupsRes.data || []).forEach((g: any) => {
        groupsMap[g.id] = { name_bn: g.name_bn, name_en: g.name_en };
      });

      const allFiles = (filesRes.data || []) as QbFile[];
      const allBatches = (batchesRes.data || []) as { id: string; name: string; year: number }[];

      // Group files by batch (year_id)
      const batchMap = new Map<string, QbFile[]>();
      allFiles.forEach((file) => {
        const batchId = file.year_id || "unknown";
        if (!batchMap.has(batchId)) batchMap.set(batchId, []);
        batchMap.get(batchId)!.push(file);
      });

      // Build sorted batch groups (recent year first)
      const batchGroups: BatchGroup[] = allBatches
        .filter((b) => batchMap.has(b.id))
        .sort((a, b) => b.year - a.year)
        .map((b) => ({
          batchId: b.id,
          batchName: b.name,
          batchYear: b.year,
          files: batchMap
            .get(b.id)!
            .sort(
              (a, b) =>
                new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime(),
            ),
        }));

      // Handle files with no batch
      const orphanFiles = batchMap.get("unknown") || [];
      if (orphanFiles.length > 0) {
        batchGroups.push({
          batchId: "unknown",
          batchName: "অন্যান্য",
          batchYear: 0,
          files: orphanFiles,
        });
      }

      return {
        entity,
        unit,
        files: allFiles,
        batchGroups,
        groupsMap,
      };
    },
    enabled: !!slug && !!unitSlug,
    staleTime: 5 * 60 * 1000,
  });

  const entity = data?.entity;
  const unit = data?.unit;
  const files = data?.files || [];
  const batchGroups = data?.batchGroups || [];
  const groupsMap = data?.groupsMap || {};
  const { toast } = useToast();

  const shortNameDisplay = entity?.short_name_en || entity?.short_name_bn || "";

  const primaryGroup = unit?.primary_group_id ? groupsMap[unit.primary_group_id]?.name_bn : null;

  const unitChangeGroups = useMemo(() => {
    if (!unit?.allowed_group_ids) return [];
    return unit.allowed_group_ids
      .map((gid) => groupsMap[gid]?.name_bn)
      .filter((gname): gname is string => Boolean(gname))
      .filter((gname, index, self) => {
        if (primaryGroup && gname.trim().toLowerCase() === primaryGroup.trim().toLowerCase()) {
          return false;
        }
        return self.indexOf(gname) === index;
      });
  }, [unit, groupsMap, primaryGroup]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (f) =>
          (f.display_name && f.display_name.toLowerCase().includes(term)) ||
          (f.original_filename && f.original_filename.toLowerCase().includes(term)) ||
          (f.batch?.name && f.batch.name.toLowerCase().includes(term)) ||
          (f.batch?.year && String(f.batch.year).includes(term)),
      );
    }
    // Sort by batch year descending (newest first)
    return result.sort((a, b) => (b.batch?.year || 0) - (a.batch?.year || 0));
  }, [files, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner message="প্রশ্নব্যাংক ফাইলসমূহ লোড হচ্ছে..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !entity || !unit) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="grow container mx-auto px-4 py-16 text-center font-bengali">
          <div className="max-w-md mx-auto bg-card border rounded-2xl p-8 shadow-lg space-y-4">
            <Building className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">ইউনিট বা প্রতিষ্ঠানটি পাওয়া যায়নি</h1>
            <p className="text-muted-foreground text-sm">
              আপনার খোঁজা লিংকটি সঠিক নয় অথবা তথ্যভান্ডারে ফাইলসমূহ নেই।
            </p>
            <Button asChild className="mt-4">
              <Link to={slug ? `/qb/${slug}` : "/qb"} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> ইউনিটের তালিকায় ফিরে যান
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
        <title>{`${entity.name_bn} - ${unit.unit_name_bn} প্রশ্নব্যাংক | MNR Study`}</title>
        <meta
          name="description"
          content={`${entity.name_bn}-এর ${unit.unit_name_bn}-এর বিগত বছরের প্রশ্নব্যাংক, মডেল টেস্ট ও সমাধান।`}
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-bengali">
        <Header />

        <main className="grow container mx-auto px-4 lg:px-44 pt-6 pb-16 space-y-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">
              হোম
            </Link>
            <span>/</span>
            <Link to="/qb" className="hover:text-primary transition-colors">
              প্রশ্নব্যাংক
            </Link>
            <span>/</span>
            <Link to={`/qb/${entity.slug}`} className="hover:text-primary transition-colors">
              {entity.name_bn}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{unit.unit_name_bn}</span>
          </nav>

          {/* Unit Header Card */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xl">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              {/* Institution Logo */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-background/90 p-3 border border-border/80 shadow-md flex items-center justify-center overflow-hidden">
                  {entity.logo_url ? (
                    <img
                      src={entity.logo_url}
                      alt={entity.name_bn}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <GraduationCap className="h-10 w-10 text-primary" />
                  )}
                </div>
              </div>

              {/* Unit Info */}
              <div className="text-center sm:text-left space-y-3 grow">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-sm font-semibold text-primary/80">
                    {entity.name_bn} {shortNameDisplay ? `(${shortNameDisplay})` : ""}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                  {unit.unit_name_bn} — প্রশ্নব্যাংক ফাইলসমূহ
                </h1>

                {unit.unit_name_en && (
                  <p className="text-sm text-muted-foreground font-sans font-medium">
                    {unit.unit_name_en}
                  </p>
                )}

                {/* Group & Unit Change Badges */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {primaryGroup && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/15 text-primary border-transparent font-semibold"
                    >
                      গ্রুপ: {primaryGroup}
                    </Badge>
                  )}

                  {unitChangeGroups.length > 0 && (
                    <Badge variant="outline" className="text-muted-foreground">
                      ইউনিট পরিবর্তন: {unitChangeGroups.join(", ")}
                    </Badge>
                  )}

                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    মোট {files.length} টি ফাইল
                  </Badge>
                </div>
              </div>

              {/* Back to Unit List Button */}
              <div className="shrink-0 pt-2 sm:pt-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <Link to={`/qb/${entity.slug}`}>
                    <ArrowLeft className="h-4 w-4" />
                    সকল ইউনিট
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Files List Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    প্রশ্নব্যাংক প্রশ্নপত্র ও সমাধান
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {entity.name_bn}-এর {unit.unit_name_bn}-এর সকল ফাইল ও সমাধান
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ফাইল খুঁজুন..."
                  className="pl-9 h-10 text-sm bg-card"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Flat Files Grid */}
            {filteredFiles.length === 0 ? (
              <div className="bg-card border rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <HelpCircle className="h-16 w-16 text-muted-foreground/60 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {searchTerm ? "কোনো ফাইল পাওয়া যায়নি" : "প্রশ্নব্যাংক ফাইল শীঘ্রই আপলোড করা হবে"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {searchTerm
                      ? `"${searchTerm}" দিয়ে কোনো ফাইল পাওয়া যায়নি। অন্য কিছু দিয়ে চেষ্টা করুন।`
                      : `${entity.name_bn}-এর ${unit.unit_name_bn}-এর জন্য নতুন বছরের প্রশ্নপত্র ও সমাধান আপলোড প্রক্রিয়া চলমান রয়েছে।`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFiles.map((file) => {
                  const fileBatchGroup = batchGroups.find((g) =>
                    g.files.some((f) => f.id === file.id),
                  );
                  const batchIndex = fileBatchGroup ? batchGroups.indexOf(fileBatchGroup) : -1;
                  const isLocked = batchIndex >= FREE_BATCHES && batchIndex !== -1;

                  return (
                    <div
                      key={file.id}
                      className={`p-5 rounded-2xl border border-border bg-card transition-all duration-300 flex flex-col justify-between space-y-4 group ${
                        isLocked
                          ? "opacity-75 cursor-not-allowed"
                          : "hover:border-primary/50 hover:shadow-lg"
                      }`}
                      onClick={
                        isLocked
                          ? () =>
                              toast({
                                title: "প্রিমিয়াম কনটেন্ট",
                                description:
                                  "এই ব্যাচের প্রশ্নগুলো প্রিমিয়াম। এই ফিচারটি শীঘ্রই উন্মুক্ত করা হবে!",
                                variant: "default",
                              })
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-3 rounded-xl shrink-0 group-hover:scale-105 transition-transform ${
                            isLocked
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isLocked ? (
                            <Lock className="h-6 w-6" />
                          ) : (
                            <FileText className="h-6 w-6" />
                          )}
                        </div>

                        <div className="space-y-2 grow min-w-0">
                          <h3
                            className={`text-base font-bold line-clamp-2 ${
                              isLocked
                                ? "text-muted-foreground"
                                : "text-foreground group-hover:text-primary transition-colors"
                            }`}
                          >
                            {file.display_name || file.original_filename}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2">
                            {file.batch?.year && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-primary/10 text-primary border-transparent"
                              >
                                {file.batch.year}-{String(file.batch.year + 1).slice(-2)}
                              </Badge>
                            )}
                            {file.set_id && (
                              <Badge variant="outline" className="text-xs text-primary/80">
                                {/^(set|সেট)/i.test(file.set_id.trim())
                                  ? file.set_id
                                  : `Set ${file.set_id}`}
                              </Badge>
                            )}
                            {typeof file.total_questions === "number" &&
                              file.total_questions > 0 && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <HelpCircle className="h-3 w-3" />
                                  {file.total_questions} টি প্রশ্ন
                                </Badge>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-3 w-full pt-2 border-t border-border/50">
                        {isLocked ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            <span>প্রিমিয়াম</span>
                          </div>
                        ) : (
                          <>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-8 text-xs font-semibold border-primary/30 hover:bg-primary/10"
                            >
                              <Link
                                to={`/qb/${slug}/${unitSlug}/${getBatchSession(file.batch) || file.batch?.year || file.year_id || file.id}/exams`}
                              >
                                <PenLine className="h-3.5 w-3.5" /> প্র্যাকটিস করুন
                              </Link>
                            </Button>
                            <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold">
                              <Link
                                to={`/qb/${slug}/${unitSlug}/${getBatchSession(file.batch) || file.batch?.year || file.year_id || file.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" /> সমাধানসহ প্রশ্ন দেখুন
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
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
