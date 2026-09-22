import { useState } from "react";
import { Search } from "lucide-react";
import UniversityCard from "@/components/UniversityCard";

type ClusterUni = {
  id: string;
  name_bn: string;
  name_en: string;
  short_name: string;
  slug: string;
  logo_url: string | null;
  location: string | null;
};

interface Props {
  universities: ClusterUni[];
}

export default function ClusterUniversityList({ universities }: Props) {
  const [search, setSearch] = useState("");

  const filtered = universities.filter(
    (uni) =>
      uni.name_bn.toLowerCase().includes(search.toLowerCase()) ||
      uni.name_en.toLowerCase().includes(search.toLowerCase()) ||
      uni.short_name.toLowerCase().includes(search.toLowerCase()) ||
      uni.slug.toLowerCase().includes(search.toLowerCase()),
  );

  if (universities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-bengali bg-card border border-border rounded-2xl">
        <p className="text-sm">এই গুচ্ছে কোনো বিশ্ববিদ্যালয় পাওয়া যায়নি।</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-4">
        <div className="gradient-background inline-block px-6 py-2 text-primary-foreground rounded-full text-base sm:text-lg font-bold shadow-md font-bengali">
          অন্তর্ভুক্ত বিশ্ববিদ্যালয়
        </div>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="বিশ্ববিদ্যালয় খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bengali focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="grid gap-3">
        {filtered.map((uni) => (
          <UniversityCard
            key={uni.id}
            hideCircular
            university={{
              id: uni.id,
              slug: uni.slug,
              nameBn: uni.name_bn,
              nameEn: uni.name_en,
              shortName: uni.short_name,
              logo: uni.logo_url,
              link: `/university/${uni.slug}`,
            }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground font-bengali py-8">
            কোনো বিশ্ববিদ্যালয় পাওয়া যায়নি।
          </p>
        )}
      </div>
    </div>
  );
}
