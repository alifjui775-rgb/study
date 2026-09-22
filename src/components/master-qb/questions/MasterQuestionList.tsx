import { memo, useMemo } from "react";
import { Layers } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MasterMcqCard from "./MasterMcqCard";
import MasterWrittenCard from "./MasterWrittenCard";
import type {
  MasterQbTopic,
  MasterQuestionItem,
  MasterQuestionType,
} from "@/lib/master-qb-queries";

const OTHER_TOPIC_ID = "other";
const OTHER_TOPIC_NAME = "অন্যান্য / বিবিধ প্রশ্ন";

interface MasterQuestionListProps {
  questions: MasterQuestionItem[];
  loading: boolean;
  hasMore: boolean;
  activeTab: MasterQuestionType;
  user?: { uid: string } | null;
  topics: MasterQbTopic[];
}

function getTopicInfo(
  q: MasterQuestionItem,
  topicNameMap: Map<string, string>,
): { id: string; name: string } {
  if (q.topic_id) {
    return {
      id: q.topic_id,
      name: q.topic_name ?? topicNameMap.get(q.topic_id) ?? OTHER_TOPIC_NAME,
    };
  }
  return { id: OTHER_TOPIC_ID, name: OTHER_TOPIC_NAME };
}

const MasterQuestionList = memo(function MasterQuestionList({
  questions,
  loading,
  hasMore,
  activeTab,
  user,
  topics,
}: MasterQuestionListProps) {
  const topicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    topics.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [topics]);

  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      const ta = getTopicInfo(a, topicNameMap);
      const tb = getTopicInfo(b, topicNameMap);
      if (ta.id !== tb.id) {
        if (ta.id === OTHER_TOPIC_ID) return 1;
        if (tb.id === OTHER_TOPIC_ID) return -1;
        return ta.name.localeCompare(tb.name, "bn");
      }
      return (a.sequence_order ?? 0) - (b.sequence_order ?? 0);
    });
  }, [questions, topicNameMap]);

  let lastTopicId = "";

  return (
    <div className="space-y-6">
      {sortedQuestions.map((q, i) => {
        const topic = getTopicInfo(q, topicNameMap);
        const showHeader = topic.id !== lastTopicId;
        if (showHeader) lastTopicId = topic.id;

        return (
          <div key={q.id} className="space-y-4">
            {showHeader && (
              <div className="flex items-center gap-3 pt-4 pb-2 border-b-2 border-primary/20">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground font-bengali">
                  {topic.name}
                </h2>
              </div>
            )}

            {activeTab === "mcq" ? (
              <MasterMcqCard question={q} index={i} user={user} />
            ) : (
              <MasterWrittenCard question={q} index={i} user={user} />
            )}
          </div>
        );
      })}

      {loading && (
        <div className="flex justify-center py-6">
          <LoadingSpinner message="আরো প্রশ্ন লোড হচ্ছে..." />
        </div>
      )}

      {!hasMore && sortedQuestions.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4 font-bengali">
          সব প্রশ্ন দেখানো হয়েছে ({sortedQuestions.length} টি)
        </p>
      )}
    </div>
  );
});

export default MasterQuestionList;
