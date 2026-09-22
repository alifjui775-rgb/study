"use client";

import { PageHeader, LoadingSpinner } from "@/components";
import { SettingsClient } from "./SettingsClient";
import { useQuery } from "@tanstack/react-query";
import { getCourseBatches, getCourseCategories } from "@/lib/queries";

export default function AdminSettingsPage() {
  const { data: batches, isLoading: loadingBatches } = useQuery({
    queryKey: ["course-batches"],
    queryFn: getCourseBatches,
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["course-categories"],
    queryFn: getCourseCategories,
  });

  if (loadingBatches || loadingCategories) {
    return <LoadingSpinner message="তথ্য লোড হচ্ছে..." />;
  }

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-6">
      <PageHeader title="সেটিংস" description="অ্যাডমিন প্যানেলের কনফিগারেশন এবং পছন্দসমূহ পরিচালনা করুন।" />

      <SettingsClient initialBatches={batches || []} initialCategories={categories || []} />
    </div>
  );
}
