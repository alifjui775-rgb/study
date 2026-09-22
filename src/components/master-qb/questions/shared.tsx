import { Badge } from "@/components/ui/badge";
import { Building2, BookOpen, Layers, FileText, Tag } from "lucide-react";
import { toBnDigits, type MasterQuestionSourceInfo } from "@/lib/master-qb-queries";

export function ImageList({ images, alt }: { images?: string[] | null; alt: string }) {
  if (!images || images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img}
          alt={alt}
          className="max-h-80 rounded-xl border border-border bg-white dark:bg-white p-1 object-contain shadow-sm"
        />
      ))}
    </div>
  );
}

function formatSession(
  batchName?: string | null,
  batchYear?: number | string | null,
): string | null {
  const name = batchName != null ? String(batchName).trim() : "";
  if (name) return toBnDigits(name);

  if (batchYear != null && batchYear !== "") {
    const year = typeof batchYear === "string" ? parseInt(batchYear, 10) : batchYear;
    if (Number.isFinite(year)) {
      return toBnDigits(`${year}-${String(year + 1).slice(-2)}`);
    }
    return toBnDigits(String(batchYear));
  }

  return null;
}

export function SourceBadge({ source }: { source?: MasterQuestionSourceInfo | null }) {
  if (!source) return null;

  const institution = source.university_name || source.cluster_name || "";
  const unitName = source.unit_name_bn?.trim() || "";
  const session = formatSession(source.batch_name, source.batch_year);

  const sourceName = [institution, unitName].filter(Boolean).join(" ");
  const label = [sourceName, session].filter(Boolean).join(" • ");
  if (!label.trim()) return null;

  return (
    <Badge
      variant="outline"
      className="text-[10px] sm:text-xs font-bengali gap-1 bg-primary/5 text-primary border-primary/20 max-w-full"
    >
      <Building2 className="w-3 h-3 shrink-0" />
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export function MasterFooterBadges({
  paperName,
  chapterName,
  topicName,
  typeName,
}: {
  paperName?: string | null;
  chapterName?: string | null;
  topicName?: string | null;
  typeName?: string | null;
}) {
  if (!paperName && !chapterName && !topicName && !typeName) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/70 flex flex-wrap gap-2 items-center">
      {paperName && (
        <Badge
          variant="outline"
          className="text-xs bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
        >
          <BookOpen className="w-3 h-3 mr-1" />
          {paperName}
        </Badge>
      )}
      {chapterName && (
        <Badge
          variant="outline"
          className="text-xs bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
        >
          <Layers className="w-3 h-3 mr-1" />
          {chapterName}
        </Badge>
      )}
      {topicName && (
        <Badge
          variant="outline"
          className="text-xs bg-teal-50/50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800"
        >
          <FileText className="w-3 h-3 mr-1" />
          {topicName}
        </Badge>
      )}
      {typeName && (
        <Badge
          variant="outline"
          className="text-xs bg-purple-50/50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
        >
          <Tag className="w-3 h-3 mr-1" />
          {typeName}
        </Badge>
      )}
    </div>
  );
}
