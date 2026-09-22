import React from "react";
import type { University } from "@/lib/data";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface QuestionBankUniversity extends Partial<University> {
  id: string;
  slug?: string;
  nameBn: string;
  nameEn?: string;
  shortName: string;
  logo: string;
  category: string[];
  link?: string;
  unitsText?: string;
}

interface QuestionBankUniversityCardProps {
  university: QuestionBankUniversity;
}

const clusterInfoFallback: { [key: string]: string } = {
  du: "ইউনিট: ক, খ, গ",
  ru: "ইউনিট: ক, খ, গ",
  cu: "ইউনিট: এ, বি, সি, ডি, বি১, বি২, ডি১",
  ju: "ইউনিট: এ, বি, সি, ডি, ই, সি১, IBA-JU",
  iu: "GST গুচ্ছভুক্ত + ডি ইউনিট",
  ku: "ইউনিট: এ, বি, সি, ডি",
  jnu: "ইউনিট: এ, বি, সি, ডি, ই",
  cou: "ইউনিট: এ, বি, সি",
  jkkniu: "GST গুচ্ছভুক্ত",
  brur: "GST গুচ্ছভুক্ত",
  bu: "GST গুচ্ছভুক্ত",
  kiu: "GST গুচ্ছভুক্ত",
  neu: "GST গুচ্ছভুক্ত",
  rub: "GST গুচ্ছভুক্ত",
  sust: "ইউনিট: এ, বি",
  just: "GST গুচ্ছভুক্ত",
  mbstu: "GST গুচ্ছভুক্ত",
  hstu: "ইউনিট: এ, বি, সি, ডি",
  nstu: "GST গুচ্ছভুক্ত",
  pstu: "GST গুচ্ছভুক্ত",
  pust: "GST গুচ্ছভুক্ত",
  rmstu: "GST গুচ্ছভুক্ত",
  bstu: "GST গুচ্ছভুক্ত",
  cstu: "GST গুচ্ছভুক্ত",
  gstu: "GST গুচ্ছভুক্ত",
  jstu: "GST গুচ্ছভুক্ত",
  prstu: "GST গুচ্ছভুক্ত",
  sstu: "GST গুচ্ছভুক্ত",
  uftb: "GST গুচ্ছভুক্ত",
  bmu: "ইউনিট: FEOS, FET, FMGP, FSA",
  bup: "ইউনিট: FASS, FBS, FSSS, FST",
  gst: "ইউনিট: ক, খ, গ",
  agri: "শুধু বিজ্ঞান বিভাগ",
  medical: "শুধু বিজ্ঞান বিভাগ",
  dental: "শুধু বিজ্ঞান বিভাগ",
  nursing: "নার্সিং ও মিডওয়াইফারি",
  nu: "সকল বিভাগ",
  dcu: "সকল বিভাগ",
  bau: "শুধু বিজ্ঞান বিভাগ",
  cvasu: "শুধু বিজ্ঞান বিভাগ",
  gau: "শুধু বিজ্ঞান বিভাগ",
  hau: "শুধু বিজ্ঞান বিভাগ",
  kau: "শুধু বিজ্ঞান বিভাগ",
  kuriau: "শুধু বিজ্ঞান বিভাগ",
  sau: "শুধু বিজ্ঞান বিভাগ",
  sbau: "শুধু বিজ্ঞান বিভাগ",
  buet: "শুধু বিজ্ঞান বিভাগ",
  kuet: "শুধু বিজ্ঞান বিভাগ",
  mist: "শুধু বিজ্ঞান বিভাগ",
  aaub: "শুধু বিজ্ঞান বিভাগ",
  ruet: "শুধু বিজ্ঞান বিভাগ",
  cuet: "শুধু বিজ্ঞান বিভাগ",
  afmc: "শুধু বিজ্ঞান বিভাগ",
  nitor: "শুধু বিজ্ঞান বিভাগ",
  butex: "শুধু বিজ্ঞান বিভাগ",
  "butex-affiliated": "শুধু বিজ্ঞান বিভাগ",
  "sust-affiliated": "শুধু বিজ্ঞান বিভাগ",
  "du-affiliated": "সকল বিভাগ",
  iut: "শুধু বিজ্ঞান বিভাগের মুসলিমদের",
  duet: "শুধুমাত্র ডিপ্লোমা শিক্ষার্থী",
};

const QuestionBankUniversityCard = React.memo(function QuestionBankUniversityCard({
  university,
}: QuestionBankUniversityCardProps) {
  const slug = university.slug || university.id;
  const targetLink = university.link || `/qb/${slug}`;
  const displayUnits =
    university.unitsText || clusterInfoFallback[university.id] || clusterInfoFallback[slug] || "";

  return (
    <Link to={targetLink}>
      <div
        className={cn(
          "relative w-full h-56 sm:h-64 text-center font-bold rounded-md p-4 flex flex-col justify-between items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border",
          "bg-card hover:border-primary/50",
        )}
      >
        <div>
          <div className="bg-accent dark:bg-muted rounded-full p-2 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 shadow-inner mx-auto">
            <img
              src={university.logo}
              alt={`${university.nameEn || university.nameBn} logo`}
              className="object-contain w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
          <h3 className="text-sm sm:text-base text-card-foreground">{university.nameBn}</h3>
          {university.shortName && (
            <p className="text-xs text-muted-foreground font-normal">({university.shortName})</p>
          )}
        </div>
        {displayUnits ? (
          <div className="w-full">
            <hr className="my-2 border-border/50" />
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5 font-normal">
              <Sparkles size={12} />
              {displayUnits}
            </p>
          </div>
        ) : (
          <div className="w-full h-2" />
        )}
      </div>
    </Link>
  );
});

export default QuestionBankUniversityCard;
