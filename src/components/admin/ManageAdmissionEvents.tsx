// =============================================================================
// Admin — Admission Events Super-Tab Component (Phase 3 — All 5 Sub-Tabs)
// =============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBatches } from "@/lib/university-events-queries";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ManageAdmissionCirculars from "@/components/admin/ManageAdmissionCirculars";
import ManageApplicationDetails from "@/components/admin/ManageApplicationDetails";
import ManageExamSchedules from "@/components/admin/ManageExamSchedules";
import ManageAdmitCardDetails from "@/components/admin/ManageAdmitCardDetails";
import ManageResultDetails from "@/components/admin/ManageResultDetails";

import { CalendarDays, FileText, Clock, Contact2, Award, Calendar } from "lucide-react";

interface ManageAdmissionEventsProps {
  entityId: string;
  entityType?: "university" | "college" | "cluster";
}

const QUERY_KEY_BATCHES = "admin-batches";

export default function ManageAdmissionEvents({
  entityId,
  entityType = "university",
}: ManageAdmissionEventsProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  // Fetch Batches
  const {
    data: batches = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY_BATCHES],
    queryFn: fetchBatches,
  });

  if (isLoading) {
    return <LoadingSpinner message="সেশন/ব্যাচ তালিকা লোড হচ্ছে..." />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive font-bengali">
          সেশন লোড করতে সমস্যা: {error instanceof Error ? error.message : "Unknown"}
        </p>
      </div>
    );
  }

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="space-y-6">
      {/* Batch Selector Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border border-border">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold font-bengali flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            ভর্তি পরীক্ষার সেশন / ব্যাচ নির্বাচন
          </h3>
          <p className="text-xs text-muted-foreground font-bengali">
            সংশ্লিষ্ট ইভেন্ট পরিচালনা করতে একটি ভর্তি পরীক্ষার সেশন সিলেক্ট করুন।
          </p>
        </div>
        <div className="w-full sm:w-[220px]">
          <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
            <SelectTrigger className="font-bengali">
              <SelectValue placeholder="সেশন/ব্যাচ নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name_bn} ({batch.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conditional Rendering based on Batch Selection */}
      {!selectedBatchId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h4 className="font-bold text-base font-bengali text-foreground">
              সেশন নির্বাচন করা হয়নি
            </h4>
            <p className="text-xs text-muted-foreground font-bengali mt-1 max-w-[280px]">
              ভর্তি বিজ্ঞপ্তি, সময়সূচী, এডমিট কার্ড ও রেজাল্ট সম্পর্কিত তথ্য দেখতে ও এডিট করতে উপরে একটি ব্যাচ বা
              সেশন সিলেক্ট করুন।
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="border-b border-border/80 pb-2">
            <h3 className="font-bold text-lg font-bengali">
              ইভেন্টস ডেটা — সেশন:{" "}
              <span className="text-primary">{selectedBatch?.name_bn || ""}</span>
            </h3>
          </div>

          <Tabs defaultValue="circulars" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto h-auto flex flex-wrap gap-1 p-1 bg-muted/40 border border-border rounded-lg">
              <TabsTrigger value="circulars" className="gap-1.5 py-1.5 text-xs font-bengali">
                <FileText className="h-3.5 w-3.5" />
                ভর্তি সার্কুলার
              </TabsTrigger>
              <TabsTrigger value="applications" className="gap-1.5 py-1.5 text-xs font-bengali">
                <Contact2 className="h-3.5 w-3.5" />
                আবেদন বিবরণ
              </TabsTrigger>
              <TabsTrigger value="schedules" className="gap-1.5 py-1.5 text-xs font-bengali">
                <Clock className="h-3.5 w-3.5" />
                পরীক্ষার সময়সূচী
              </TabsTrigger>
              <TabsTrigger value="admit_cards" className="gap-1.5 py-1.5 text-xs font-bengali">
                <CalendarDays className="h-3.5 w-3.5" />
                এডমিট কার্ড তথ্য
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-1.5 py-1.5 text-xs font-bengali">
                <Award className="h-3.5 w-3.5" />
                পরীক্ষার ফলাফল
              </TabsTrigger>
            </TabsList>

            {/* Circulars */}
            <TabsContent value="circulars" className="focus-visible:outline-none">
              <ManageAdmissionCirculars
                entityId={entityId}
                entityType={entityType}
                batchId={selectedBatchId}
              />
            </TabsContent>

            {/* Application Details */}
            <TabsContent value="applications" className="focus-visible:outline-none">
              <ManageApplicationDetails
                entityId={entityId}
                entityType={entityType}
                batchId={selectedBatchId}
              />
            </TabsContent>

            {/* Exam Schedules */}
            <TabsContent value="schedules" className="focus-visible:outline-none">
              <ManageExamSchedules
                entityId={entityId}
                entityType={entityType}
                batchId={selectedBatchId}
              />
            </TabsContent>

            {/* Admit Card Details */}
            <TabsContent value="admit_cards" className="focus-visible:outline-none">
              <ManageAdmitCardDetails
                entityId={entityId}
                entityType={entityType}
                batchId={selectedBatchId}
              />
            </TabsContent>

            {/* Result Details */}
            <TabsContent value="results" className="focus-visible:outline-none">
              <ManageResultDetails
                entityId={entityId}
                entityType={entityType}
                batchId={selectedBatchId}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
