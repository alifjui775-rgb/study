"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Landmark,
  HelpCircle,
} from "lucide-react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import SimplePageHeader from "@/components/common/SimplePageHeader";

interface NormalizedUniversity {
  id: string;
  name: string;
  slug: string;
  method: "gpa" | "marks";
  maxGPA: number | null;
  sscMax: number | null;
  hscMax: number | null;
  sscWeight: number;
  hscWeight: number;
  totalScore: number;
  notes: string | null;
}

export default function GpaCalculatorPage() {
  const [universities, setUniversities] = useState<NormalizedUniversity[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Inputs
  const [sscVal, setSscVal] = useState("");
  const [hscVal, setHscVal] = useState("");

  // Result state
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  const selectedUniv = universities.find((u) => u.id === selectedId);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const { data, error } = await supabase.from("gpa_calculation_methods").select(`
            *,
            universities(id, name_en, name_bn, slug),
            clusters(id, name_en, name_bn, slug),
            colleges(id, name_en, name_bn, slug)
          `);

        if (error) throw error;

        if (data) {
          const formattedData: NormalizedUniversity[] = data.map((row) => {
            const institution = row.universities || row.clusters || row.colleges;
            return {
              id: row.id,
              name: institution?.name_bn || institution?.name_en || "অজানা প্রতিষ্ঠান",
              slug: institution?.slug || "",
              method: row.method as "gpa" | "marks",
              maxGPA: row.max_gpa,
              sscMax: row.ssc_max_marks,
              hscMax: row.hsc_max_marks,
              sscWeight: row.ssc_weight,
              hscWeight: row.hsc_weight,
              totalScore: row.total_score,
              notes: row.notes,
            };
          });

          // Sort alphabetically by name
          formattedData.sort((a, b) => a.name.localeCompare(b.name, "bn"));
          setUniversities(formattedData);
        }
      } catch (err: any) {
        console.error("Error fetching GPA calculation methods:", err);
        setErrorMsg("ডাটাবেজ থেকে ক্যালকুলেশন মেথড লোড করতে ব্যর্থ হয়েছে।");
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, []);

  // Reset inputs when university changes
  useEffect(() => {
    setSscVal("");
    setHscVal("");
    setCalculatedScore(null);
    setErrorMsg("");
  }, [selectedId]);

  const onCalculate = () => {
    setErrorMsg("");
    setCalculatedScore(null);

    if (!selectedUniv) {
      setErrorMsg("অনুগ্রহ করে একটি বিশ্ববিদ্যালয়/প্রতিষ্ঠান নির্বাচন করুন।");
      return;
    }

    const sscNum = parseFloat(sscVal);
    const hscNum = parseFloat(hscVal);

    if (isNaN(sscNum) || isNaN(hscNum)) {
      setErrorMsg("অনুগ্রহ করে এসএসসি এবং এইচএসসি জিপিএ/নম্বর সঠিকভাবে ইনপুট দিন।");
      return;
    }

    if (sscNum < 0 || hscNum < 0) {
      setErrorMsg("প্রাপ্ত জিপিএ/নম্বর ঋণাত্মক হতে পারে না।");
      return;
    }

    if (selectedUniv.method === "gpa") {
      const maxG = selectedUniv.maxGPA || 5;
      if (sscNum > maxG) {
        setErrorMsg(`এসএসসি জিপিএ সর্বোচ্চ জিপিএ (${maxG}) এর বেশি হতে পারবে না।`);
        return;
      }
      if (hscNum > maxG) {
        setErrorMsg(`এইচএসসি জিপিএ সর্বোচ্চ জিপিএ (${maxG}) এর বেশি হতে পারবে না।`);
        return;
      }
      const score = sscNum * selectedUniv.sscWeight + hscNum * selectedUniv.hscWeight;
      setCalculatedScore(score);
    } else {
      const sscM = selectedUniv.sscMax || 0;
      const hscM = selectedUniv.hscMax || 0;
      if (sscM <= 0 || hscM <= 0) {
        setErrorMsg("ডাটাবেজে সর্বোচ্চ নম্বরের তথ্য সঠিক নয়।");
        return;
      }
      if (sscNum > sscM) {
        setErrorMsg(`এসএসসি প্রাপ্ত নম্বর সর্বোচ্চ নম্বর (${sscM}) এর বেশি হতে পারবে না।`);
        return;
      }
      if (hscNum > hscM) {
        setErrorMsg(`এইচএসসি প্রাপ্ত নম্বর সর্বোচ্চ নম্বর (${hscM}) এর বেশি হতে পারবে না।`);
        return;
      }
      const score =
        (sscNum / sscM) * selectedUniv.sscWeight + (hscNum / hscM) * selectedUniv.hscWeight;
      setCalculatedScore(score);
    }
  };

  const handleReset = () => {
    setSelectedId("");
    setSscVal("");
    setHscVal("");
    setCalculatedScore(null);
    setErrorMsg("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow font-bengali pt-8 sm:pt-10 pb-8 sm:pb-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          {/* Page Header */}
          <SimplePageHeader
            title="জিপিএ ক্যালকুলেটর"
            description="বিভিন্ন বিশ্ববিদ্যালয়ের নিজস্ব জিপিএ হিসাব করার নিয়ম অনুযায়ী সহজেই আপনার ভর্তি পরীক্ষার পূর্ববর্তী জিপিএ স্কোর বের করুন।"
          />

          {/* Calculator Card */}
          <Card className="border border-border/60 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">স্কোর হিসাব করুন</CardTitle>
              <CardDescription>
                নিচের তালিকা থেকে আপনার কাঙ্ক্ষিত শিক্ষা প্রতিষ্ঠানটি বেছে নিন।
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Institution Selection */}
              <div className="space-y-2">
                <Label htmlFor="university-select" className="text-sm font-semibold">
                  বিশ্ববিদ্যালয়/প্রতিষ্ঠান নির্বাচন করুন
                </Label>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" /> লোড হচ্ছে...
                  </div>
                ) : (
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger id="university-select" className="w-full">
                      <SelectValue placeholder="একটি প্রতিষ্ঠান নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((uni) => (
                        <SelectItem key={uni.id} value={uni.id}>
                          {uni.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Conditional Inputs */}
              {selectedUniv && (
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex flex-col sm:flex-row gap-2 justify-between border-b border-primary/10 pb-2">
                    <span className="text-xs font-semibold text-primary/80 flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5" /> {selectedUniv.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      পদ্ধতি: {selectedUniv.method === "gpa" ? "জিপিএ ভিত্তিক" : "নম্বর ভিত্তিক"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SSC Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sscVal" className="text-xs font-semibold">
                        {selectedUniv.method === "gpa"
                          ? `এসএসসি জিপিএ (সর্বোচ্চ ${selectedUniv.maxGPA || 5.0})`
                          : `এসএসসি প্রাপ্ত নম্বর (সর্বোচ্চ ${selectedUniv.sscMax})`}
                      </Label>
                      <Input
                        id="sscVal"
                        type="number"
                        placeholder={selectedUniv.method === "gpa" ? "e.g. 5.00" : "e.g. 600"}
                        value={sscVal}
                        onChange={(e) => setSscVal(e.target.value)}
                        step="0.01"
                        className="bg-background border-primary/20 focus-visible:ring-primary"
                      />
                    </div>

                    {/* HSC Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="hscVal" className="text-xs font-semibold">
                        {selectedUniv.method === "gpa"
                          ? `এইচএসসি জিপিএ (সর্বোচ্চ ${selectedUniv.maxGPA || 5.0})`
                          : `এইচএসসি প্রাপ্ত নম্বর (সর্বোচ্চ ${selectedUniv.hscMax})`}
                      </Label>
                      <Input
                        id="hscVal"
                        type="number"
                        placeholder={selectedUniv.method === "gpa" ? "e.g. 5.00" : "e.g. 600"}
                        value={hscVal}
                        onChange={(e) => setHscVal(e.target.value)}
                        step="0.01"
                        className="bg-background border-primary/20 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error messages */}
              {errorMsg && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm animate-in fade-in duration-200">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Calculated Result Display */}
              {calculatedScore !== null && selectedUniv && (
                <div className="p-5 rounded-xl border-2 border-green-500/20 bg-green-500/5 text-center space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5" /> হিসাব সম্পন্ন হয়েছে
                  </div>
                  <div className="space-y-1">
                    <div className="text-4xl font-extrabold text-primary">
                      {calculatedScore.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground font-semibold">
                      মোট স্কোর: {selectedUniv.totalScore} এর মধ্যে
                    </div>
                  </div>
                  {/* Weight details breakdown */}
                  <div className="text-[11px] text-muted-foreground/80 mt-2 bg-background/50 py-1.5 px-3 rounded-lg max-w-sm mx-auto border border-border/50">
                    এসএসসি কন্ট্রিবিউশন:{" "}
                    {(
                      (selectedUniv.method === "gpa"
                        ? parseFloat(sscVal)
                        : parseFloat(sscVal) / (selectedUniv.sscMax || 1)) * selectedUniv.sscWeight
                    ).toFixed(2)}{" "}
                    | এইচএসসি কন্ট্রিবিউশন:{" "}
                    {(
                      (selectedUniv.method === "gpa"
                        ? parseFloat(hscVal)
                        : parseFloat(hscVal) / (selectedUniv.hscMax || 1)) * selectedUniv.hscWeight
                    ).toFixed(2)}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={onCalculate}
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                <Calculator className="h-4 w-4" /> স্কোর হিসাব করুন
              </Button>
              {selectedUniv && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  রিসেট করুন
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Notes display */}
          {selectedUniv?.notes && (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs sm:text-sm text-muted-foreground space-y-1.5 animate-in fade-in duration-200">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> বিশেষ নিয়ম ও নির্দেশনা:
              </div>
              <p className="leading-relaxed pl-5 whitespace-pre-line">{selectedUniv.notes}</p>
            </div>
          )}

          {/* FAQ / Info Section */}
          <section className="bg-muted/30 border border-border/40 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> কিছু সাধারণ জিজ্ঞাসা
            </h3>
            <div className="space-y-4 divide-y divide-border/50 text-sm">
              <div className="pt-0 space-y-1.5">
                <h4 className="font-semibold text-foreground">১. জিপিএ ভিত্তিক হিসাব কীভাবে করা হয়?</h4>
                <p className="text-muted-foreground leading-relaxed">
                  জিপিএ ভিত্তিক হিসাবের ক্ষেত্রে আপনার প্রাপ্ত এসএসসি ও এইচএসসি জিপিএ-কে যথাক্রমে বিশ্ববিদ্যালয়ের
                  নির্ধারিত এসএসসি ও এইচএসসি ওয়েট (Weight) দিয়ে গুণ করে যোগ করা হয়।
                  <br />
                  <span className="font-mono text-xs text-primary/80">
                    সূত্র: (SSC GPA × SSC Weight) + (HSC GPA × HSC Weight)
                  </span>
                </p>
              </div>
              <div className="pt-3 space-y-1.5">
                <h4 className="font-semibold text-foreground">২. নম্বর ভিত্তিক হিসাব কীভাবে করা হয়?</h4>
                <p className="text-muted-foreground leading-relaxed">
                  নম্বর ভিত্তিক হিসাবের ক্ষেত্রে আপনার প্রাপ্ত এসএসসি নম্বরকে এসএসসি সর্বোচ্চ নম্বর দিয়ে ভাগ করে
                  এসএসসি ওয়েট দিয়ে গুণ করা হয় এবং এইচএসসির ক্ষেত্রেও একইভাবে করে দুটি যোগ করা হয়।
                  <br />
                  <span className="font-mono text-xs text-primary/80">
                    সূত্র: ((SSC প্রাপ্ত নম্বর ÷ SSC সর্বোচ্চ নম্বর) × SSC Weight) + ((HSC প্রাপ্ত নম্বর ÷ HSC
                    সর্বোচ্চ নম্বর) × HSC Weight)
                  </span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
