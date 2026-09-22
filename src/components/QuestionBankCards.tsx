import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export interface MasterQBStream {
  id: number;
  slug: string;
  name_bn: string;
  short_name_bn: string | null;
  description: string | null;
  paper_ids: string[];
  sort_order: number;
  icon_url: string | null;
}

interface QuestionBankCardsProps {
  streams: MasterQBStream[];
  isLoading: boolean;
  isError?: boolean;
}

function StreamIcon({ iconUrl, nameBn }: { iconUrl: string | null; nameBn: string }) {
  const [failed, setFailed] = useState(false);

  if (!iconUrl || failed) {
    return <BookOpen className="size-6 sm:size-8 text-primary" />;
  }

  return (
    <img
      src={iconUrl}
      alt={`${nameBn} logo`}
      className="object-contain w-10 h-10 sm:w-12 sm:h-12"
      onError={() => setFailed(true)}
    />
  );
}

const QuestionBankCards = ({ streams, isLoading, isError }: QuestionBankCardsProps) => {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="relative w-full h-56 sm:h-64 rounded-md p-4 flex flex-col items-center justify-center gap-4 border bg-card animate-pulse"
          >
            <div className="bg-muted rounded-full w-16 h-16 sm:w-20 sm:h-20" />
            <div className="bg-muted h-4 w-24 rounded" />
          </div>
        ))}
      </>
    );
  }

  if (isError || streams.length === 0) return null;

  return (
    <>
      {streams.map((stream) => (
        <Link
          key={stream.id}
          to={`/qb/master/${stream.slug}`}
          className="relative w-full h-56 sm:h-64 text-center font-bold rounded-md p-4 flex flex-col justify-center items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border bg-card hover:border-primary/50"
        >
          <div className="bg-accent dark:bg-[#757575] rounded-full p-2 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shadow-inner">
            <StreamIcon iconUrl={stream.icon_url} nameBn={stream.name_bn} />
          </div>
          <h3 className="text-sm sm:text-base text-card-foreground">{stream.name_bn}</h3>
        </Link>
      ))}
    </>
  );
};

export default QuestionBankCards;
