import React from "react";
import {
  University as UniversityIcon,
  Leaf,
  Cog,
  Atom,
  HeartPulse,
  Blocks,
  Sparkles,
  Building,
  BookOpen,
} from "lucide-react";
import QuestionBankUniversityCard, {
  type QuestionBankUniversity,
} from "./QuestionBankUniversityCard";

interface QuestionBankClientProps {
  universities: QuestionBankUniversity[];
  searchTerm: string;
}

const categoryIcons: { [key: string]: React.FC<React.ComponentProps<"svg">> } = {
  গুচ্ছ: Blocks,
  সাধারণ: UniversityIcon,
  কৃষি: Leaf,
  প্রকৌশল: Cog,
  ইঞ্জিনিয়ারিং: Cog,
  ইঞ্জিনিয়ারিং: Cog,
  "বিজ্ঞান ও প্রযুক্তি": Atom,
  মেডিকেল: HeartPulse,
  বিশেষ: Sparkles,
  ইসলামিক: BookOpen,
  ইসলামী: BookOpen,
  অধিভুক্ত: UniversityIcon,
  প্রাইভেট: Building,
};

const categoryIdMap: { [key: string]: string } = {
  গুচ্ছ: "cluster-system",
  সাধারণ: "general",
  কৃষি: "agriculture",
  প্রকৌশল: "engineering",
  ইঞ্জিনিয়ারিং: "engineering",
  ইঞ্জিনিয়ারিং: "engineering",
  "বিজ্ঞান ও প্রযুক্তি": "science-and-technology",
  মেডিকেল: "medical",
  বিশেষ: "special",
  ইসলামিক: "islamic",
  ইসলামী: "islamic",
  অধিভুক্ত: "affiliated",
  প্রাইভেট: "private",
};

export default function QuestionBankClient({ universities, searchTerm }: QuestionBankClientProps) {
  const filteredUniversities = universities.filter((uni) => {
    if (searchTerm === "") return true;
    const lowercasedTerm = searchTerm.toLowerCase();
    return (
      (uni.nameBn && uni.nameBn.toLowerCase().includes(lowercasedTerm)) ||
      (uni.nameEn && uni.nameEn.toLowerCase().includes(lowercasedTerm)) ||
      (uni.shortName && uni.shortName.toLowerCase().includes(lowercasedTerm))
    );
  });

  const groupedUniversities = filteredUniversities.reduce(
    (acc, uni) => {
      (uni.category || []).forEach((category) => {
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(uni);
      });
      return acc;
    },
    {} as Record<string, QuestionBankUniversity[]>,
  );

  const categoryOrder = [
    "গুচ্ছ",
    "মেডিকেল",
    "সাধারণ",
    "বিজ্ঞান ও প্রযুক্তি",
    "ইঞ্জিনিয়ারিং",
    "ইঞ্জিনিয়ারিং",
    "প্রকৌশল",
    "বিশেষ",
    "ইসলামিক",
    "ইসলামী",
    "কৃষি",
    "অধিভুক্ত",
    "প্রাইভেট",
  ];

  const sortedCategories = Object.keys(groupedUniversities).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <>
      <div className="mt-12 space-y-12">
        {sortedCategories.map((category) => {
          const Icon = categoryIcons[category] || Cog;
          const categoryId =
            categoryIdMap[category] ||
            (category.includes("ইঞ্জিনি") || category.includes("প্রকৌশল")
              ? "engineering"
              : category.includes("ইসলাম")
                ? "islamic"
                : "general");
          return (
            <div key={category}>
              <a href={`#${categoryId}`} id={categoryId} className="scroll-mt-24">
                <div className="flex justify-center">
                  <div className="gradient-background inline-flex items-center gap-2 px-6 py-2 text-primary-foreground rounded-full text-lg mb-4 font-bold shadow-md">
                    {Icon && <Icon className="h-5 w-5" />}
                    {category}
                  </div>
                </div>
              </a>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {groupedUniversities[category].map((university, index) => (
                  <div
                    key={`${university.id}-${index}`}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <QuestionBankUniversityCard university={university} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
