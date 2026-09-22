import { useState } from "react";
import { allData } from "@/lib/data";
import type { University } from "@/lib/data";
import { Input } from "@/components/ui/input";
import {
  Search,
  University as UniversityIcon,
  Leaf,
  Cog,
  Atom,
  HeartPulse,
  Blocks,
  Sparkles,
} from "lucide-react";
import PublicPageFloatingMenu from "../common/PublicPageFloatingMenu";
import CalendarUniversityCard from "./CalendarUniversityCard";

const categoryIcons: { [key: string]: React.FC<React.ComponentProps<"svg">> } = {
  গুচ্ছ: Blocks,
  সাধারণ: UniversityIcon,
  কৃষি: Leaf,
  প্রকৌশল: Cog,
  "বিজ্ঞান ও প্রযুক্তি": Atom,
  মেডিকেল: HeartPulse,
  বিশেষ: Sparkles,
  অধিভুক্ত: UniversityIcon,
};

const categoryIdMap: { [key: string]: string } = {
  গুচ্ছ: "cluster-system",
  সাধারণ: "general",
  কৃষি: "agriculture",
  প্রকৌশল: "engineering",
  "বিজ্ঞান ও প্রযুক্তি": "science-and-technology",
  মেডিকেল: "medical",
  বিশেষ: "special",
  অধিভুক্ত: "affiliated",
};

const CalendarGeneralAdmissionInfo = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const publicUniversities = (allData.universities as University[]).filter(
    (uni) => !uni.category.includes("প্রাইভেট"),
  );

  const filteredUniversities = publicUniversities.filter((uni) => {
    if (searchTerm === "") return true;
    const lowercasedTerm = searchTerm.toLowerCase();
    return (
      uni.nameBn.toLowerCase().includes(lowercasedTerm) ||
      uni.nameEn.toLowerCase().includes(lowercasedTerm) ||
      uni.shortName.toLowerCase().includes(lowercasedTerm)
    );
  });

  const groupedUniversities = filteredUniversities.reduce(
    (acc, uni) => {
      uni.category.forEach((category: string) => {
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(uni);
      });
      return acc;
    },
    {} as Record<string, University[]>,
  );

  const categoryOrder = [
    "গুচ্ছ",
    "সাধারণ",
    "কৃষি",
    "প্রকৌশল",
    "বিজ্ঞান ও প্রযুক্তি",
    "মেডিকেল",
    "বিশেষ",
    "অধিভুক্ত",
  ];

  const sortedCategories = Object.keys(groupedUniversities).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div id="Info" className="mt-4 w-full">
      <PublicPageFloatingMenu />
      <div className="mt-8 space-y-4 px-2 sm:px-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="বিশ্ববিদ্যালয় খুঁজুন..."
            className="w-full pl-10 h-12 text-base bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-12 space-y-12">
        {sortedCategories.map((category) => {
          const Icon = categoryIcons[category];
          const categoryId = categoryIdMap[category];
          return (
            <div key={category}>
              <div id={categoryId} className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-center pb-2 border-b-2 border-primary/20 flex items-center justify-center gap-2">
                  {Icon && <Icon className="h-6 w-6 text-primary" />}
                  {category} ({groupedUniversities[category].length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedUniversities[category].map((university: University) => (
                  <div key={university.shortName}>
                    <CalendarUniversityCard university={university} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGeneralAdmissionInfo;
