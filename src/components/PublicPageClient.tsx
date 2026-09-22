import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  University as UniversityIcon,
  Leaf,
  Cog,
  Atom,
  HeartPulse,
  Blocks,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import UniversityCard from "@/components/UniversityCard";
import SimplePageHeader from "@/components/common/SimplePageHeader";
import PublicPageFloatingDock from "@/components/common/PublicPageFloatingDock";

interface PublicItem {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string;
  shortName: string;
  logo?: string | null;
  description?: string | null;
  link: string;
  categories: string[];
  clusters?: { label: string; fullName: string }[];
}

interface PublicPageClientProps {
  universities: PublicItem[];
}

const categoryIcons: Record<string, React.FC<React.ComponentProps<"svg">>> = {
  গুচ্ছ: Blocks,
  সাধারণ: UniversityIcon,
  "বিজ্ঞান ও প্রযুক্তি": Atom,
  প্রকৌশল: Cog,
  ইঞ্জিনিয়ারিং: Cog,
  ইঞ্জিনিয়ারিং: Cog,
  বিশেষ: Sparkles,
  ইসলামিক: BookOpen,
  ইসলামী: BookOpen,
  কৃষি: Leaf,
  মেডিকেল: HeartPulse,
  অধিভুক্ত: UniversityIcon,
};

const categoryIdMap: Record<string, string> = {
  গুচ্ছ: "cluster-system",
  সাধারণ: "general",
  "বিজ্ঞান ও প্রযুক্তি": "science-and-technology",
  প্রকৌশল: "engineering",
  ইঞ্জিনিয়ারিং: "engineering",
  ইঞ্জিনিয়ারিং: "engineering",
  বিশেষ: "special",
  ইসলামিক: "islamic",
  ইসলামী: "islamic",
  কৃষি: "agriculture",
  মেডিকেল: "medical",
  অধিভুক্ত: "affiliated",
};

export default function PublicPageClient({ universities }: PublicPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isPublicPage = pathname === "/public";

  const filteredUniversities = universities.filter((uni) => {
    const term = isPublicPage ? searchTerm : "";
    if (term === "") return true;
    const lowercasedTerm = term.toLowerCase();
    return (
      uni.nameBn.toLowerCase().includes(lowercasedTerm) ||
      uni.nameEn.toLowerCase().includes(lowercasedTerm) ||
      uni.shortName.toLowerCase().includes(lowercasedTerm)
    );
  });

  const groupedUniversities = filteredUniversities.reduce(
    (acc, uni) => {
      uni.categories.forEach((category) => {
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(uni);
      });
      return acc;
    },
    {} as Record<string, PublicItem[]>,
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
  ];

  const sortedCategories = Object.keys(groupedUniversities)
    .filter((cat) => groupedUniversities[cat].length > 0)
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      const valA = indexA === -1 ? 999 : indexA;
      const valB = indexB === -1 ? 999 : indexB;
      return valA - valB;
    });

  return (
    <>
      {isPublicPage && (
        <>
          <PublicPageFloatingDock isScrolled={isScrolled} />
          <div className="px-4">
            <SimplePageHeader
              title="পাবলিক বিশ্ববিদ্যালয়"
              description="সকল পাবলিক বিশ্ববিদ্যালয়ের ভর্তি তথ্য, সার্কুলার এবং প্রশ্নব্যাংক একত্রে"
            />
          </div>
          <div className="mt-4 space-y-4 px-4 sm:px-0 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="বিশ্ববিদ্যালয় খুঁজুন..."
                className="w-full pl-10 h-12 text-base bg-card rounded-full focus-visible:ring-primary/40 font-bengali"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-8 space-y-12 pb-16">
        {sortedCategories.map((category) => {
          const Icon = categoryIcons[category] || UniversityIcon;
          const categoryId = categoryIdMap[category];
          const count = groupedUniversities[category].length;

          return (
            <div key={category} className="px-4 sm:px-0">
              <div id={categoryId} className="scroll-mt-24 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-center pb-2 border-b border-primary/20 flex items-center justify-center gap-2 font-bengali">
                  <Icon className="h-5.5 w-5.5 text-primary" />
                  <span>
                    {category} ({count})
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedUniversities[category].map((university, index) => (
                  <div
                    key={`${category}-${university.slug}`}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${(index % 6) * 50}ms` }}
                  >
                    <UniversityCard university={university} />
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
